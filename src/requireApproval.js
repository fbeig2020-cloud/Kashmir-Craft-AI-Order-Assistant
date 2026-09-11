'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const { sendNotification, DEFAULT_NOTIFICATIONS_PATH } = require('./notifier');
const defaultApprovalTable = require('./approvalTable');

function validateRiskAssessedRecord(record) {
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
 * Requires human approval for a high-risk action (from assessRisk.js,
 * REQ-007) before it can proceed (REQ-008). Every outcome is logged to the
 * audit trail (REQ-015).
 *
 * Only 'high' riskLevel records require approval; anything else bypasses
 * this workflow (logged as approval_not_required) since REQ-008 is scoped to
 * high-risk actions. This story does not add a way to grant approval — a
 * high-risk record is stored with status 'paused_pending_approval' and stays
 * that way; approving/rejecting it is out of scope here (future story).
 *
 * Failure paths handled here:
 *  - Incorrect input (missing/malformed record) is rejected, logged,
 *    alerted, and thrown rather than silently skipping approval
 *    ("approval workflow failure").
 *  - A storage failure while recording the approval request is logged,
 *    alerted, and re-thrown rather than swallowed ("approval workflow
 *    failure").
 *  - A notification failure is logged, alerted, and re-thrown rather than
 *    swallowed ("notification failure"). The approval request has already
 *    been stored as paused by this point, so the action stays safely paused
 *    even though the approver was not successfully notified.
 *
 * options.approvalTable defaults to the real table. Tests inject a
 * stand-in to simulate storage/notification failures without touching the
 * real ones.
 */
function requireApproval(record, options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.approvalTable ?? defaultApprovalTable;
  const notify = options.notify ?? sendNotification;
  const notificationsPath = options.notificationsPath ?? DEFAULT_NOTIFICATIONS_PATH;

  const orderId = record && typeof record === 'object' ? record.orderId : undefined;

  const validationError = validateRiskAssessedRecord(record);
  if (validationError) {
    const failureEvent = {
      type: 'approval_workflow_failed',
      orderId,
      issueType: record && typeof record === 'object' ? record.issueType : undefined,
      recommendedAction: record && typeof record === 'object' ? record.recommendedAction : undefined,
      reason: validationError,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Approval workflow failed: ${validationError}`);
  }

  if (record.riskLevel !== 'high') {
    logEvent(
      {
        type: 'approval_not_required',
        orderId: record.orderId,
        issueType: record.issueType,
        recommendedAction: record.recommendedAction,
        riskLevel: record.riskLevel,
      },
      logPath,
    );

    return { ...record, status: 'auto_approved' };
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
      status: 'paused_pending_approval',
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'approval_workflow_failed',
      orderId: record.orderId,
      issueType: record.issueType,
      recommendedAction: record.recommendedAction,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Approval workflow failed: ${storageErr.message}`);
  }

  try {
    notify(
      {
        type: 'approval_required_notification',
        orderId: record.orderId,
        issueType: record.issueType,
        recommendedAction: record.recommendedAction,
        riskLevel: record.riskLevel,
        riskRationale: record.riskRationale,
        message: `Order ${record.orderId}: action "${record.recommendedAction}" is high risk and requires approval before it can proceed.`,
      },
      notificationsPath,
    );
  } catch (notifyErr) {
    const failureEvent = {
      type: 'notification_failed',
      orderId: record.orderId,
      issueType: record.issueType,
      recommendedAction: record.recommendedAction,
      reason: notifyErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Notification failed: ${notifyErr.message}`);
  }

  logEvent(
    {
      type: 'approval_required',
      orderId: record.orderId,
      issueType: record.issueType,
      recommendedAction: record.recommendedAction,
      riskLevel: record.riskLevel,
      riskRationale: record.riskRationale,
      status: storedRecord.status,
    },
    logPath,
  );

  return storedRecord;
}

module.exports = { requireApproval };
