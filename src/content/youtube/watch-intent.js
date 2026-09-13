/**
 * FocusTube — Watch Intent (v1.17.0, P0)
 * ======================================
 * "Why are you here?" — an implementation-intention prompt on YouTube watch
 * pages (Gollwitzer 1999: stating an if-then plan reliably increases goal
 * attainment; Mendoza 2018: pre-committed media plans cut distraction media
 * consumption). One question, once per watch session:
 *
 *   · chips (Learn / Music / Tutorial / Entertainment) or free text,
 *   · optional planned minutes,
 *   · an honest "Just browsing" answer that starts a mindful countdown and
 *     re-asks when it runs out.
 *
 * Outcomes are logged to `watchIntents` (day-keyed, pruned to 60 days):
 *   { "YYYY-MM-DD": [{ t, kind, purpose, plannedMin, videoId, matched }] }
 * matched is set when the session resolves:
 *   · watched ≤ plannedMin (+25% grace, min +2 min) → true
 *   · stayed much longer or hopped deeper → false
 *   · browsing intent → scored as null and excluded from the rate.
 * The dashboard renders the resulting Intent-match rate.
 */
(function () {
  "use strict";

  if (window.__ftWatchIntent) return;
  window.__ftWatchIntent = true;

  const KEY = "watchIntents";
  const BROWSE_GRACE_DEFAULT_MIN = 10;
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CHIP_KINDS = [
    { id: "learn", label: "Learn something", emoji: "📚" },
    { id: "music", label: "Music / background", emoji: "🎧" },
    { id: "tutorial", label: "Follow a tutorial", emoji: "🛠" },
    { id: "fun", label: "Planned entertainment", emoji: "🎬" },
    { id: "browse", label: "Just browsing", emoji: "🌊" },
  ];

  let sheetEl = null;
  let askedThisNav = false;
  let activeIntent = null; // {t, kind, purpose, plannedMin, videoId, startTs}
  let browseDeadline = 0;

  function todayKey() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function videoIdOf() {
    try {
      return new URL(location.href).searchParams.get("v") || "";
    } catch (_) {
      return "";
    }
  }

  function isWatchPage() {
    // Test/harness hook for headless verification (never set in production).
    if (typeof window !== "undefined" && window.__ftWatchIntentWatchOverride) return true;
    return location.pathname === "/watch" || location.pathname.startsWith("/watch/");
  }

  async function logIntent(entry) {
    try {
      const data = await chrome.storage.local.get(KEY);
      const map = (data && data[KEY]) || {};
      const tk = todayKey();
      const list = Array.isArray(map[tk]) ? map[tk] : [];
      list.push(entry);
      map[tk] = list;
      // prune to 60 day keys
      const keys = Object.keys(map).sort();
      while (keys.length > 60) delete map[keys.shift()];
      await chrome.storage.local.set({ [KEY]: map });
    } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById("ft-watch-intent-style")) return;
    const style = document.createElement("style");
    style.id = "ft-watch-intent-style";
    style.textContent = `
      .ftwi-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483645;
        opacity:0;transition:opacity .3s ease;display:flex;align-items:flex-end;justify-content:center;}
      .ftwi-backdrop.show{opacity:1;}
      .ftwi-sheet{width:min(560px,94vw);margin-bottom:24px;border-radius:20px;padding:22px;
        background:rgba(28,28,32,.98);color:#f2f2f7;border:1px solid rgba(255,255,255,.1);
        box-shadow:0 24px 70px rgba(0,0,0,.6);font-family:-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif;
        transform:translateY(40px);transition:transform .38s cubic-bezier(.34,1.4,.64,1);}
      .ftwi-backdrop.show .ftwi-sheet{transform:translateY(0);}
      .ftwi-eyebrow{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#0A84FF;font-weight:700;margin:0 0 4px;}
      .ftwi-title{font-size:19px;font-weight:800;margin:0 0 4px;}
      .ftwi-sub{font-size:12.5px;color:rgba(242,242,247,.55);margin:0 0 14px;}
      .ftwi-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
      .ftwi-chip{padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.06);color:#f2f2f7;font-size:13px;font-weight:600;cursor:pointer;
        transition:transform .2s cubic-bezier(.34,1.56,.64,1),background .2s,border-color .2s;}
      .ftwi-chip:hover{transform:translateY(-1px);}
      .ftwi-chip.sel{background:#0A84FF;border-color:#0A84FF;}
      .ftwi-row{display:flex;gap:10px;align-items:center;margin-bottom:16px;}
      .ftwi-input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.06);color:inherit;font-size:13.5px;outline:none;}
      .ftwi-input:focus{border-color:#0A84FF;}
      .ftwi-min{width:88px;flex:none;}
      .ftwi-go{padding:11px 20px;border-radius:11px;border:0;background:#0A84FF;color:#fff;
        font-size:14px;font-weight:700;cursor:pointer;}
      .ftwi-go:disabled{opacity:.35;cursor:default;}
      @media (prefers-reduced-motion: reduce){.ftwi-backdrop,.ftwi-sheet{transition:none;transform:none;}}
    `;
    document.documentElement.appendChild(style);
  }

  function ask() {
    if (sheetEl) return;
    askedThisNav = true;
    injectStyles();

    const backdrop = document.createElement("div");
    backdrop.className = "ftwi-backdrop";
    backdrop.innerHTML = `
      <div class="ftwi-sheet" role="dialog" aria-label="What are you here for?">
        <p class="ftwi-eyebrow">Watch Intent</p>
        <h2 class="ftwi-title">What are you here for?</h2>
        <p class="ftwi-sub">Say it once — watching on purpose beats watching on autopilot.</p>
        <div class="ftwi-chips">
          ${CHIP_KINDS.map((c) => `<button class="ftwi-chip" data-kind="${c.id}">${c.emoji} ${c.label}</button>`).join("")}
        </div>
        <div class="ftwi-row">
          <input class="ftwi-input" type="text" maxlength="80" placeholder="…or type it (optional)" />
          <input class="ftwi-input ftwi-min" type="number" min="1" max="240" placeholder="min" />
          <button class="ftwi-go" disabled>Start</button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(backdrop);
    sheetEl = backdrop;

    let kind = null;
    const chips = backdrop.querySelectorAll(".ftwi-chip");
    const input = backdrop.querySelector(".ftwi-input");
    const mins = backdrop.querySelector(".ftwi-min");
    const go = backdrop.querySelector(".ftwi-go");

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("sel"));
        chip.classList.add("sel");
        kind = chip.dataset.kind;
        go.disabled = false;
        go.focus();
      });
    });
    input.addEventListener("input", () => {
      if (!kind && input.value.trim().length >= 3) go.disabled = false;
    });

    function dismiss() {
      backdrop.classList.remove("show");
      setTimeout(() => backdrop.remove(), REDUCED ? 0 : 380);
      if (sheetEl === backdrop) sheetEl = null;
    }

    go.addEventListener("click", () => {
      const purpose = input.value.trim();
      const plannedMin = Math.max(1, Math.min(240, Number(mins.value) || 0));
      activeIntent = {
        t: Date.now(),
        kind: kind || "free",
        purpose,
        plannedMin,
        videoId: videoIdOf(),
        startTs: Date.now(),
      };
      if (kind === "browse") {
        browseDeadline = Date.now() + BROWSE_GRACE_DEFAULT_MIN * 60 * 1000;
      }
      dismiss();
      startResolutionWatch();
    });

    requestAnimationFrame(() => backdrop.classList.add("show"));
  }

  /** Re-ask when a browsing grace period expires mid-video. */
  function mindfulTimer() {
    setInterval(() => {
      if (browseDeadline && Date.now() > browseDeadline && isWatchPage()) {
        browseDeadline = 0;
        askedThisNav = false; // allow the sheet again
        resolveActive("browse-expired");
        ask();
      }
    }, 15000);
  }

  /** Resolve the active intent when the watch session ends. */
  function startResolutionWatch() {
    if (!activeIntent) return;
    const check = () => {
      if (!activeIntent) return;
      const stillWatching = isWatchPage();
      if (!stillWatching) {
        resolveActive("left");
      }
    };
    window.addEventListener("yt-navigate-finish", () => setTimeout(check, 400), { passive: true });
    window.addEventListener("beforeunload", () => resolveActive("unload"), { passive: true });
  }

  function resolveActive(reason) {
    if (!activeIntent) return;
    const watchedMin = (Date.now() - activeIntent.startTs) / 60000;
    let matched = null;
    if (activeIntent.kind !== "browse") {
      const allowance = Math.max(2, (activeIntent.plannedMin || 15) * 1.25);
      matched = watchedMin <= allowance;
    }
    logIntent({
      t: activeIntent.t,
      kind: activeIntent.kind,
      purpose: String(activeIntent.purpose || "").slice(0, 80),
      plannedMin: activeIntent.plannedMin || 0,
      videoId: activeIntent.videoId,
      watchedMin: Math.round(watchedMin * 10) / 10,
      matched,
      reason,
    });
    activeIntent = null;
  }

  function init() {
    const nav = () => {
      if (!isWatchPage()) return;
      if (askedThisNav || sheetEl) return;
      // Ask once per navigation; small delay so YouTube's chrome settles.
      setTimeout(ask, 1600);
    };
    window.addEventListener("yt-navigate-finish", nav, { passive: true });
    // SPA fallback poll
    let last = location.href;
    setInterval(() => {
      if (location.href !== last) {
        last = location.href;
        nav();
      }
    }, 2000);
    nav();
    mindfulTimer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
