'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const { getRiskLevel } = require('./riskLevel');
const defaultRiskAssessmentTable = require('./riskAssessmentTable');

function validateActionRecord(actionRecord) {
  if (!actionRecord || typeof actionRecord !== 'object') {
    return 'actionRecord is missing or not an object';
  }
  if (!actionRecord.orderId || typeof actionRecord.orderId !== 'string') {
    return 'actionRecord is missing a string orderId';
  }
  if (!actionRecord.issueType || typeof actionRecord.issueType !== 'string') {
    return 'actionRecord is missing a string issueType';
  }
  if (!actionRecord.recommendedAction || typeof actionRecord.recommendedAction !== 'string') {
    return 'actionRecord is missing a string recommendedAction';
  }
  if (!actionRecord.rationale || typeof actionRecord.rationale !== 'string') {
    return 'actionRecord is missing a string rationale';
  }
  return null;
}

/**
 * Assesses the risk of a recommended action (from recommendAction.js /
 * actionList.js, REQ-006) and stores the risk alongside the action's own
 * details for review (REQ-007). Every outcome is logged to the audit trail
 * with the action details (REQ-015).
 *
 * Failure paths handled here:
 *  - Incorrect input (missing/malformed actionRecord) is rejected, logged,
 *    alerted, and thrown rather than producing a bogus assessment
 *    ("risk assessment failure").
 *  - An unrecognized recommendedAction never produces a guessed low risk:
 *    getRiskLevel defaults it to 'high' ("incorrect risk levels").
 *  - A storage failure while recording the assessment is logged, alerted,
 *    and re-thrown rather than swallowed (mirrors recommendAction.js).
 *
 * options.riskAssessmentTable defaults to the real table. Tests inject a
 * stand-in to simulate storage failures without touching the real one.
 */
function assessRisk(actionRecord, options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.riskAssessmentTable ?? defaultRiskAssessmentTable;

  const orderId = actionRecord && typeof actionRecord === 'object' ? actionRecord.orderId : undefined;

  const validationError = validateActionRecord(actionRecord);
  if (validationError) {
    const failureEvent = {
      type: 'risk_assessment_failed',
      orderId,
      issueType: actionRecord && typeof actionRecord === 'object' ? actionRecord.issueType : undefined,
      recommendedAction: actionRecord && typeof actionRecord === 'object' ? actionRecord.recommendedAction : undefined,
      reason: validationError,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Risk assessment failed: ${validationError}`);
  }

  const { riskLevel, riskRationale } = getRiskLevel(actionRecord.recommendedAction);

  let storedRecord;
  try {
    storedRecord = table.insert({
      orderId: actionRecord.orderId,
      issueType: actionRecord.issueType,
      recommendedAction: actionRecord.recommendedAction,
      rationale: actionRecord.rationale,
      riskLevel,
      riskRationale,
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'risk_assessment_storage_failed',
      orderId: actionRecord.orderId,
      issueType: actionRecord.issueType,
      recommendedAction: actionRecord.recommendedAction,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Risk assessment storage failed: ${storageErr.message}`);
  }

  logEvent(
    {
      type: 'risk_assessed',
      orderId: actionRecord.orderId,
      issueType: actionRecord.issueType,
      recommendedAction: actionRecord.recommendedAction,
      rationale: actionRecord.rationale,
      riskLevel,
      riskRationale,
    },
    logPath,
  );

  return storedRecord;
}

module.exports = { assessRisk };
