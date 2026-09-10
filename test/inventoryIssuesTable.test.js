'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const inventoryIssuesTable = require('../src/inventoryIssuesTable');

test('insert requires a row object', () => {
  inventoryIssuesTable.reset();
  assert.throws(() => inventoryIssuesTable.insert(null), /requires a row object/);
});

test('insert requires a string productId', () => {
  inventoryIssuesTable.reset();
  assert.throws(
    () =>
      inventoryIssuesTable.insert({
        issueType: 'low_inventory',
        details: { quantity: 2, threshold: 5 },
        timestamp: new Date().toISOString(),
      }),
    /requires a string productId/,
  );
});

test('insert requires a string issueType', () => {
  inventoryIssuesTable.reset();
  assert.throws(
    () =>
      inventoryIssuesTable.insert({
        productId: 'SKU-1',
        details: { quantity: 2, threshold: 5 },
        timestamp: new Date().toISOString(),
      }),
    /requires a string issueType/,
  );
});

test('insert rejects incorrect details: missing details object', () => {
  inventoryIssuesTable.reset();
  assert.throws(
    () =>
      inventoryIssuesTable.insert({
        productId: 'SKU-1',
        issueType: 'low_inventory',
        timestamp: new Date().toISOString(),
      }),
    /requires a details object/,
  );
});

test('insert rejects incorrect details: empty details object', () => {
  inventoryIssuesTable.reset();
  assert.throws(
    () =>
      inventoryIssuesTable.insert({
        productId: 'SKU-1',
        issueType: 'low_inventory',
        details: {},
        timestamp: new Date().toISOString(),
      }),
    /requires a non-empty details object/,
  );
});

test('insert requires a valid timestamp', () => {
  inventoryIssuesTable.reset();
  assert.throws(
    () =>
      inventoryIssuesTable.insert({
        productId: 'SKU-1',
        issueType: 'low_inventory',
        details: { quantity: 2, threshold: 5 },
        timestamp: 'not-a-date',
      }),
    /requires a valid timestamp/,
  );
});

test('insert accepts a well-formed inventory issue row', () => {
  inventoryIssuesTable.reset();
  const row = inventoryIssuesTable.insert({
    productId: 'SKU-1',
    issueType: 'low_inventory',
    details: { quantity: 2, threshold: 5 },
    timestamp: new Date().toISOString(),
  });
  assert.equal(row.productId, 'SKU-1');
  assert.equal(inventoryIssuesTable.getAll().length, 1);
});

test('getAll returns rows in insertion order and a defensive copy', () => {
  inventoryIssuesTable.reset();
  inventoryIssuesTable.insert({
    productId: 'SKU-1',
    issueType: 'low_inventory',
    details: { quantity: 2, threshold: 5 },
    timestamp: new Date().toISOString(),
  });
  inventoryIssuesTable.insert({
    productId: 'SKU-2',
    issueType: 'low_inventory',
    details: { quantity: 0, threshold: 6 },
    timestamp: new Date().toISOString(),
  });

  const rows = inventoryIssuesTable.getAll();
  assert.deepEqual(rows.map((r) => r.productId), ['SKU-1', 'SKU-2']);

  rows.push({
    productId: 'SKU-3',
    issueType: 'low_inventory',
    details: { quantity: 1, threshold: 4 },
    timestamp: new Date().toISOString(),
  });
  assert.equal(inventoryIssuesTable.getAll().length, 2, 'mutating the returned array must not affect internal state');
});

test('reset clears all rows', () => {
  inventoryIssuesTable.insert({
    productId: 'SKU-1',
    issueType: 'low_inventory',
    details: { quantity: 2, threshold: 5 },
    timestamp: new Date().toISOString(),
  });
  inventoryIssuesTable.reset();
  assert.deepEqual(inventoryIssuesTable.getAll(), []);
});
