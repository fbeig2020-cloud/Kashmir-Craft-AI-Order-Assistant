'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const actionList = require('../src/actionList');

test('insert requires a row object', () => {
  actionList.reset();
  assert.throws(() => actionList.insert(null), /requires a row object/);
});

test('insert requires a string orderId', () => {
  actionList.reset();
  assert.throws(
    () =>
      actionList.insert({
        issueType: 'payment_failure',
        recommendedAction: 'retry_payment',
        rationale: 'card was declined, retrying may succeed',
        timestamp: new Date().toISOString(),
      }),
    /requires a string orderId/,
  );
});

test('insert requires a string issueType', () => {
  actionList.reset();
  assert.throws(
    () =>
      actionList.insert({
        orderId: 'ORD-1',
        recommendedAction: 'retry_payment',
        rationale: 'card was declined, retrying may succeed',
        timestamp: new Date().toISOString(),
      }),
    /requires a string issueType/,
  );
});

test('insert requires a string recommendedAction', () => {
  actionList.reset();
  assert.throws(
    () =>
      actionList.insert({
        orderId: 'ORD-1',
        issueType: 'payment_failure',
        rationale: 'card was declined, retrying may succeed',
        timestamp: new Date().toISOString(),
      }),
    /requires a string recommendedAction/,
  );
});

test('insert requires a string rationale', () => {
  actionList.reset();
  assert.throws(
    () =>
      actionList.insert({
        orderId: 'ORD-1',
        issueType: 'payment_failure',
        recommendedAction: 'retry_payment',
        timestamp: new Date().toISOString(),
      }),
    /requires a string rationale/,
  );
});

test('insert requires a valid timestamp', () => {
  actionList.reset();
  assert.throws(
    () =>
      actionList.insert({
        orderId: 'ORD-1',
        issueType: 'payment_failure',
        recommendedAction: 'retry_payment',
        rationale: 'card was declined, retrying may succeed',
        timestamp: 'not-a-date',
      }),
    /requires a valid timestamp/,
  );
});

test('insert accepts a well-formed action row', () => {
  actionList.reset();
  const row = actionList.insert({
    orderId: 'ORD-1',
    issueType: 'payment_failure',
    recommendedAction: 'retry_payment',
    rationale: 'card was declined, retrying may succeed',
    timestamp: new Date().toISOString(),
  });
  assert.equal(row.orderId, 'ORD-1');
  assert.equal(actionList.getAll().length, 1);
});

test('getAll returns rows in insertion order and a defensive copy', () => {
  actionList.reset();
  actionList.insert({
    orderId: 'ORD-1',
    issueType: 'payment_failure',
    recommendedAction: 'retry_payment',
    rationale: 'card was declined, retrying may succeed',
    timestamp: new Date().toISOString(),
  });
  actionList.insert({
    orderId: 'ORD-2',
    issueType: 'payment_failure',
    recommendedAction: 'notify_customer',
    rationale: 'insufficient funds, customer must update payment method',
    timestamp: new Date().toISOString(),
  });

  const rows = actionList.getAll();
  assert.deepEqual(rows.map((r) => r.orderId), ['ORD-1', 'ORD-2']);

  rows.push({
    orderId: 'ORD-3',
    issueType: 'payment_failure',
    recommendedAction: 'retry_payment',
    rationale: 'card was declined, retrying may succeed',
    timestamp: new Date().toISOString(),
  });
  assert.equal(actionList.getAll().length, 2, 'mutating the returned array must not affect internal state');
});

test('reset clears all rows', () => {
  actionList.insert({
    orderId: 'ORD-1',
    issueType: 'payment_failure',
    recommendedAction: 'retry_payment',
    rationale: 'card was declined, retrying may succeed',
    timestamp: new Date().toISOString(),
  });
  actionList.reset();
  assert.deepEqual(actionList.getAll(), []);
});
