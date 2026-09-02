window.CC = window.CC || {};

(function () {
  const esc = window.CC.escapeHtml;

  function renderList(main, data, mode) {
    const measures = data.plan?.derived?.measures || [];
    if (measures.length === 0) {
      main.innerHTML = `
        <h1 class="cc-page-title">Outcomes</h1>
        <p class="cc-page-sub">The numbers this project has to move.</p>
        <div class="cc-placeholder"><h2>No measures in the plan</h2>
        <p>Nothing under <code>plan.derived.measures</code> yet — build the empty state, don't invent a number.</p></div>`;
      return;
    }

    const cards = measures
      .map((m) => {
        const trend = data.trends?.[m.id];
        const latest = trend && mode === "sample" ? trend.values[trend.values.length - 1] : null;
        return `
        <a class="cc-card" href="#/outcomes/${encodeURIComponent(m.id)}">
          <span class="cc-card-label">${esc(m.id)}</span>
          <span class="cc-card-value">${latest !== null ? `${latest}${trend.unit || ""}` : "Not measured yet"}</span>
          <span class="cc-card-detail">${esc(m.statement)}</span>
          <span class="cc-card-arrow">See how it's calculated →</span>
        </a>`;
      })
      .join("");

    main.innerHTML = `
      <h1 class="cc-page-title">Outcomes</h1>
      <p class="cc-page-sub">The numbers this project committed to move. Your files know what was promised — never how far it has moved; that comes from the running system.</p>
      <div class="cc-grid">${cards}</div>
    `;
  }

  function renderDetail(main, data, mode, id) {
    const measures = data.plan?.derived?.measures || [];
    const measure = measures.find((m) => m.id === id);
    if (!measure) {
      main.innerHTML = `<a class="back-link" href="#/outcomes">← Back to Outcomes</a>
        <div class="cc-placeholder"><h2>Not found</h2><p>No measure with id ${esc(id)}.</p></div>`;
      return;
    }
    const req = window.CC.findRequirement(data.plan, id);
    const trend = data.trends?.[id];

    let body;
    if (mode === "sample" && trend) {
      const latest = trend.values[trend.values.length - 1];
      body = `
        <div class="cc-section">
          <h2>Trend (sample)</h2>
          ${window.CC.renderSparkline(trend.values, { target: trend.target })}
          <p style="margin:6px 0 0">Latest: <strong>${latest}${trend.unit}</strong> — target <strong>${trend.target}${trend.unit}</strong>. Dashed line marks the target.</p>
          <p class="cc-empty">Sample trend for illustration only — see the Sample badge in the header.</p>
        </div>`;
    } else {
      body = `
        <div class="cc-section">
          <h2>Current value</h2>
          <p class="cc-empty">Not measured yet. This requirement records what was promised — the actual figure comes from the running system once it is measuring, not from these files.</p>
        </div>`;
    }

    main.innerHTML = `
      <a class="back-link" href="#/outcomes">← Back to Outcomes</a>
      <h1 class="cc-page-title">${esc(measure.id)}</h1>
      <p class="cc-page-sub">${esc(measure.statement)}</p>
      ${body}
      ${
        req
          ? `<div class="cc-section"><h2>Requirement</h2>
              <div class="kv-list">
                <div class="kv-row"><dt>Kind</dt><dd>${esc(req.kind)}</dd></div>
                <div class="kv-row"><dt>Priority</dt><dd>${esc(req.priority)}</dd></div>
                <div class="kv-row"><dt>Cluster</dt><dd>${esc(req.cluster)}</dd></div>
                <div class="kv-row"><dt>Fulfilled by</dt><dd>${
                  (req.fulfilled_by || []).length
                    ? `<div class="pill-list">${req.fulfilled_by
                        .map((sid) => `<a class="pill" href="#/pm/${encodeURIComponent(sid)}">${esc(sid)}</a>`)
                        .join("")}</div>`
                    : '<span class="gap-flag">No story fulfils this requirement yet</span>'
                }</dd></div>
              </div>
            </div>`
          : ""
      }
    `;
  }

  window.CC.tabOutcomes = { renderList, renderDetail };
})();
