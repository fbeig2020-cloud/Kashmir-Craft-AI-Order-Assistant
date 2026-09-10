'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { detectInventoryIssues } = require('../src/detectInventoryIssue');
const inventoryIssuesTable = require('../src/inventoryIssuesTable');

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

test('happy path: a below-threshold record is identified, stored, and logged with details and a timestamp', async () => {
  inventoryIssuesTable.reset();
  const logPath = tempLogPath('audit-');
  const dataSource = () => [
    { productId: 'SKU-1002', name: 'Kani Shawl - Royal Blue', quantity: 3, threshold: 5, warehouse: 'Srinagar-1' },
    { productId: 'SKU-1006', name: 'Embroidered Wool Stole', quantity: 60, threshold: 15, warehouse: 'Srinagar-1' },
  ];

  const results = await detectInventoryIssues({ logPath, dataSource });

  assert.equal(results.length, 2);
  assert.equal(results[0].isIssue, true);
  assert.equal(results[1].isIssue, false);

  const tableRows = inventoryIssuesTable.getAll();
  assert.equal(tableRows.length, 1);
  assert.equal(tableRows[0].productId, 'SKU-1002');
  assert.equal(tableRows[0].issueType, 'low_inventory');
  assert.equal(tableRows[0].details.quantity, 3);
  assert.equal(tableRows[0].details.threshold, 5);
  assert.ok(!Number.isNaN(new Date(tableRows[0].timestamp).getTime()));

  const entries = readLogEntries(logPath);
  const detected = entries.find((e) => e.type === 'inventory_issue_detected');
  assert.ok(detected, 'expected an inventory_issue_detected audit entry');
  assert.equal(detected.productId, 'SKU-1002');
  assert.equal(detected.details.warehouse, 'Srinagar-1');
  assert.ok(entries.some((e) => e.type === 'no_inventory_issue_found' && e.productId === 'SKU-1006'));
});

test('failure path: a malformed record is logged, alerted, and skipped, but the rest of the catalog is still checked', async () => {
  inventoryIssuesTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const dataSource = () => [
    { productId: 'SKU-1004', quantity: 'not-a-number', threshold: 6 },
    { productId: 'SKU-1002', quantity: 3, threshold: 5 },
  ];

  const results = await detectInventoryIssues({ logPath, alertPath, dataSource });

  assert.equal(results.length, 2);
  assert.equal(results[0].isIssue, false);
  assert.match(results[0].error, /numeric quantity/);
  assert.equal(results[1].isIssue, true, 'the second, well-formed record must still be checked');

  const auditEntries = readLogEntries(logPath);
  const missing = auditEntries.find((e) => e.type === 'inventory_data_missing');
  assert.ok(missing, 'expected an inventory_data_missing audit entry');
  assert.equal(missing.productId, 'SKU-1004');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'inventory_data_missing');
  assert.equal(alertEntries[0].productId, 'SKU-1004');

  assert.equal(inventoryIssuesTable.getAll().length, 1, 'only the well-formed issue should be stored');
});

test('failure path: an empty response from the data source is logged, alerted, and thrown, not swallowed', async () => {
  inventoryIssuesTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const dataSource = () => [];

  await assert.rejects(
    () => detectInventoryIssues({ logPath, alertPath, dataSource }),
    /Inventory data missing: data source returned no inventory records/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'inventory_data_missing');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'inventory_data_missing');
});

test('failure path: the data source being unavailable after every retry is logged, alerted, and thrown', async () => {
  inventoryIssuesTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  let calls = 0;
  const dataSource = () => {
    calls += 1;
    throw new Error('connection refused');
  };

  await assert.rejects(
    () => detectInventoryIssues({ logPath, alertPath, dataSource, maxRetries: 2 }),
    /Inventory data source unavailable after 2 attempts: connection refused/,
  );
  assert.equal(calls, 2, 'expected exactly maxRetries attempts, not more');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.filter((e) => e.type === 'inventory_data_source_attempt_failed').length, 2);
  assert.equal(auditEntries.filter((e) => e.type === 'inventory_data_source_unavailable').length, 1);

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'inventory_data_source_unavailable');
});

test('failure path: a data source call exceeding its timeout is retried and eventually reported as unavailable', async () => {
  inventoryIssuesTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const dataSource = () => new Promise((resolve) => setTimeout(resolve, 200));

  await assert.rejects(
    () => detectInventoryIssues({ logPath, alertPath, dataSource, maxRetries: 2, timeoutMs: 20 }),
    /Inventory data source unavailable after 2 attempts: .*timed out after 20ms/,
  );
});

test('failure path: a storage failure is logged and alerted, and the error is not swallowed', async () => {
  inventoryIssuesTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const dataSource = () => [{ productId: 'SKU-1002', quantity: 3, threshold: 5 }];
  const brokenTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  await assert.rejects(
    () => detectInventoryIssues({ logPath, alertPath, dataSource, inventoryIssuesTable: brokenTable }),
    /Inventory issue storage failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  const notLogged = auditEntries.find((e) => e.type === 'inventory_issue_not_logged');
  assert.ok(notLogged, 'expected an inventory_issue_not_logged audit entry');
  assert.equal(notLogged.productId, 'SKU-1002');
  assert.equal(notLogged.reason, 'disk full');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'inventory_issue_not_logged');

  assert.equal(inventoryIssuesTable.getAll().length, 0, 'the real table must be untouched since the injected table was used');
});
