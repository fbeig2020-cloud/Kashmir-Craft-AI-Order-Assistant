window.CC = window.CC || {};

(function () {
  const esc = window.CC.escapeHtml;

  function statusFor(plan, progress, guardrailId) {
    const req = window.CC.findRequirement(plan, guardrailId);
    const storyIds = req?.fulfilled_by || [];
    const rows = storyIds.map((sid) => ({
      id: sid,
      story: window.CC.findStoryPlan(plan, sid),
      progress: window.CC.findStoryProgress(progress, sid),
    }));
    const enforced = storyIds.length > 0 && rows.every((r) => r.progress?.verification?.state === "verified");
    return { req, storyIds, rows, enforced };
  }

  function renderList(main, data) {
    const guardrails = data.plan?.derived?.guardrails || [];
    if (guardrails.length === 0) {
      main.innerHTML = `
        <h1 class="cc-page-title">Guardrails</h1>
        <p class="cc-page-sub">What must never happen.</p>
        <div class="cc-placeholder"><h2>No guardrails in the plan</h2>
        <p>Your plan has no SAFE requirement yet — that's worth fixing before building further, not something to hide.</p></div>`;
      return;
    }

    const cards = guardrails
      .map((g) => {
        const { storyIds, enforced } = statusFor(data.plan, data.progress, g.id);
        return `
        <a class="cc-card" href="#/guardrails/${encodeURIComponent(g.id)}">
          <span class="cc-card-label">${esc(g.id)}</span>
          <span class="cc-card-detail">${esc(g.statement)}</span>
          <span>${
            storyIds.length === 0
              ? '<span class="badge badge-muted">No story yet</span>'
              : enforced
              ? '<span class="badge badge-ok">Enforced</span>'
              : '<span class="badge badge-warn">Not yet enforced</span>'
          }</span>
          <span class="cc-card-arrow">See what enforces it →</span>
        </a>`;
      })
      .join("");

    main.innerHTML = `
      <h1 class="cc-page-title">Guardrails</h1>
      <p class="cc-page-sub">The promises this system makes. A guardrail whose stories aren't verified is a promise made and not yet kept.</p>
      <div class="cc-grid">${cards}</div>
    `;
  }

  function renderDetail(main, data, mode, id) {
    const guardrails = data.plan?.derived?.guardrails || [];
    const g = guardrails.find((x) => x.id === id);
    if (!g) {
      main.innerHTML = `<a class="back-link" href="#/guardrails">← Back to Guardrails</a>
        <div class="cc-placeholder"><h2>Not found</h2><p>No guardrail ${esc(id)}.</p></div>`;
      return;
    }
    const { storyIds, rows, enforced } = statusFor(data.plan, data.progress, g.id);

    const rowsHtml = rows
      .map(
        (r) => `
        <tr class="row-link" onclick="location.hash='#/pm/${encodeURIComponent(r.id)}'">
          <td>${esc(r.id)}</td>
          <td>${esc(r.story?.title || "")}</td>
          <td>${window.CC.stateBadge(r.progress?.verification?.state)}</td>
        </tr>`
      )
      .join("");

    main.innerHTML = `
      <a class="back-link" href="#/guardrails">← Back to Guardrails</a>
      <h1 class="cc-page-title">${esc(g.id)}</h1>
      <p class="cc-page-sub">${esc(g.statement)}</p>
      <div class="cc-section">
        <h2>${enforced ? '<span class="badge badge-ok">Enforced</span>' : storyIds.length ? '<span class="badge badge-warn">Not yet enforced</span>' : '<span class="badge badge-muted">No story yet</span>'}</h2>
        <p style="margin:0 0 12px">${
          storyIds.length === 0
            ? "No story in the plan currently fulfils this requirement."
            : enforced
            ? "Every story that fulfils this requirement is verified."
            : "This is a promise the plan has made and not yet kept — the stories below aren't all verified."
        }</p>
        ${
          storyIds.length
            ? `<div class="cc-table-wrap"><table class="cc-table">
                <thead><tr><th>Story</th><th>Title</th><th>Status</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
              </table></div>`
            : ""
        }
      </div>
    `;
  }

  window.CC.tabGuardrails = { renderList, renderDetail };
})();
