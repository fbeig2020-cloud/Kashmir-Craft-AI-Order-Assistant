'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { requireApproval } = require('../src/requireApproval');
const approvalTable = require('../src/approvalTable');

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

const lowRiskRecord = {
  orderId: 'ORD-10',
  issueType: 'payment_failure',
  recommendedAction: 'retry_payment_with_updated_method',
  rationale: 'Card was declined; asking the customer to retry with an updated payment method resolves most one-off declines.',
  riskLevel: 'low',
  riskRationale: 'Asks the customer to retry with an updated payment method; no charge or order change happens automatically.',
};

const highRiskRecord = {
  orderId: 'ORD-20',
  issueType: 'payment_failure',
  recommendedAction: 'issue_refund',
  rationale: 'Customer requested a refund after repeated failed delivery attempts.',
  riskLevel: 'high',
  riskRationale: 'issue_refund moves money automatically; not in the known low-risk action map.',
};

test('happy path: a non-high-risk action bypasses approval and is auto-approved', () => {
  approvalTable.reset();
  const logPath = tempLogPath('audit-');

  const result = requireApproval(lowRiskRecord, { logPath });

  assert.equal(result.status, 'auto_approved');
  assert.equal(approvalTable.getAll().length, 0, 'a non-high-risk action should never create an approval request');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'approval_not_required');
  assert.equal(entries[0].orderId, 'ORD-10');
  assert.equal(entries[0].riskLevel, 'low');
});

test('happy path: a high-risk action is paused, a notification is sent, and the request is logged with a timestamp', () => {
  approvalTable.reset();
  const logPath = tempLogPath('audit-');
  const sent = [];

  const result = requireApproval(highRiskRecord, {
    logPath,
    notify: (notification) => {
      sent.push(notification);
      return { timestamp: new Date().toISOString(), ...notification };
    },
  });

  assert.equal(result.status, 'paused_pending_approval');
  assert.equal(result.orderId, 'ORD-20');

  const stored = approvalTable.getAll();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].orderId, 'ORD-20');
  assert.equal(stored[0].status, 'paused_pending_approval');
  assert.ok(stored[0].timestamp, 'approval request must carry a timestamp');

  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'approval_required_notification');
  assert.equal(sent[0].orderId, 'ORD-20');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'approval_required');
  assert.equal(entries[0].orderId, 'ORD-20');
  assert.equal(entries[0].status, 'paused_pending_approval');
  assert.ok(entries[0].timestamp, 'approval_required log entry must carry a timestamp');
});

test('failure path: a storage failure is logged and alerted, and the error is not swallowed', () => {
  approvalTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenApprovalTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  assert.throws(
    () => requireApproval(highRiskRecord, { logPath, alertPath, approvalTable: brokenApprovalTable }),
    /Approval workflow failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'approval_workflow_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-20');
  assert.equal(auditEntries[0].reason, 'disk full');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'approval_workflow_failed');
});

test('failure path: a notification failure is logged and alerted, the error is not swallowed, and the action stays paused', () => {
  approvalTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');

  assert.throws(
    () =>
      requireApproval(highRiskRecord, {
        logPath,
        alertPath,
        notify: () => {
          throw new Error('notification service unreachable');
        },
      }),
    /Notification failed: notification service unreachable/,
  );

  const stored = approvalTable.getAll();
  assert.equal(stored.length, 1, 'the approval request must already be stored before notification is attempted');
  assert.equal(stored[0].orderId, 'ORD-20');
  assert.equal(
    stored[0].status,
    'paused_pending_approval',
    'a failed notification must not un-pause the action; it stays paused pending approval',
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'notification_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-20');
  assert.equal(auditEntries[0].reason, 'notification service unreachable');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'notification_failed');
});

test('failure path: incorrect input (missing riskLevel) is rejected, logged, and alerted, not stored', () => {
  approvalTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const incomplete = {
    orderId: 'ORD-30',
    issueType: 'payment_failure',
    recommendedAction: 'issue_refund',
    rationale: 'Some rationale.',
  };

  assert.throws(
    () => requireApproval(incomplete, { logPath, alertPath }),
    /Approval workflow failed: record is missing a string riskLevel/,
  );

  assert.equal(approvalTable.getAll().length, 0, 'nothing should be stored for input that failed validation');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'approval_workflow_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-30');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'approval_workflow_failed');
});
