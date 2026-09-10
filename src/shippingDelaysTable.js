'use strict';

/**
 * In-memory stand-in for the shipping_delays table (REQ-004). A plain
 * array, mirroring the in-memory approach the rest of this walking skeleton
 * uses for order data — no real database yet.
 */
let rows = [];

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('shippingDelaysTable.insert requires a row object');
  }
  if (!row.orderId || typeof row.orderId !== 'string') {
    throw new Error('shippingDelaysTable.insert requires a string orderId');
  }
  if (!row.issueType || typeof row.issueType !== 'string') {
    throw new Error('shippingDelaysTable.insert requires a string issueType');
  }
  if (!row.details || typeof row.details !== 'object' || Array.isArray(row.details)) {
    throw new Error('shippingDelaysTable.insert requires a details object');
  }
  if (Object.keys(row.details).length === 0) {
    throw new Error('shippingDelaysTable.insert requires a non-empty details object');
  }
  if (!row.timestamp || Number.isNaN(new Date(row.timestamp).getTime())) {
    throw new Error('shippingDelaysTable.insert requires a valid timestamp');
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
