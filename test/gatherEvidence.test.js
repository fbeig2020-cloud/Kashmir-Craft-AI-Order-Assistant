'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { gatherEvidence } = require('../src/gatherEvidence');
const evidenceTable = require('../src/evidenceTable');

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

const validPaymentFailure = {
  orderId: 'ORD-1',
  customerId: 'CUST-1',
  failureReason: 'card_declined',
  amount: 42.5,
  paymentMethod: 'visa',
};

test('happy path: evidence is gathered and stored for review, and logged with issue details', () => {
  evidenceTable.reset();
  const logPath = tempLogPath('audit-');

  const stored = gatherEvidence(validPaymentFailure, { logPath });

  assert.equal(stored.orderId, 'ORD-1');
  assert.equal(stored.issueType, 'payment_failure');
  assert.equal(stored.evidence.failureReason, 'card_declined');

  const tableRows = evidenceTable.getAll();
  assert.equal(tableRows.length, 1);
  assert.equal(tableRows[0].orderId, 'ORD-1');

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'evidence_gathered');
  assert.equal(entries[0].orderId, 'ORD-1');
  assert.equal(entries[0].evidence.failureReason, 'card_declined');
  assert.equal(entries[0].evidence.amount, 42.5);
});

test('failure path: incorrect evidence (missing failureReason) is rejected, logged, and alerted, not stored', () => {
  evidenceTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const incomplete = { orderId: 'ORD-2', customerId: 'CUST-2' };

  assert.throws(
    () => gatherEvidence(incomplete, { logPath, alertPath }),
    /Evidence collection failed: payment failure is missing a string failureReason/,
  );

  assert.equal(evidenceTable.getAll().length, 0, 'nothing should be stored for evidence that failed collection');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'evidence_collection_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-2');
  assert.match(auditEntries[0].reason, /missing a string failureReason/);

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'evidence_collection_failed');
  assert.equal(alertEntries[0].orderId, 'ORD-2');
});

test('failure path: a storage failure is logged and alerted, and the error is not swallowed', () => {
  evidenceTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const brokenTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  assert.throws(
    () => gatherEvidence(validPaymentFailure, { logPath, alertPath, evidenceTable: brokenTable }),
    /Evidence storage failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'evidence_storage_failed');
  assert.equal(auditEntries[0].orderId, 'ORD-1');
  assert.equal(auditEntries[0].reason, 'disk full');
  assert.equal(auditEntries[0].evidence.failureReason, 'card_declined');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'evidence_storage_failed');
  assert.equal(alertEntries[0].orderId, 'ORD-1');

  assert.equal(evidenceTable.getAll().length, 0, 'the real table must be untouched since the injected table was used');
});
