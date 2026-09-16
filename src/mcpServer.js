'use strict';

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const { detectPaymentFailure } = require('./detectPaymentFailure');
const { gatherEvidence } = require('./gatherEvidence');
const { recommendAction } = require('./recommendAction');
const { assessRisk } = require('./assessRisk');
const { requireApproval } = require('./requireApproval');

const server = new McpServer({ name: 'kashmir-craft-order-assistant', version: '0.1.0' });

const optionsSchema = {
  logPath: z.string().optional(),
  alertPath: z.string().optional(),
  notificationsPath: z.string().optional(),
};

function buildOptions({ logPath, alertPath, notificationsPath }) {
  const options = {};
  if (logPath) options.logPath = logPath;
  if (alertPath) options.alertPath = alertPath;
  if (notificationsPath) options.notificationsPath = notificationsPath;
  return options;
}

function toolResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

server.registerTool(
  'detect_payment_failure',
  {
    title: 'Detect payment failure',
    description: 'Wraps detectPaymentFailure: checks a single order for a failed payment (paymentStatus === "failed") and logs the outcome.',
    inputSchema: {
      order: z.object({
        orderId: z.string(),
        customerId: z.string(),
        paymentStatus: z.string(),
        failureReason: z.string().optional(),
      }),
      ...optionsSchema,
    },
  },
  async ({ order, logPath, alertPath, notificationsPath }) => {
    const result = detectPaymentFailure(order, buildOptions({ logPath, alertPath, notificationsPath }));
    return toolResult(result);
  },
);

server.registerTool(
  'gather_evidence',
  {
    title: 'Gather evidence',
    description: 'Wraps gatherEvidence: stores evidence for an already-identified payment failure and logs the outcome.',
    inputSchema: {
      paymentFailure: z.object({
        orderId: z.string(),
        customerId: z.string(),
        failureReason: z.string(),
        amount: z.number().optional(),
        paymentMethod: z.string().optional(),
        detectedAt: z.string().optional(),
      }),
      ...optionsSchema,
    },
  },
  async ({ paymentFailure, logPath, alertPath, notificationsPath }) => {
    const result = gatherEvidence(paymentFailure, buildOptions({ logPath, alertPath, notificationsPath }));
    return toolResult(result);
  },
);

server.registerTool(
  'recommend_action',
  {
    title: 'Recommend action',
    description: 'Wraps recommendAction: recommends and stores an action for a payment failure given gathered evidence, or notifies when none is possible.',
    inputSchema: {
      evidence: z.object({
        orderId: z.string(),
        failureReason: z.string(),
      }).passthrough(),
      ...optionsSchema,
    },
  },
  async ({ evidence, logPath, alertPath, notificationsPath }) => {
    const result = recommendAction(evidence, buildOptions({ logPath, alertPath, notificationsPath }));
    return toolResult(result);
  },
);

server.registerTool(
  'assess_risk',
  {
    title: 'Assess risk',
    description: 'Wraps assessRisk: assesses and stores the risk of a recommended action.',
    inputSchema: {
      actionRecord: z.object({
        orderId: z.string(),
        issueType: z.string(),
        recommendedAction: z.string(),
        rationale: z.string(),
      }).passthrough(),
      ...optionsSchema,
    },
  },
  async ({ actionRecord, logPath, alertPath, notificationsPath }) => {
    const result = assessRisk(actionRecord, buildOptions({ logPath, alertPath, notificationsPath }));
    return toolResult(result);
  },
);

server.registerTool(
  'require_approval',
  {
    title: 'Require approval',
    description: 'Wraps requireApproval: requires human approval for a high-risk action before it can proceed.',
    inputSchema: {
      record: z.object({
        orderId: z.string(),
        issueType: z.string(),
        recommendedAction: z.string(),
        rationale: z.string(),
        riskLevel: z.string(),
        riskRationale: z.string(),
      }).passthrough(),
      ...optionsSchema,
    },
  },
  async ({ record, logPath, alertPath, notificationsPath }) => {
    const result = requireApproval(record, buildOptions({ logPath, alertPath, notificationsPath }));
    return toolResult(result);
  },
);

/**
 * Drives all 5 stages in sequence, carrying fields between them that the
 * individual tools cannot pass on their own: gatherEvidence needs
 * customerId/amount/paymentMethod from the original order (not present in
 * detectPaymentFailure's output), and recommendAction needs the nested
 * .evidence object from gatherEvidence's stored record, not the record
 * itself. Stops early (without erroring) when there's no failure to chase or
 * no recommendation to assess; any inner throw is re-thrown with the stage
 * name attached instead of being swallowed.
 */
function runPaymentFailurePipeline(order, options) {
  const stages = {};

  let detectResult;
  try {
    detectResult = detectPaymentFailure(order, options);
  } catch (err) {
    throw new Error(`Pipeline failed at stage 'detect_payment_failure': ${err.message}`, { cause: err });
  }
  stages.detectPaymentFailure = detectResult;

  if (!detectResult.isPaymentFailure) {
    return { finalStage: 'detect_payment_failure', outcome: 'no_failure_detected', stages };
  }

  const paymentFailureInput = {
    orderId: detectResult.orderId,
    customerId: order.customerId,
    failureReason: detectResult.failureReason,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    detectedAt: order.detectedAt,
  };

  let evidenceRecord;
  try {
    evidenceRecord = gatherEvidence(paymentFailureInput, options);
  } catch (err) {
    throw new Error(`Pipeline failed at stage 'gather_evidence': ${err.message}`, { cause: err });
  }
  stages.gatherEvidence = evidenceRecord;

  let actionRecord;
  try {
    actionRecord = recommendAction(evidenceRecord.evidence, options);
  } catch (err) {
    throw new Error(`Pipeline failed at stage 'recommend_action': ${err.message}`, { cause: err });
  }
  stages.recommendAction = actionRecord;

  if (actionRecord === null) {
    return { finalStage: 'recommend_action', outcome: 'no_recommendation_possible', stages };
  }

  let riskRecord;
  try {
    riskRecord = assessRisk(actionRecord, options);
  } catch (err) {
    throw new Error(`Pipeline failed at stage 'assess_risk': ${err.message}`, { cause: err });
  }
  stages.assessRisk = riskRecord;

  let approvalResult;
  try {
    approvalResult = requireApproval(riskRecord, options);
  } catch (err) {
    throw new Error(`Pipeline failed at stage 'require_approval': ${err.message}`, { cause: err });
  }
  stages.requireApproval = approvalResult;

  return { finalStage: 'require_approval', outcome: approvalResult.status, stages };
}

server.registerTool(
  'run_payment_failure_pipeline',
  {
    title: 'Run payment failure pipeline',
    description:
      'Drives detect_payment_failure -> gather_evidence -> recommend_action -> assess_risk -> require_approval in sequence for a single order, carrying fields between stages that the individual tools cannot pass on their own. Proves end-to-end wiring. Stops early and reports the outcome if no failure is found or no action can be recommended.',
    inputSchema: {
      order: z.object({
        orderId: z.string(),
        customerId: z.string(),
        paymentStatus: z.string(),
        failureReason: z.string().optional(),
        amount: z.number().optional(),
        paymentMethod: z.string().optional(),
        detectedAt: z.string().optional(),
      }),
      ...optionsSchema,
    },
  },
  async ({ order, logPath, alertPath, notificationsPath }) => {
    const result = runPaymentFailurePipeline(order, buildOptions({ logPath, alertPath, notificationsPath }));
    return toolResult(result);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error starting MCP server: ${err.stack || err.message}\n`);
  process.exit(1);
});
