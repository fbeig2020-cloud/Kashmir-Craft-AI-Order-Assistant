'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { recommendAction } = require('../src/recommendAction');
const actionList = require('../src/actionList');

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

const knownEvidence = {
  orderId: 'ORD-1',
  customerId: 'CUST-1',
  failureReason: 'card_declined',
  amount: 42.5,
  paymentMethod: 'visa',
};

test('happy path: a known failure reason is recommended, appears in the action list, and is logged with rationale', () => {
  actionList.reset();
  const logPath = tempLogPath('audit-');

  const stored = recommendAction(knownEvidence, { logPath });

  assert.equal(stored.orderId, 'ORD-1');
  assert.equal(stored.recommendedAction, 'retry_payment_with_updated_method');
  assert.ok(stored.rationale.length > 0);

  const listed = actionList.getAll();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].orderId, 'ORD-1');
  assert.equal(listed[0].recommendedAction, 'retry_payment_with_updated_method');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'action_recommended');
  assert.equal(entries[0].orderId, 'ORD-1');
  assert.equal(entries[0].recommendedAction, 'retry_payment_with_updated_method');
  assert.ok(entries[0].rationale.length > 0);
});

test('failure path: incorrect input (missing failureReason) is rejected, logged, and alerted, not stored', () => {
  actionList.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const incomplete = { orderId: 'ORD-2', customerId: 'CUST-2' };

  assert.throws(
    () => recommendAction(incomplete, { logPath, alertPath }),
    /Recommendation failed: evidence is missing a string failureReason/,
  );

  assert.equal(actionList.getAll().length, 0, 'nothing should be stored for input that failed validation');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'recommendation_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-2');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'recommendation_failed');
});

test('failure path: a storage failure is logged and alerted, and the error is not swallowed', () => {
  actionList.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenActionList = {
    insert() {
      throw new Error('disk full');
    },
  };

  assert.throws(
    () => recommendAction(knownEvidence, { logPath, alertPath, actionList: brokenActionList }),
    /Recommendation storage failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'recommendation_storage_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-1');
  assert.equal(auditEntries[0].reason, 'disk full');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'recommendation_storage_failed');
});

test('no recommendation possible: an unmapped failure reason sends a notification, logs both outcomes, and returns null', () => {
  actionList.reset();
  const logPath = tempLogPath('audit-');
  const notificationsPath = tempLogPath('notifications-');
  const sent = [];
  const evidence = { orderId: 'ORD-3', customerId: 'CUST-3', failureReason: 'bank_rejected_unknown_code' };

  const result = recommendAction(evidence, {
    logPath,
    notificationsPath,
    notify: (notification, notifPath) => {
      sent.push(notification);
      return { timestamp: new Date().toISOString(), ...notification };
    },
  });

  assert.equal(result, null);
  assert.equal(actionList.getAll().length, 0, 'no action should be stored when no recommendation is possible');

  assert.equal(sent.length, 1);
  assert.equal(sent[0].orderId, 'ORD-3');
  assert.equal(sent[0].type, 'no_recommendation_notification');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].type, 'recommendation_not_possible');
  assert.equal(entries[0].orderId, 'ORD-3');
  assert.equal(entries[1].type, 'notification_sent');
  assert.equal(entries[1].orderId, 'ORD-3');
});

test('failure path: a notification failure is logged and alerted, and the error is not swallowed', () => {
  actionList.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const evidence = { orderId: 'ORD-4', customerId: 'CUST-4', failureReason: 'bank_rejected_unknown_code' };

  assert.throws(
    () =>
      recommendAction(evidence, {
        logPath,
        alertPath,
        notify: () => {
          throw new Error('notification service unreachable');
        },
      }),
    /Notification failed: notification service unreachable/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 2);
  assert.equal(auditEntries[0].type, 'recommendation_not_possible');
  assert.equal(auditEntries[1].type, 'notification_failed');
  assert.equal(auditEntries[1].orderId, 'ORD-4');
  assert.equal(auditEntries[1].reason, 'notification service unreachable');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'notification_failed');
});
