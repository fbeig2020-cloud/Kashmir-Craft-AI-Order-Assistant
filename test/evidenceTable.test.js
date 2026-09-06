'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const evidenceTable = require('../src/evidenceTable');

test('insert requires a row object', () => {
  evidenceTable.reset();
  assert.throws(() => evidenceTable.insert(null), /requires a row object/);
});

test('insert requires a string orderId', () => {
  evidenceTable.reset();
  assert.throws(
    () =>
      evidenceTable.insert({
        issueType: 'payment_failure',
        evidence: { failureReason: 'card_declined' },
        timestamp: new Date().toISOString(),
      }),
    /requires a string orderId/,
  );
});

test('insert requires a string issueType', () => {
  evidenceTable.reset();
  assert.throws(
    () =>
      evidenceTable.insert({
        orderId: 'ORD-1',
        evidence: { failureReason: 'card_declined' },
        timestamp: new Date().toISOString(),
      }),
    /requires a string issueType/,
  );
});

test('insert rejects incorrect evidence: missing evidence object', () => {
  evidenceTable.reset();
  assert.throws(
    () =>
      evidenceTable.insert({
        orderId: 'ORD-1',
        issueType: 'payment_failure',
        timestamp: new Date().toISOString(),
      }),
    /requires an evidence object/,
  );
});

test('insert rejects incorrect evidence: empty evidence object', () => {
  evidenceTable.reset();
  assert.throws(
    () =>
      evidenceTable.insert({
        orderId: 'ORD-1',
        issueType: 'payment_failure',
        evidence: {},
        timestamp: new Date().toISOString(),
      }),
    /requires a non-empty evidence object/,
  );
});

test('insert requires a valid timestamp', () => {
  evidenceTable.reset();
  assert.throws(
    () =>
      evidenceTable.insert({
        orderId: 'ORD-1',
        issueType: 'payment_failure',
        evidence: { failureReason: 'card_declined' },
        timestamp: 'not-a-date',
      }),
    /requires a valid timestamp/,
  );
});

test('insert accepts a well-formed evidence row', () => {
  evidenceTable.reset();
  const row = evidenceTable.insert({
    orderId: 'ORD-1',
    issueType: 'payment_failure',
    evidence: { failureReason: 'card_declined' },
    timestamp: new Date().toISOString(),
  });
  assert.equal(row.orderId, 'ORD-1');
  assert.equal(evidenceTable.getAll().length, 1);
});

test('getAll returns rows in insertion order and a defensive copy', () => {
  evidenceTable.reset();
  evidenceTable.insert({
    orderId: 'ORD-1',
    issueType: 'payment_failure',
    evidence: { failureReason: 'card_declined' },
    timestamp: new Date().toISOString(),
  });
  evidenceTable.insert({
    orderId: 'ORD-2',
    issueType: 'payment_failure',
    evidence: { failureReason: 'insufficient_funds' },
    timestamp: new Date().toISOString(),
  });

  const rows = evidenceTable.getAll();
  assert.deepEqual(rows.map((r) => r.orderId), ['ORD-1', 'ORD-2']);

  rows.push({
    orderId: 'ORD-3',
    issueType: 'payment_failure',
    evidence: { failureReason: 'card_declined' },
    timestamp: new Date().toISOString(),
  });
  assert.equal(evidenceTable.getAll().length, 2, 'mutating the returned array must not affect internal state');
});

test('reset clears all rows', () => {
  evidenceTable.insert({
    orderId: 'ORD-1',
    issueType: 'payment_failure',
    evidence: { failureReason: 'card_declined' },
    timestamp: new Date().toISOString(),
  });
  evidenceTable.reset();
  assert.deepEqual(evidenceTable.getAll(), []);
});
