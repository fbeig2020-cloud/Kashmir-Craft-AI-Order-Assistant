'use strict';

/**
 * In-memory stand-in for a verified-outcome list (REQ-009), mirroring
 * riskAssessmentTable.js / approvalTable.js's approach — a plain array, no
 * real database yet.
 *
 * Each row carries the approved action's own fields (orderId, issueType,
 * recommendedAction, rationale, riskLevel, riskRationale) alongside the
 * verification result (outcomeStatus, verificationDetails), so a single row
 * is the outcome "logged as successful or failed" for that action.
 */
let rows = [];

const VALID_OUTCOME_STATUSES = new Set(['success', 'failed']);

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('outcomeTable.insert requires a row object');
  }
  if (!row.orderId || typeof row.orderId !== 'string') {
    throw new Error('outcomeTable.insert requires a string orderId');
  }
  if (!row.issueType || typeof row.issueType !== 'string') {
    throw new Error('outcomeTable.insert requires a string issueType');
  }
  if (!row.recommendedAction || typeof row.recommendedAction !== 'string') {
    throw new Error('outcomeTable.insert requires a string recommendedAction');
  }
  if (!row.rationale || typeof row.rationale !== 'string') {
    throw new Error('outcomeTable.insert requires a string rationale');
  }
  if (!row.riskLevel || typeof row.riskLevel !== 'string') {
    throw new Error('outcomeTable.insert requires a string riskLevel');
  }
  if (!row.riskRationale || typeof row.riskRationale !== 'string') {
    throw new Error('outcomeTable.insert requires a string riskRationale');
  }
  if (!row.outcomeStatus || !VALID_OUTCOME_STATUSES.has(row.outcomeStatus)) {
    throw new Error('outcomeTable.insert requires outcomeStatus to be one of success, failed');
  }
  if (!row.verificationDetails || typeof row.verificationDetails !== 'string') {
    throw new Error('outcomeTable.insert requires a string verificationDetails');
  }
  if (!row.timestamp || Number.isNaN(new Date(row.timestamp).getTime())) {
    throw new Error('outcomeTable.insert requires a valid timestamp');
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
