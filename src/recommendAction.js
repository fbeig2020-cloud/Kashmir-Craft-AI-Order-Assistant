'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const defaultActionList = require('./actionList');
const { sendNotification, DEFAULT_NOTIFICATIONS_PATH } = require('./notifier');

/**
 * Known failureReason -> recommended action mappings (REQ-006). A
 * failureReason not in this map has no known recommendation — the caller
 * (recommendAction) treats that as "no recommendation possible" rather than
 * guessing.
 */
const ACTION_MAP = {
  card_declined: {
    recommendedAction: 'retry_payment_with_updated_method',
    rationale: 'Card was declined; asking the customer to retry with an updated payment method resolves most one-off declines.',
  },
  insufficient_funds: {
    recommendedAction: 'notify_customer_to_add_funds',
    rationale: 'Payment failed for insufficient funds; the customer needs to add funds or use a different method before retrying.',
  },
  expired_card: {
    recommendedAction: 'request_updated_card',
    rationale: 'Card on file is expired; the customer must supply a valid card before the payment can succeed.',
  },
};

function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return 'evidence is missing or not an object';
  }
  if (!evidence.orderId || typeof evidence.orderId !== 'string') {
    return 'evidence is missing a string orderId';
  }
  if (!evidence.failureReason || typeof evidence.failureReason !== 'string') {
    return 'evidence is missing a string failureReason';
  }
  return null;
}

/**
 * Recommends an action for a payment failure, given the evidence gathered by
 * gatherEvidence (REQ-005), and stores the recommendation for review
 * (REQ-006). Every outcome is logged to the audit trail with rationale
 * (REQ-015): a recommendation logs why it was chosen, and an unmappable
 * failureReason logs that none was possible instead of guessing.
 *
 * Failure paths handled here:
 *  - Incorrect input (missing/malformed evidence) is rejected, logged, and
 *    thrown rather than producing a bogus recommendation.
 *  - A storage failure while recording the recommendation is logged, alerted,
 *    and re-thrown rather than swallowed (mirrors gatherEvidence.js).
 *  - When no recommendation is possible, a notification is sent (REQ-006
 *    acceptance criterion 2); if the notification itself fails to send, that
 *    is logged, alerted, and re-thrown rather than swallowed.
 *
 * options.actionList defaults to the real actionList module; options.notify
 * defaults to the real notifier. Tests inject stand-ins to simulate storage
 * or notification failures without touching the real ones.
 */
function recommendAction(evidence, options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.actionList ?? defaultActionList;
  const notify = options.notify ?? sendNotification;
  const notificationsPath = options.notificationsPath ?? DEFAULT_NOTIFICATIONS_PATH;

  const orderId = evidence && typeof evidence === 'object' ? evidence.orderId : undefined;

  const validationError = validateEvidence(evidence);
  if (validationError) {
    const failureEvent = {
      type: 'recommendation_failed',
      orderId,
      issueType: 'payment_failure',
      reason: validationError,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Recommendation failed: ${validationError}`);
  }

  const mapping = ACTION_MAP[evidence.failureReason];

  if (!mapping) {
    logEvent(
      {
        type: 'recommendation_not_possible',
        orderId: evidence.orderId,
        issueType: 'payment_failure',
        failureReason: evidence.failureReason,
      },
      logPath,
    );

    try {
      notify(
        {
          type: 'no_recommendation_notification',
          orderId: evidence.orderId,
          issueType: 'payment_failure',
          failureReason: evidence.failureReason,
          message: `No recommendation available for order ${evidence.orderId} (failureReason: ${evidence.failureReason}); needs manual review.`,
        },
        notificationsPath,
      );
    } catch (notifyErr) {
      const failureEvent = {
        type: 'notification_failed',
        orderId: evidence.orderId,
        issueType: 'payment_failure',
        reason: notifyErr.message,
      };
      logEvent(failureEvent, logPath);
      logEvent(failureEvent, alertPath);
      throw new Error(`Notification failed: ${notifyErr.message}`);
    }

    logEvent(
      {
        type: 'notification_sent',
        orderId: evidence.orderId,
        issueType: 'payment_failure',
        failureReason: evidence.failureReason,
      },
      logPath,
    );

    return null;
  }

  let storedRecord;
  try {
    storedRecord = table.insert({
      orderId: evidence.orderId,
      issueType: 'payment_failure',
      recommendedAction: mapping.recommendedAction,
      rationale: mapping.rationale,
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'recommendation_storage_failed',
      orderId: evidence.orderId,
      issueType: 'payment_failure',
      recommendedAction: mapping.recommendedAction,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Recommendation storage failed: ${storageErr.message}`);
  }

  logEvent(
    {
      type: 'action_recommended',
      orderId: evidence.orderId,
      issueType: 'payment_failure',
      recommendedAction: mapping.recommendedAction,
      rationale: mapping.rationale,
    },
    logPath,
  );

  return storedRecord;
}

module.exports = { recommendAction, ACTION_MAP };
