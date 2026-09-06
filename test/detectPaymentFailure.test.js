'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { detectPaymentFailure } = require('../src/detectPaymentFailure');

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
  paymentStatus: 'failed',
  failureReason: 'card_declined',
};

test('flags and logs a payment failure', () => {
  const logPath = tempLogPath();

  const result = detectPaymentFailure(baseOrder, { logPath });

  assert.equal(result.isPaymentFailure, true);
  assert.equal(result.orderId, 'ORD-1');
  assert.equal(result.failureReason, 'card_declined');

  const [entry] = readLogEntries(logPath);
  assert.equal(entry.type, 'payment_failure_detected');
  assert.equal(entry.orderId, 'ORD-1');
  assert.equal(entry.failureReason, 'card_declined');
});

test('logs a clean result when payment succeeded', () => {
  const logPath = tempLogPath();
  const order = { ...baseOrder, paymentStatus: 'settled' };

  const result = detectPaymentFailure(order, { logPath });

  assert.equal(result.isPaymentFailure, false);
  assert.equal(result.failureReason, null);

  const [entry] = readLogEntries(logPath);
  assert.equal(entry.type, 'no_payment_failure_found');
  assert.equal(entry.orderId, 'ORD-1');
});

test('failure path: throws on a malformed order instead of guessing', () => {
  const logPath = tempLogPath();

  assert.throws(
    () => detectPaymentFailure({ orderId: 'ORD-1' }, { logPath }),
    /missing a string customerId/,
  );

  // Nothing should have been logged for an order that never got validated.
  assert.equal(fs.existsSync(logPath), false);
});
