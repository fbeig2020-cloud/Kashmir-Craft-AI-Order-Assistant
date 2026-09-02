(function () {
  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "outcomes", label: "Outcomes" },
    { id: "users", label: "Users & Use Case" },
    { id: "guardrails", label: "Guardrails" },
    { id: "systems", label: "Systems" },
    { id: "pm", label: "Project Management" },
    { id: "agents", label: "AI Agents" },
    { id: "kb", label: "Knowledge Base" },
    { id: "data-model", label: "Data Model" },
  ];

  const app = document.getElementById("app");

  function parseRoute() {
    const raw = window.location.hash.replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean).map((p) => {
      try {
        return decodeURIComponent(p);
      } catch (e) {
        return p;
      }
    });
    const tabId = TABS.some((t) => t.id === parts[0]) ? parts[0] : "overview";
    return { tabId, rest: parts.slice(1) };
  }

  function renderShell(data, mode) {
    const { tabId, rest } = parseRoute();
    const age = data.manifest ? window.CC.formatDataAge(data.manifest.generated_at) : null;

    const navHtml = TABS.map(
      (t) => `<a href="#/${t.id}" class="${t.id === tabId ? "active" : ""}">${t.label}</a>`
    ).join("");

    app.innerHTML = `
      <header class="cc-header">
        <div class="cc-title">
          <strong>Kashmir Craft — Command Center</strong>
          <span class="cc-datastamp ${age && age.warn ? "warn" : ""}">${age ? age.label : "Data as of: unknown"}</span>
        </div>
        <div class="cc-header-right">
          ${mode === "sample" ? '<span class="sample-banner">Sample data</span>' : ""}
          <div class="mode-toggle" role="group" aria-label="Sample or real data">
            <button data-mode="sample" class="${mode === "sample" ? "active" : ""}">Sample</button>
            <button data-mode="real" class="${mode === "real" ? "active" : ""}">Real</button>
          </div>
        </div>
      </header>
      <nav class="cc-nav">${navHtml}</nav>
      <main class="cc-main" id="cc-main"></main>
      <footer class="cc-footer">"Live" means as of your last sync from the portal — not continuously monitored.</footer>
    `;

    document.querySelectorAll(".mode-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.CC.setMode(btn.dataset.mode);
        renderApp();
      });
    });

    const main = document.getElementById("cc-main");

    if (data.error) {
      main.innerHTML = `<div class="cc-placeholder"><h2>Could not load project data</h2><p>${String(
        data.error.message || data.error
      )}</p><p>Check that <code>.colaberry/plan.json</code>, <code>.colaberry/progress.json</code> and
      <code>.colaberry/manifest.json</code> are present, or switch to Sample mode above.</p></div>`;
      return;
    }

    switch (tabId) {
      case "overview":
        window.CC.renderOverview(main, data, mode);
        break;
      case "outcomes":
        rest[0] ? window.CC.tabOutcomes.renderDetail(main, data, mode, rest[0]) : window.CC.tabOutcomes.renderList(main, data, mode);
        break;
      case "users":
        rest[0] ? window.CC.tabUsers.renderDetail(main, data, mode, rest[0]) : window.CC.tabUsers.renderList(main, data, mode);
        break;
      case "guardrails":
        rest[0] ? window.CC.tabGuardrails.renderDetail(main, data, mode, rest[0]) : window.CC.tabGuardrails.renderList(main, data, mode);
        break;
      case "systems":
        rest[0] ? window.CC.tabSystems.renderDetail(main, data, mode, rest[0]) : window.CC.tabSystems.renderList(main, data, mode);
        break;
      case "pm":
        rest[0] ? window.CC.tabPm.renderDetail(main, data, mode, rest[0]) : window.CC.tabPm.renderList(main, data, mode);
        break;
      case "agents":
        rest[0] ? window.CC.tabAgents.renderDetail(main, data, mode, rest[0]) : window.CC.tabAgents.renderList(main, data, mode);
        break;
      case "kb":
        window.CC.tabKb.renderList(main, data, mode);
        break;
      case "data-model":
        window.CC.tabDataModel.renderList(main, data, mode);
        break;
      default:
        window.CC.renderOverview(main, data, mode);
    }
  }

  async function renderApp() {
    const mode = window.CC.getMode();
    const data = await window.CC.getData();
    renderShell(data, mode);
  }

  window.addEventListener("hashchange", renderApp);
  window.addEventListener("DOMContentLoaded", renderApp);
  if (document.readyState !== "loading") {
    renderApp();
  }
})();
