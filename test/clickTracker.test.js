'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { completeAction, MAX_CLICKS } = require('../src/clickTracker');
const clickLogTable = require('../src/clickLogTable');

function tempLogPath(prefix) {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), prefix)), 'log.log');
}

function readLogEntries(logPath) {
  return fs
    .readFileSync(logPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
}

test('happy path: a primary action completed within the click limit is stored and logged', () => {
  clickLogTable.reset();
  const logPath = tempLogPath('audit-');

  const result = completeAction('approve_high_risk_action', 2, { logPath });

  assert.equal(result.screenId, 'approve_high_risk_action');
  assert.equal(result.clickCount, 2);
  assert.equal(result.withinLimit, true);

  const stored = clickLogTable.getAll();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].withinLimit, true);
  assert.ok(stored[0].timestamp, 'stored row must carry a timestamp');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1, 'a within-limit action logs only click_count_logged, no excessive-click event');
  assert.equal(entries[0].type, 'click_count_logged');
  assert.equal(entries[0].screenId, 'approve_high_risk_action');
  assert.equal(entries[0].clickCount, 2);
  assert.equal(entries[0].withinLimit, true);
});

test('failure path: an unknown screenId is rejected, logged, and alerted, not stored', () => {
  clickLogTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () => completeAction('no_such_screen', 2, { logPath, alertPath }),
    /Click tracking failed: screenId "no_such_screen" is not a known screen/,
  );

  assert.equal(clickLogTable.getAll().length, 0);

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'click_tracking_failed');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'click_tracking_failed');
});

test('failure path: a malformed clickCount is rejected, logged, and alerted, not stored', () => {
  clickLogTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () => completeAction('approve_high_risk_action', -1, { logPath, alertPath }),
    /Click tracking failed: clickCount must be a non-negative integer/,
  );

  assert.equal(clickLogTable.getAll().length, 0);
  assert.equal(readLogEntries(logPath)[0].type, 'click_tracking_failed');
  assert.equal(readLogEntries(alertPath)[0].type, 'click_tracking_failed');
});

test('failure path: a storage failure while logging clicks is logged and alerted, and the error is not swallowed', () => {
  clickLogTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenClickLogTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  assert.throws(
    () => completeAction('approve_high_risk_action', 2, { logPath, alertPath, clickLogTable: brokenClickLogTable }),
    /Click tracking failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'click_tracking_failed');
  assert.equal(auditEntries[0].reason, 'disk full');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'click_tracking_failed');
});

test('failure path: more than three clicks triggers a streamline notification and is logged as excessive', () => {
  clickLogTable.reset();
  const logPath = tempLogPath('audit-');
  const sent = [];

  const result = completeAction('resolve_paused_issue', MAX_CLICKS + 1, {
    logPath,
    notify: (notification) => {
      sent.push(notification);
      return { timestamp: new Date().toISOString(), ...notification };
    },
  });

  assert.equal(result.withinLimit, false);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'excessive_clicks_notification');
  assert.equal(sent[0].screenId, 'resolve_paused_issue');
  assert.equal(sent[0].clickCount, MAX_CLICKS + 1);

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].type, 'excessive_clicks_detected');
  assert.equal(entries[0].clickCount, MAX_CLICKS + 1);
  assert.equal(entries[1].type, 'click_count_logged');
  assert.equal(entries[1].withinLimit, false);
});

test('failure path: a notification failure on an excessive-click attempt is logged and alerted, and the click count stays stored', () => {
  clickLogTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () =>
      completeAction('resolve_paused_issue', MAX_CLICKS + 2, {
        logPath,
        alertPath,
        notify: () => {
          throw new Error('notification service unreachable');
        },
      }),
    /Notification failed: notification service unreachable/,
  );

  const stored = clickLogTable.getAll();
  assert.equal(stored.length, 1, 'the click count must already be stored before notification is attempted');
  assert.equal(stored[0].clickCount, MAX_CLICKS + 2);
  assert.equal(stored[0].withinLimit, false);

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'notification_failed');
  assert.equal(auditEntries[0].reason, 'notification service unreachable');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'notification_failed');
});
