'use strict';

const { logEvent, DEFAULT_ALERT_PATH } = require('./logger');
const { sendNotification, DEFAULT_NOTIFICATIONS_PATH } = require('./notifier');
const defaultRiskAssessmentTable = require('./riskAssessmentTable');

const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high']);

function validatePreparedAction(row) {
  if (!row || typeof row !== 'object') {
    return 'a prepared action is missing or not an object';
  }
  if (!row.orderId || typeof row.orderId !== 'string') {
    return 'a prepared action is missing a string orderId';
  }
  if (!row.issueType || typeof row.issueType !== 'string') {
    return 'a prepared action is missing a string issueType';
  }
  if (!row.recommendedAction || typeof row.recommendedAction !== 'string') {
    return 'a prepared action is missing a string recommendedAction';
  }
  if (!row.rationale || typeof row.rationale !== 'string') {
    return 'a prepared action is missing a string rationale';
  }
  if (!row.riskLevel || typeof row.riskLevel !== 'string') {
    return 'a prepared action is missing a string riskLevel';
  }
  return null;
}

/**
 * A prepared action can pass structural validation (right fields, right
 * types) yet still be wrong to show an agent: a riskLevel outside the
 * recognized set would render as a misleading summary line rather than a
 * missing one, so it is checked separately as "incorrect summary" rather
 * than folded into validatePreparedAction's "generation failure" check.
 */
function findIncorrectRiskLevel(row) {
  if (!VALID_RISK_LEVELS.has(row.riskLevel)) {
    return `prepared action for order ${row.orderId} has an unrecognized riskLevel: ${JSON.stringify(row.riskLevel)}`;
  }
  return null;
}

function summaryLineFor(row) {
  return `Order ${row.orderId}: ${row.recommendedAction} (risk: ${row.riskLevel}) — ${row.rationale}`;
}

/**
 * Builds a summary of prepared actions (recommended + risk-assessed, from
 * assessRisk.js / STORY-005) for a support agent to review before anything
 * executes (REQ-011). This story does not decide what "prepared" means
 * beyond that boundary -- the same way pauseProcessing.js/verifyOutcome.js
 * take assessRisk.js's output as given, or add a way to act on the summary
 * (future story).
 *
 * There is no summaries table: a summary is a derived, point-in-time view
 * over riskAssessmentTable, not a new stored entity, so nothing new is
 * persisted here -- only the *event* of generating it is logged (the trust
 * criterion). The returned object is itself the "displayed to the agent"
 * artifact, since no UI layer exists yet anywhere in this codebase (the
 * same stand-in the other stories use for their return value/log entry).
 *
 * Failure paths handled here:
 *  - Summary generation failure: the source table throwing, returning
 *    something other than an array, or any row in it missing a required
 *    field, is logged (summary_generation_failed), alerted, and re-thrown
 *    rather than returning a partial or bogus summary.
 *  - Incorrect summary: a row that is structurally complete but carries a
 *    riskLevel outside low/medium/high would render a misleading line to
 *    the agent rather than a missing one, so it is rejected separately
 *    (summary_incorrect) rather than silently included or folded into the
 *    generation-failure case.
 *  - Alert failure: either failure above is reported as a notification to
 *    the agent; if that notification itself fails to send, that is logged
 *    and alerted separately as alert_failed and re-thrown, rather than
 *    letting the original failure vanish silently.
 *
 * options.riskAssessmentTable defaults to the real table. Tests inject a
 * stand-in to simulate a source failure without touching the real one.
 */
function generateActionSummary(options = {}) {
  const logPath = options.logPath;
  const alertPath = options.alertPath ?? DEFAULT_ALERT_PATH;
  const table = options.riskAssessmentTable ?? defaultRiskAssessmentTable;
  const notify = options.notify ?? sendNotification;
  const notificationsPath = options.notificationsPath ?? DEFAULT_NOTIFICATIONS_PATH;

  let rows;
  let failureType;
  let failureReason;

  try {
    rows = table.getAll();
    if (!Array.isArray(rows)) {
      failureType = 'summary_generation_failed';
      failureReason = 'riskAssessmentTable.getAll() did not return an array';
    } else {
      for (const row of rows) {
        const structuralError = validatePreparedAction(row);
        if (structuralError) {
          failureType = 'summary_generation_failed';
          failureReason = structuralError;
          break;
        }
        const riskLevelError = findIncorrectRiskLevel(row);
        if (riskLevelError) {
          failureType = 'summary_incorrect';
          failureReason = riskLevelError;
          break;
        }
      }
    }
  } catch (err) {
    failureType = 'summary_generation_failed';
    failureReason = err.message;
  }

  let summary;
  if (!failureReason) {
    const actions = rows.map((row) => ({
      orderId: row.orderId,
      issueType: row.issueType,
      recommendedAction: row.recommendedAction,
      rationale: row.rationale,
      riskLevel: row.riskLevel,
      riskRationale: row.riskRationale,
      summaryLine: summaryLineFor(row),
    }));

    summary = {
      generatedAt: new Date().toISOString(),
      actionCount: actions.length,
      actions,
    };
  }

  if (failureReason) {
    const errorPrefix = failureType === 'summary_incorrect' ? 'Summary incorrect' : 'Summary generation failed';
    const failureEvent = { type: failureType, reason: failureReason };
    logEvent(failureEvent, logPath);
    logEvent(failureEvent, alertPath);

    try {
      notify(
        {
          type: `${failureType}_notification`,
          reason: failureReason,
          message: `${errorPrefix}: ${failureReason}`,
        },
        notificationsPath,
      );
    } catch (notifyErr) {
      const alertFailureEvent = { type: 'alert_failed', reason: notifyErr.message };
      logEvent(alertFailureEvent, logPath);
      logEvent(alertFailureEvent, alertPath);
      throw new Error(`Alert failed: ${notifyErr.message}`);
    }

    throw new Error(`${errorPrefix}: ${failureReason}`);
  }

  logEvent(
    {
      type: 'summary_generated',
      actionCount: summary.actionCount,
      actions: summary.actions,
    },
    logPath,
  );

  return summary;
}

module.exports = { generateActionSummary };
