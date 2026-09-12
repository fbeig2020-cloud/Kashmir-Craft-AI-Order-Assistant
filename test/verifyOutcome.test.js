'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { verifyOutcome } = require('../src/verifyOutcome');
const outcomeTable = require('../src/outcomeTable');

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

const approvedRecord = {
  orderId: 'ORD-40',
  issueType: 'payment_failure',
  recommendedAction: 'retry_payment_with_updated_method',
  rationale: 'Card was declined; asking the customer to retry with an updated payment method resolves most one-off declines.',
  riskLevel: 'low',
  riskRationale: 'Asks the customer to retry with an updated payment method; no charge or order change happens automatically.',
};

test('happy path: a successful outcome is verified, stored alongside the action, and logged', () => {
  outcomeTable.reset();
  const logPath = tempLogPath('audit-');

  const stored = verifyOutcome(approvedRecord, { logPath, checkOutcome: () => 'success' });

  assert.equal(stored.orderId, 'ORD-40');
  assert.equal(stored.recommendedAction, 'retry_payment_with_updated_method');
  assert.equal(stored.outcomeStatus, 'success');
  assert.ok(stored.verificationDetails.length > 0);

  const listed = outcomeTable.getAll();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].orderId, 'ORD-40');
  assert.equal(listed[0].outcomeStatus, 'success');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'outcome_verified');
  assert.equal(entries[0].orderId, 'ORD-40');
  assert.equal(entries[0].outcomeStatus, 'success');
});

test('happy path: a failed outcome is logged as failed and an alert notification is sent', () => {
  outcomeTable.reset();
  const logPath = tempLogPath('audit-');
  const sent = [];

  const stored = verifyOutcome(approvedRecord, {
    logPath,
    checkOutcome: () => 'failed',
    notify: (notification) => {
      sent.push(notification);
      return { timestamp: new Date().toISOString(), ...notification };
    },
  });

  assert.equal(stored.outcomeStatus, 'failed');

  const listed = outcomeTable.getAll();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].outcomeStatus, 'failed');

  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'outcome_failed_alert');
  assert.equal(sent[0].orderId, 'ORD-40');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'outcome_verified');
  assert.equal(entries[0].outcomeStatus, 'failed');
});

test('failure path: incorrect input (missing riskLevel) is rejected, logged, and alerted, not stored', () => {
  outcomeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const incomplete = {
    orderId: 'ORD-41',
    issueType: 'payment_failure',
    recommendedAction: 'retry_payment_with_updated_method',
    rationale: 'Some rationale.',
  };

  assert.throws(
    () => verifyOutcome(incomplete, { logPath, alertPath }),
    /Outcome verification failed: record is missing a string riskLevel/,
  );

  assert.equal(outcomeTable.getAll().length, 0, 'nothing should be stored for input that failed validation');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'outcome_verification_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-41');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'outcome_verification_failed');
});

test('failure path: verification process failure (checkOutcome throws) is logged, alerted, and not swallowed', () => {
  outcomeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () =>
      verifyOutcome(approvedRecord, {
        logPath,
        alertPath,
        checkOutcome: () => {
          throw new Error('verification service unreachable');
        },
      }),
    /Outcome verification failed: verification service unreachable/,
  );

  assert.equal(outcomeTable.getAll().length, 0, 'nothing should be stored when the verification process itself fails');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'outcome_verification_failed');
  assert.equal(auditEntries[0].reason, 'verification service unreachable');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'outcome_verification_failed');
});

test('failure path: an unrecognized checkOutcome result is treated as a verification failure, not silently success', () => {
  outcomeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () => verifyOutcome(approvedRecord, { logPath, alertPath, checkOutcome: () => 'maybe' }),
    /Outcome verification failed: checkOutcome returned an invalid outcome/,
  );

  assert.equal(outcomeTable.getAll().length, 0);

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'outcome_verification_failed');
});

test('failure path: incorrect outcome logging (storage failure) is logged, alerted, and not swallowed', () => {
  outcomeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenOutcomeTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  assert.throws(
    () => verifyOutcome(approvedRecord, { logPath, alertPath, outcomeTable: brokenOutcomeTable }),
    /Outcome logging failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'outcome_logging_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-40');
  assert.equal(auditEntries[0].reason, 'disk full');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'outcome_logging_failed');
});

test('failure path: alert failure on a failed outcome is logged and alerted, and the outcome stays stored', () => {
  outcomeTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () =>
      verifyOutcome(approvedRecord, {
        logPath,
        alertPath,
        checkOutcome: () => 'failed',
        notify: () => {
          throw new Error('notification service unreachable');
        },
      }),
    /Alert failed: notification service unreachable/,
  );

  const stored = outcomeTable.getAll();
  assert.equal(stored.length, 1, 'the failed outcome must already be stored before the alert is attempted');
  assert.equal(stored[0].outcomeStatus, 'failed');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'alert_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-40');
  assert.equal(auditEntries[0].reason, 'notification service unreachable');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'alert_failed');
});
