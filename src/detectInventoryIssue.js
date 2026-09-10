'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const defaultInventoryIssuesTable = require('./inventoryIssuesTable');
const { fetchInventoryData } = require('./inventoryData');

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 5000;

/** Races a (possibly synchronous) data source call against a deadline. */
function withTimeout(work, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`inventory data source timed out after ${timeoutMs}ms`)),
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
 * Calls the inventory data source with a capped number of attempts and an
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
      logEvent({ type: 'inventory_data_source_attempt_failed', attempt, reason: err.message }, logPath);
    }
  }

  const failureEvent = {
    type: 'inventory_data_source_unavailable',
    attempts: maxRetries,
    reason: lastError.message,
  };
  logEvent(failureEvent, logPath);
  logEvent(failureEvent, alertPath);
  throw new Error(`Inventory data source unavailable after ${maxRetries} attempts: ${lastError.message}`);
}

function validateInventoryRecord(item) {
  if (!item || typeof item !== 'object') {
    return 'inventory record is missing or not an object';
  }
  if (!item.productId || typeof item.productId !== 'string') {
    return 'inventory record is missing a string productId';
  }
  if (typeof item.quantity !== 'number' || Number.isNaN(item.quantity)) {
    return 'inventory record is missing a numeric quantity';
  }
  if (typeof item.threshold !== 'number' || Number.isNaN(item.threshold)) {
    return 'inventory record is missing a numeric threshold';
  }
  return null;
}

/**
 * Checks one inventory record against its threshold. A malformed record is
 * logged as missing data and skipped (it must not stop the rest of the
 * batch from being checked); a genuine issue is stored in the
 * inventory_issues table and logged with full details, so a storage
 * failure is alerted and thrown rather than silently dropping the issue.
 */
function checkOneRecord(item, table, logPath, alertPath) {
  const productId = item && typeof item === 'object' ? item.productId : undefined;

  const validationError = validateInventoryRecord(item);
  if (validationError) {
    const failureEvent = { type: 'inventory_data_missing', productId, reason: validationError };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    return { productId, isIssue: false, error: validationError };
  }

  if (item.quantity >= item.threshold) {
    logEvent(
      { type: 'no_inventory_issue_found', productId: item.productId, quantity: item.quantity, threshold: item.threshold },
      logPath,
    );
    return { productId: item.productId, isIssue: false };
  }

  const details = {
    productId: item.productId,
    name: item.name ?? null,
    quantity: item.quantity,
    threshold: item.threshold,
    warehouse: item.warehouse ?? null,
  };

  let storedRecord;
  try {
    storedRecord = table.insert({
      productId: item.productId,
      issueType: 'low_inventory',
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'inventory_issue_not_logged',
      productId: item.productId,
      details,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Inventory issue storage failed: ${storageErr.message}`);
  }

  logEvent(
    { type: 'inventory_issue_detected', productId: item.productId, issueType: 'low_inventory', details },
    logPath,
  );

  return { productId: item.productId, isIssue: true, record: storedRecord };
}

/**
 * Checks the online inventory data source for stock levels below threshold
 * (REQ-003) and logs every identified issue to the inventory_issues table.
 *
 * options.dataSource defaults to inventoryData's fetchInventoryData; tests
 * inject a stand-in to simulate an unavailable or empty source without
 * touching the real one. options.inventoryIssuesTable defaults to the real
 * table; tests inject a stand-in to simulate a storage failure.
 */
async function detectInventoryIssues(options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.inventoryIssuesTable ?? defaultInventoryIssuesTable;
  const dataSource = options.dataSource ?? fetchInventoryData;
  const sourceOptions = options.sourceOptions ?? {};
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const records = await fetchWithRetries(dataSource, sourceOptions, maxRetries, timeoutMs, logPath, alertPath);

  if (!Array.isArray(records) || records.length === 0) {
    const failureEvent = {
      type: 'inventory_data_missing',
      reason: 'data source returned no inventory records',
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error('Inventory data missing: data source returned no inventory records');
  }

  return records.map((item) => checkOneRecord(item, table, logPath, alertPath));
}

module.exports = { detectInventoryIssues, DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS };
