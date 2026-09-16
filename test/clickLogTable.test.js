'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const clickLogTable = require('../src/clickLogTable');

const validRow = {
  screenId: 'approve_high_risk_action',
  primaryAction: 'approve_action',
  clickCount: 2,
  withinLimit: true,
  timestamp: new Date().toISOString(),
};

test('happy path: a valid row is inserted and returned by getAll', () => {
  clickLogTable.reset();

  const inserted = clickLogTable.insert(validRow);

  assert.equal(inserted.screenId, 'approve_high_risk_action');
  assert.equal(inserted.clickCount, 2);

  const all = clickLogTable.getAll();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], validRow);
});

test('failure path: a missing row is rejected', () => {
  clickLogTable.reset();

  assert.throws(
    () => clickLogTable.insert(undefined),
    /clickLogTable.insert requires a row object/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('failure path: a non-object row is rejected', () => {
  clickLogTable.reset();

  assert.throws(
    () => clickLogTable.insert('not an object'),
    /clickLogTable.insert requires a row object/,
  );
});

test('failure path: a row missing screenId is rejected', () => {
  clickLogTable.reset();
  const { screenId, ...rest } = validRow;

  assert.throws(
    () => clickLogTable.insert(rest),
    /clickLogTable.insert requires a string screenId/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('failure path: a row missing primaryAction is rejected', () => {
  clickLogTable.reset();
  const { primaryAction, ...rest } = validRow;

  assert.throws(
    () => clickLogTable.insert(rest),
    /clickLogTable.insert requires a string primaryAction/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('failure path: a row missing clickCount is rejected', () => {
  clickLogTable.reset();
  const { clickCount, ...rest } = validRow;

  assert.throws(
    () => clickLogTable.insert(rest),
    /clickLogTable.insert requires a non-negative integer clickCount/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('failure path: a negative clickCount is rejected', () => {
  clickLogTable.reset();
  const invalid = { ...validRow, clickCount: -1 };

  assert.throws(
    () => clickLogTable.insert(invalid),
    /clickLogTable.insert requires a non-negative integer clickCount/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('failure path: a non-integer clickCount is rejected', () => {
  clickLogTable.reset();
  const invalid = { ...validRow, clickCount: 1.5 };

  assert.throws(
    () => clickLogTable.insert(invalid),
    /clickLogTable.insert requires a non-negative integer clickCount/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('failure path: a row missing withinLimit is rejected', () => {
  clickLogTable.reset();
  const { withinLimit, ...rest } = validRow;

  assert.throws(
    () => clickLogTable.insert(rest),
    /clickLogTable.insert requires a boolean withinLimit/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('failure path: a row with an invalid timestamp is rejected', () => {
  clickLogTable.reset();
  const invalid = { ...validRow, timestamp: 'not-a-date' };

  assert.throws(
    () => clickLogTable.insert(invalid),
    /clickLogTable.insert requires a valid timestamp/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('failure path: a row missing a timestamp is rejected', () => {
  clickLogTable.reset();
  const { timestamp, ...rest } = validRow;

  assert.throws(
    () => clickLogTable.insert(rest),
    /clickLogTable.insert requires a valid timestamp/,
  );
  assert.equal(clickLogTable.getAll().length, 0);
});

test('reset clears all stored rows', () => {
  clickLogTable.reset();
  clickLogTable.insert(validRow);
  assert.equal(clickLogTable.getAll().length, 1);

  clickLogTable.reset();
  assert.equal(clickLogTable.getAll().length, 0);
});
