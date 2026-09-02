window.CC = window.CC || {};

(function () {
  const esc = window.CC.escapeHtml;

  function storiesForRole(plan, role) {
    const prefix = `as a ${role.toLowerCase()}`;
    return (plan.stories || []).filter((s) =>
      (s.narrative || "").toLowerCase().startsWith(prefix)
    );
  }

  function renderList(main, data) {
    const roles = data.plan?.derived?.roles || [];
    if (roles.length === 0) {
      main.innerHTML = `
        <h1 class="cc-page-title">Users and use case</h1>
        <div class="cc-placeholder"><h2>No roles in the plan</h2>
        <p>Nothing under <code>plan.derived.roles</code> yet.</p></div>`;
      return;
    }

    const cards = roles
      .map((role) => {
        const stories = storiesForRole(data.plan, role);
        return `
        <a class="cc-card" href="#/users/${encodeURIComponent(role)}">
          <span class="cc-card-label">Role</span>
          <span class="cc-card-value" style="font-size:20px">${esc(role)}</span>
          <span class="cc-card-detail">${stories.length} stor${stories.length === 1 ? "y" : "ies"} written for this role</span>
          <span class="cc-card-arrow">See their stories →</span>
        </a>`;
      })
      .join("");

    main.innerHTML = `
      <h1 class="cc-page-title">Users and use case</h1>
      <p class="cc-page-sub">Who this is for and what they're trying to get done, taken from each story's "As a &lt;role&gt;, I want …" narrative.</p>
      <div class="cc-grid">${cards}</div>
    `;
  }

  function renderDetail(main, data, mode, roleParam) {
    const roles = data.plan?.derived?.roles || [];
    const role = roles.find((r) => r === roleParam);
    if (!role) {
      main.innerHTML = `<a class="back-link" href="#/users">← Back to Users and use case</a>
        <div class="cc-placeholder"><h2>Not found</h2><p>No role "${esc(roleParam)}" in the plan.</p></div>`;
      return;
    }
    const stories = storiesForRole(data.plan, role);
    const rows = stories
      .map((s) => {
        const prog = window.CC.findStoryProgress(data.progress, s.id);
        return `
        <tr class="row-link" onclick="location.hash='#/pm/${encodeURIComponent(s.id)}'">
          <td>${esc(s.id)}</td>
          <td>${esc(s.title)}</td>
          <td>${esc(s.narrative)}</td>
          <td>${window.CC.stateBadge(prog?.verification?.state)}</td>
        </tr>`;
      })
      .join("");

    main.innerHTML = `
      <a class="back-link" href="#/users">← Back to Users and use case</a>
      <h1 class="cc-page-title">${esc(role)}</h1>
      <p class="cc-page-sub">${stories.length} stor${stories.length === 1 ? "y" : "ies"} written for this role.</p>
      <div class="cc-section">
        <div class="cc-table-wrap">
          <table class="cc-table">
            <thead><tr><th>Story</th><th>Title</th><th>Narrative</th><th>Status</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="4" class="cc-empty">No stories yet.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  window.CC.tabUsers = { renderList, renderDetail };
})();
