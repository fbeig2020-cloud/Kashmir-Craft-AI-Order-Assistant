'use strict';

/**
 * In-memory stand-in for an approval request list (REQ-008), mirroring
 * riskAssessmentTable.js's approach — a plain array, no real database yet.
 *
 * Each row carries the risk-assessed action's own fields (orderId,
 * issueType, recommendedAction, rationale, riskLevel, riskRationale)
 * alongside a status, so a pending row IS the "action is paused" state:
 * nothing in this story ever flips status away from 'pending_approval'.
 */
let rows = [];

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('approvalTable.insert requires a row object');
  }
  if (!row.orderId || typeof row.orderId !== 'string') {
    throw new Error('approvalTable.insert requires a string orderId');
  }
  if (!row.issueType || typeof row.issueType !== 'string') {
    throw new Error('approvalTable.insert requires a string issueType');
  }
  if (!row.recommendedAction || typeof row.recommendedAction !== 'string') {
    throw new Error('approvalTable.insert requires a string recommendedAction');
  }
  if (!row.rationale || typeof row.rationale !== 'string') {
    throw new Error('approvalTable.insert requires a string rationale');
  }
  if (!row.riskLevel || typeof row.riskLevel !== 'string') {
    throw new Error('approvalTable.insert requires a string riskLevel');
  }
  if (!row.riskRationale || typeof row.riskRationale !== 'string') {
    throw new Error('approvalTable.insert requires a string riskRationale');
  }
  if (!row.status || typeof row.status !== 'string') {
    throw new Error('approvalTable.insert requires a string status');
  }
  if (!row.timestamp || Number.isNaN(new Date(row.timestamp).getTime())) {
    throw new Error('approvalTable.insert requires a valid timestamp');
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
