'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_LOG_PATH = path.join(__dirname, '..', 'logs', 'audit.log');

/**
 * Appends one structured, timestamped entry to the audit log.
 * Every action or decision the system makes must go through here (REQ-015).
 *
 * Throws rather than swallowing on write failure, so a logging failure is
 * visible to the caller instead of silently vanishing.
 */
function logEvent(event, logPath = DEFAULT_LOG_PATH) {
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
    throw new Error(`Audit log write failed: ${err.message}`);
  }

  return entry;
}

module.exports = { logEvent, DEFAULT_LOG_PATH };
