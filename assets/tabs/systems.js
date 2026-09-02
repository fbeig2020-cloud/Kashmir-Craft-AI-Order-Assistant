window.CC = window.CC || {};

(function () {
  const esc = window.CC.escapeHtml;

  function renderList(main, data) {
    const systems = data.plan?.derived?.systems || [];
    if (systems.length === 0) {
      main.innerHTML = `
        <h1 class="cc-page-title">Systems</h1>
        <p class="cc-page-sub">What this connects to.</p>
        <div class="cc-placeholder"><h2>No systems named yet</h2>
        <p>Your plan names no external system. This is the correct empty state — not a zero pretending to be a real result.</p></div>`;
      return;
    }

    const cards = systems
      .map(
        (name) => `
        <a class="cc-card" href="#/systems/${encodeURIComponent(name)}">
          <span class="status-row"><span class="status-dot"></span>${esc(name)}</span>
          <span class="cc-card-detail">Not checked from here</span>
          <span class="cc-card-arrow">Details →</span>
        </a>`
      )
      .join("");

    main.innerHTML = `
      <h1 class="cc-page-title">Systems</h1>
      <p class="cc-page-sub">What this connects to. Whether any of these is actually connected right now is a fact about the running system — nothing in this repo can prove it, so every indicator starts grey.</p>
      <div class="cc-grid">${cards}</div>
    `;
  }

  function renderDetail(main, data, mode, name) {
    const systems = data.plan?.derived?.systems || [];
    const found = systems.find((s) => s === name);
    if (!found) {
      main.innerHTML = `<a class="back-link" href="#/systems">← Back to Systems</a>
        <div class="cc-placeholder"><h2>Not found</h2><p>No system named ${esc(name)}.</p></div>`;
      return;
    }
    main.innerHTML = `
      <a class="back-link" href="#/systems">← Back to Systems</a>
      <h1 class="cc-page-title">${esc(found)}</h1>
      <div class="cc-section">
        <div class="status-row"><span class="status-dot"></span><strong>Not checked from here</strong></div>
        <p style="margin-top:10px">This name appearing in the plan is not proof of a live connection. An indicator that turns green because a name showed up in a JSON file would be a lie with a colour on it — so it stays grey until the running system itself reports a connection.</p>
        <p class="cc-empty">Last checked: never.</p>
      </div>
    `;
  }

  window.CC.tabSystems = { renderList, renderDetail };
})();
