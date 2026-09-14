'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const { sendNotification, DEFAULT_NOTIFICATIONS_PATH } = require('./notifier');
const defaultResolutionTimeTable = require('./resolutionTimeTable');

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function validateResolvedIssue(record) {
  if (!record || typeof record !== 'object') {
    return 'record is missing or not an object';
  }
  if (!record.orderId || typeof record.orderId !== 'string') {
    return 'record is missing a string orderId';
  }
  if (!record.issueType || typeof record.issueType !== 'string') {
    return 'record is missing a string issueType';
  }
  if (!record.detectedAt || Number.isNaN(new Date(record.detectedAt).getTime())) {
    return 'record is missing a valid detectedAt';
  }
  if (!record.resolvedAt || Number.isNaN(new Date(record.resolvedAt).getTime())) {
    return 'record is missing a valid resolvedAt';
  }
  if (new Date(record.resolvedAt).getTime() < new Date(record.detectedAt).getTime()) {
    return 'resolvedAt is before detectedAt';
  }
  return null;
}

/**
 * Checks whether a resolved order issue met the 2-hour resolution target
 * (REQ-014), given when it was detected and when it was resolved (e.g. the
 * moment verifyOutcome.js records a successful outcome). Every check is
 * stored via resolutionTimeTable (the "logged for performance analysis"
 * trust criterion) regardless of outcome, and logged to the audit trail.
 *
 * Failure paths handled here:
 *  - Resolution time failure: a missing/malformed record (absent
 *    timestamps, or resolvedAt before detectedAt) is rejected, logged,
 *    alerted, and thrown rather than computing a bogus elapsed time.
 *  - Performance bottleneck: when elapsed time exceeds 2 hours, an alert
 *    notification is sent so the breach is actionable, not just recorded.
 *  - Alert failure: if that notification itself fails to send, it is
 *    logged, alerted, and re-thrown rather than swallowed. The row has
 *    already been durably stored by this point, so the timing data is not
 *    lost even though the alert didn't go out.
 *
 * options.resolutionTimeTable defaults to the real table. Tests inject a
 * stand-in to simulate storage/notification failures without touching the
 * real ones.
 */
function checkResolutionTime(record, options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.resolutionTimeTable ?? defaultResolutionTimeTable;
  const notify = options.notify ?? sendNotification;
  const notificationsPath = options.notificationsPath ?? DEFAULT_NOTIFICATIONS_PATH;

  const orderId = record && typeof record === 'object' ? record.orderId : undefined;

  const validationError = validateResolvedIssue(record);
  if (validationError) {
    const failureEvent = {
      type: 'resolution_time_check_failed',
      orderId,
      issueType: record && typeof record === 'object' ? record.issueType : undefined,
      reason: validationError,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Resolution time check failed: ${validationError}`);
  }

  const elapsedMs = new Date(record.resolvedAt).getTime() - new Date(record.detectedAt).getTime();
  const timely = elapsedMs <= TWO_HOURS_MS;

  let storedRecord;
  try {
    storedRecord = table.insert({
      orderId: record.orderId,
      issueType: record.issueType,
      detectedAt: record.detectedAt,
      resolvedAt: record.resolvedAt,
      elapsedMs,
      timely,
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'resolution_time_logging_failed',
      orderId: record.orderId,
      issueType: record.issueType,
      elapsedMs,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Resolution time logging failed: ${storageErr.message}`);
  }

  if (!timely) {
    try {
      notify(
        {
          type: 'resolution_time_exceeded_alert',
          orderId: record.orderId,
          issueType: record.issueType,
          elapsedMs,
          message: `Order ${record.orderId}: issue "${record.issueType}" took ${elapsedMs}ms to resolve, exceeding the 2-hour target.`,
        },
        notificationsPath,
      );
    } catch (notifyErr) {
      const failureEvent = {
        type: 'alert_failed',
        orderId: record.orderId,
        issueType: record.issueType,
        elapsedMs,
        reason: notifyErr.message,
      };
      logEvent(failureEvent, logPath);
      logEvent(failureEvent, alertPath);
      throw new Error(`Alert failed: ${notifyErr.message}`);
    }
  }

  logEvent(
    {
      type: timely ? 'resolution_timely' : 'resolution_exceeded',
      orderId: record.orderId,
      issueType: record.issueType,
      elapsedMs,
      timely,
    },
    logPath,
  );

  return storedRecord;
}

module.exports = { checkResolutionTime, TWO_HOURS_MS };
