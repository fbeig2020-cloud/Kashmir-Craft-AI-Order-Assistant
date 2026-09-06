'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const defaultEvidenceTable = require('./evidenceTable');

function validatePaymentFailure(paymentFailure) {
  if (!paymentFailure || typeof paymentFailure !== 'object') {
    return 'payment failure is missing or not an object';
  }
  if (!paymentFailure.orderId || typeof paymentFailure.orderId !== 'string') {
    return 'payment failure is missing a string orderId';
  }
  if (!paymentFailure.customerId || typeof paymentFailure.customerId !== 'string') {
    return 'payment failure is missing a string customerId';
  }
  if (!paymentFailure.failureReason || typeof paymentFailure.failureReason !== 'string') {
    return 'payment failure is missing a string failureReason';
  }
  return null;
}

/**
 * Gathers evidence for an already-identified payment failure (REQ-005) and
 * stores it for review. Every outcome — success or failure — is logged to
 * the audit trail with the full issue details (REQ-015). A failure is
 * additionally logged to the alerts log via the same logEvent mechanism, so
 * it is discoverable even if the caller doesn't handle the thrown error,
 * before being re-thrown rather than swallowed.
 *
 * options.evidenceTable defaults to the real evidenceTable module; tests
 * inject a stand-in to simulate a storage failure without touching it.
 */
function gatherEvidence(paymentFailure, options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.evidenceTable ?? defaultEvidenceTable;

  const orderId = paymentFailure && typeof paymentFailure === 'object' ? paymentFailure.orderId : undefined;

  const validationError = validatePaymentFailure(paymentFailure);
  if (validationError) {
    const failureEvent = {
      type: 'evidence_collection_failed',
      orderId,
      issueType: 'payment_failure',
      reason: validationError,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Evidence collection failed: ${validationError}`);
  }

  const evidence = {
    orderId: paymentFailure.orderId,
    customerId: paymentFailure.customerId,
    failureReason: paymentFailure.failureReason,
    amount: paymentFailure.amount ?? null,
    paymentMethod: paymentFailure.paymentMethod ?? null,
    detectedAt: paymentFailure.detectedAt ?? new Date().toISOString(),
  };

  let storedRecord;
  try {
    storedRecord = table.insert({
      orderId: evidence.orderId,
      issueType: 'payment_failure',
      evidence,
      timestamp: new Date().toISOString(),
    });
  } catch (storageErr) {
    const failureEvent = {
      type: 'evidence_storage_failed',
      orderId: evidence.orderId,
      issueType: 'payment_failure',
      evidence,
      reason: storageErr.message,
    };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);
    throw new Error(`Evidence storage failed: ${storageErr.message}`);
  }

  logEvent(
    {
      type: 'evidence_gathered',
      orderId: evidence.orderId,
      issueType: 'payment_failure',
      evidence,
    },
    logPath,
  );

  return storedRecord;
}

module.exports = { gatherEvidence };
