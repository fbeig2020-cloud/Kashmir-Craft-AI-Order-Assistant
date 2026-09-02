window.CC = window.CC || {};

(function () {
  const esc = window.CC.escapeHtml;

  function buildIndex(data) {
    const plan = data.plan;
    const progress = data.progress;
    const items = [];

    (plan.requirements || []).forEach((r) => {
      items.push({
        text: `${r.id} ${r.statement} ${r.cluster} ${r.kind} ${r.priority}`,
        title: `${r.id}: ${r.statement}`,
        tab: "Knowledge Base",
        href: "#/kb",
      });
    });
    (plan.stories || []).forEach((s) => {
      const acceptance = (s.acceptance || []).join(" ");
      items.push({
        text: `${s.id} ${s.title} ${s.narrative} ${acceptance} ${s.owner_agent}`,
        title: `${s.id}: ${s.title}`,
        tab: "Project Management",
        href: `#/pm/${encodeURIComponent(s.id)}`,
      });
    });
    (plan.derived?.guardrails || []).forEach((g) => {
      items.push({ text: `${g.id} ${g.statement} guardrail`, title: `Guardrail ${g.id}: ${g.statement}`, tab: "Guardrails", href: `#/guardrails/${encodeURIComponent(g.id)}` });
    });
    (plan.derived?.measures || []).forEach((m) => {
      items.push({ text: `${m.id} ${m.statement} outcome measure`, title: `Outcome ${m.id}: ${m.statement}`, tab: "Outcomes", href: `#/outcomes/${encodeURIComponent(m.id)}` });
    });
    (plan.derived?.roles || []).forEach((role) => {
      items.push({ text: `${role} role user`, title: `Role: ${role}`, tab: "Users and use case", href: `#/users/${encodeURIComponent(role)}` });
    });
    (plan.derived?.systems || []).forEach((sys) => {
      items.push({ text: `${sys} system integration`, title: `System: ${sys}`, tab: "Systems", href: `#/systems/${encodeURIComponent(sys)}` });
    });
    const owners = new Set((plan.stories || []).map((s) => s.owner_agent).filter(Boolean));
    owners.forEach((owner) => {
      items.push({ text: `${owner} agent owner`, title: `Owner: ${owner}`, tab: "AI Agents", href: `#/agents/${encodeURIComponent(owner)}` });
    });

    return items;
  }

  function search(index, query) {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (words.length === 0) return [];
    const scored = index
      .map((item) => {
        const hay = item.text.toLowerCase();
        const score = words.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0);
        return { item, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return scored.map((s) => s.item);
  }

  function renderChatPanel(index) {
    return `
      <div class="chat-panel">
        <div class="chat-log" id="kb-chat-log">
          <div class="chat-msg bot">Ask me about a requirement, story, role, guardrail or system — I only answer from the data loaded on this page, and I'll say so if it isn't here.</div>
        </div>
        <form class="chat-form" id="kb-chat-form">
          <input id="kb-chat-input" type="text" placeholder="e.g. what covers REQ-014?" autocomplete="off" />
          <button type="submit">Ask</button>
        </form>
      </div>`;
  }

  function wireChat(index) {
    const form = document.getElementById("kb-chat-form");
    const input = document.getElementById("kb-chat-input");
    const log = document.getElementById("kb-chat-log");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      const userMsg = document.createElement("div");
      userMsg.className = "chat-msg user";
      userMsg.textContent = q;
      log.appendChild(userMsg);

      const results = search(index, q);
      const botMsg = document.createElement("div");
      botMsg.className = "chat-msg bot";
      if (results.length === 0) {
        botMsg.textContent =
          "I can't answer that from the data on this page. Try a requirement id (e.g. REQ-014), a story id, a role, a guardrail or a system name.";
      } else {
        botMsg.innerHTML =
          results
            .map((r) => `<div>${esc(r.title)}<span class="cite">→ ${esc(r.tab)} tab — <a href="${r.href}">open</a></span></div>`)
            .join("") ;
      }
      log.appendChild(botMsg);
      log.scrollTop = log.scrollHeight;
      input.value = "";
    });
  }

  function renderList(main, data) {
    const requirements = data.plan?.requirements || [];
    const storyById = new Map((data.plan.stories || []).map((s) => [s.id, s]));
    const progressById = new Map((data.progress.stories || []).map((s) => [s.id, s]));

    const rows = requirements
      .map((r) => {
        const stories = r.fulfilled_by || [];
        const gap = r.priority === "must" && stories.length === 0;
        const pills = stories
          .map((sid) => {
            const verified = progressById.get(sid)?.verification?.state === "verified";
            return `<a class="pill ${verified ? "" : "pill-muted"}" href="#/pm/${encodeURIComponent(sid)}">${esc(sid)}${verified ? " ✓" : ""}</a>`;
          })
          .join("");
        return `
        <tr>
          <td>${esc(r.id)}</td>
          <td>${esc(r.statement)}</td>
          <td>${esc(r.kind)}</td>
          <td>${esc(r.priority)}</td>
          <td>${pills || (gap ? '<span class="gap-flag">No story fulfils this — real gap</span>' : '<span class="cc-empty">none</span>')}</td>
        </tr>`;
      })
      .join("");

    const index = buildIndex(data);

    main.innerHTML = `
      <h1 class="cc-page-title">Knowledge base</h1>
      <p class="cc-page-sub">Everything the project knows about itself. Grows for the whole programme.</p>

      <div class="cc-section">
        <h2>Requirement → story traceability</h2>
        <div class="cc-table-wrap">
          <table class="cc-table">
            <thead><tr><th>Requirement</th><th>Statement</th><th>Kind</th><th>Priority</th><th>Fulfilled by</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>

      <div class="cc-section">
        <h2>Ask the knowledge base</h2>
        ${renderChatPanel(index)}
      </div>
    `;

    wireChat(index);
  }

  window.CC.tabKb = { renderList };
})();
