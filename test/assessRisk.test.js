'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { assessRisk } = require('../src/assessRisk');
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

const knownAction = {
  orderId: 'ORD-1',
  issueType: 'payment_failure',
  recommendedAction: 'retry_payment_with_updated_method',
  rationale: 'Card was declined; asking the customer to retry with an updated payment method resolves most one-off declines.',
};

test('happy path: risk is assessed, stored alongside the action, and logged with action details', () => {
  riskAssessmentTable.reset();
  const logPath = tempLogPath('audit-');

  const stored = assessRisk(knownAction, { logPath });

  assert.equal(stored.orderId, 'ORD-1');
  assert.equal(stored.recommendedAction, 'retry_payment_with_updated_method');
  assert.equal(stored.riskLevel, 'low');
  assert.ok(stored.riskRationale.length > 0);

  const listed = riskAssessmentTable.getAll();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].orderId, 'ORD-1');
  assert.equal(listed[0].recommendedAction, 'retry_payment_with_updated_method');
  assert.equal(listed[0].riskLevel, 'low');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'risk_assessed');
  assert.equal(entries[0].orderId, 'ORD-1');
  assert.equal(entries[0].recommendedAction, 'retry_payment_with_updated_method');
  assert.equal(entries[0].riskLevel, 'low');
  assert.ok(entries[0].riskRationale.length > 0);
});

test('failure path: incorrect input (missing recommendedAction) is rejected, logged, and alerted, not stored', () => {
  riskAssessmentTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const incomplete = { orderId: 'ORD-2', issueType: 'payment_failure' };

  assert.throws(
    () => assessRisk(incomplete, { logPath, alertPath }),
    /Risk assessment failed: actionRecord is missing a string recommendedAction/,
  );

  assert.equal(riskAssessmentTable.getAll().length, 0, 'nothing should be stored for input that failed validation');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'risk_assessment_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-2');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'risk_assessment_failed');
});

test('unmapped action: an unrecognized recommendedAction defaults to high risk, not silently treated as safe, and is still logged', () => {
  riskAssessmentTable.reset();
  const logPath = tempLogPath('audit-');
  const unknownAction = {
    orderId: 'ORD-3',
    issueType: 'payment_failure',
    recommendedAction: 'issue_full_refund',
    rationale: 'Escalated case; a refund was recommended by a human reviewer.',
  };

  const stored = assessRisk(unknownAction, { logPath });

  assert.equal(stored.riskLevel, 'high');
  assert.ok(stored.riskRationale.length > 0);

  const listed = riskAssessmentTable.getAll();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].riskLevel, 'high');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'risk_assessed');
  assert.equal(entries[0].orderId, 'ORD-3');
  assert.equal(entries[0].riskLevel, 'high');
});

test('failure path: a storage failure is logged and alerted, and the error is not swallowed', () => {
  riskAssessmentTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  assert.throws(
    () => assessRisk(knownAction, { logPath, alertPath, riskAssessmentTable: brokenTable }),
    /Risk assessment storage failed: disk full/,
  );

  assert.equal(riskAssessmentTable.getAll().length, 0, 'nothing should be stored when the underlying table fails');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'risk_assessment_storage_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-1');
  assert.equal(auditEntries[0].reason, 'disk full');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'risk_assessment_storage_failed');
});
