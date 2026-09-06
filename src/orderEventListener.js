'use strict';

const { logEvent } = require('./logger');
const orderEventsTable = require('./orderEventsTable');

const DEFAULT_MAX_RETRIES = 3;

function validateOrderEvent(event) {
  if (!event || typeof event !== 'object') {
    return 'order event is missing or not an object';
  }
  if (!event.orderId || typeof event.orderId !== 'string') {
    return 'order event is missing a string orderId';
  }
  if (!event.submittedAt || Number.isNaN(new Date(event.submittedAt).getTime())) {
    return 'order event has an invalid submittedAt timestamp';
  }
  return null;
}

/**
 * Writes one order_events row and mirrors it to the audit log (REQ-015), so
 * the table and the audit trail can never drift apart from a caller doing
 * only one of the two.
 */
function recordOrderEvent(orderId, submittedAt, status, extra, logPath) {
  const timestamp = new Date().toISOString();
  orderEventsTable.insert({ orderId, submittedAt, status, timestamp, ...extra });
  logEvent({ type: 'order_event', orderId, submittedAt, status, ...extra }, logPath);
}

/**
 * Entry point standing in for the order-submission trigger (REQ-012). This
 * walking skeleton has no real message queue or webhook yet, so "receiving
 * the event" is this function being called with the event payload; a
 * dropped or garbled delivery is simulated as a payload that fails
 * validation. Every attempt — success or failure — is written to the
 * order_events table and the audit log, so a missing row can be trusted as
 * "never attempted" rather than "attempted but not logged".
 *
 * options.process: function(event) => any, the downstream processing to
 * kick off once the event is accepted. Defaults to a no-op stub since the
 * actual processing (STORY-013/014) doesn't exist yet.
 */
function handleOrderSubmission(rawEvent, options = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const logPath = options.logPath;
  const process = options.process ?? (() => {});

  const orderId = rawEvent && typeof rawEvent === 'object' ? rawEvent.orderId : undefined;
  const submittedAt = rawEvent && typeof rawEvent === 'object' ? rawEvent.submittedAt : undefined;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const validationError = validateOrderEvent(rawEvent);

    if (validationError) {
      lastError = validationError;
      recordOrderEvent(orderId, submittedAt, 'error', { attempt, reason: validationError }, logPath);
      continue;
    }

    recordOrderEvent(orderId, submittedAt, 'received', { attempt }, logPath);

    try {
      const result = process(rawEvent);
      recordOrderEvent(orderId, submittedAt, 'processing_started', { attempt }, logPath);
      return { started: true, attempt, result };
    } catch (processErr) {
      recordOrderEvent(orderId, submittedAt, 'processing_error', { attempt, reason: processErr.message }, logPath);
      throw processErr;
    }
  }

  throw new Error(`Order event could not be received after ${maxRetries} attempts: ${lastError}`);
}

module.exports = { handleOrderSubmission, DEFAULT_MAX_RETRIES };
