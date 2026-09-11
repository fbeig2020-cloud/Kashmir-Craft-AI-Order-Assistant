'use strict';

/**
 * In-memory stand-in for a risk assessment list (REQ-007), mirroring
 * actionList.js's approach — a plain array, no real database yet.
 *
 * Each row carries the recommended action's own fields (orderId, issueType,
 * recommendedAction, rationale) alongside the risk fields (riskLevel,
 * riskRationale), so a single row is the risk "displayed with the action".
 */
let rows = [];

const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high']);

function insert(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('riskAssessmentTable.insert requires a row object');
  }
  if (!row.orderId || typeof row.orderId !== 'string') {
    throw new Error('riskAssessmentTable.insert requires a string orderId');
  }
  if (!row.issueType || typeof row.issueType !== 'string') {
    throw new Error('riskAssessmentTable.insert requires a string issueType');
  }
  if (!row.recommendedAction || typeof row.recommendedAction !== 'string') {
    throw new Error('riskAssessmentTable.insert requires a string recommendedAction');
  }
  if (!row.rationale || typeof row.rationale !== 'string') {
    throw new Error('riskAssessmentTable.insert requires a string rationale');
  }
  if (!row.riskLevel || !VALID_RISK_LEVELS.has(row.riskLevel)) {
    throw new Error('riskAssessmentTable.insert requires riskLevel to be one of low, medium, high');
  }
  if (!row.riskRationale || typeof row.riskRationale !== 'string') {
    throw new Error('riskAssessmentTable.insert requires a string riskRationale');
  }
  if (!row.timestamp || Number.isNaN(new Date(row.timestamp).getTime())) {
    throw new Error('riskAssessmentTable.insert requires a valid timestamp');
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
