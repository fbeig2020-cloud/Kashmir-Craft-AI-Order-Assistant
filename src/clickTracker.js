'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const { sendNotification, DEFAULT_NOTIFICATIONS_PATH } = require('./notifier');
const { getScreen } = require('./screenDefinitions');
const defaultClickLogTable = require('./clickLogTable');

const MAX_CLICKS = 3;

function validateAttempt(screenId, clickCount) {
  if (!getScreen(screenId)) {
    return `screenId "${screenId}" is not a known screen`;
  }
  if (typeof clickCount !== 'number' || !Number.isInteger(clickCount) || clickCount < 0) {
    return 'clickCount must be a non-negative integer';
  }
  return null;
}

/**
 * Records how many clicks it took a support agent to complete a screen's
 * primary action (REQ-013). There is no UI layer in this codebase, so
 * "screen" and "clicks" are defined in screenDefinitions.js against
 * workflows that already exist in the backend.
 *
 * Failure paths handled here:
 *  - An unknown screenId or a malformed clickCount is rejected, logged,
 *    alerted, and thrown ("click count logging fails" starts here — bad
 *    input never reaches storage).
 *  - A storage failure while recording the click count is logged, alerted,
 *    and re-thrown rather than swallowed ("click count logging fails").
 *  - clickCount > MAX_CLICKS ("primary action takes more than three
 *    clicks") triggers a notification to streamline the workflow; if that
 *    notification itself fails, it is logged, alerted, and re-thrown
 *    ("notification for excessive clicks does not appear") — the click-count
 *    row is already stored by this point, so the audit record survives even
 *    though the notification did not.
 *  - Every attempt, whether within the limit or not, is logged as
 *    click_count_logged with the click count (the trust criterion).
 *
 * options.clickLogTable defaults to the real table. Tests inject a stand-in
 * to simulate storage/notification failures without touching the real ones.
 */
function completeAction(screenId, clickCount, options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.clickLogTable ?? defaultClickLogTable;
  const notify = options.notify ?? sendNotification;
  const notificationsPath = options.notificationsPath ?? DEFAULT_NOTIFICATIONS_PATH;

  const validationError = validateAttempt(screenId, clickCount);
  if (validationError) {
    const failureEvent = {
      type: 'click_tracking_failed',
      screenId,
      clickCount,
      reason: validationError,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Click tracking failed: ${validationError}`);
  }

  const screen = getScreen(screenId);
  const withinLimit = clickCount <= MAX_CLICKS;

  let storedRecord;
  try {
    storedRecord = table.insert({
      screenId,
      primaryAction: screen.primaryAction,
      clickCount,
      withinLimit,
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'click_tracking_failed',
      screenId,
      primaryAction: screen.primaryAction,
      clickCount,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Click tracking failed: ${storageErr.message}`);
  }

  if (!withinLimit) {
    try {
      notify(
        {
          type: 'excessive_clicks_notification',
          screenId,
          screenName: screen.screenName,
          primaryAction: screen.primaryAction,
          clickCount,
          message: `Screen "${screen.screenName}": primary action "${screen.primaryAction}" took ${clickCount} clicks, exceeding the ${MAX_CLICKS}-click limit. Streamline this workflow.`,
        },
        notificationsPath,
      );
    } catch (notifyErr) {
      const failureEvent = {
        type: 'notification_failed',
        screenId,
        primaryAction: screen.primaryAction,
        clickCount,
        reason: notifyErr.message,
      };
      logEvent(failureEvent, logPath);
      logEvent(failureEvent, alertPath);
      throw new Error(`Notification failed: ${notifyErr.message}`);
    }

    logEvent(
      {
        type: 'excessive_clicks_detected',
        screenId,
        screenName: screen.screenName,
        primaryAction: screen.primaryAction,
        clickCount,
      },
      logPath,
    );
  }

  logEvent(
    {
      type: 'click_count_logged',
      screenId,
      screenName: screen.screenName,
      primaryAction: screen.primaryAction,
      clickCount,
      withinLimit,
    },
    logPath,
  );

  return storedRecord;
}

module.exports = { completeAction, MAX_CLICKS };
