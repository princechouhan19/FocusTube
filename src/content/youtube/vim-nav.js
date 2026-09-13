/**
 * FocusTube — Vim-Style Keyboard Navigation (v1.17.0, P3)
 * ======================================================
 * Power-user movement for YouTube with one honest caveat baked into the
 * design: faster *interaction* must not mean longer *lingering*, so the
 * exit keys are first-class citizens:
 *
 *   j / k        scroll down / up (smooth)
 *   gg / G       jump to top / bottom
 *   f            toggle fullscreen
 *   t            toggle theater mode (widths)
 *   Esc          go BACK (leave the current video — the anti-rabbit-hole key)
 *   x            CLOSE this tab (background handler: vimCloseTab)
 *   ?            toggle this help overlay
 *
 * Everything is inert until the user enables it: Settings → "Vim-style keys".
 * Storage key: vimNavEnabled (bool). The help overlay auto-hides; the whole
 * module ignores keystrokes in inputs/textareas/contenteditable.
 */
(function () {
  "use strict";

  if (window.__ftVimNav) return;
  window.__ftVimNav = true;

  const KEY = "vimNavEnabled";
  let enabled = false;
  let pendingG = false;
  let helpEl = null;

  function inEditable(e) {
    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
  }

  function smoothScrollBy(dy) {
    window.scrollBy({ top: dy, behavior: "smooth" });
  }

  function activePlayer() {
    return document.getElementById("movie_player") || document.querySelector("video");
  }

  function toggleFullscreen() {
    const p = activePlayer();
    if (!p) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else (p.requestFullscreen ? p.requestFullscreen() : null);
  }

  function toggleTheater() {
    const btn =
      document.querySelector("ytd-watch-flexy button.ytp-size-button") ||
      document.querySelector(".ytp-size-button");
    if (btn) btn.click();
  }

  function goBack() {
    if (history.length > 1) history.back();
  }

  async function closeTab() {
    try {
      await chrome.runtime.sendMessage({ action: "vimCloseTab" });
    } catch (_) {
      window.close(); // works for script-opened tabs
    }
  }

  function toggleHelp() {
    if (helpEl) {
      helpEl.remove();
      helpEl = null;
      return;
    }
    helpEl = document.createElement("div");
    helpEl.id = "ft-vim-help";
    helpEl.style.cssText = [
      "position:fixed", "left:18px", "bottom:18px", "z-index:2147483646",
      "background:rgba(22,22,26,.96)", "color:#f2f2f7", "padding:14px 16px",
      "border-radius:14px", "border:1px solid rgba(255,255,255,.12)",
      "font:12.5px/1.7 -apple-system,'SF Pro Text',Arial,sans-serif",
      "box-shadow:0 16px 44px rgba(0,0,0,.5)", "pointer-events:none",
      "min-width:210px",
    ].join(";");
    const row = (k, v) =>
      `<div><b style="color:#0A84FF;font-weight:700">${k}</b> <span style="opacity:.75">${v}</span></div>`;
    helpEl.innerHTML =
      `<div style="font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin-bottom:6px">FocusTube keys</div>` +
      row("j / k", "scroll down / up") +
      row("gg / G", "top / bottom") +
      row("f", "fullscreen") +
      row("t", "theater") +
      row("Esc", "go back — leave the video") +
      row("x", "close this tab") +
      row("?", "toggle help");
    document.documentElement.appendChild(helpEl);
    setTimeout(() => {
      if (helpEl) {
        helpEl.remove();
        helpEl = null;
      }
    }, 6000);
  }

  function onKey(e) {
    if (!enabled || inEditable(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;

    if (pendingG) {
      pendingG = false;
      if (k === "g") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    switch (k) {
      case "j":
        e.preventDefault();
        smoothScrollBy(160);
        break;
      case "k":
        e.preventDefault();
        smoothScrollBy(-160);
        break;
      case "g":
        pendingG = true;
        setTimeout(() => (pendingG = false), 600);
        break;
      case "G":
        e.preventDefault();
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        break;
      case "f":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "t":
        e.preventDefault();
        toggleTheater();
        break;
      case "Escape":
        e.preventDefault();
        goBack();
        break;
      case "x":
        e.preventDefault();
        closeTab();
        break;
      case "?":
        e.preventDefault();
        toggleHelp();
        break;
      default:
        break;
    }
  }

  async function init() {
    try {
      const data = await chrome.storage.local.get(KEY);
      enabled = data && data[KEY] === true;
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[KEY]) enabled = changes[KEY].newValue === true;
      });
    } catch (_) {
      enabled = false;
    }
    if (!enabled) {
      // keep listening for the settings toggle without re-binding keys
      const armInterval = setInterval(async () => {
        if (enabled) {
          clearInterval(armInterval);
          window.addEventListener("keydown", onKey, true);
        }
      }, 4000);
      return;
    }
    window.addEventListener("keydown", onKey, true);
  }

  init();
})();
