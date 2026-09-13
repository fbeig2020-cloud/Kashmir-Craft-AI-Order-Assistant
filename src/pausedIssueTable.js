'use strict';

/**
 * In-memory stand-in for a paused-issue list (REQ-010), mirroring
 * approvalTable.js's approach — a plain array, no real database yet.
 *
 * Each row carries the issue's own details (orderId, issueType,
 * uncertaintyReason) alongside a status, so a stored row IS the "processing
 * is paused" state: nothing in this story ever flips status away from
 * 'paused_uncertain' — resuming a paused issue is out of scope here (future
 * story), same boundary approvalTable.js draws for 'paused_pending_approval'.
 */
let rows = [];

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('pausedIssueTable.insert requires a row object');
  }
  if (!row.orderId || typeof row.orderId !== 'string') {
    throw new Error('pausedIssueTable.insert requires a string orderId');
  }
  if (!row.issueType || typeof row.issueType !== 'string') {
    throw new Error('pausedIssueTable.insert requires a string issueType');
  }
  if (!row.uncertaintyReason || typeof row.uncertaintyReason !== 'string') {
    throw new Error('pausedIssueTable.insert requires a string uncertaintyReason');
  }
  if (!row.status || typeof row.status !== 'string') {
    throw new Error('pausedIssueTable.insert requires a string status');
  }
  if (!row.timestamp || Number.isNaN(new Date(row.timestamp).getTime())) {
    throw new Error('pausedIssueTable.insert requires a valid timestamp');
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
