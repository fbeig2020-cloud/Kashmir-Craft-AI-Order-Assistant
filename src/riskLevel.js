'use strict';

/**
 * Known recommendedAction -> risk mappings (REQ-007). All three actions
 * recommended by recommendAction.js today ask the customer to take the next
 * step (retry, add funds, supply a new card) — none of them move money or
 * change order state on their own, so each is low risk.
 *
 * A recommendedAction not in this map is deliberately NOT guessed as low
 * risk: getRiskLevel falls back to 'high' for anything unrecognized, so an
 * action this table doesn't know about gets the cautious label instead of a
 * silently wrong one (the "incorrect risk levels" failure path).
 */
const RISK_MAP = {
  retry_payment_with_updated_method: {
    riskLevel: 'low',
    riskRationale: 'Asks the customer to retry with an updated payment method; no charge or order change happens automatically.',
  },
  notify_customer_to_add_funds: {
    riskLevel: 'low',
    riskRationale: 'Only notifies the customer to add funds; no charge or order change happens automatically.',
  },
  request_updated_card: {
    riskLevel: 'low',
    riskRationale: 'Only requests a new card from the customer; no charge or order change happens automatically.',
  },
};

const UNKNOWN_ACTION_RISK = {
  riskLevel: 'high',
  riskRationale: 'recommendedAction is not in the known risk map; defaulting to high risk rather than guessing low.',
};

/**
 * Looks up the risk level and rationale for a recommendedAction string.
 * Never throws and never returns null/undefined — an unrecognized action
 * still gets a risk (high), so callers always have something to log and
 * display rather than a missing value.
 */
function getRiskLevel(recommendedAction) {
  return RISK_MAP[recommendedAction] ?? UNKNOWN_ACTION_RISK;
}

module.exports = { getRiskLevel, RISK_MAP, UNKNOWN_ACTION_RISK };
