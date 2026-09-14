'use strict';

/**
 * In-memory stand-in for a resolution-time list (REQ-014), mirroring
 * outcomeTable.js / pausedIssueTable.js's approach — a plain array, no real
 * database yet.
 *
 * Each row is one resolved issue's timing: when it was detected, when it was
 * resolved, the elapsed time between them, and whether that elapsed time was
 * within the 2-hour target. Storing every row (not just the exceeded ones)
 * is what satisfies "all resolution times are logged for performance
 * analysis" — this table is the source data for that analysis.
 */
let rows = [];

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('resolutionTimeTable.insert requires a row object');
  }
  if (!row.orderId || typeof row.orderId !== 'string') {
    throw new Error('resolutionTimeTable.insert requires a string orderId');
  }
  if (!row.issueType || typeof row.issueType !== 'string') {
    throw new Error('resolutionTimeTable.insert requires a string issueType');
  }
  if (!row.detectedAt || Number.isNaN(new Date(row.detectedAt).getTime())) {
    throw new Error('resolutionTimeTable.insert requires a valid detectedAt');
  }
  if (!row.resolvedAt || Number.isNaN(new Date(row.resolvedAt).getTime())) {
    throw new Error('resolutionTimeTable.insert requires a valid resolvedAt');
  }
  if (typeof row.elapsedMs !== 'number' || Number.isNaN(row.elapsedMs)) {
    throw new Error('resolutionTimeTable.insert requires a numeric elapsedMs');
  }
  if (typeof row.timely !== 'boolean') {
    throw new Error('resolutionTimeTable.insert requires a boolean timely');
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
