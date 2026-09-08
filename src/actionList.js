'use strict';

/**
 * In-memory stand-in for an action list (REQ-006), mirroring evidenceTable.js's
 * approach — a plain array, no real database yet.
 */
let rows = [];

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('actionList.insert requires a row object');
  }
  if (!row.orderId || typeof row.orderId !== 'string') {
    throw new Error('actionList.insert requires a string orderId');
  }
  if (!row.issueType || typeof row.issueType !== 'string') {
    throw new Error('actionList.insert requires a string issueType');
  }
  if (!row.recommendedAction || typeof row.recommendedAction !== 'string') {
    throw new Error('actionList.insert requires a string recommendedAction');
  }
  if (!row.rationale || typeof row.rationale !== 'string') {
    throw new Error('actionList.insert requires a string rationale');
  }
  if (!row.timestamp || Number.isNaN(new Date(row.timestamp).getTime())) {
    throw new Error('actionList.insert requires a valid timestamp');
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
