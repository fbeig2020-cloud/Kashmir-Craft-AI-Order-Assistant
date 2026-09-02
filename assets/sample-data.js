/* Believable made-up data, in the exact same shape as the real
   .colaberry files, so every tab can render identically in either
   mode. Every screen that shows this must label it SAMPLE — see the
   header badge in app.js. This file is never read as the source of
   truth; .colaberry/*.json always is. Requirements/stories text is
   copied from the real plan (it's the actual backlog); only
   progress, schedule, systems and outcome trends are fabricated. */

window.CC = window.CC || {};

(function () {
  const REQUIREMENTS = [
    { id: "REQ-001", kind: "FUNC", cluster: "Order Identification", priority: "must", statement: "The system must identify duplicate orders from the online data source.", fulfilled_by: ["STORY-001"] },
    { id: "REQ-002", kind: "FUNC", cluster: "Order Identification", priority: "must", statement: "The system must detect payment failures from the online data source.", fulfilled_by: ["STORY-003"] },
    { id: "REQ-003", kind: "FUNC", cluster: "Order Identification", priority: "must", statement: "The system must identify inventory issues from the online data source.", fulfilled_by: ["STORY-013"] },
    { id: "REQ-004", kind: "FUNC", cluster: "Order Identification", priority: "must", statement: "The system must detect shipping delays from the online data source.", fulfilled_by: ["STORY-014"] },
    { id: "REQ-005", kind: "FUNC", cluster: "Evidence Gathering", priority: "must", statement: "The system must gather evidence for each identified order issue.", fulfilled_by: ["STORY-003"] },
    { id: "REQ-006", kind: "FUNC", cluster: "Action Recommendation", priority: "must", statement: "The system must recommend an action for each order issue.", fulfilled_by: ["STORY-004"] },
    { id: "REQ-007", kind: "FUNC", cluster: "Risk Assessment", priority: "must", statement: "The system must check the risk level of each recommended action.", fulfilled_by: ["STORY-005"] },
    { id: "REQ-008", kind: "FUNC", cluster: "Approval Process", priority: "must", statement: "The system must require human approval for high-risk actions.", fulfilled_by: ["STORY-006"] },
    { id: "REQ-009", kind: "FUNC", cluster: "Outcome Verification", priority: "must", statement: "The system must verify the outcome of each action taken.", fulfilled_by: ["STORY-007"] },
    { id: "REQ-010", kind: "FUNC", cluster: "Processing Control", priority: "must", statement: "The system must pause processing when unsure about an order issue.", fulfilled_by: ["STORY-008"] },
    { id: "REQ-011", kind: "FUNC", cluster: "Transparency", priority: "must", statement: "The system must provide a summary of actions prepared before execution.", fulfilled_by: ["STORY-009"] },
    { id: "REQ-012", kind: "FUNC", cluster: "Triggering", priority: "must", statement: "The system must be triggered by an order submission event.", fulfilled_by: ["STORY-012"] },
    { id: "REQ-013", kind: "NFR", cluster: "User Experience", priority: "must", statement: "Every screen the customer support team uses must complete its primary action in three clicks or fewer.", fulfilled_by: ["STORY-015"] },
    { id: "REQ-014", kind: "NFR", cluster: "Performance", priority: "must", statement: "The system must resolve order issues within 2 hours.", fulfilled_by: ["STORY-011"] },
    { id: "REQ-015", kind: "SAFE", cluster: "Audit Trail", priority: "must", statement: "The system must log all actions and decisions for audit purposes.", fulfilled_by: ["STORY-001", "STORY-002"] },
    { id: "REQ-016", kind: "CONSTRAINT", cluster: "Integration", priority: "must", statement: "The system must connect to the online data source for order information.", fulfilled_by: [] },
  ];

  const STORY_TEXT = {
    "STORY-001": { title: "Identify Duplicate Orders", release: "r0", fulfills: ["REQ-001", "REQ-015"], narrative: "As a customer support agent, I want to identify duplicate orders so that I can prevent processing errors.", acceptance: ["Given an order submission, when a duplicate order is detected, then log the detection.", "Given an order submission, when no duplicate is found, then log the result.", "Trust: All duplicate detections are logged for audit."], blocked_by: [], owner_agent: "Customer Support Team", failure_paths: ["Failure to detect duplicates", "Incorrect duplicate detection", "Logging failure"] },
    "STORY-002": { title: "Log Actions for Audit", release: "r0", fulfills: ["REQ-015"], narrative: "As a system auditor, I want all actions logged so that I can review them for compliance.", acceptance: ["Given an action is taken, when it is logged, then it appears in the audit trail.", "Given an action is taken, when logging fails, then an alert is generated.", "Trust: All actions are logged with timestamps."], blocked_by: [], owner_agent: "System Auditor", failure_paths: ["Logging system failure", "Incomplete logs", "Timestamp errors"] },
    "STORY-003": { title: "Gather Evidence for Payment Failures", release: "r1", fulfills: ["REQ-002", "REQ-005"], narrative: "As a customer support agent, I want to gather evidence for payment failures so that I can understand the issue better.", acceptance: ["Given a payment failure, when evidence is gathered, then it is stored for review.", "Given a payment failure, when evidence gathering fails, then an alert is generated.", "Trust: All evidence is logged with the issue details."], blocked_by: ["STORY-001"], owner_agent: "Customer Support Team", failure_paths: ["Evidence collection failure", "Incorrect evidence", "Storage failure"] },
    "STORY-004": { title: "Recommend Actions for Payment Failures", release: "r1", fulfills: ["REQ-006"], narrative: "As a customer support agent, I want the system to recommend actions for payment failures so that I can resolve them efficiently.", acceptance: ["Given a payment failure, when an action is recommended, then it appears in the action list.", "Given a payment failure, when no recommendation is possible, then a notification is sent.", "Trust: All recommendations are logged with rationale."], blocked_by: ["STORY-003"], owner_agent: "Customer Support Team", failure_paths: ["Recommendation engine failure", "Incorrect recommendations", "Notification failure"] },
    "STORY-005": { title: "Assess Risk of Recommended Actions", release: "r2", fulfills: ["REQ-007"], narrative: "As a customer support agent, I want to assess the risk of recommended actions so that I can decide on approvals.", acceptance: ["Given a recommended action, when risk is assessed, then it is displayed with the action.", "Given a recommended action, when risk assessment fails, then an alert is generated.", "Trust: All risk assessments are logged with action details."], blocked_by: ["STORY-004"], owner_agent: "Customer Support Team", failure_paths: ["Risk assessment failure", "Incorrect risk levels", "Logging failure"] },
    "STORY-006": { title: "Require Approval for High-Risk Actions", release: "r2", fulfills: ["REQ-008"], narrative: "As a customer support agent, I want high-risk actions to require approval so that I can ensure safety.", acceptance: ["Given a high-risk action, when approval is required, then a notification is sent to the approver.", "Given a high-risk action, when approval is not obtained, then the action is paused.", "Trust: All approval requests are logged with timestamps."], blocked_by: ["STORY-005"], owner_agent: "Customer Support Team", failure_paths: ["Approval workflow failure", "Notification failure", "Logging failure"] },
    "STORY-007": { title: "Verify Outcome of Actions", release: "r3", fulfills: ["REQ-009"], narrative: "As a customer support agent, I want to verify the outcome of actions so that I can confirm their success.", acceptance: ["Given an action is taken, when the outcome is verified, then it is logged as successful or failed.", "Given an action is taken, when verification fails, then an alert is generated.", "Trust: All outcomes are logged with verification details."], blocked_by: ["STORY-006"], owner_agent: "Customer Support Team", failure_paths: ["Verification process failure", "Incorrect outcome logging", "Alert failure"] },
    "STORY-008": { title: "Pause Processing on Uncertain Issues", release: "r3", fulfills: ["REQ-010"], narrative: "As a customer support agent, I want processing to pause on uncertain issues so that I can review them manually.", acceptance: ["Given an uncertain issue, when processing is paused, then a notification is sent to the agent.", "Given an uncertain issue, when pausing fails, then an alert is generated.", "Trust: All pauses are logged with issue details."], blocked_by: ["STORY-007"], owner_agent: "Customer Support Team", failure_paths: ["Pause functionality failure", "Notification failure", "Logging failure"] },
    "STORY-009": { title: "Provide Summary of Prepared Actions", release: "r4", fulfills: ["REQ-011"], narrative: "As a customer support agent, I want to see a summary of prepared actions so that I can review them before execution.", acceptance: ["Given actions are prepared, when a summary is generated, then it is displayed to the agent.", "Given actions are prepared, when summary generation fails, then an alert is generated.", "Trust: All summaries are logged with action details."], blocked_by: ["STORY-008"], owner_agent: "Customer Support Team", failure_paths: ["Summary generation failure", "Incorrect summary", "Alert failure"] },
    "STORY-011": { title: "Ensure 2-Hour Resolution Time", release: "r4", fulfills: ["REQ-014"], narrative: "As a customer support agent, I want order issues resolved within 2 hours so that I can meet service level agreements.", acceptance: ["Given an order issue, when resolved within 2 hours, then it is logged as timely.", "Given an order issue, when resolution exceeds 2 hours, then an alert is generated.", "Trust: All resolution times are logged for performance analysis."], blocked_by: ["STORY-009"], owner_agent: "Customer Support Team", failure_paths: ["Resolution time failure", "Performance bottlenecks", "Alert failure"] },
    "STORY-012": { title: "Trigger System on Order Submission", release: "r0", fulfills: ["REQ-012"], narrative: "As a system, I want to be triggered by an order submission event, so that I can start processing immediately.", acceptance: ["Given an order is submitted, when the system receives the event, then it starts processing the order.", "Given an order is submitted, when the system fails to receive the event, then it logs an error and retries.", "Trust: Every order submission event is logged with a timestamp and status."], blocked_by: [], owner_agent: "Order Processing System", failure_paths: ["Event not received", "Event received but not logged", "Event triggers incorrect processing"] },
    "STORY-013": { title: "Identify Inventory Issues", release: "r1", fulfills: ["REQ-003"], narrative: "As a system, I want to identify inventory issues from the online data source, so that I can alert the inventory management team.", acceptance: ["Given the online data source, when inventory levels fall below threshold, then the system identifies an issue.", "Given the online data source, when inventory data is missing, then the system logs an error.", "Trust: Every identified inventory issue is logged with details and timestamp."], blocked_by: ["STORY-012"], owner_agent: "Inventory Management System", failure_paths: ["Data source unavailable", "Incorrect threshold detection", "Issue not logged"] },
    "STORY-014": { title: "Detect Shipping Delays", release: "r1", fulfills: ["REQ-004"], narrative: "As a system, I want to detect shipping delays from the online data source, so that I can notify the logistics team.", acceptance: ["Given the online data source, when shipping times exceed expected duration, then the system detects a delay.", "Given the online data source, when shipping data is incomplete, then the system logs an error.", "Trust: Every detected shipping delay is logged with details and timestamp."], blocked_by: ["STORY-012"], owner_agent: "Logistics Management System", failure_paths: ["Data source unavailable", "Incorrect delay detection", "Delay not logged"] },
    "STORY-015": { title: "Optimize Customer Support Screens for Efficiency", release: "r4", fulfills: ["REQ-013"], narrative: "As a customer support agent, I want to complete primary actions on screens in three clicks or fewer, so that I can assist customers efficiently.", acceptance: ["Given a customer support screen, when I perform the primary action, then it completes in three clicks or fewer.", "Given a customer support screen, when I attempt to perform an action that requires more than three clicks, then I receive a notification to streamline the process.", "Trust: Every action performed is logged with the number of clicks for audit."], blocked_by: ["STORY-009"], owner_agent: "Customer Support Team", failure_paths: ["Primary action takes more than three clicks", "Notification for excessive clicks does not appear", "Click count logging fails"] },
  };

  // due_on / due_baseline_on — a couple of stories show slippage on purpose,
  // so the Project Management tab has something real to demonstrate.
  const DUE_DATES = {
    "STORY-001": { due_on: "2026-09-05", due_baseline_on: "2026-09-05" },
    "STORY-002": { due_on: "2026-09-06", due_baseline_on: "2026-09-06" },
    "STORY-012": { due_on: "2026-09-08", due_baseline_on: "2026-09-08" },
    "STORY-003": { due_on: "2026-09-09", due_baseline_on: "2026-09-09" },
    "STORY-004": { due_on: "2026-09-11", due_baseline_on: "2026-09-10" },
    "STORY-013": { due_on: "2026-09-11", due_baseline_on: "2026-09-11" },
    "STORY-014": { due_on: "2026-09-12", due_baseline_on: "2026-09-12" },
    "STORY-005": { due_on: "2026-09-15", due_baseline_on: "2026-09-15" },
    "STORY-006": { due_on: "2026-09-19", due_baseline_on: "2026-09-17" },
    "STORY-007": { due_on: "2026-09-19", due_baseline_on: "2026-09-19" },
    "STORY-008": { due_on: "2026-09-22", due_baseline_on: "2026-09-22" },
    "STORY-009": { due_on: "2026-09-25", due_baseline_on: "2026-09-25" },
    "STORY-011": { due_on: "2026-09-28", due_baseline_on: "2026-09-28" },
    "STORY-015": { due_on: "2026-10-01", due_baseline_on: "2026-10-01" },
  };

  // Verification state per story — a plausible mid-programme snapshot.
  const STATE_PLAN = {
    "STORY-001": "verified",
    "STORY-002": "verified",
    "STORY-012": "verified",
    "STORY-003": "verified",
    "STORY-004": "verified",
    "STORY-013": "verified",
    "STORY-014": "submitted",
    "STORY-005": "in_progress",
    "STORY-006": "in_progress",
    "STORY-007": "not_started",
    "STORY-008": "not_started",
    "STORY-009": "not_started",
    "STORY-011": "not_started",
    "STORY-015": "not_started",
  };

  const PASSED_COUNT = { verified: 3, submitted: 2, in_progress: 1, not_started: 0 };

  function buildProgressStories() {
    const stories = [
      {
        id: "STORY-000",
        release: null,
        acceptance_total: 5,
        criteria: [
          { text: "Given the Command Center, when it is opened, then every tab is reachable and every card drills down one level.", passed: false },
          { text: "Given sample mode, when any tab is shown, then the sample data is visibly labelled as sample.", passed: false },
          { text: "Given the Command Center, when any tab renders, then .colaberry/plan.json and .colaberry/progress.json are both committed in this repo and every tab reads its content from them at runtime rather than from hard-coded values.", passed: false },
          { text: "Given the Command Center, when any tab is shown, then .colaberry/manifest.json is committed in this repo and every tab shows how old that data is and warns when the age exceeds a week.", passed: false },
          { text: "Trust — no tab shows a number, a connection or a result the project has not actually produced.", passed: false },
        ],
        verification: { state: "not_started", commit_sha: null, commit_url: null, commit_at: null, verified_at: null, points_awarded: null },
      },
    ];

    Object.entries(STORY_TEXT).forEach(([id, s], idx) => {
      const state = STATE_PLAN[id] || "not_started";
      const passedCount = PASSED_COUNT[state];
      const criteria = s.acceptance.map((text, i) => ({ text, passed: i < passedCount }));
      const hasCommit = state === "verified" || state === "submitted";
      stories.push({
        id,
        release: s.release,
        acceptance_total: s.acceptance.length,
        criteria,
        verification: {
          state,
          criteria_passed: passedCount,
          criteria_total: s.acceptance.length,
          verified_at: state === "verified" ? "2026-09-" + String(6 + idx).padStart(2, "0") + "T10:00:00.000Z" : null,
          commit_sha: hasCommit ? "a1b2c3" + idx : null,
          commit_url: hasCommit ? `https://github.com/example/kashmir-craft-ai-order-assistant/commit/a1b2c3${idx}` : null,
          commit_at: hasCommit ? "2026-09-" + String(5 + idx).padStart(2, "0") + "T09:00:00.000Z" : null,
          points_awarded: state === "verified" ? 100 : null,
          outstanding: [],
        },
      });
    });
    return stories;
  }

  function buildPlanStories() {
    return Object.entries(STORY_TEXT).map(([id, s]) => ({
      id,
      title: s.title,
      release: s.release,
      fulfills: s.fulfills,
      narrative: s.narrative,
      acceptance: s.acceptance,
      blocked_by: s.blocked_by,
      owner_agent: s.owner_agent,
      failure_paths: s.failure_paths,
      task_guidance: "",
      due_on: DUE_DATES[id]?.due_on || null,
      due_baseline_on: DUE_DATES[id]?.due_baseline_on || null,
    }));
  }

  function sampleData() {
    const now = new Date();
    const generatedAt = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

    const releases = [
      { key: "r0", name: "Initial Skeleton", goal: "Establish basic order issue identification and logging.", story_ids: ["STORY-001", "STORY-002", "STORY-012"], starts_on: "2026-09-05", ends_on: "2026-09-08", is_demo_target: false },
      { key: "r1", name: "Evidence Gathering and Recommendation", goal: "Enable evidence gathering and action recommendation.", story_ids: ["STORY-003", "STORY-004", "STORY-013", "STORY-014"], starts_on: "2026-09-09", ends_on: "2026-09-12", is_demo_target: true },
      { key: "r2", name: "Risk Assessment and Approval", goal: "Implement risk assessment and human approval process.", story_ids: ["STORY-005", "STORY-006"], starts_on: "2026-09-15", ends_on: "2026-09-17", is_demo_target: false },
      { key: "r3", name: "Outcome Verification and Processing Control", goal: "Add outcome verification and processing control features.", story_ids: ["STORY-007", "STORY-008"], starts_on: "2026-09-19", ends_on: "2026-09-22", is_demo_target: false },
      { key: "r4", name: "User Experience and Performance", goal: "Enhance user experience and ensure performance targets.", story_ids: ["STORY-009", "STORY-011", "STORY-015"], starts_on: "2026-09-25", ends_on: "2026-10-01", is_demo_target: false },
    ];

    const plan = {
      schema_version: 2,
      project_name: "AI-Powered E-Commerce Order Operations Assistant",
      descriptor: "An AI assistant for managing order issues on the Kashmir Craft website, focusing on safety, reliability, and ease of management.",
      requirements: REQUIREMENTS,
      releases,
      stories: buildPlanStories(),
      agents: [],
      project: {
        name: "AI-Powered E-Commerce Order Operations Assistant",
        descriptor: "An AI assistant for managing order issues on the Kashmir Craft website, focusing on safety, reliability, and ease of management.",
        repo_url: "https://github.com/example/kashmir-craft-ai-order-assistant",
        plan_version: 1,
        plan_sha256: "sample",
      },
      schedule: {
        build_start: "2026-09-05",
        build_end: "2026-10-01",
        demo_day: "2026-10-08",
        demo_release_key: "r1",
      },
      derived: {
        measures: [{ id: "REQ-014", statement: "The system must resolve order issues within 2 hours." }],
        guardrails: [{ id: "REQ-015", statement: "The system must log all actions and decisions for audit purposes." }],
        systems: ["Payment Gateway", "Inventory Management System", "Shipping Carrier API"],
        roles: ["customer support agent", "system auditor"],
        counts: {
          requirements_total: REQUIREMENTS.length,
          stories_total: Object.keys(STORY_TEXT).length,
          releases_total: releases.length,
          agents_total: 0,
        },
      },
    };

    const progressStories = buildProgressStories();
    const totals = progressStories.reduce(
      (acc, s) => {
        acc.criteria_total += s.acceptance_total;
        acc.criteria_passed += s.verification.criteria_passed || 0;
        acc.points_awarded += s.verification.points_awarded || 0;
        acc[`stories_${s.verification.state}`] = (acc[`stories_${s.verification.state}`] || 0) + 1;
        return acc;
      },
      { stories_total: progressStories.length, criteria_total: 0, criteria_passed: 0, points_awarded: 0 }
    );

    const progress = {
      schema_version: 2,
      project: plan.project_name,
      totals,
      stories: progressStories,
    };

    const manifest = {
      generated_at: generatedAt,
      plan_version: 1,
      plan_sha256: "sample",
    };

    const trends = {
      "REQ-014": {
        unit: " hrs",
        target: 2,
        values: [5.8, 5.1, 4.6, 4.2, 3.9, 3.4, 3.1],
      },
    };

    return { plan, progress, manifest, trends, source: "sample" };
  }

  window.CC.sampleData = sampleData;
})();
