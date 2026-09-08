'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_NOTIFICATIONS_PATH = path.join(__dirname, '..', 'logs', 'notifications.log');

/**
 * Sends a notification that no recommendation was possible for an order
 * issue, so a human can pick it up (REQ-006 acceptance: "when no
 * recommendation is possible, then a notification is sent"). Durable record
 * only, in the same append-only-log style as audit.log/alerts.log — no real
 * email/SMS channel wired up yet.
 *
 * Throws rather than swallowing on write failure, so the caller can log/alert
 * the notification failure instead of it vanishing silently.
 */
function sendNotification(notification, notificationsPath = DEFAULT_NOTIFICATIONS_PATH) {
  if (!notification || typeof notification.type !== 'string') {
    throw new Error('sendNotification requires a notification object with a string "type"');
  }

  const entry = {
    timestamp: new Date().toISOString(),
    ...notification,
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    fs.mkdirSync(path.dirname(notificationsPath), { recursive: true });
    fs.appendFileSync(notificationsPath, line);
  } catch (err) {
    throw new Error(`Notification send failed: ${err.message}`);
  }

  return entry;
}

module.exports = { sendNotification, DEFAULT_NOTIFICATIONS_PATH };
