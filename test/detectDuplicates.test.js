'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { detectDuplicate } = require('../src/detectDuplicates');

function tempLogPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'audit-')), 'audit.log');
}

function readLogEntries(logPath) {
  return fs
    .readFileSync(logPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
}

const baseOrder = {
  orderId: 'ORD-1',
  customerId: 'CUST-1',
  items: [{ sku: 'SHAWL-01', quantity: 1 }],
  submittedAt: '2026-09-04T10:00:00.000Z',
};

test('flags and logs a duplicate: same customer, same items, within the window', () => {
  const logPath = tempLogPath();
  const newOrder = {
    ...baseOrder,
    orderId: 'ORD-2',
    submittedAt: '2026-09-04T10:04:00.000Z', // 4 minutes later
  };

  const result = detectDuplicate(newOrder, [baseOrder], { logPath });

  assert.equal(result.isDuplicate, true);
  assert.equal(result.duplicateOfOrderId, 'ORD-1');

  const [entry] = readLogEntries(logPath);
  assert.equal(entry.type, 'duplicate_detected');
  assert.equal(entry.orderId, 'ORD-2');
  assert.equal(entry.duplicateOfOrderId, 'ORD-1');
});

test('finds a duplicate regardless of item array order', () => {
  const logPath = tempLogPath();
  const existing = {
    ...baseOrder,
    items: [
      { sku: 'SHAWL-01', quantity: 1 },
      { sku: 'SCARF-02', quantity: 2 },
    ],
  };
  const newOrder = {
    ...baseOrder,
    orderId: 'ORD-2',
    submittedAt: '2026-09-04T10:02:00.000Z',
    items: [
      { sku: 'SCARF-02', quantity: 2 },
      { sku: 'SHAWL-01', quantity: 1 },
    ],
  };

  const result = detectDuplicate(newOrder, [existing], { logPath });

  assert.equal(result.isDuplicate, true);
});

test('logs a clean result when no duplicate is found: different customer', () => {
  const logPath = tempLogPath();
  const existing = { ...baseOrder, customerId: 'CUST-2' };
  const newOrder = { ...baseOrder, orderId: 'ORD-2' };

  const result = detectDuplicate(newOrder, [existing], { logPath });

  assert.equal(result.isDuplicate, false);
  assert.equal(result.duplicateOfOrderId, null);

  const [entry] = readLogEntries(logPath);
  assert.equal(entry.type, 'no_duplicate_found');
  assert.equal(entry.orderId, 'ORD-2');
});

test('logs a clean result when no duplicate is found: outside the time window', () => {
  const logPath = tempLogPath();
  const newOrder = {
    ...baseOrder,
    orderId: 'ORD-2',
    submittedAt: '2026-09-04T10:30:00.000Z', // 30 minutes later, default window is 10
  };

  const result = detectDuplicate(newOrder, [baseOrder], { logPath });

  assert.equal(result.isDuplicate, false);
  const [entry] = readLogEntries(logPath);
  assert.equal(entry.type, 'no_duplicate_found');
});

test('logs a clean result when no duplicate is found: different items', () => {
  const logPath = tempLogPath();
  const existing = { ...baseOrder, items: [{ sku: 'RUG-09', quantity: 1 }] };
  const newOrder = { ...baseOrder, orderId: 'ORD-2' };

  const result = detectDuplicate(newOrder, [existing], { logPath });

  assert.equal(result.isDuplicate, false);
});

test('failure path: throws on a malformed order instead of guessing', () => {
  const logPath = tempLogPath();

  assert.throws(
    () => detectDuplicate({ orderId: 'ORD-2' }, [baseOrder], { logPath }),
    /missing a string customerId/,
  );

  // Nothing should have been logged for a submission that never got validated.
  assert.equal(fs.existsSync(logPath), false);
});

test('failure path: does not swallow a logging failure', () => {
  const blockerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-blocked-'));
  const blockerFile = path.join(blockerDir, 'not-a-directory');
  fs.writeFileSync(blockerFile, 'occupied');
  const logPath = path.join(blockerFile, 'audit.log');

  const newOrder = { ...baseOrder, orderId: 'ORD-2' };

  assert.throws(
    () => detectDuplicate(newOrder, [baseOrder], { logPath }),
    /Audit log write failed/,
  );
});
