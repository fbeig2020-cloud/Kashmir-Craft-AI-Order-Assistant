'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const { sendNotification, DEFAULT_NOTIFICATIONS_PATH } = require('./notifier');
const defaultPausedIssueTable = require('./pausedIssueTable');

function validateUncertainIssue(record) {
  if (!record || typeof record !== 'object') {
    return 'record is missing or not an object';
  }
  if (!record.orderId || typeof record.orderId !== 'string') {
    return 'record is missing a string orderId';
  }
  if (!record.issueType || typeof record.issueType !== 'string') {
    return 'record is missing a string issueType';
  }
  if (!record.uncertaintyReason || typeof record.uncertaintyReason !== 'string') {
    return 'record is missing a string uncertaintyReason';
  }
  return null;
}

/**
 * Pauses processing on an order issue the caller has already determined to
 * be uncertain (REQ-010). This story does not decide what "uncertain"
 * means — the same boundary requireApproval.js draws around "high risk": the
 * caller supplies uncertaintyReason, this module only pauses, notifies, and
 * logs. It also does not add a way to resume a paused issue (future story);
 * a stored row with status 'paused_uncertain' stays that way.
 *
 * Failure paths handled here:
 *  - Incorrect input (missing/malformed record) is rejected, logged,
 *    alerted, and thrown rather than silently skipping the pause
 *    ("pause functionality failure").
 *  - A storage failure while recording the pause is logged, alerted, and
 *    re-thrown rather than swallowed ("pause functionality failure").
 *  - A notification failure is logged, alerted, and re-thrown rather than
 *    swallowed ("notification failure"). The issue has already been stored
 *    as paused by this point, so it stays safely paused even though the
 *    agent was not successfully notified.
 *  - A logging failure is handled by logEvent() itself (logger.js already
 *    raises an alert and throws rather than swallowing a write failure),
 *    the same way every other module in this pipeline relies on it.
 *
 * options.pausedIssueTable defaults to the real table. Tests inject a
 * stand-in to simulate storage/notification failures without touching the
 * real ones.
 */
function pauseProcessing(record, options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.pausedIssueTable ?? defaultPausedIssueTable;
  const notify = options.notify ?? sendNotification;
  const notificationsPath = options.notificationsPath ?? DEFAULT_NOTIFICATIONS_PATH;

  const orderId = record && typeof record === 'object' ? record.orderId : undefined;

  const validationError = validateUncertainIssue(record);
  if (validationError) {
    const failureEvent = {
      type: 'pause_failed',
      orderId,
      issueType: record && typeof record === 'object' ? record.issueType : undefined,
      reason: validationError,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Pause failed: ${validationError}`);
  }

  let storedRecord;
  try {
    storedRecord = table.insert({
      orderId: record.orderId,
      issueType: record.issueType,
      uncertaintyReason: record.uncertaintyReason,
      status: 'paused_uncertain',
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'pause_failed',
      orderId: record.orderId,
      issueType: record.issueType,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Pause failed: ${storageErr.message}`);
  }

  try {
    notify(
      {
        type: 'issue_paused_notification',
        orderId: record.orderId,
        issueType: record.issueType,
        uncertaintyReason: record.uncertaintyReason,
        message: `Order ${record.orderId}: processing paused for issue "${record.issueType}" — ${record.uncertaintyReason}`,
      },
      notificationsPath,
    );
  } catch (notifyErr) {
    const failureEvent = {
      type: 'notification_failed',
      orderId: record.orderId,
      issueType: record.issueType,
      reason: notifyErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Notification failed: ${notifyErr.message}`);
  }

  logEvent(
    {
      type: 'issue_paused',
      orderId: record.orderId,
      issueType: record.issueType,
      uncertaintyReason: record.uncertaintyReason,
      status: storedRecord.status,
    },
    logPath,
  );

  return storedRecord;
}

module.exports = { pauseProcessing };
