window.CC = window.CC || {};

(function () {
  const esc = window.CC.escapeHtml;

  function toDate(iso) {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function renderGantt(plan) {
    const releases = plan.releases || [];
    const schedule = plan.schedule || {};
    const candidates = [];
    releases.forEach((r) => {
      const s = toDate(r.starts_on);
      const e = toDate(r.ends_on);
      if (s) candidates.push(s);
      if (e) candidates.push(e);
    });
    const buildStart = toDate(schedule.build_start);
    const buildEnd = toDate(schedule.build_end);
    const demoDay = toDate(schedule.demo_day);
    if (buildStart) candidates.push(buildStart);
    if (buildEnd) candidates.push(buildEnd);
    if (demoDay) candidates.push(demoDay);

    if (candidates.length === 0) {
      return `
        <p class="cc-empty">No release dates set in the plan yet — showing releases without a timeline.</p>
        ${releases
          .map(
            (r) => `
          <div class="gantt-row">
            <div class="gantt-label">${esc(r.name)} <span class="rel-dates">${r.key}${r.is_demo_target ? " · demo target" : ""}</span></div>
            <div class="gantt-label">${(r.story_ids || []).length} stor${(r.story_ids || []).length === 1 ? "y" : "ies"} — dates not set</div>
          </div>`
          )
          .join("")}
      `;
    }

    const min = new Date(Math.min(...candidates));
    const max = new Date(Math.max(...candidates));
    const totalMs = Math.max(1, max - min);

    const demoMarker =
      demoDay
        ? `<div class="gantt-marker" style="left:${(((demoDay - min) / totalMs) * 100).toFixed(2)}%">
             <span class="gantt-marker-label">Demo ${window.CC.fmtDateOnly(schedule.demo_day)}</span>
           </div>`
        : "";

    const rows = releases
      .map((r) => {
        const s = toDate(r.starts_on);
        const e = toDate(r.ends_on);
        let bar = "";
        if (s && e) {
          const left = (((s - min) / totalMs) * 100).toFixed(2);
          const width = Math.max(1.5, (((e - s) / totalMs) * 100)).toFixed(2);
          bar = `<div class="gantt-bar${r.is_demo_target ? " demo-target" : ""}" style="left:${left}%; width:${width}%"></div>`;
        }
        return `
        <div class="gantt-row">
          <div class="gantt-label">${esc(r.name)}<span class="rel-dates">${r.key}${r.is_demo_target ? " · demo target" : ""} · ${
          s && e ? `${window.CC.fmtDateOnly(r.starts_on)} – ${window.CC.fmtDateOnly(r.ends_on)}` : "dates not set"
        }</span></div>
          <div class="gantt-track">${bar}${demoMarker}</div>
        </div>`;
      })
      .join("");

    return `<div style="padding-top:14px">${rows}</div>`;
  }

  function renderList(main, data) {
    const plan = data.plan;
    const progress = data.progress;
    const joined = window.CC.joinStories(plan, progress);

    const rows = joined
      .map((s) => {
        const due = s.due_on ? window.CC.fmtDateOnly(s.due_on) : "not set";
        const baseline = s.due_baseline_on ? window.CC.fmtDateOnly(s.due_baseline_on) : "not set";
        const slipped = s.due_on && s.due_baseline_on && s.due_on !== s.due_baseline_on;
        return `
        <tr class="row-link" onclick="location.hash='#/pm/${encodeURIComponent(s.id)}'">
          <td>${esc(s.id)}</td>
          <td>${esc(s.title)}</td>
          <td>${esc(s.release || "")}</td>
          <td>${esc(due)}</td>
          <td>${esc(baseline)}${slipped ? ' <span class="gap-flag" title="Due date has moved from its original baseline">slipped</span>' : ""}</td>
          <td>${window.CC.stateBadge(s.progress?.verification?.state)}</td>
        </tr>`;
      })
      .join("");

    main.innerHTML = `
      <h1 class="cc-page-title">Project management</h1>
      <p class="cc-page-sub">Releases and every story's due date. The gap between "due" and its original baseline is slippage — shown, not hidden.</p>
      <div class="cc-section">
        <h2>Releases</h2>
        ${renderGantt(plan)}
      </div>
      <div class="cc-section">
        <h2>Stories</h2>
        <div class="cc-table-wrap">
          <table class="cc-table">
            <thead><tr><th>Story</th><th>Title</th><th>Release</th><th>Due</th><th>Baseline due</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderDetail(main, data, mode, id) {
    const plan = data.plan;
    const progress = data.progress;
    const story = window.CC.findStoryPlan(plan, id);
    const prog = window.CC.findStoryProgress(progress, id);
    if (!story) {
      main.innerHTML = `<a class="back-link" href="#/pm">← Back to Project management</a>
        <div class="cc-placeholder"><h2>Not found</h2><p>No story ${esc(id)}.</p></div>`;
      return;
    }
    const v = prog?.verification || {};
    const criteria = prog?.criteria || [];

    const criteriaHtml = criteria.length
      ? `<ul style="margin:0;padding-left:20px">${criteria
          .map(
            (c) =>
              `<li style="margin-bottom:6px">${c.passed ? '<span class="badge badge-ok">Passed</span>' : '<span class="badge badge-muted">Not yet</span>'} ${esc(
                c.text
              )}</li>`
          )
          .join("")}</ul>`
      : '<span class="cc-empty">No criteria recorded yet.</span>';

    const blockedBy = (story.blocked_by || [])
      .map((sid) => `<a class="pill" href="#/pm/${encodeURIComponent(sid)}">${esc(sid)}</a>`)
      .join("");

    main.innerHTML = `
      <a class="back-link" href="#/pm">← Back to Project management</a>
      <h1 class="cc-page-title">${esc(story.id)} — ${esc(story.title)}</h1>
      <p class="cc-page-sub">${esc(story.narrative || "")}</p>

      <div class="cc-section">
        <h2>Status</h2>
        <div class="kv-list">
          <div class="kv-row"><dt>Verification</dt><dd>${window.CC.stateBadge(v.state)}</dd></div>
          <div class="kv-row"><dt>Release</dt><dd>${esc(story.release || "—")}</dd></div>
          <div class="kv-row"><dt>Due</dt><dd>${story.due_on ? esc(window.CC.fmtDateOnly(story.due_on)) : '<span class="cc-empty">not set</span>'}</dd></div>
          <div class="kv-row"><dt>Baseline due</dt><dd>${story.due_baseline_on ? esc(window.CC.fmtDateOnly(story.due_baseline_on)) : '<span class="cc-empty">not set</span>'}</dd></div>
          <div class="kv-row"><dt>Owner</dt><dd><a class="pill" href="#/agents/${encodeURIComponent(story.owner_agent || "")}">${esc(story.owner_agent || "unassigned")}</a></dd></div>
          <div class="kv-row"><dt>Blocked by</dt><dd>${blockedBy ? `<div class="pill-list">${blockedBy}</div>` : '<span class="cc-empty">nothing</span>'}</dd></div>
          <div class="kv-row"><dt>Points awarded</dt><dd>${v.points_awarded ?? '<span class="cc-empty">not set</span>'}</dd></div>
          <div class="kv-row"><dt>Commit</dt><dd>${v.commit_url ? `<a href="${esc(v.commit_url)}">${esc(v.commit_sha || v.commit_url)}</a>` : '<span class="cc-empty">no commit recorded yet</span>'}</dd></div>
        </div>
      </div>

      <div class="cc-section">
        <h2>Acceptance criteria</h2>
        ${criteriaHtml}
      </div>

      <div class="cc-section">
        <h2>Failure paths</h2>
        ${
          (story.failure_paths || []).length
            ? `<div class="pill-list">${story.failure_paths.map((f) => `<span class="pill pill-muted">${esc(f)}</span>`).join("")}</div>`
            : '<span class="cc-empty">None recorded.</span>'
        }
      </div>
    `;
  }

  window.CC.tabPm = { renderList, renderDetail };
})();
