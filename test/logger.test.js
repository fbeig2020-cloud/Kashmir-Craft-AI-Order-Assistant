'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { logEvent } = require('../src/logger');

function tempLogPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'audit-')), 'audit.log');
}

test('logEvent writes a timestamped entry to the log file', () => {
  const logPath = tempLogPath();

  const entry = logEvent({ type: 'duplicate_detected', orderId: 'ORD-1' }, logPath);

  assert.equal(entry.type, 'duplicate_detected');
  assert.equal(entry.orderId, 'ORD-1');
  assert.ok(entry.timestamp, 'entry should carry a timestamp');

  const written = fs.readFileSync(logPath, 'utf8').trim();
  const parsed = JSON.parse(written);
  assert.deepEqual(parsed, entry);
});

test('logEvent appends rather than overwrites on repeated calls', () => {
  const logPath = tempLogPath();

  logEvent({ type: 'no_duplicate_found', orderId: 'ORD-1' }, logPath);
  logEvent({ type: 'no_duplicate_found', orderId: 'ORD-2' }, logPath);

  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).orderId, 'ORD-1');
  assert.equal(JSON.parse(lines[1]).orderId, 'ORD-2');
});

test('logEvent throws rather than swallowing an invalid event', () => {
  assert.throws(() => logEvent(null), /requires an event object/);
  assert.throws(() => logEvent({}), /requires an event object/);
});

test('logEvent throws rather than swallowing a write failure', () => {
  // Make the log's parent path a file instead of a directory, so mkdir/append fail.
  const blockerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-blocked-'));
  const blockerFile = path.join(blockerDir, 'not-a-directory');
  fs.writeFileSync(blockerFile, 'occupied');
  const logPath = path.join(blockerFile, 'audit.log');

  assert.throws(() => logEvent({ type: 'duplicate_detected' }, logPath), /Audit log write failed/);
});

test('logEvent raises an alert when the audit log write fails', () => {
  const blockerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-blocked-'));
  const blockerFile = path.join(blockerDir, 'not-a-directory');
  fs.writeFileSync(blockerFile, 'occupied');
  const logPath = path.join(blockerFile, 'audit.log');
  const alertPath = path.join(blockerDir, 'alerts.log');

  assert.throws(
    () => logEvent({ type: 'duplicate_detected', orderId: 'ORD-1' }, logPath, alertPath),
    /Audit log write failed/,
  );

  const alertLine = fs.readFileSync(alertPath, 'utf8').trim();
  const alert = JSON.parse(alertLine);
  assert.equal(alert.type, 'audit_log_write_failed');
  assert.equal(alert.originalEvent.orderId, 'ORD-1');
  assert.ok(alert.timestamp, 'alert should carry a timestamp');
  assert.ok(alert.reason, 'alert should carry the failure reason');
});
