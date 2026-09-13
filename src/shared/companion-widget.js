/**
 * FocusTube — Companion Widget (v1.17.0 "Anime Duo")
 * ===================================================
 * Page-side host for the anime focus buddies (Mika & Haru) on every
 * FULL-SCREEN extension surface — onboarding, dashboard, block page and the
 * morning digest. Deliberately NOT mounted in the popup/sidebar UI.
 *
 * Two ways to use:
 *
 *  1) Guided (onboarding):
 *       const buddy = FTCompanionWidget.mount({ fixed: true, size: 150 });
 *       buddy.set({ character: "mika", emotion: "happy", pose: "guide" });
 *       buddy.say("Pick your guide!", { sticky: true });
 *
 *  2) Auto (dashboard / blocked / digest): give the page's <body> a
 *       <body data-ft-companion="dashboard">
 *     attribute and include this script. On DOMContentLoaded the widget
 *     mounts bottom-right, reads companionEnabled / companionCharacter /
 *     userName from chrome.storage, derives the mood from the day's ring
 *     data and greets the user by name. Zero page-code changes needed.
 *
 * Rendering is delegated to FTCompanionArt (pure SVG). The widget lives in a
 * closed ShadowRoot so page CSS and widget CSS never leak in either
 * direction. Speech text is set via textContent only (XSS-safe).
 */
(function () {
  "use strict";

  if (window.FTCompanionWidget) return;

  const REDUCED = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Max-int z: matches the block overlay (--lg-z-blocker); the widget host is
  // appended after it in the DOM, so equal z-index still paints on top.
  const Z_INDEX = 2147483647;

  // ---------------------------------------------------------------------------
  // Shadow CSS
  // ---------------------------------------------------------------------------
  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .ctw-wrap {
      display: inline-flex; align-items: flex-end; gap: 10px;
      font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
      pointer-events: none; user-select: none; -webkit-user-select: none;
    }
    .ctw-fixed {
      position: fixed; right: 26px; bottom: 22px; z-index: ${Z_INDEX};
      flex-direction: row; align-items: flex-end;
    }
    .ctw-bubble {
      position: relative; max-width: 232px; padding: 10px 14px;
      background: rgba(28,28,32,.94); color: #F2F2F7; font-size: 12.5px;
      line-height: 1.5; border-radius: 14px 14px 4px 14px;
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: 0 10px 30px rgba(0,0,0,.4);
      opacity: 0; transform: translateY(8px) scale(.96);
      transition: opacity .32s ease, transform .38s cubic-bezier(.34,1.56,.64,1);
      margin-bottom: 44px;
    }
    .ctw-bubble.show { opacity: 1; transform: translateY(0) scale(1); }
    .ctw-bubble::after {
      content: ""; position: absolute; right: -5px; bottom: 14px;
      width: 10px; height: 10px; background: rgba(28,28,32,.94);
      border-right: 1px solid rgba(255,255,255,.10); border-top: 1px solid rgba(255,255,255,.10);
      transform: rotate(45deg); border-radius: 2px;
    }
    .ctw-char { line-height: 0; ${REDUCED ? "" : "animation: ctw-in .55s cubic-bezier(.34,1.56,.64,1);"} }
    @keyframes ctw-in { 0% { opacity: 0; transform: translateY(14px) scale(.86); }
                        70% { opacity: 1; transform: translateY(-2px) scale(1.02); }
                        100% { opacity: 1; transform: translateY(0) scale(1); } }
    @media (prefers-reduced-motion: reduce) {
      .ctw-char { animation: none !important; }
      .ctw-bubble { transition: opacity .2s ease; transform: none; }
    }
    @media (max-width: 900px) {
      .ctw-fixed .ctw-bubble { max-width: 172px; font-size: 11.5px; margin-bottom: 34px; }
    }
  `;

  // ---------------------------------------------------------------------------
  // Widget factory
  // ---------------------------------------------------------------------------
  function mount(opts = {}) {
    const host = document.createElement("div");
    host.id = "focustube-companion-widget";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>${STYLE}</style><div class="ctw-wrap${opts.fixed ? " ctw-fixed" : ""}">
      <div class="ctw-bubble" role="status" aria-live="polite"><span class="ctw-text"></span></div>
      <div class="ctw-char"></div>
    </div>`;
    (opts.fixed ? document.body : opts.el || document.body).appendChild(host);

    const wrap = root.querySelector(".ctw-wrap");
    if (opts.fixed && Number.isFinite(opts.bottom)) {
      wrap.style.bottom = `${opts.bottom}px`; // clear page footers (onboarding)
    }
    const bubbleEl = root.querySelector(".ctw-bubble");
    const textEl = root.querySelector(".ctw-text");
    const charEl = root.querySelector(".ctw-char");

    const state = {
      character: opts.character || "mika",
      emotion: opts.emotion || "happy",
      pose: opts.pose || "idle",
      size: opts.size || 140,
      bubbleTimer: null,
      idp: "ctw" + Math.random().toString(36).slice(2, 7) + "-",
    };

    function paintChar() {
      const art = window.FTCompanionArt ||
        (window.parent && window.parent.FTCompanionArt);
      if (!art) return;
      charEl.innerHTML = art.render({
        character: state.character,
        emotion: state.emotion,
        pose: state.pose,
        size: state.size,
        idPrefix: state.idp,
      });
    }

    paintChar();

    return {
      el: wrap,
      set(next = {}) {
        let dirty = false;
        if (next.character && next.character !== state.character) { state.character = next.character; dirty = true; }
        if (next.emotion && next.emotion !== state.emotion) { state.emotion = next.emotion; dirty = true; }
        if (next.pose && next.pose !== state.pose) { state.pose = next.pose; dirty = true; }
        if (next.size && next.size !== state.size) { state.size = next.size; dirty = true; }
        if (dirty) paintChar();
      },
      say(text, o = {}) {
        if (!text) return;
        textEl.textContent = String(text);
        bubbleEl.classList.add("show");
        if (state.bubbleTimer) clearTimeout(state.bubbleTimer);
        if (!o.sticky) {
          state.bubbleTimer = setTimeout(
            () => bubbleEl.classList.remove("show"),
            o.ms || 6000,
          );
        }
      },
      hideBubble() {
        if (state.bubbleTimer) clearTimeout(state.bubbleTimer);
        bubbleEl.classList.remove("show");
      },
      hide() { host.style.display = "none"; },
      show() { host.style.display = ""; },
    };
  }

  // ---------------------------------------------------------------------------
  // Auto-mount for full-screen surfaces (dashboard / blocked / digest)
  // ---------------------------------------------------------------------------
  function todayKey() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function ringsFrom(day) {
    if (!day) return null;
    const deflected = (Number(day.shortsSkipped) || 0) + (Number(day.adsBlocked) || 0) + (Number(day.quitsEarly) || 0);
    const focusedMin = (Number(day.pomodoroCompleted) || 0) * 25;
    const savedMin = Number(day.timeSavedMinutes) || 0;
    const closed =
      (deflected >= 12 ? 1 : 0) +
      (focusedMin >= 120 ? 1 : 0) +
      (savedMin >= 60 ? 1 : 0);
    return { closed, deflected, focusedMin, savedMin };
  }

  async function mountAuto(surface) {
    let data = {};
    try {
      data = (await chrome.storage.local.get(
        ["companionEnabled", "companionCharacter", "userName", "focusAnalyticsDaily"],
      )) || {};
    } catch (_) { /* no storage — use defaults */ }

    if (data.companionEnabled === false) return null;

    const character = data.companionCharacter === "haru" ? "haru" : "mika";
    const rawName = typeof data.userName === "string" ? data.userName.trim() : "";
    const name = rawName ? `, ${rawName.split(/\s+/)[0]}` : "";
    const ringsToday = ringsFrom((data.focusAnalyticsDaily || {})[todayKey()]);
    const ringsYest = ringsFrom((data.focusAnalyticsDaily || {})[yesterdayKey()]);

    const widget = mount({ fixed: true, size: 132, character });

    if (surface === "blocked") {
      widget.set({ character, emotion: "surprised", pose: "idle" });
      widget.say(`Whoa — this one's a rabbit hole${name}. Future you says thanks.`, { sticky: true, ms: 8000 });
    } else if (surface === "digest") {
      if (ringsYest && ringsYest.savedMin >= 60) {
        widget.set({ character, emotion: "proud", pose: "cheer" });
        widget.say(`You saved ${ringsYest.savedMin}m yesterday${name}. I'm bragging about you.`, { sticky: true, ms: 8000 });
      } else if (ringsYest && ringsYest.savedMin > 0) {
        widget.set({ character, emotion: "happy", pose: "wave" });
        widget.say(`Morning${name}! ${ringsYest.savedMin}m saved yesterday — let's beat it.`, { sticky: true, ms: 8000 });
      } else {
        widget.set({ character, emotion: "happy", pose: "wave" });
        widget.say(`Morning${name}! Fresh day, fresh rings.`, { sticky: true, ms: 8000 });
      }
    } else { // dashboard
      if (ringsToday && ringsToday.closed === 3) {
        widget.set({ character, emotion: "joyful", pose: "cheer" });
        widget.say(`ALL THREE RINGS${name}! Absolute legend.`, { sticky: true, ms: 8000 });
      } else if (ringsToday && ringsToday.focusedMin > 0) {
        widget.set({ character, emotion: "happy", pose: "wave" });
        widget.say(`${ringsToday.focusedMin}m of deep focus today${name} — keep it rolling.`, { sticky: true, ms: 8000 });
      } else if (ringsToday && ringsToday.deflected >= 12) {
        widget.set({ character, emotion: "proud", pose: "cheer" });
        widget.say(`${ringsToday.deflected} distractions deflected${name}. The wall holds.`, { sticky: true, ms: 8000 });
      } else {
        widget.set({ character, emotion: "neutral", pose: "wave" });
        widget.say(`I'm ${character === "mika" ? "Mika" : "Haru"} — I'll keep score while you browse${name}.`, { sticky: true, ms: 8000 });
      }
    }

    // Non-sticky safety: bubble always fades eventually (except blocked, where
    // the page itself is transient).
    setTimeout(() => widget.hideBubble(), 12000);
    return widget;
  }

  function autoBoot() {
    const surface = document.body && document.body.dataset.ftCompanion;
    if (!surface) return;
    if (surface === "onboarding") return; // guided by onboarding.js instead
    mountAuto(surface);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoBoot, { once: true });
  } else {
    autoBoot();
  }

  window.FTCompanionWidget = { mount, mountAuto };
})();
