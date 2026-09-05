'use strict';

const { logEvent } = require('./logger');

const DEFAULT_WINDOW_MINUTES = 10;

function normalizeItems(items) {
  return [...items]
    .map((item) => ({ sku: item.sku, quantity: item.quantity }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

function sameItems(a, b) {
  return JSON.stringify(normalizeItems(a)) === JSON.stringify(normalizeItems(b));
}

function validateOrder(order, label) {
  if (!order || typeof order !== 'object') {
    throw new Error(`${label} order is missing or not an object`);
  }
  if (!order.orderId || typeof order.orderId !== 'string') {
    throw new Error(`${label} order is missing a string orderId`);
  }
  if (!order.customerId || typeof order.customerId !== 'string') {
    throw new Error(`${label} order is missing a string customerId`);
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error(`${label} order is missing a non-empty items array`);
  }
  for (const item of order.items) {
    if (!item || typeof item.sku !== 'string' || typeof item.quantity !== 'number') {
      throw new Error(`${label} order has an invalid item entry`);
    }
  }
  if (Number.isNaN(new Date(order.submittedAt).getTime())) {
    throw new Error(`${label} order has an invalid submittedAt timestamp`);
  }
}

/**
 * Checks a newly submitted order against existing orders for a duplicate:
 * same customer, same items, submitted within `windowMinutes` of each other.
 * Every check logs its outcome (REQ-015) — a detection and a clean result
 * both get an audit entry, so a missing flag can be trusted as a real "no
 * duplicate" rather than a check that silently never ran.
 */
function detectDuplicate(order, existingOrders, options = {}) {
  const windowMinutes = options.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
  const logPath = options.logPath;

  validateOrder(order, 'submitted');
  if (!Array.isArray(existingOrders)) {
    throw new Error('existingOrders must be an array');
  }
  existingOrders.forEach((existing) => validateOrder(existing, 'existing'));

  const submittedAt = new Date(order.submittedAt).getTime();
  const windowMs = windowMinutes * 60 * 1000;

  const match = existingOrders.find((existing) => {
    if (existing.orderId === order.orderId) return false;
    if (existing.customerId !== order.customerId) return false;
    if (!sameItems(existing.items, order.items)) return false;
    const existingAt = new Date(existing.submittedAt).getTime();
    return Math.abs(submittedAt - existingAt) <= windowMs;
  });

  if (match) {
    logEvent(
      {
        type: 'duplicate_detected',
        orderId: order.orderId,
        duplicateOfOrderId: match.orderId,
        customerId: order.customerId,
      },
      logPath,
    );
    return { isDuplicate: true, duplicateOfOrderId: match.orderId };
  }

  logEvent(
    {
      type: 'no_duplicate_found',
      orderId: order.orderId,
      customerId: order.customerId,
    },
    logPath,
  );
  return { isDuplicate: false, duplicateOfOrderId: null };
}

module.exports = { detectDuplicate, DEFAULT_WINDOW_MINUTES };
