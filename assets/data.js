/* Loads .colaberry/*.json at runtime. Nothing here is hard-coded plan
   content — every tab reads through CC.getData(). */

window.CC = window.CC || {};

(function () {
  const DATA_PATHS = {
    plan: "./.colaberry/plan.json",
    progress: "./.colaberry/progress.json",
    manifest: "./.colaberry/manifest.json",
  };

  let realDataPromise = null;

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load ${path}: HTTP ${res.status}`);
    }
    return res.json();
  }

  function loadRealData() {
    if (!realDataPromise) {
      realDataPromise = Promise.all([
        fetchJson(DATA_PATHS.plan),
        fetchJson(DATA_PATHS.progress),
        fetchJson(DATA_PATHS.manifest),
      ]).then(([plan, progress, manifest]) => ({
        plan,
        progress,
        manifest,
        source: "real",
      }));
    }
    return realDataPromise;
  }

  // ---- sample/real mode, persisted per-browser ----
  const MODE_KEY = "cc.mode";

  function getMode() {
    try {
      const stored = localStorage.getItem(MODE_KEY);
      return stored === "sample" || stored === "real" ? stored : "real";
    } catch (e) {
      return "real";
    }
  }

  function setMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (e) {
      /* ignore storage failures, mode just won't persist */
    }
  }

  async function getData() {
    const mode = getMode();
    if (mode === "sample") {
      return window.CC.sampleData();
    }
    try {
      return await loadRealData();
    } catch (err) {
      return { error: err, source: "real" };
    }
  }

  // ---- join helpers ----
  function joinStories(plan, progress) {
    const progressById = new Map((progress?.stories || []).map((s) => [s.id, s]));
    return (plan?.stories || []).map((story) => ({
      ...story,
      progress: progressById.get(story.id) || null,
    }));
  }

  // ---- "Data as of" formatting ----
  function formatDataAge(generatedAt) {
    if (!generatedAt) {
      return { label: "Data as of: unknown — sync from the portal", warn: true };
    }
    const generated = new Date(generatedAt);
    if (isNaN(generated.getTime())) {
      return { label: "Data as of: unknown — sync from the portal", warn: true };
    }
    const now = new Date();
    const ms = now - generated;
    const days = ms / (1000 * 60 * 60 * 24);

    const absolute = generated.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let relative;
    if (days < 1) {
      const hours = Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
      relative = hours <= 0 ? "less than an hour ago" : `${hours} hour${hours === 1 ? "" : "s"} ago`;
    } else {
      const wholeDays = Math.floor(days);
      relative = `${wholeDays} day${wholeDays === 1 ? "" : "s"} ago`;
    }

    const warn = days > 7;
    let label = `Data as of ${absolute} (${relative})`;
    if (warn) {
      label += " — sync from the portal to refresh";
    }
    return { label, warn };
  }

  // ---- small shared helpers ----
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  const STATE_LABELS = {
    verified: "Verified",
    submitted: "Submitted",
    in_progress: "In progress",
    not_started: "Not started",
  };

  const STATE_BADGE_CLASS = {
    verified: "badge-ok",
    submitted: "badge-warn",
    in_progress: "badge-warn",
    not_started: "badge-muted",
  };

  function stateBadge(state) {
    const s = state || "not_started";
    const cls = STATE_BADGE_CLASS[s] || "badge-muted";
    const label = STATE_LABELS[s] || s;
    return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
  }

  function fmtDateOnly(iso) {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    const d = m
      ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      : new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function findRequirement(plan, id) {
    return (plan?.requirements || []).find((r) => r.id === id) || null;
  }
  function findStoryPlan(plan, id) {
    return (plan?.stories || []).find((s) => s.id === id) || null;
  }
  function findStoryProgress(progress, id) {
    return (progress?.stories || []).find((s) => s.id === id) || null;
  }

  window.CC.getData = getData;
  window.CC.getMode = getMode;
  window.CC.setMode = setMode;
  window.CC.joinStories = joinStories;
  window.CC.formatDataAge = formatDataAge;
  window.CC.escapeHtml = escapeHtml;
  window.CC.stateBadge = stateBadge;
  window.CC.fmtDateOnly = fmtDateOnly;
  window.CC.findRequirement = findRequirement;
  window.CC.findStoryPlan = findStoryPlan;
  window.CC.findStoryProgress = findStoryProgress;
})();
