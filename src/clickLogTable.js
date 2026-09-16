'use strict';

/**
 * In-memory stand-in for the click-count audit log (REQ-013's trust
 * criterion), mirroring pausedIssueTable.js's approach — a plain array, no
 * real database yet.
 *
 * Each row is one completed primary action on a screen: which screen, which
 * action, how many clicks it took, and whether that was within the 3-click
 * limit. This is the record that makes "every action performed is logged
 * with the number of clicks" checkable.
 */
let rows = [];

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('clickLogTable.insert requires a row object');
  }
  if (!row.screenId || typeof row.screenId !== 'string') {
    throw new Error('clickLogTable.insert requires a string screenId');
  }
  if (!row.primaryAction || typeof row.primaryAction !== 'string') {
    throw new Error('clickLogTable.insert requires a string primaryAction');
  }
  if (typeof row.clickCount !== 'number' || !Number.isInteger(row.clickCount) || row.clickCount < 0) {
    throw new Error('clickLogTable.insert requires a non-negative integer clickCount');
  }
  if (typeof row.withinLimit !== 'boolean') {
    throw new Error('clickLogTable.insert requires a boolean withinLimit');
  }
  if (!row.timestamp || Number.isNaN(new Date(row.timestamp).getTime())) {
    throw new Error('clickLogTable.insert requires a valid timestamp');
  }

  const record = { ...row };
  rows.push(record);
  return record;
}

function getAll() {
  return [...rows];
}

/** Clears all rows. Exists so tests can isolate state between runs. */
function reset() {
  rows = [];
}

module.exports = { insert, getAll, reset };
