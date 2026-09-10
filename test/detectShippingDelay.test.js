'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { detectShippingDelays } = require('../src/detectShippingDelay');
const shippingDelaysTable = require('../src/shippingDelaysTable');

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

test('happy path: a shipment exceeding its expected duration is detected, stored, and logged with details and a timestamp', async () => {
  shippingDelaysTable.reset();
  const logPath = tempLogPath('audit-');
  const dataSource = () => [
    { orderId: 'ORD-2002', carrier: 'DTDC', shippedAt: '2026-08-28T10:00:00Z', expectedDurationDays: 4, actualDurationDays: 9, destination: 'Delhi' },
    { orderId: 'ORD-2001', carrier: 'BlueDart', shippedAt: '2026-09-01T10:00:00Z', expectedDurationDays: 5, actualDurationDays: 4, destination: 'Mumbai' },
  ];

  const results = await detectShippingDelays({ logPath, dataSource });

  assert.equal(results.length, 2);
  assert.equal(results[0].isDelayed, true);
  assert.equal(results[1].isDelayed, false);

  const tableRows = shippingDelaysTable.getAll();
  assert.equal(tableRows.length, 1);
  assert.equal(tableRows[0].orderId, 'ORD-2002');
  assert.equal(tableRows[0].issueType, 'shipping_delay');
  assert.equal(tableRows[0].details.expectedDurationDays, 4);
  assert.equal(tableRows[0].details.actualDurationDays, 9);
  assert.ok(!Number.isNaN(new Date(tableRows[0].timestamp).getTime()));

  const entries = readLogEntries(logPath);
  const detected = entries.find((e) => e.type === 'shipping_delay_detected');
  assert.ok(detected, 'expected a shipping_delay_detected audit entry');
  assert.equal(detected.orderId, 'ORD-2002');
  assert.equal(detected.details.destination, 'Delhi');
  assert.ok(entries.some((e) => e.type === 'no_shipping_delay_found' && e.orderId === 'ORD-2001'));
});

test('failure path: a shipment with incomplete data is logged, alerted, and skipped, but the rest of the batch is still checked', async () => {
  shippingDelaysTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const dataSource = () => [
    { orderId: 'ORD-2004', carrier: 'BlueDart', expectedDurationDays: 5 },
    { orderId: 'ORD-2002', expectedDurationDays: 4, actualDurationDays: 9 },
  ];

  const results = await detectShippingDelays({ logPath, alertPath, dataSource });

  assert.equal(results.length, 2);
  assert.equal(results[0].isDelayed, false);
  assert.match(results[0].error, /numeric actualDurationDays/);
  assert.equal(results[1].isDelayed, true, 'the second, well-formed record must still be checked');

  const auditEntries = readLogEntries(logPath);
  const incomplete = auditEntries.find((e) => e.type === 'shipping_data_incomplete');
  assert.ok(incomplete, 'expected a shipping_data_incomplete audit entry');
  assert.equal(incomplete.orderId, 'ORD-2004');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'shipping_data_incomplete');
  assert.equal(alertEntries[0].orderId, 'ORD-2004');

  assert.equal(shippingDelaysTable.getAll().length, 1, 'only the well-formed delay should be stored');
});

test('failure path: an empty response from the data source is logged, alerted, and thrown, not swallowed', async () => {
  shippingDelaysTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const dataSource = () => [];

  await assert.rejects(
    () => detectShippingDelays({ logPath, alertPath, dataSource }),
    /Shipping data incomplete: data source returned no shipment records/,
  );

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].type, 'shipping_data_incomplete');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'shipping_data_incomplete');
});

test('failure path: the data source being unavailable after every retry is logged, alerted, and thrown', async () => {
  shippingDelaysTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  let calls = 0;
  const dataSource = () => {
    calls += 1;
    throw new Error('connection refused');
  };

  await assert.rejects(
    () => detectShippingDelays({ logPath, alertPath, dataSource, maxRetries: 2 }),
    /Shipping data source unavailable after 2 attempts: connection refused/,
  );
  assert.equal(calls, 2, 'expected exactly maxRetries attempts, not more');

  const auditEntries = readLogEntries(logPath);
  assert.equal(auditEntries.filter((e) => e.type === 'shipping_data_source_attempt_failed').length, 2);
  assert.equal(auditEntries.filter((e) => e.type === 'shipping_data_source_unavailable').length, 1);

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'shipping_data_source_unavailable');
});

test('failure path: a data source call exceeding its timeout is retried and eventually reported as unavailable', async () => {
  shippingDelaysTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const dataSource = () => new Promise((resolve) => setTimeout(resolve, 200));

  await assert.rejects(
    () => detectShippingDelays({ logPath, alertPath, dataSource, maxRetries: 2, timeoutMs: 20 }),
    /Shipping data source unavailable after 2 attempts: .*timed out after 20ms/,
  );
});

test('failure path: a storage failure is logged and alerted, and the error is not swallowed', async () => {
  shippingDelaysTable.reset();
  const logPath = tempLogPath('audit-');
  const alertPath = tempLogPath('alerts-');
  const dataSource = () => [{ orderId: 'ORD-2002', expectedDurationDays: 4, actualDurationDays: 9 }];
  const brokenTable = {
    insert() {
      throw new Error('disk full');
    },
  };

  await assert.rejects(
    () => detectShippingDelays({ logPath, alertPath, dataSource, shippingDelaysTable: brokenTable }),
    /Shipping delay storage failed: disk full/,
  );

  const auditEntries = readLogEntries(logPath);
  const notLogged = auditEntries.find((e) => e.type === 'shipping_delay_not_logged');
  assert.ok(notLogged, 'expected a shipping_delay_not_logged audit entry');
  assert.equal(notLogged.orderId, 'ORD-2002');
  assert.equal(notLogged.reason, 'disk full');

  const alertEntries = readLogEntries(alertPath);
  assert.equal(alertEntries.length, 1);
  assert.equal(alertEntries[0].type, 'shipping_delay_not_logged');

  assert.equal(shippingDelaysTable.getAll().length, 0, 'the real table must be untouched since the injected table was used');
});
