'use strict';

const { logEvent } = require('./logger');

function validateOrder(order) {
  if (!order || typeof order !== 'object') {
    throw new Error('order is missing or not an object');
  }
  if (!order.orderId || typeof order.orderId !== 'string') {
    throw new Error('order is missing a string orderId');
  }
  if (!order.customerId || typeof order.customerId !== 'string') {
    throw new Error('order is missing a string customerId');
  }
  if (!order.paymentStatus || typeof order.paymentStatus !== 'string') {
    throw new Error('order is missing a string paymentStatus');
  }
}

/**
 * Checks a single order (as read from the online data source) for a failed
 * payment: paymentStatus === 'failed'. Every check logs its outcome
 * (REQ-015) — a detection and a clean result both get an audit entry, so a
 * missing flag can be trusted as a real "no failure" rather than a check
 * that silently never ran.
 */
function detectPaymentFailure(order, options = {}) {
  const logPath = options.logPath;

  validateOrder(order);

  if (order.paymentStatus === 'failed') {
    logEvent(
      {
        type: 'payment_failure_detected',
        orderId: order.orderId,
        customerId: order.customerId,
        failureReason: order.failureReason ?? null,
      },
      logPath,
    );
    return { isPaymentFailure: true, orderId: order.orderId, failureReason: order.failureReason ?? null };
  }

  logEvent(
    {
      type: 'no_payment_failure_found',
      orderId: order.orderId,
      customerId: order.customerId,
    },
    logPath,
  );
  return { isPaymentFailure: false, orderId: order.orderId, failureReason: null };
}

module.exports = { detectPaymentFailure };
