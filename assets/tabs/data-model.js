window.CC = window.CC || {};

/* This tab is a design artifact, not a read of .colaberry/*.json — it's a
   proposed data model for review, derived from the requirements below.
   Nothing is built against it yet. */
(function () {
  const esc = window.CC.escapeHtml;

  const ENTITIES = [
    {
      name: "Order",
      from: "REQ-016",
      fields: ["id", "customer_ref", "source_ref (id in the online data source)", "submitted_at", "status"],
    },
    {
      name: "OrderEvent",
      from: "REQ-012",
      fields: ["id", "order_id → Order", "event_type", "received_at", "status", "retry_count"],
    },
    {
      name: "OrderIssue",
      from: "REQ-001 · REQ-002 · REQ-003 · REQ-004",
      fields: ["id", "order_id → Order", "kind (duplicate | payment_failure | inventory_issue | shipping_delay)", "detected_at", "status (open | paused | resolved)"],
    },
    {
      name: "Evidence",
      from: "REQ-005",
      fields: ["id", "order_issue_id → OrderIssue", "collected_at", "details", "source_ref"],
    },
    {
      name: "Recommendation",
      from: "REQ-006",
      fields: ["id", "order_issue_id → OrderIssue", "action", "rationale", "created_at"],
    },
    {
      name: "RiskAssessment",
      from: "REQ-007",
      fields: ["id", "recommendation_id → Recommendation", "risk_level", "assessed_at"],
    },
    {
      name: "ApprovalRequest",
      from: "REQ-008",
      fields: ["id", "recommendation_id → Recommendation", "requested_at", "approver", "decision (pending | approved | denied)", "decided_at"],
    },
    {
      name: "ActionOutcome",
      from: "REQ-009",
      fields: ["id", "recommendation_id → Recommendation", "executed_at", "result (success | failed)", "verified_at"],
    },
    {
      name: "ProcessingPause",
      from: "REQ-010",
      fields: ["id", "order_issue_id → OrderIssue", "reason", "paused_at", "resumed_at"],
    },
    {
      name: "ActionSummary",
      from: "REQ-011",
      fields: ["id", "order_issue_id → OrderIssue", "prepared_at", "summary_text"],
    },
    {
      name: "ResolutionTiming",
      from: "REQ-014",
      fields: ["id", "order_issue_id → OrderIssue", "started_at", "resolved_at", "duration_minutes", "within_target (bool)"],
    },
    {
      name: "SupportScreenAction",
      from: "REQ-013",
      fields: ["id", "screen", "action", "click_count", "performed_by", "order_issue_id → OrderIssue (nullable)", "timestamp"],
    },
    {
      name: "AuditLogEntry",
      from: "REQ-015",
      fields: ["id", "actor", "action", "target_type", "target_id", "timestamp", "details"],
    },
  ];

  const RELATIONSHIPS = [
    "Order 1—* OrderEvent",
    "Order 1—* OrderIssue",
    "OrderIssue 1—* Evidence",
    "OrderIssue 1—* Recommendation",
    "Recommendation 1—1 RiskAssessment",
    "Recommendation 0..1 ApprovalRequest (only when risk is high)",
    "Recommendation 1—1 ActionOutcome",
    "OrderIssue 0..1 ProcessingPause",
    "OrderIssue 1—* ActionSummary",
    "OrderIssue 1—1 ResolutionTiming",
    "AuditLogEntry references any of the above via target_type/target_id",
    "SupportScreenAction optionally references OrderIssue",
  ];

  function render(main, data) {
    const requirements = data?.plan?.requirements || [];

    const cards = ENTITIES.map((e) => {
      const reqIds = e.from.split("·").map((s) => s.trim());
      const badges = reqIds
        .map((id) => {
          const req = requirements.find((r) => r.id === id);
          return req
            ? `<span class="badge badge-muted" style="text-transform:none;font-weight:600" title="${esc(req.statement)}">${esc(id)}</span>`
            : `<span class="badge badge-warn" title="Not found in the current plan">${esc(id)} ?</span>`;
        })
        .join(" ");
      return `
      <div class="cc-section" style="margin-bottom:14px">
        <h2>${esc(e.name)} ${badges}</h2>
        <div class="pill-list">${e.fields.map((f) => `<span class="pill pill-muted">${esc(f)}</span>`).join("")}</div>
      </div>`;
    }).join("");

    main.innerHTML = `
      <h1 class="cc-page-title">Data model</h1>
      <p class="cc-page-sub">A starting point, not the answer — derived from the requirements, named for this project's own domain rather than any vendor. Nothing is built against this yet; it's here for review.</p>

      <div class="cc-section">
        <h2>Relationships</h2>
        <ul style="margin:0;padding-left:20px">
          ${RELATIONSHIPS.map((r) => `<li>${esc(r)}</li>`).join("")}
        </ul>
      </div>

      <h2 style="margin:20px 0 10px">Entities</h2>
      ${cards}
    `;
  }

  window.CC.tabDataModel = { renderList: render };
})();
