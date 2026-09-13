'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { generateActionSummary } = require('../src/actionSummary');
const riskAssessmentTable = require('../src/riskAssessmentTable');

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

const riskAssessedActions = [
  {
    orderId: 'ORD-70',
    issueType: 'payment_failure',
    recommendedAction: 'retry_payment_with_updated_method',
    rationale: 'Card was declined; asking the customer to retry with an updated payment method resolves most one-off declines.',
    riskLevel: 'low',
    riskRationale: 'Does not move money or change order state automatically.',
    timestamp: new Date().toISOString(),
  },
  {
    orderId: 'ORD-71',
    issueType: 'payment_failure',
    recommendedAction: 'issue_full_refund',
    rationale: 'Order is unrecoverable; a refund resolves the customer complaint.',
    riskLevel: 'high',
    riskRationale: 'Moves money automatically.',
    timestamp: new Date().toISOString(),
  },
];

test('happy path: prepared actions produce a summary that is returned and logged with full action details', () => {
  riskAssessmentTable.reset();
  riskAssessedActions.forEach((action) => riskAssessmentTable.insert(action));
  const logPath = tempLogPath('audit-');

  const summary = generateActionSummary({ logPath });

  assert.equal(summary.actionCount, 2);
  assert.ok(summary.generatedAt, 'summary must carry a generation timestamp');
  assert.equal(summary.actions.length, 2);
  assert.equal(summary.actions[0].orderId, 'ORD-70');
  assert.equal(summary.actions[0].recommendedAction, 'retry_payment_with_updated_method');
  assert.equal(summary.actions[0].riskLevel, 'low');
  assert.equal(summary.actions[0].rationale, riskAssessedActions[0].rationale);
  assert.equal(summary.actions[0].riskRationale, riskAssessedActions[0].riskRationale);
  assert.match(summary.actions[0].summaryLine, /ORD-70/);
  assert.match(summary.actions[0].summaryLine, /retry_payment_with_updated_method/);
  assert.equal(summary.actions[1].orderId, 'ORD-71');
  assert.equal(summary.actions[1].riskLevel, 'high');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'summary_generated');
  assert.equal(entries[0].actionCount, 2);
  assert.equal(entries[0].actions.length, 2);
  assert.equal(entries[0].actions[0].orderId, 'ORD-70');
  assert.equal(entries[0].actions[1].orderId, 'ORD-71');
});

test('failure path: summary generation failure — a structurally malformed prepared action is rejected, logged, alerted, notified, and not returned', () => {
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const sent = [];
  const brokenTable = {
    getAll() {
      return [
        {
          orderId: 'ORD-72',
          issueType: 'payment_failure',
          // recommendedAction missing
          rationale: 'Some rationale.',
          riskLevel: 'low',
          riskRationale: 'Some risk rationale.',
        },
      ];
    },
  };

  assert.throws(
    () =>
      generateActionSummary({
        logPath,
        alertPath,
        riskAssessmentTable: brokenTable,
        notify: (notification) => {
          sent.push(notification);
          return { timestamp: new Date().toISOString(), ...notification };
        },
      }),
    /Summary generation failed: a prepared action is missing a string recommendedAction/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'summary_generation_failed');
  assert.match(auditEntries[0].reason, /recommendedAction/);

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'summary_generation_failed');

  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'summary_generation_failed_notification');
});

test('failure path: incorrect summary — a prepared action with an unrecognized riskLevel is rejected, logged, alerted, notified, and not returned', () => {
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const sent = [];
  const brokenTable = {
    getAll() {
      return [
        {
          orderId: 'ORD-73',
          issueType: 'payment_failure',
          recommendedAction: 'issue_full_refund',
          rationale: 'Some rationale.',
          riskLevel: 'extreme',
          riskRationale: 'Some risk rationale.',
        },
      ];
    },
  };

  assert.throws(
    () =>
      generateActionSummary({
        logPath,
        alertPath,
        riskAssessmentTable: brokenTable,
        notify: (notification) => {
          sent.push(notification);
          return { timestamp: new Date().toISOString(), ...notification };
        },
      }),
    /Summary incorrect: prepared action for order ORD-73 has an unrecognized riskLevel: "extreme"/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'summary_incorrect');
  assert.match(auditEntries[0].reason, /ORD-73/);

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'summary_incorrect');

  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'summary_incorrect_notification');
});

test('failure path: alert failure — a notification failure during a generation failure is logged and alerted separately as alert_failed, and re-thrown', () => {
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenTable = {
    getAll() {
      return [
        {
          orderId: 'ORD-74',
          issueType: 'payment_failure',
          // recommendedAction missing, forces a generation failure first
          rationale: 'Some rationale.',
          riskLevel: 'low',
          riskRationale: 'Some risk rationale.',
        },
      ];
    },
  };

  assert.throws(
    () =>
      generateActionSummary({
        logPath,
        alertPath,
        riskAssessmentTable: brokenTable,
        notify: () => {
          throw new Error('notification service unreachable');
        },
      }),
    /Alert failed: notification service unreachable/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 2, 'both the original failure and the alert failure must be logged');
  assert.equal(auditEntries[0].type, 'summary_generation_failed');
  assert.equal(auditEntries[1].type, 'alert_failed');
  assert.equal(auditEntries[1].reason, 'notification service unreachable');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 2);
  assert.equal(alertEntries[0].type, 'summary_generation_failed');
  assert.equal(alertEntries[1].type, 'alert_failed');
});
