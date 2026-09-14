'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const resolutionTimeTable = require('../src/resolutionTimeTable');

const validRow = {
  orderId: 'ORD-50',
  issueType: 'payment_failure',
  detectedAt: '2026-01-01T10:00:00.000Z',
  resolvedAt: '2026-01-01T11:00:00.000Z',
  elapsedMs: 60 * 60 * 1000,
  timely: true,
};

test('happy path: a valid row is inserted and returned by getAll', () => {
  resolutionTimeTable.reset();

  const inserted = resolutionTimeTable.insert(validRow);

  assert.equal(inserted.orderId, 'ORD-50');
  assert.equal(inserted.timely, true);

  const all = resolutionTimeTable.getAll();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], validRow);
});

test('failure path: a missing row is rejected', () => {
  resolutionTimeTable.reset();

  assert.throws(
    () => resolutionTimeTable.insert(undefined),
    /resolutionTimeTable.insert requires a row object/,
  );
  assert.equal(resolutionTimeTable.getAll().length, 0);
});

test('failure path: a row missing orderId is rejected', () => {
  resolutionTimeTable.reset();
  const { orderId, ...rest } = validRow;

  assert.throws(
    () => resolutionTimeTable.insert(rest),
    /resolutionTimeTable.insert requires a string orderId/,
  );
  assert.equal(resolutionTimeTable.getAll().length, 0);
});

test('failure path: a row missing issueType is rejected', () => {
  resolutionTimeTable.reset();
  const { issueType, ...rest } = validRow;

  assert.throws(
    () => resolutionTimeTable.insert(rest),
    /resolutionTimeTable.insert requires a string issueType/,
  );
  assert.equal(resolutionTimeTable.getAll().length, 0);
});

test('failure path: a row with an invalid detectedAt is rejected', () => {
  resolutionTimeTable.reset();
  const invalid = { ...validRow, detectedAt: 'not-a-date' };

  assert.throws(
    () => resolutionTimeTable.insert(invalid),
    /resolutionTimeTable.insert requires a valid detectedAt/,
  );
  assert.equal(resolutionTimeTable.getAll().length, 0);
});

test('failure path: a row with an invalid resolvedAt is rejected', () => {
  resolutionTimeTable.reset();
  const invalid = { ...validRow, resolvedAt: 'not-a-date' };

  assert.throws(
    () => resolutionTimeTable.insert(invalid),
    /resolutionTimeTable.insert requires a valid resolvedAt/,
  );
  assert.equal(resolutionTimeTable.getAll().length, 0);
});

test('failure path: a row with a non-numeric elapsedMs is rejected', () => {
  resolutionTimeTable.reset();
  const invalid = { ...validRow, elapsedMs: 'a while' };

  assert.throws(
    () => resolutionTimeTable.insert(invalid),
    /resolutionTimeTable.insert requires a numeric elapsedMs/,
  );
  assert.equal(resolutionTimeTable.getAll().length, 0);
});

test('failure path: a row with a non-boolean timely is rejected', () => {
  resolutionTimeTable.reset();
  const invalid = { ...validRow, timely: 'yes' };

  assert.throws(
    () => resolutionTimeTable.insert(invalid),
    /resolutionTimeTable.insert requires a boolean timely/,
  );
  assert.equal(resolutionTimeTable.getAll().length, 0);
});

test('reset clears all stored rows', () => {
  resolutionTimeTable.reset();
  resolutionTimeTable.insert(validRow);
  assert.equal(resolutionTimeTable.getAll().length, 1);

  resolutionTimeTable.reset();
  assert.equal(resolutionTimeTable.getAll().length, 0);
});
