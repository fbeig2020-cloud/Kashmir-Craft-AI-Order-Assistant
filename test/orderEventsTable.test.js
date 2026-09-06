'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const orderEventsTable = require('../src/orderEventsTable');

test('insert requires a row object', () => {
  orderEventsTable.reset();
  assert.throws(() => orderEventsTable.insert(null), /requires a row object/);
});

test('insert requires a string status', () => {
  orderEventsTable.reset();
  assert.throws(
    () => orderEventsTable.insert({ orderId: 'ORD-1', timestamp: new Date().toISOString() }),
    /requires a string status/,
  );
});

test('insert requires a valid timestamp', () => {
  orderEventsTable.reset();
  assert.throws(
    () => orderEventsTable.insert({ orderId: 'ORD-1', status: 'received', timestamp: 'not-a-date' }),
    /requires a valid timestamp/,
  );
});

test('insert accepts a row with no orderId, for events that never carried one', () => {
  orderEventsTable.reset();
  const row = orderEventsTable.insert({ status: 'error', timestamp: new Date().toISOString() });
  assert.equal(row.status, 'error');
  assert.equal(orderEventsTable.getAll().length, 1);
});

test('getAll returns rows in insertion order and a defensive copy', () => {
  orderEventsTable.reset();
  orderEventsTable.insert({ orderId: 'ORD-1', status: 'received', timestamp: new Date().toISOString() });
  orderEventsTable.insert({ orderId: 'ORD-2', status: 'received', timestamp: new Date().toISOString() });

  const rows = orderEventsTable.getAll();
  assert.deepEqual(rows.map((r) => r.orderId), ['ORD-1', 'ORD-2']);

  rows.push({ orderId: 'ORD-3', status: 'received', timestamp: new Date().toISOString() });
  assert.equal(orderEventsTable.getAll().length, 2, 'mutating the returned array must not affect internal state');
});

test('reset clears all rows', () => {
  orderEventsTable.insert({ orderId: 'ORD-1', status: 'received', timestamp: new Date().toISOString() });
  orderEventsTable.reset();
  assert.deepEqual(orderEventsTable.getAll(), []);
});
