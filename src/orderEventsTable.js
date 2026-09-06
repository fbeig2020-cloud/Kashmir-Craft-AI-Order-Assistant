'use strict';

/**
 * In-memory stand-in for the order_events table (REQ-012). A plain array,
 * mirroring the in-memory approach the rest of this walking skeleton uses
 * for order data — no real database yet.
 */
let rows = [];

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('orderEventsTable.insert requires a row object');
  }
  // orderId is intentionally not required: a garbled event that fails to
  // receive at all (REQ-012's "event not received" path) may not have one,
  // and that row still has to be recorded rather than rejected.
  if (!row.status || typeof row.status !== 'string') {
    throw new Error('orderEventsTable.insert requires a string status');
  }
  if (!row.timestamp || Number.isNaN(new Date(row.timestamp).getTime())) {
    throw new Error('orderEventsTable.insert requires a valid timestamp');
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
