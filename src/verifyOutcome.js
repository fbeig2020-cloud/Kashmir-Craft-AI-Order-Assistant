'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const { sendNotification, DEFAULT_NOTIFICATIONS_PATH } = require('./notifier');
const defaultOutcomeTable = require('./outcomeTable');

const VALID_OUTCOME_STATUSES = new Set(['success', 'failed']);

function validateApprovedRecord(record) {
  if (!record || typeof record !== 'object') {
    return 'record is missing or not an object';
  }
  if (!record.orderId || typeof record.orderId !== 'string') {
    return 'record is missing a string orderId';
  }
  if (!record.issueType || typeof record.issueType !== 'string') {
    return 'record is missing a string issueType';
  }
  if (!record.recommendedAction || typeof record.recommendedAction !== 'string') {
    return 'record is missing a string recommendedAction';
  }
  if (!record.rationale || typeof record.rationale !== 'string') {
    return 'record is missing a string rationale';
  }
  if (!record.riskLevel || typeof record.riskLevel !== 'string') {
    return 'record is missing a string riskLevel';
  }
  if (!record.riskRationale || typeof record.riskRationale !== 'string') {
    return 'record is missing a string riskRationale';
  }
  return null;
}

/**
 * Verifies the outcome of an action that has been taken (from
 * requireApproval.js / assessRisk.js, REQ-007/REQ-008), and stores the
 * result alongside the action's own details (REQ-009). Every outcome is
 * logged to the audit trail (REQ-015).
 *
 * options.checkOutcome: function(record) => 'success' | 'failed', the actual
 * check against the outside world (e.g. did the refund post, did the email
 * send). Defaults to a stub that always returns 'success', since no real
 * outcome-checking integration exists yet — tests and future stories inject
 * a real/fake implementation, the same way orderEventListener.js injects
 * options.process.
 *
 * Failure paths handled here:
 *  - Incorrect input (missing/malformed record) is rejected, logged,
 *    alerted, and thrown rather than verifying a bogus record.
 *  - Verification process failure: checkOutcome throwing, or returning
 *    anything other than 'success'/'failed', is logged, alerted, and thrown
 *    rather than being silently treated as success.
 *  - Incorrect outcome logging: a storage failure while recording the
 *    verified outcome is logged, alerted, and re-thrown rather than
 *    swallowed.
 *  - Alert failure: when the outcome is 'failed', an alert notification is
 *    sent; if that notification itself fails to send, it is logged,
 *    alerted, and re-thrown rather than swallowed. The outcome has already
 *    been durably stored by this point, so the failed outcome is not lost
 *    even though the alert didn't go out.
 *
 * options.outcomeTable defaults to the real table. Tests inject a stand-in
 * to simulate storage/notification failures without touching the real ones.
 */
function verifyOutcome(record, options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.outcomeTable ?? defaultOutcomeTable;
  const checkOutcome = options.checkOutcome ?? (() => 'success');
  const notify = options.notify ?? sendNotification;
  const notificationsPath = options.notificationsPath ?? DEFAULT_NOTIFICATIONS_PATH;

  const orderId = record && typeof record === 'object' ? record.orderId : undefined;

  const validationError = validateApprovedRecord(record);
  if (validationError) {
    const failureEvent = {
      type: 'outcome_verification_failed',
      orderId,
      issueType: record && typeof record === 'object' ? record.issueType : undefined,
      recommendedAction: record && typeof record === 'object' ? record.recommendedAction : undefined,
      reason: validationError,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Outcome verification failed: ${validationError}`);
  }

  let outcomeStatus;
  let verificationDetails;
  try {
    const result = checkOutcome(record);
    if (!VALID_OUTCOME_STATUSES.has(result)) {
      throw new Error(`checkOutcome returned an invalid outcome: ${JSON.stringify(result)}`);
    }
    outcomeStatus = result;
    verificationDetails = `Verified via checkOutcome: ${result}`;
  } catch (checkErr) {
    const failureEvent = {
      type: 'outcome_verification_failed',
      orderId: record.orderId,
      issueType: record.issueType,
      recommendedAction: record.recommendedAction,
      reason: checkErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Outcome verification failed: ${checkErr.message}`);
  }

  let storedRecord;
  try {
    storedRecord = table.insert({
      orderId: record.orderId,
      issueType: record.issueType,
      recommendedAction: record.recommendedAction,
      rationale: record.rationale,
      riskLevel: record.riskLevel,
      riskRationale: record.riskRationale,
      outcomeStatus,
      verificationDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'outcome_logging_failed',
      orderId: record.orderId,
      issueType: record.issueType,
      recommendedAction: record.recommendedAction,
      outcomeStatus,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Outcome logging failed: ${storageErr.message}`);
  }

  if (outcomeStatus === 'failed') {
    try {
      notify(
        {
          type: 'outcome_failed_alert',
          orderId: record.orderId,
          issueType: record.issueType,
          recommendedAction: record.recommendedAction,
          verificationDetails,
          message: `Order ${record.orderId}: action "${record.recommendedAction}" failed verification.`,
        },
        notificationsPath,
      );
    } catch (notifyErr) {
      const failureEvent = {
        type: 'alert_failed',
        orderId: record.orderId,
        issueType: record.issueType,
        recommendedAction: record.recommendedAction,
        reason: notifyErr.message,
      };
      logEvent(failureEvent, logPath);
      logEvent(failureEvent, alertPath);
      throw new Error(`Alert failed: ${notifyErr.message}`);
    }
  }

  logEvent(
    {
      type: 'outcome_verified',
      orderId: record.orderId,
      issueType: record.issueType,
      recommendedAction: record.recommendedAction,
      outcomeStatus,
      verificationDetails,
    },
    logPath,
  );

  return storedRecord;
}

module.exports = { verifyOutcome };
