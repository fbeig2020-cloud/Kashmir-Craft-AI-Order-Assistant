'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { checkResolutionTime } = require('../src/checkResolutionTime');
const resolutionTimeTable = require('../src/resolutionTimeTable');

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

const detectedAt = '2026-01-01T09:00:00.000Z';

test('happy path: resolution within 2 hours is logged as timely, no alert sent', () => {
  resolutionTimeTable.reset();
  const logPath = tempLogPath('audit-');
  const sent = [];

  const stored = checkResolutionTime(
    {
      orderId: 'ORD-50',
      issueType: 'payment_failure',
      detectedAt,
      resolvedAt: '2026-01-01T10:30:00.000Z',
    },
    {
      logPath,
      notify: (notification) => {
        sent.push(notification);
        return { timestamp: new Date().toISOString(), ...notification };
      },
    },
  );

  assert.equal(stored.orderId, 'ORD-50');
  assert.equal(stored.timely, true);
  assert.equal(stored.elapsedMs, 90 * 60 * 1000);

  const listed = resolutionTimeTable.getAll();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].timely, true);

  assert.equal(sent.length, 0, 'no alert should be sent for a timely resolution');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'resolution_timely');
  assert.equal(entries[0].orderId, 'ORD-50');
});

test('failure path: resolution exceeding 2 hours is logged as exceeded and an alert is generated', () => {
  resolutionTimeTable.reset();
  const logPath = tempLogPath('audit-');
  const sent = [];

  const stored = checkResolutionTime(
    {
      orderId: 'ORD-51',
      issueType: 'shipping_delay',
      detectedAt,
      resolvedAt: '2026-01-01T11:30:01.000Z',
    },
    {
      logPath,
      notify: (notification) => {
        sent.push(notification);
        return { timestamp: new Date().toISOString(), ...notification };
      },
    },
  );

  assert.equal(stored.timely, false);

  const listed = resolutionTimeTable.getAll();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].timely, false);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'resolution_time_exceeded_alert');
  assert.equal(sent[0].orderId, 'ORD-51');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'resolution_exceeded');
  assert.equal(entries[0].timely, false);
});

test('failure path: resolution time failure (missing resolvedAt) is rejected, logged, and alerted, not stored', () => {
  resolutionTimeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const incomplete = {
    orderId: 'ORD-52',
    issueType: 'payment_failure',
    detectedAt,
  };

  assert.throws(
    () => checkResolutionTime(incomplete, { logPath, alertPath }),
    /Resolution time check failed: record is missing a valid resolvedAt/,
  );

  assert.equal(resolutionTimeTable.getAll().length, 0, 'nothing should be stored for input that failed validation');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'resolution_time_check_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-52');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'resolution_time_check_failed');
});

test('failure path: resolvedAt before detectedAt is rejected as invalid input', () => {
  resolutionTimeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () =>
      checkResolutionTime(
        { orderId: 'ORD-53', issueType: 'payment_failure', detectedAt, resolvedAt: '2026-01-01T08:00:00.000Z' },
        { logPath, alertPath },
      ),
    /Resolution time check failed: resolvedAt is before detectedAt/,
  );

  assert.equal(resolutionTimeTable.getAll().length, 0);
});

test('failure path: performance bottleneck (storage failure) is logged, alerted, and not swallowed', () => {
  resolutionTimeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  assert.throws(
    () =>
      checkResolutionTime(
        { orderId: 'ORD-54', issueType: 'payment_failure', detectedAt, resolvedAt: '2026-01-01T10:00:00.000Z' },
        { logPath, alertPath, resolutionTimeTable: brokenTable },
      ),
    /Resolution time logging failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'resolution_time_logging_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-54');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'resolution_time_logging_failed');
});

test('failure path: alert failure on an exceeded resolution is logged and alerted, and the row stays stored', () => {
  resolutionTimeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () =>
      checkResolutionTime(
        { orderId: 'ORD-55', issueType: 'payment_failure', detectedAt, resolvedAt: '2026-01-01T12:00:00.000Z' },
        {
          logPath,
          alertPath,
          notify: () => {
            throw new Error('notification service unreachable');
          },
        },
      ),
    /Alert failed: notification service unreachable/,
  );

  const stored = resolutionTimeTable.getAll();
  assert.equal(stored.length, 1, 'the exceeded resolution must already be stored before the alert is attempted');
  assert.equal(stored[0].timely, false);

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'alert_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-55');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'alert_failed');
});
