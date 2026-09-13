'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const pausedIssueTable = require('../src/pausedIssueTable');

const validRow = {
  orderId: 'ORD-40',
  issueType: 'payment_failure',
  uncertaintyReason: 'failureReason "chargeback_pending" is not a known case; cannot confidently recommend an action.',
  status: 'paused_uncertain',
  timestamp: new Date().toISOString(),
};

test('happy path: a valid row is inserted and returned by getAll', () => {
  pausedIssueTable.reset();

  const inserted = pausedIssueTable.insert(validRow);

  assert.equal(inserted.orderId, 'ORD-40');
  assert.equal(inserted.status, 'paused_uncertain');

  const all = pausedIssueTable.getAll();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], validRow);
});

test('failure path: a missing row is rejected', () => {
  pausedIssueTable.reset();

  assert.throws(
    () => pausedIssueTable.insert(undefined),
    /pausedIssueTable.insert requires a row object/,
  );
  assert.equal(pausedIssueTable.getAll().length, 0);
});

test('failure path: a non-object row is rejected', () => {
  pausedIssueTable.reset();

  assert.throws(
    () => pausedIssueTable.insert('not an object'),
    /pausedIssueTable.insert requires a row object/,
  );
});

test('failure path: a row missing orderId is rejected', () => {
  pausedIssueTable.reset();
  const { orderId, ...rest } = validRow;

  assert.throws(
    () => pausedIssueTable.insert(rest),
    /pausedIssueTable.insert requires a string orderId/,
  );
  assert.equal(pausedIssueTable.getAll().length, 0);
});

test('failure path: a row missing issueType is rejected', () => {
  pausedIssueTable.reset();
  const { issueType, ...rest } = validRow;

  assert.throws(
    () => pausedIssueTable.insert(rest),
    /pausedIssueTable.insert requires a string issueType/,
  );
  assert.equal(pausedIssueTable.getAll().length, 0);
});

test('failure path: a row missing uncertaintyReason is rejected', () => {
  pausedIssueTable.reset();
  const { uncertaintyReason, ...rest } = validRow;

  assert.throws(
    () => pausedIssueTable.insert(rest),
    /pausedIssueTable.insert requires a string uncertaintyReason/,
  );
  assert.equal(pausedIssueTable.getAll().length, 0);
});

test('failure path: a row missing status is rejected', () => {
  pausedIssueTable.reset();
  const { status, ...rest } = validRow;

  assert.throws(
    () => pausedIssueTable.insert(rest),
    /pausedIssueTable.insert requires a string status/,
  );
  assert.equal(pausedIssueTable.getAll().length, 0);
});

test('failure path: a row with an invalid timestamp is rejected', () => {
  pausedIssueTable.reset();
  const invalid = { ...validRow, timestamp: 'not-a-date' };

  assert.throws(
    () => pausedIssueTable.insert(invalid),
    /pausedIssueTable.insert requires a valid timestamp/,
  );
  assert.equal(pausedIssueTable.getAll().length, 0);
});

test('failure path: a row missing a timestamp is rejected', () => {
  pausedIssueTable.reset();
  const { timestamp, ...rest } = validRow;

  assert.throws(
    () => pausedIssueTable.insert(rest),
    /pausedIssueTable.insert requires a valid timestamp/,
  );
  assert.equal(pausedIssueTable.getAll().length, 0);
});

test('reset clears all stored rows', () => {
  pausedIssueTable.reset();
  pausedIssueTable.insert(validRow);
  assert.equal(pausedIssueTable.getAll().length, 1);

  pausedIssueTable.reset();
  assert.equal(pausedIssueTable.getAll().length, 0);
});
