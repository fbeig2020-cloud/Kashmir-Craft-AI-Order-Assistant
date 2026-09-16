'use strict';

/**
 * Catalog of customer support screens for REQ-013. There is no UI layer in
 * this codebase yet, so a "screen" here is a support-agent workflow already
 * present in the backend, and its "clicks" are the discrete steps an agent
 * takes to complete that workflow's primary action.
 *
 * Screen -> owning story:
 *  - review_action_summary   -> STORY-009 (actionSummary.js)
 *  - approve_high_risk_action -> STORY-006 (requireApproval.js)
 *  - resolve_paused_issue     -> STORY-008 (pauseProcessing.js)
 */
const SCREENS = {
  review_action_summary: {
    screenName: 'Review Action Summary',
    primaryAction: 'view_summary',
    steps: ['open_summary'],
  },
  approve_high_risk_action: {
    screenName: 'Approve High-Risk Action',
    primaryAction: 'approve_action',
    steps: ['open_paused_approval', 'approve'],
  },
  resolve_paused_issue: {
    screenName: 'Resolve Paused Issue',
    primaryAction: 'resolve_issue',
    steps: ['open_paused_issue', 'resolve'],
  },
};

/**
 * Looks up a screen definition by id. Returns null for an unknown id rather
 * than throwing, so callers can treat "no such screen" as their own failure
 * case (e.g. a logged/alerted error) instead of an uncaught exception.
 */
function getScreen(screenId) {
  return SCREENS[screenId] ?? null;
}

module.exports = { SCREENS, getScreen };
