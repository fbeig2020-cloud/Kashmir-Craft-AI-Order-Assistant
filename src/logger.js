'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_LOG_PATH = path.join(__dirname, '..', 'logs', 'audit.log');
const DEFAULT_ALERT_PATH = path.join(__dirname, '..', 'logs', 'alerts.log');

/**
 * Records that the audit log itself failed to write, so the failure leaves a
 * durable trace even if the caller's exception handling doesn't forward it
 * anywhere (REQ-015: logging failures must raise an alert, not just throw).
 *
 * Does not swallow its own failure: if the alert write fails too, that
 * reason is returned so the caller can fold it into the error it throws.
 */
function raiseAlert(event, err, alertPath) {
  const alertEntry = {
    timestamp: new Date().toISOString(),
    type: 'audit_log_write_failed',
    originalEvent: event,
    reason: err.message,
  };

  try {
    fs.mkdirSync(path.dirname(alertPath), { recursive: true });
    fs.appendFileSync(alertPath, JSON.stringify(alertEntry) + '\n');
    return null;
  } catch (alertErr) {
    return alertErr;
  }
}

/**
 * Appends one structured, timestamped entry to the audit log.
 * Every action or decision the system makes must go through here (REQ-015).
 *
 * Throws rather than swallowing on write failure, so a logging failure is
 * visible to the caller instead of silently vanishing. Before throwing, it
 * also raises an alert (a separate durable record) so the failure is
 * discoverable even if the caller doesn't propagate the exception.
 */
function logEvent(event, logPath = DEFAULT_LOG_PATH, alertPath = DEFAULT_ALERT_PATH) {
  if (!event || typeof event.type !== 'string') {
    throw new Error('logEvent requires an event object with a string "type"');
  }

  const entry = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, line);
  } catch (err) {
    const alertErr = raiseAlert(entry, err, alertPath);
    if (alertErr) {
      throw new Error(
        `Audit log write failed: ${err.message} (alert also failed: ${alertErr.message})`,
      );
    }
    throw new Error(`Audit log write failed: ${err.message}`);
  }

  return entry;
}

module.exports = { logEvent, DEFAULT_LOG_PATH, DEFAULT_ALERT_PATH };
