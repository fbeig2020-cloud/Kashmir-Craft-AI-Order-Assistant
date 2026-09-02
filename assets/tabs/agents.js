window.CC = window.CC || {};

(function () {
  const esc = window.CC.escapeHtml;

  function groupByOwner(plan) {
    const groups = new Map();
    (plan.stories || []).forEach((s) => {
      const owner = s.owner_agent || "Unassigned";
      if (!groups.has(owner)) groups.set(owner, []);
      groups.get(owner).push(s);
    });
    return groups;
  }

  function scopedAgentFor(plan, owner) {
    return (plan.agents || []).find((a) => a.name === owner) || null;
  }

  function renderList(main, data) {
    const groups = groupByOwner(data.plan);
    if (groups.size === 0) {
      main.innerHTML = `
        <h1 class="cc-page-title">AI agents</h1>
        <div class="cc-placeholder"><h2>No story owners in the plan</h2></div>`;
      return;
    }

    const cards = [...groups.entries()]
      .map(([owner, stories]) => {
        const scoped = scopedAgentFor(data.plan, owner);
        return `
        <a class="cc-card" href="#/agents/${encodeURIComponent(owner)}">
          <span class="cc-card-label">${scoped ? "Agent" : "Story owner"}</span>
          <span class="cc-card-value" style="font-size:19px">${esc(owner)}</span>
          <span class="cc-card-detail">Owns ${stories.length} stor${stories.length === 1 ? "y" : "ies"}</span>
          <span class="cc-card-arrow">See owned stories →</span>
        </a>`;
      })
      .join("");

    main.innerHTML = `
      <h1 class="cc-page-title">AI agents</h1>
      <p class="cc-page-sub">Your plan doesn't carry a scoped agent roster yet, so this tab is built from who owns each story. These are owners, not scoped AI agents.</p>
      <div class="cc-grid">${cards}</div>
    `;
  }

  function renderDetail(main, data, mode, owner) {
    const groups = groupByOwner(data.plan);
    const stories = groups.get(owner);
    if (!stories) {
      main.innerHTML = `<a class="back-link" href="#/agents">← Back to AI agents</a>
        <div class="cc-placeholder"><h2>Not found</h2><p>No stories owned by "${esc(owner)}".</p></div>`;
      return;
    }
    const scoped = scopedAgentFor(data.plan, owner);

    const rows = stories
      .map((s) => {
        const prog = window.CC.findStoryProgress(data.progress, s.id);
        return `
        <tr class="row-link" onclick="location.hash='#/pm/${encodeURIComponent(s.id)}'">
          <td>${esc(s.id)}</td>
          <td>${esc(s.title)}</td>
          <td>${esc(s.release || "")}</td>
          <td>${window.CC.stateBadge(prog?.verification?.state)}</td>
        </tr>`;
      })
      .join("");

    main.innerHTML = `
      <a class="back-link" href="#/agents">← Back to AI agents</a>
      <h1 class="cc-page-title">${esc(owner)}</h1>
      <p class="cc-page-sub">${scoped ? "" : "Owner — not a scoped AI agent."}</p>

      <div class="cc-section">
        <h2>Design</h2>
        <div class="kv-list">
          <div class="kv-row"><dt>Purpose</dt><dd>${scoped?.purpose ? esc(scoped.purpose) : '<span class="cc-empty">not defined yet</span>'}</dd></div>
          <div class="kv-row"><dt>Trigger</dt><dd>${scoped?.trigger ? esc(scoped.trigger) : '<span class="cc-empty">not defined yet</span>'}</dd></div>
          <div class="kv-row"><dt>Autonomy level</dt><dd>${scoped?.autonomy_level ? esc(scoped.autonomy_level) : '<span class="cc-empty">not defined yet</span>'}</dd></div>
          <div class="kv-row"><dt>Approval gates</dt><dd>${(scoped?.approval_gates || []).length ? scoped.approval_gates.map(esc).join(", ") : '<span class="cc-empty">not defined yet</span>'}</dd></div>
          <div class="kv-row"><dt>Skills</dt><dd><span class="cc-empty">no skills registered yet</span></dd></div>
          <div class="kv-row"><dt>Run history</dt><dd><span class="cc-empty">no runs recorded</span></dd></div>
        </div>
      </div>

      <div class="cc-section">
        <h2>Owned stories</h2>
        <div class="cc-table-wrap">
          <table class="cc-table">
            <thead><tr><th>Story</th><th>Title</th><th>Release</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  window.CC.tabAgents = { renderList, renderDetail };
})();
