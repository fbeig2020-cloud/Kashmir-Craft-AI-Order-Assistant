window.CC = window.CC || {};

(function () {
  const fmtDate = window.CC.fmtDateOnly;

  function schedulePosition(schedule, releases) {
    if (!schedule || (!schedule.build_start && !schedule.demo_day)) {
      return {
        html: '<span class="cc-empty">No schedule set in the plan yet.</span>',
      };
    }
    const start = fmtDate(schedule.build_start);
    const end = fmtDate(schedule.build_end);
    const demo = fmtDate(schedule.demo_day);
    const demoRelease = (releases || []).find((r) => r.key === schedule.demo_release_key);
    let html = "";
    if (start && end) html += `Build window: <strong>${start} – ${end}</strong>. `;
    if (demo) html += `Demo day: <strong>${demo}</strong>`;
    if (demoRelease) html += ` (targeting <strong>${demoRelease.name}</strong>)`;
    return { html: html || '<span class="cc-empty">No schedule set in the plan yet.</span>' };
  }

  function guardrailSummary(plan, progress) {
    const guardrails = plan?.derived?.guardrails || [];
    if (guardrails.length === 0) {
      return { enforced: 0, total: 0, empty: true };
    }
    const requirements = plan.requirements || [];
    const storyById = new Map((progress?.stories || []).map((s) => [s.id, s]));
    let enforced = 0;
    guardrails.forEach((g) => {
      const req = requirements.find((r) => r.id === g.id);
      const storyIds = req?.fulfilled_by || [];
      const allVerified =
        storyIds.length > 0 &&
        storyIds.every((id) => storyById.get(id)?.verification?.state === "verified");
      if (allVerified) enforced += 1;
    });
    return { enforced, total: guardrails.length, empty: false };
  }

  function render(container, data, mode) {
    if (data.error) {
      container.innerHTML = `
        <div class="cc-placeholder">
          <h2>Could not load project data</h2>
          <p>${String(data.error.message || data.error)}</p>
          <p>Check that <code>.colaberry/plan.json</code>, <code>.colaberry/progress.json</code> and
          <code>.colaberry/manifest.json</code> are present and reachable from this page, or switch to
          Sample mode above.</p>
        </div>`;
      return;
    }

    const { plan, progress } = data;
    const project = plan.project || { name: plan.project_name, descriptor: plan.descriptor };
    const totals = progress.totals || {};
    const schedule = schedulePosition(plan.schedule, plan.releases);
    const guardrails = guardrailSummary(plan, progress);
    const systems = plan?.derived?.systems || [];

    const storiesPct = totals.stories_total
      ? Math.round((100 * (totals.stories_verified || 0)) / totals.stories_total)
      : 0;
    const criteriaPct = totals.criteria_total
      ? Math.round((100 * (totals.criteria_passed || 0)) / totals.criteria_total)
      : 0;

    container.innerHTML = `
      <h1 class="cc-page-title">${project.name || "Untitled project"}</h1>
      <p class="cc-page-sub">${project.descriptor || ""}</p>

      <div class="cc-section">
        <h2>Where you are</h2>
        <p style="margin:0">${schedule.html}</p>
      </div>

      <div class="cc-grid">
        <a class="cc-card" href="#/pm">
          <span class="cc-card-label">Stories verified</span>
          <span class="cc-card-value">${totals.stories_verified ?? 0} / ${totals.stories_total ?? 0}</span>
          <span class="cc-card-detail">${storiesPct}% of stories confirmed done</span>
          <span class="cc-card-arrow">See project management →</span>
        </a>
        <a class="cc-card" href="#/kb">
          <span class="cc-card-label">Criteria passed</span>
          <span class="cc-card-value">${totals.criteria_passed ?? 0} / ${totals.criteria_total ?? 0}</span>
          <span class="cc-card-detail">${criteriaPct}% of acceptance criteria confirmed</span>
          <span class="cc-card-arrow">See knowledge base →</span>
        </a>
        <a class="cc-card" href="#/pm">
          <span class="cc-card-label">Points awarded</span>
          <span class="cc-card-value">${totals.points_awarded ?? 0}</span>
          <span class="cc-card-detail">Cumulative across verified stories</span>
          <span class="cc-card-arrow">See project management →</span>
        </a>
        <a class="cc-card" href="#/guardrails">
          <span class="cc-card-label">Guardrails enforced</span>
          <span class="cc-card-value">${guardrails.empty ? "—" : `${guardrails.enforced} / ${guardrails.total}`}</span>
          <span class="cc-card-detail">${guardrails.empty ? "No SAFE requirement in the plan yet" : "Verified against the stories that fulfil each one"}</span>
          <span class="cc-card-arrow">See guardrails →</span>
        </a>
        <a class="cc-card" href="#/systems">
          <span class="cc-card-label">Connected systems</span>
          <span class="cc-card-value">${systems.length}</span>
          <span class="cc-card-detail">${systems.length ? "Named in the plan — connection status not checked from here" : "None named in the plan yet"}</span>
          <span class="cc-card-arrow">See systems →</span>
        </a>
      </div>
    `;
  }

  window.CC.renderOverview = render;
})();
