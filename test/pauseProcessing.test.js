'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { pauseProcessing } = require('../src/pauseProcessing');
const pausedIssueTable = require('../src/pausedIssueTable');

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

const uncertainIssue = {
  orderId: 'ORD-50',
  issueType: 'payment_failure',
  uncertaintyReason: 'failureReason "chargeback_pending" is not a known case; cannot confidently recommend an action.',
};

test('happy path: an uncertain issue is paused, a notification is sent, and the pause is logged with issue details', () => {
  pausedIssueTable.reset();
  const logPath = tempLogPath('audit-');
  const sent = [];

  const result = pauseProcessing(uncertainIssue, {
    logPath,
    notify: (notification) => {
      sent.push(notification);
      return { timestamp: new Date().toISOString(), ...notification };
    },
  });

  assert.equal(result.status, 'paused_uncertain');
  assert.equal(result.orderId, 'ORD-50');

  const stored = pausedIssueTable.getAll();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].orderId, 'ORD-50');
  assert.equal(stored[0].status, 'paused_uncertain');
  assert.ok(stored[0].timestamp, 'paused issue must carry a timestamp');

  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'issue_paused_notification');
  assert.equal(sent[0].orderId, 'ORD-50');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'issue_paused');
  assert.equal(entries[0].orderId, 'ORD-50');
  assert.equal(entries[0].issueType, 'payment_failure');
  assert.equal(entries[0].uncertaintyReason, uncertainIssue.uncertaintyReason);
  assert.equal(entries[0].status, 'paused_uncertain');
});

test('failure path: incorrect input (missing uncertaintyReason) is rejected, logged, and alerted, not stored', () => {
  pausedIssueTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const incomplete = {
    orderId: 'ORD-51',
    issueType: 'payment_failure',
  };

  assert.throws(
    () => pauseProcessing(incomplete, { logPath, alertPath }),
    /Pause failed: record is missing a string uncertaintyReason/,
  );

  assert.equal(pausedIssueTable.getAll().length, 0, 'nothing should be stored for input that failed validation');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'pause_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-51');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'pause_failed');
});

test('failure path: a storage failure while pausing is logged and alerted, and the error is not swallowed', () => {
  pausedIssueTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenPausedIssueTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  assert.throws(
    () => pauseProcessing(uncertainIssue, { logPath, alertPath, pausedIssueTable: brokenPausedIssueTable }),
    /Pause failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'pause_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-50');
  assert.equal(auditEntries[0].reason, 'disk full');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'pause_failed');
});

test('failure path: a notification failure is logged and alerted, the error is not swallowed, and the issue stays paused', () => {
  pausedIssueTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () =>
      pauseProcessing(uncertainIssue, {
        logPath,
        alertPath,
        notify: () => {
          throw new Error('notification service unreachable');
        },
      }),
    /Notification failed: notification service unreachable/,
  );

  const stored = pausedIssueTable.getAll();
  assert.equal(stored.length, 1, 'the issue must already be stored as paused before notification is attempted');
  assert.equal(stored[0].orderId, 'ORD-50');
  assert.equal(
    stored[0].status,
    'paused_uncertain',
    'a failed notification must not un-pause the issue; it stays paused',
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'notification_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-50');
  assert.equal(auditEntries[0].reason, 'notification service unreachable');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'notification_failed');
});
