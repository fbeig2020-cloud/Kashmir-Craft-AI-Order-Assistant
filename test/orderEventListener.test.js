'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { handleOrderSubmission, DEFAULT_MAX_RETRIES } = require('../src/orderEventListener');
const orderEventsTable = require('../src/orderEventsTable');

function tempLogPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'order-events-')), 'audit.log');
}

function readLogEntries(logPath) {
  return fs
    .readFileSync(logPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
}

const validEvent = { orderId: 'ORD-1', submittedAt: '2026-09-04T10:00:00.000Z' };

test('happy path: a valid event is received, starts processing, and both are logged', () => {
  orderEventsTable.reset();
  const logPath = tempLogPath();
  let processedWith = null;
  const process = (event) => {
    processedWith = event;
    return 'processing-result';
  };

  const result = handleOrderSubmission(validEvent, { logPath, process });

  assert.equal(result.started, true);
  assert.equal(result.attempt, 1);
  assert.equal(result.result, 'processing-result');
  assert.deepEqual(processedWith, validEvent);

  const rows = orderEventsTable.getAll();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, 'received');
  assert.equal(rows[1].status, 'processing_started');
  for (const row of rows) {
    assert.equal(row.orderId, 'ORD-1');
    assert.ok(!Number.isNaN(new Date(row.timestamp).getTime()));
  }

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].status, 'received');
  assert.equal(entries[1].status, 'processing_started');
});

test('failure path: event not received (missing orderId) logs an error and retries up to the cap, then throws', () => {
  orderEventsTable.reset();
  const logPath = tempLogPath();
  const malformedEvent = { submittedAt: '2026-09-04T10:00:00.000Z' };

  assert.throws(
    () => handleOrderSubmission(malformedEvent, { logPath }),
    new RegExp(`could not be received after ${DEFAULT_MAX_RETRIES} attempts`),
  );

  const rows = orderEventsTable.getAll();
  assert.equal(rows.length, DEFAULT_MAX_RETRIES);
  rows.forEach((row, i) => {
    assert.equal(row.status, 'error');
    assert.equal(row.attempt, i + 1);
    assert.match(row.reason, /missing a string orderId/);
  });

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, DEFAULT_MAX_RETRIES);
  assert.ok(entries.every((e) => e.status === 'error'));
});

test('failure path: event triggers incorrect processing — the error is logged and re-thrown, not swallowed, and not retried', () => {
  orderEventsTable.reset();
  const logPath = tempLogPath();
  const process = () => {
    throw new Error('boom: downstream processing failed');
  };

  assert.throws(() => handleOrderSubmission(validEvent, { logPath, process }), /boom: downstream processing failed/);

  const rows = orderEventsTable.getAll();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, 'received');
  assert.equal(rows[1].status, 'processing_error');
  assert.match(rows[1].reason, /boom/);

  const entries = readLogEntries(logPath);
  assert.equal(entries.length, 2);
  assert.equal(entries[1].status, 'processing_error');
});

test('a valid event with no injected process still logs processing_started (default is a no-op, not a skip)', () => {
  orderEventsTable.reset();
  const logPath = tempLogPath();

  const result = handleOrderSubmission(validEvent, { logPath });

  assert.equal(result.started, true);
  const rows = orderEventsTable.getAll();
  assert.equal(rows[rows.length - 1].status, 'processing_started');
});
