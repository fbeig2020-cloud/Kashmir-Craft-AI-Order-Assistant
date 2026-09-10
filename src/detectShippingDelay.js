'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const defaultShippingDelaysTable = require('./shippingDelaysTable');
const { fetchShippingData } = require('./shippingData');

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 5000;

/** Races a (possibly synchronous) data source call against a deadline. */
function withTimeout(work, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`shipping data source timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    Promise.resolve()
      .then(work)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Calls the shipping data source with a capped number of attempts and an
 * explicit timeout per attempt. Exhausting all attempts is the "data source
 * unavailable" failure path: it is logged, alerted, and thrown rather than
 * swallowed.
 */
async function fetchWithRetries(dataSource, sourceOptions, maxRetries, timeoutMs, logPath, alertPath) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await withTimeout(() => dataSource(sourceOptions), timeoutMs);
    } catch (err) {
      lastError = err;
      logEvent({ type: 'shipping_data_source_attempt_failed', attempt, reason: err.message }, logPath);
    }
  }

  const failureEvent = {
    type: 'shipping_data_source_unavailable',
    attempts: maxRetries,
    reason: lastError.message,
  };
  logEvent(failureEvent, logPath);
  logEvent(failureEvent, alertPath);
  throw new Error(`Shipping data source unavailable after ${maxRetries} attempts: ${lastError.message}`);
}

function validateShipmentRecord(item) {
  if (!item || typeof item !== 'object') {
    return 'shipment record is missing or not an object';
  }
  if (!item.orderId || typeof item.orderId !== 'string') {
    return 'shipment record is missing a string orderId';
  }
  if (typeof item.expectedDurationDays !== 'number' || Number.isNaN(item.expectedDurationDays)) {
    return 'shipment record is missing a numeric expectedDurationDays';
  }
  if (typeof item.actualDurationDays !== 'number' || Number.isNaN(item.actualDurationDays)) {
    return 'shipment record is missing a numeric actualDurationDays';
  }
  return null;
}

/**
 * Checks one shipment record against its expected duration. A malformed
 * record is logged as incomplete data and skipped (it must not stop the
 * rest of the batch from being checked); a genuine delay is stored in the
 * shipping_delays table and logged with full details, so a storage failure
 * is alerted and thrown rather than silently dropping the delay.
 */
function checkOneRecord(item, table, logPath, alertPath) {
  const orderId = item && typeof item === 'object' ? item.orderId : undefined;

  const validationError = validateShipmentRecord(item);
  if (validationError) {
    const failureEvent = { type: 'shipping_data_incomplete', orderId, reason: validationError };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    return { orderId, isDelayed: false, error: validationError };
  }

  if (item.actualDurationDays <= item.expectedDurationDays) {
    logEvent(
      {
        type: 'no_shipping_delay_found',
        orderId: item.orderId,
        expectedDurationDays: item.expectedDurationDays,
        actualDurationDays: item.actualDurationDays,
      },
      logPath,
    );
    return { orderId: item.orderId, isDelayed: false };
  }

  const details = {
    orderId: item.orderId,
    carrier: item.carrier ?? null,
    shippedAt: item.shippedAt ?? null,
    expectedDurationDays: item.expectedDurationDays,
    actualDurationDays: item.actualDurationDays,
    destination: item.destination ?? null,
  };

  let storedRecord;
  try {
    storedRecord = table.insert({
      orderId: item.orderId,
      issueType: 'shipping_delay',
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'shipping_delay_not_logged',
      orderId: item.orderId,
      details,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Shipping delay storage failed: ${storageErr.message}`);
  }

  logEvent(
    { type: 'shipping_delay_detected', orderId: item.orderId, issueType: 'shipping_delay', details },
    logPath,
  );

  return { orderId: item.orderId, isDelayed: true, record: storedRecord };
}

/**
 * Checks the online shipping data source for shipments whose actual
 * duration exceeds the expected duration (REQ-004) and logs every detected
 * delay to the shipping_delays table.
 *
 * options.dataSource defaults to shippingData's fetchShippingData; tests
 * inject a stand-in to simulate an unavailable or empty source without
 * touching the real one. options.shippingDelaysTable defaults to the real
 * table; tests inject a stand-in to simulate a storage failure.
 */
async function detectShippingDelays(options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.shippingDelaysTable ?? defaultShippingDelaysTable;
  const dataSource = options.dataSource ?? fetchShippingData;
  const sourceOptions = options.sourceOptions ?? {};
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const records = await fetchWithRetries(dataSource, sourceOptions, maxRetries, timeoutMs, logPath, alertPath);

  if (!Array.isArray(records) || records.length === 0) {
    const failureEvent = {
      type: 'shipping_data_incomplete',
      reason: 'data source returned no shipment records',
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error('Shipping data incomplete: data source returned no shipment records');
  }

  return records.map((item) => checkOneRecord(item, table, logPath, alertPath));
}

module.exports = { detectShippingDelays, DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS };
