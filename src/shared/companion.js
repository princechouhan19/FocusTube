/**
 * FocusTube — Interactive Companion (v1.17.0 "Anime Duo")
 * ========================================================
 * Your chosen anime buddy — MIKA (girl) or HARU (boy), picked during
 * onboarding — floats on every page and keeps your attention honest, in
 * real time:
 *
 *   · ANIME DUO       — hand-authored chibi-anime SVG (companion-art.js),
 *                       8 emotion faces driven by the live site score
 *   · LIVE SITE CLOCK — seconds-accurate "12m 40s on this site" chip
 *   · MOOD ENGINE     — happy & cheering on productive sites, concerned →
 *                       sad on rabbit-hole sites, celebrating your rings
 *   · NUDGES          — research-phrased speech bubbles (motivate / demotivate)
 *   · TAP TO EXPAND   — mini rings, streak, saved time, quick actions and a
 *                       live MIKA/HARU buddy switcher
 *   · DRAG ANYWHERE   — position persists across pages (storage)
 *   · SNOOZE / PER-SITE HIDE — autonomy-supportive, never a nanny
 *
 * Design notes:
 *   · Character art in a closed ShadowRoot — zero CSS leakage in either
 *     direction, no dependence on page styles, tiny footprint.
 *   · The SAME buddy also appears on every full-screen extension page
 *     (onboarding guide, dashboard, block page, digest) via
 *     companion-widget.js — but never inside the popup/sidebar UI.
 *   · Why not 3D: WebGL in a persistent content-script overlay costs battery
 *     and a texture-heavy model would triple the extension size. The same
 *     personality is achievable with vector art + spring easing (HIG motion),
 *     and it stays crisp at every DPI. A 3D variant can be layered later.
 *   · Timer truth: the background service worker already accumulates
 *     per-domain seconds in `timeUsage` (30 s ticks). The companion seeds
 *     from that and keeps its own 1 s ticker for the current session.
 *   · Mood inputs: `blockedSites` / `smartListsEnabled` categories (hostile
 *     = blocked or distraction category), `timeLimits`, and the day's ring
 *     data for celebrations.
 *   · Honors prefers-reduced-motion (no bob/blink), z-index capped above
 *     YouTube's theater chrome, and it never overlaps clicks (pointer-events
 *     only on the widget itself).
 *
 * Settings keys: companionEnabled (bool), companionCharacter ('mika'|'haru'),
 *                userName (string, set in onboarding),
 *                companionHiddenSites [domains], companionPos {x,y},
 *                companionSnoozedUntil (epoch ms)
 */
(function () {
  "use strict";

  if (window.__focustubeCompanion) return;
  window.__focustubeCompanion = true;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SNOOZE_KEY = "companionSnoozedUntil";
  const HIDDEN_KEY = "companionHiddenSites";
  const POS_KEY = "companionPos";
  const SETTINGS_KEY = "companionEnabled";
  const CHARACTER_KEY = "companionCharacter";

  let settings = { enabled: true, character: "mika", hiddenSites: [], pos: null, snoozedUntil: 0 };
  let siteCategory = "neutral"; // neutral | productive | distraction | blocked
  let sessionSeconds = 0;
  let todayRings = null;       // {closed, total}
  let mood = "idle";           // idle | good | warn | danger | cheer | sleep
  let dragState = null;
  let panelOpen = false;
  let bubbleTimer = null;
  let tickTimer = null;

  // ---------------------------------------------------------------------------
  // Domain & category heuristics
  // ---------------------------------------------------------------------------
  const PRODUCTIVE_HINTS = [
    "github", "gitlab", "stackoverflow", "docs.google", "notion.so", "figma",
    "linkedin.com/jobs", "developer.mozilla", "wikipedia", "arxiv", "coursera",
    "edx.org", "khanacademy", "leetcode", "atlassian", "linear.app", "vercel",
  ];
  const DISTRACTION_HINTS = [
    "x.com", "twitter.com", "instagram", "facebook", "reddit", "tiktok",
    "netflix", "twitch", "9gag", "pinterest", "buzzfeed", "dailymail",
    "kotaku", "espncdn", "rollcall",
  ];

  function hostOf() {
    try {
      return new URL(location.href).hostname.toLowerCase().replace(/^www\./, "");
    } catch (_) {
      return "";
    }
  }

  function categorize(host) {
    // Test/harness hook: lets a headless harness pin a category without
    // serving pages from real domains. Never set in production.
    if (typeof window !== "undefined" && window.__ftCompanionCategoryOverride) {
      return window.__ftCompanionCategoryOverride;
    }
    if (!host) return "neutral";
    for (const h of DISTRACTION_HINTS) if (host.includes(h)) return "distraction";
    for (const h of PRODUCTIVE_HINTS) if (host.includes(h)) return "productive";
    // YouTube is judged by the page type (watch = ok, feed/shorts = distraction)
    if (host.includes("youtube.com")) {
      return /\/watch|\/embed/.test(location.pathname) ? "productive" : "distraction";
    }
    return "neutral";
  }

  // ---------------------------------------------------------------------------
  // Storage bootstrap + live listeners
  // ---------------------------------------------------------------------------
  async function boot() {
    try {
      const data = await chrome.storage.local.get([
        SETTINGS_KEY, HIDDEN_KEY, POS_KEY, SNOOZE_KEY, CHARACTER_KEY,
        "userName",
        "timeUsage", "blockedSites", "focusAnalyticsDaily", "smartListsEnabled",
      ]);
      settings.enabled = data[SETTINGS_KEY] !== false;
      settings.character = data[CHARACTER_KEY] === "haru" ? "haru"
        : data[CHARACTER_KEY] === "mika" ? "mika" : "mika";
      settings.userName = typeof data.userName === "string" ? data.userName.trim() : "";
      settings.hiddenSites = Array.isArray(data[HIDDEN_KEY]) ? data[HIDDEN_KEY] : [];
      settings.pos = data[POS_KEY] || null;
      settings.snoozedUntil = Number(data[SNOOZE_KEY]) || 0;

      const host = hostOf();
      siteCategory = categorize(host);
      sessionSeconds = seedSecondsFor(host, data.timeUsage);

      computeRings(data.focusAnalyticsDaily);
      if (isSuppressed(host)) return;

      build();
      tickTimer = setInterval(tick, 1000);
      setInterval(refreshLight, 30000); // re-seed + ring refresh, cheap

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes[SNOOZE_KEY]) settings.snoozedUntil = Number(changes[SNOOZE_KEY].newValue) || 0;
        if (changes[HIDDEN_KEY]) settings.hiddenSites = Array.isArray(changes[HIDDEN_KEY].newValue) ? changes[HIDDEN_KEY].newValue : [];
        if (changes[CHARACTER_KEY]) {
          const next = changes[CHARACTER_KEY].newValue === "haru" ? "haru" : "mika";
          if (next !== settings.character) {
            settings.character = next;
            renderMascot();
            const buddyName = next === "haru" ? "Haru" : "Mika";
            say(`${buddyName} here — reporting for duty!`);
            if (panelOpen) renderPanel();
          }
        }
        if (changes[SETTINGS_KEY]) {
          settings.enabled = changes[SETTINGS_KEY].newValue !== false;
          if (!settings.enabled) teardown();
          else if (!root) build();
        }
        if (changes[SNOOZE_KEY] || changes[SETTINGS_KEY]) applySuppression();
      });
    } catch (_) {
      /* storage unavailable — stay dormant */
    }
  }

  function isSuppressed(host) {
    const now = Date.now();
    if (settings.snoozedUntil && settings.snoozedUntil > now) return true;
    if (settings.hiddenSites.includes(host)) return true;
    return false;
  }

  function seedSecondsFor(host, timeUsage) {
    try {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const today = (timeUsage && timeUsage[key]) || {};
      return Math.max(0, Number(today[host]) || 0);
    } catch (_) {
      return 0;
    }
  }

  function computeRings(analytics) {
    try {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const today = (analytics && analytics[key]) || {};
      const goals = { deflected: 12, focusMinutes: 120, savedMinutes: 60 };
      const deflected = (Number(today.shortsSkipped) || 0) + (Number(today.adsBlocked) || 0) + (Number(today.quitsEarly) || 0);
      const focused = Number(today.pomodoroCompleted) || 0;
      const saved = Number(today.timeSavedMinutes) || 0;
      const closed =
        (deflected >= goals.deflected ? 1 : 0) +
        (focused * 25 >= goals.focusMinutes ? 1 : 0) +
        (saved >= goals.savedMinutes ? 1 : 0);
      todayRings = { closed, total: 3, deflected, focusedMin: focused * 25, savedMin: saved };
    } catch (_) {
      todayRings = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Mood engine
  // ---------------------------------------------------------------------------
  function computeMood() {
    if (todayRings && todayRings.closed === 3 && !sessionCelebratedThisOpen) {
      return "cheer";
    }
    const mins = sessionSeconds / 60;
    if (siteCategory === "blocked") return "danger";
    if (siteCategory === "distraction") {
      if (mins >= 15) return "danger";
      if (mins >= 6) return "warn";
      return "warn";
    }
    if (siteCategory === "productive") return mins >= 25 ? "good" : "good";
    return mins >= 20 ? "warn" : "idle";
  }

  let sessionCelebratedThisOpen = false;

  const BUBBLES = {
    idle: [
      "I'm here when you need a nudge.",
      "One tab at a time — that's the whole secret.",
    ],
    good: [
      "Deep work looks great on you.",
      "This is what momentum feels like — keep going.",
      "Your future self says thanks.",
    ],
    warn: [
      "This feed is designed to keep you. You designed your day — remember?",
      "Small check: is this still what you came here for?",
      "Your Focused ring is still open. It's waiting.",
    ],
    danger: [
      "You're past the point of fun — this is a rabbit hole now.",
      "Every minute here is a minute your goal didn't get.",
      "Let's get you out. One click: 'Block this site'.",
    ],
    cheer: [
      "ALL THREE RINGS CLOSED. Absolute legend. 🏆",
      "Rings complete — this is the day you planned.",
    ],
    sleep: "Snoozed — I'll check back later.",
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------------------------------------------------------------------------
  // Shadow DOM construction
  // ---------------------------------------------------------------------------
  let host = null;
  let root = null;
  let bubbleEl = null;
  let chipEl = null;
  let panelEl = null;
  let mascotEl = null;
  let mascotArtEl = null;

  // Renders the anime buddy (companion-art.js) into the floating widget.
  // Emotion follows the mood engine; pose switches to "cheer" when the
  // rings celebrate. Falls back to a tiny vector smiley if the art module
  // is missing (never expected — manifest loads it first).
  function renderMascot() {
    if (!mascotArtEl) return;
    const art = window.FTCompanionArt;
    if (art && typeof art.render === "function") {
      mascotArtEl.innerHTML = art.render({
        character: settings.character,
        emotion: art.emotionForMood(mood),
        pose: mood === "cheer" ? "cheer" : "idle",
        size: 88,
        idPrefix: "foco",
      });
    } else {
      mascotArtEl.innerHTML =
        '<svg viewBox="0 0 100 100" width="88" height="88"><circle cx="50" cy="50" r="40" fill="#2FB8A6"/><circle cx="38" cy="44" r="5" fill="#101418"/><circle cx="62" cy="44" r="5" fill="#101418"/><path d="M36 62 Q50 74 64 62" stroke="#101418" stroke-width="5" fill="none" stroke-linecap="round"/></svg>';
    }
  }

  function build() {
    if (root) return;
    host = document.createElement("div");
    host.id = "focustube-companion-host";
    host.style.cssText = "position:fixed;z-index:2147483646;pointer-events:none;";
    root = host.attachShadow({ mode: "closed" });
    root.innerHTML = template();
    document.documentElement.appendChild(host);

    mascotEl = root.querySelector(".foco");
    mascotArtEl = root.querySelector(".foco-art");
    bubbleEl = root.querySelector(".foco-bubble");
    chipEl = root.querySelector(".foco-chip");
    panelEl = root.querySelector(".foco-panel");

    if (settings.pos && Number.isFinite(settings.pos.x) && Number.isFinite(settings.pos.y)) {
      place(settings.pos.x, settings.pos.y);
    } else {
      place(window.innerWidth - 140, window.innerHeight - 240);
    }

    bindDrag();
    bindClicks();
    applyMood(computeMood(), true);
    paintChip();
    saySomething();
  }

  function teardown() {
    if (tickTimer) clearInterval(tickTimer);
    if (bubbleTimer) clearTimeout(bubbleTimer);
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null; root = null; panelOpen = false;
  }

  function applySuppression() {
    const suppressed = isSuppressed(hostOf());
    if (suppressed && host) teardown();
    else if (!suppressed && settings.enabled && !host) build();
  }

  function template() {
    const blinkAnim = REDUCED ? "" : `
      @keyframes foco-pop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    `;
    return `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .foco-wrap {
        position: fixed; right: 24px; bottom: 28px;
        display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
        font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
        pointer-events: none; user-select: none; -webkit-user-select: none;
      }
      .foco-panel {
        position: absolute; right: 0; bottom: calc(100% + 10px);
        pointer-events: auto; width: 248px; padding: 14px; border-radius: 16px;
        background: rgba(22,22,26,.97); color: #f2f2f7; border: 1px solid rgba(255,255,255,.12);
        box-shadow: 0 18px 50px rgba(0,0,0,.5); display: none;
        font-size: 12.5px;
        ${REDUCED ? "" : "animation: foco-pop .38s cubic-bezier(.34,1.56,.64,1);"}
      }
      .foco-bubble {
        pointer-events: auto; max-width: 240px; padding: 10px 14px;
        background: rgba(28,28,32,.94); color: #f2f2f7; font-size: 12.5px; line-height: 1.45;
        border-radius: 14px 14px 4px 14px; border: 1px solid rgba(255,255,255,.10);
        box-shadow: 0 10px 30px rgba(0,0,0,.4); opacity: 0; transform: translateY(6px);
        transition: opacity .35s ease, transform .35s cubic-bezier(.34,1.56,.64,1);
      }
      .foco-bubble.show { opacity: 1; transform: translateY(0); }
      .foco-chip {
        pointer-events: auto; display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
        font-variant-numeric: tabular-nums; letter-spacing: .02em;
        background: rgba(28,28,32,.92); color: rgba(255,255,255,.85);
        border: 1px solid rgba(255,255,255,.10); box-shadow: 0 6px 18px rgba(0,0,0,.35);
      }
      .foco-chip .dot { width: 6px; height: 6px; border-radius: 3px; background: #8E8E93; }
      .foco-chip.good .dot { background: #92E82A; }
      .foco-chip.warn .dot { background: #FFD60A; }
      .foco-chip.danger .dot { background: #FF453A; }
      .foco-chip.cheer .dot { background: #FFD60A; }
      .foco {
        pointer-events: auto; cursor: grab; width: 96px; height: 120px; position: relative;
      }
      .foco:active { cursor: grabbing; }
      .foco-art { line-height: 0; filter: drop-shadow(0 10px 18px rgba(0,0,0,.35)); }
      .foco-panel {
        position: absolute; right: 0; bottom: calc(100% + 10px);
        pointer-events: auto; width: 248px; padding: 14px; border-radius: 16px;
        background: rgba(22,22,26,.97); color: #f2f2f7; border: 1px solid rgba(255,255,255,.12);
        box-shadow: 0 18px 50px rgba(0,0,0,.5); display: none;
        font-size: 12.5px;
        ${REDUCED ? "" : "animation: foco-pop .38s cubic-bezier(.34,1.56,.64,1);"}
      }
      .foco-panel.open { display: block; }
      .foco-panel h4 { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; opacity: .5; margin-bottom: 8px; }
      .fp-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; }
      .fp-row + .fp-row { border-top: 1px solid rgba(255,255,255,.07); }
      .fp-row b { font-variant-numeric: tabular-nums; font-weight: 700; }
      .fp-rings { display: flex; gap: 4px; }
      .fp-ring { width: 22px; height: 22px; border-radius: 50%; border: 3px solid rgba(255,255,255,.14); }
      .fp-ring.on-red { border-color: #FA114F; box-shadow: 0 0 6px rgba(250,17,79,.5); }
      .fp-ring.on-green { border-color: #92E82A; box-shadow: 0 0 6px rgba(146,232,42,.5); }
      .fp-ring.on-cyan { border-color: #00FDDC; box-shadow: 0 0 6px rgba(0,253,220,.5); }
      .fp-actions { display: flex; gap: 8px; margin-top: 10px; }
      .fp-btn {
        flex: 1; padding: 8px 0; border-radius: 9px; border: 0; cursor: pointer;
        font-size: 11.5px; font-weight: 600; font-family: inherit;
        background: rgba(255,255,255,.08); color: rgba(255,255,255,.85);
      }
      .fp-btn:hover { background: rgba(255,255,255,.14); }
      .fp-btn.primary { background: #0A84FF; color: #fff; }
      .fp-btn.block { background: rgba(255,69,58,.16); color: #FF6961; }
      .fp-btn.block:hover { background: rgba(255,69,58,.28); }
      .fp-buddy .fp-buddy-btns { display: inline-flex; gap: 6px; }
      .fp-mini {
        padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.07); color: rgba(255,255,255,.75);
        font-size: 11px; font-weight: 600; font-family: inherit; cursor: pointer;
      }
      .fp-mini:hover { background: rgba(255,255,255,.14); }
      .fp-mini.on { background: #0A84FF; border-color: #0A84FF; color: #fff; }
      ${blinkAnim}
    </style>
    <div class="foco-wrap">
      <div class="foco-panel"></div>
      <div class="foco-bubble"></div>
      <div class="foco-chip"><span class="dot"></span><span class="chip-text">0:00</span></div>
      <div class="foco" role="button" aria-label="FocusTube companion" tabindex="0">
        <div class="foco-art"></div>
      </div>
      <div class="foco-panel"></div>
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------
  function place(x, y) {
    const wrap = root.querySelector(".foco-wrap");
    const maxX = window.innerWidth - 90;
    const maxY = window.innerHeight - 120;
    const cx = Math.max(8, Math.min(maxX, x));
    const cy = Math.max(8, Math.min(maxY, y));
    wrap.style.left = `${cx}px`;
    wrap.style.top = `${cy}px`;
    wrap.style.right = "auto";
    wrap.style.bottom = "auto";
  }

  function bindDrag() {
    const foco = mascotEl;
    let start = null;
    foco.addEventListener("pointerdown", (e) => {
      start = { mx: e.clientX, my: e.clientY };
      foco.setPointerCapture(e.pointerId);
    });
    foco.addEventListener("pointermove", (e) => {
      if (!start) return;
      const dx = e.clientX - start.mx;
      const dy = e.clientY - start.my;
      if (Math.abs(dx) + Math.abs(dy) > 6) {
        const wrap = root.querySelector(".foco-wrap");
        const rect = wrap.getBoundingClientRect();
        dragState = true;
        place(rect.left + dx, rect.top + dy);
        start = { mx: e.clientX, my: e.clientY };
      }
    });
    foco.addEventListener("pointerup", () => {
      if (dragState) {
        dragState = false;
        const rect = root.querySelector(".foco-wrap").getBoundingClientRect();
        settings.pos = { x: rect.left, y: rect.top };
        chrome.storage.local.set({ [POS_KEY]: settings.pos }).catch(() => {});
        return; // suppress the click-toggle after a drag
      }
      togglePanel();
    });
  }

  function bindClicks() {
    panelEl.addEventListener("click", (e) => {
      const buddyBtn = e.target.closest("[data-buddy]");
      if (buddyBtn) {
        const next = buddyBtn.dataset.buddy === "haru" ? "haru" : "mika";
        if (next !== settings.character) {
          settings.character = next;
          chrome.storage.local.set({ [CHARACTER_KEY]: next }).catch(() => {});
          renderMascot();
          say(`${next === "haru" ? "Haru" : "Mika"} here — reporting for duty!`);
        }
        renderPanel();
        return;
      }
      const btn = e.target.closest(".fp-btn");
      if (!btn) return;
      if (btn.dataset.action === "snooze") {
        chrome.storage.local.set({ [SNOOZE_KEY]: Date.now() + 60 * 60 * 1000 }).catch(() => {});
        say("Snoozed for an hour. I'll be back.");
        setTimeout(() => teardown(), 900);
      } else if (btn.dataset.action === "hide") {
        const h = hostOf();
        const next = Array.from(new Set([...(settings.hiddenSites || []), h]));
        settings.hiddenSites = next;
        chrome.storage.local.set({ [HIDDEN_KEY]: next }).catch(() => {});
        teardown();
      } else if (btn.dataset.action === "block") {
        blockCurrentSite();
      } else if (btn.dataset.action === "dashboard") {
        try {
          chrome.runtime.sendMessage({ action: "openDashboard" }, () => void chrome.runtime.lastError);
        } catch (_) { /* best effort */ }
      }
    });
  }

  async function blockCurrentSite() {
    const h = hostOf();
    try {
      const data = await chrome.storage.local.get("blockedSites");
      const list = Array.isArray(data.blockedSites) ? data.blockedSites : [];
      if (!list.some((x) => x && x.domain === h)) {
        list.push({ domain: h, blockUntil: Date.now() + 60 * 60 * 1000, reason: "Companion — one-hour break" });
        await chrome.storage.local.set({ blockedSites: list });
      }
      say("Done. One hour of peace. 🛡");
      siteCategory = "blocked";
      applyMood("cheer");
      renderPanel();
    } catch (_) {
      say("Couldn't reach storage — try the popup blocker.");
    }
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    if (panelOpen) renderPanel();
    panelEl.classList.toggle("open", panelOpen);
  }

  function renderPanel() {
    const h = hostOf();
    const mins = Math.floor(sessionSeconds / 60);
    const rings = todayRings;
    panelEl.innerHTML = `
      <h4>FocusTube · now</h4>
      <div class="fp-row"><span>${escapeHtml(h || "this page")}</span><b>${mins}m ${Math.floor(sessionSeconds % 60)}s</b></div>
      <div class="fp-row"><span>Mood</span><b>${moodLabel()}</b></div>
      <div class="fp-row"><span>Rings today</span>
        <span class="fp-rings">
          <span class="fp-ring ${rings && rings.deflected >= 12 ? "on-red" : ""}"></span>
          <span class="fp-ring ${rings && rings.focusedMin >= 120 ? "on-green" : ""}"></span>
          <span class="fp-ring ${rings && rings.savedMin >= 60 ? "on-cyan" : ""}"></span>
        </span>
      </div>
      <div class="fp-row"><span>Saved today</span><b>${rings ? `${rings.savedMin}m` : "—"}</b></div>
      <div class="fp-row fp-buddy">
        <span>Buddy</span>
        <span class="fp-buddy-btns">
          <button class="fp-mini ${settings.character === "mika" ? "on" : ""}" data-buddy="mika">Mika</button>
          <button class="fp-mini ${settings.character === "haru" ? "on" : ""}" data-buddy="haru">Haru</button>
        </span>
      </div>
      <div class="fp-actions">
        ${siteCategory !== "blocked" ? `<button class="fp-btn block" data-action="block">Block site 1h</button>` : ""}
        <button class="fp-btn" data-action="snooze">Snooze 1h</button>
        <button class="fp-btn" data-action="hide">Hide here</button>
      </div>
    `;
  }

  function moodLabel() {
    return { idle: "Neutral", good: "Focused", warn: "Concerned", danger: "Alarmed", cheer: "Celebrating", sleep: "Snoozing" }[mood] || "Neutral";
  }

  // ---------------------------------------------------------------------------
  // Live updates
  // ---------------------------------------------------------------------------
  function tick() {
    sessionSeconds += 1;
    paintChip();
    const next = computeMood();
    if (next !== mood) applyMood(next);
    // escalations mid-session
    if (siteCategory === "distraction" || siteCategory === "neutral") {
      const mins = sessionSeconds / 60;
      if (mins > 0 && mins % 10 === 0 && Math.floor(sessionSeconds % 60) < 2) {
        saySomething(true);
      }
    }
  }

  async function refreshLight() {
    try {
      const data = await chrome.storage.local.get(["timeUsage", "focusAnalyticsDaily"]);
      sessionSeconds = seedSecondsFor(hostOf(), data.timeUsage) || sessionSeconds;
      computeRings(data.focusAnalyticsDaily);
      if (panelOpen) renderPanel();
    } catch (_) {}
  }

  function paintChip() {
    if (!chipEl) return;
    const total = Math.floor(sessionSeconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    chipEl.querySelector(".chip-text").textContent = `${m}:${String(s).padStart(2, "0")}`;
    chipEl.classList.remove("good", "warn", "danger", "cheer");
    if (["good", "warn", "danger", "cheer"].includes(mood)) chipEl.classList.add(mood);
  }

  // ---------------------------------------------------------------------------
  // Mood application (face + colors)
  // ---------------------------------------------------------------------------
  function applyMood(next, force) {
    const prev = mood;
    mood = next;
    if (next !== prev || force) {
      renderMascot();
      if (!REDUCED) {
        mascotEl.style.transform = "scale(1.12)";
        setTimeout(() => (mascotEl.style.transform = ""), 260);
        mascotEl.style.transition = "transform .26s cubic-bezier(.34,1.56,.64,1)";
      }
    }
    paintChip();
    if (panelOpen) renderPanel();
    if (next === "cheer" && !sessionCelebratedThisOpen) {
      sessionCelebratedThisOpen = true;
      saySomething(true);
    } else if ((next === "danger" || next === "warn") && Math.random() < 0.6) {
      saySomething(true);
    }
  }

  function say(text) {
    if (!bubbleEl) return;
    bubbleEl.textContent = text;
    bubbleEl.classList.add("show");
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubbleEl.classList.remove("show"), 6000);
  }

  function saySomething(force) {
    const pool = BUBBLES[mood] || BUBBLES.idle;
    if (!force && Math.random() > 0.5) return;
    say(pick(pool));
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
