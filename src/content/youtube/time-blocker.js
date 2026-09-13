/**
 * Time Blocker Module
 * Blocks YouTube based on temporary timers or daily schedules
 */

(function () {
  "use strict";

  // Module state
  let settings = {};
  let checkInterval = null;
  let blockOverlay = null;
  let overlayObserver = null;

  /**
   * Initialize Time Blocker
   */
  async function init() {
    // Load settings
    if (typeof loadSettings === "function") {
      settings = await loadSettings();
    } else {
      // Fallback if storage helper not loaded yet
      settings = await new Promise((resolve) => {
        chrome.storage.local.get(null, resolve);
      });
    }

    // Start checking
    checkBlockingRules();
    ensureOverlayObserver();

    // Set up regular check (every 1 second)
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(checkBlockingRules, 1000);
  }

  function ensureOverlayObserver() {
    if (overlayObserver) return;

    overlayObserver = new MutationObserver(() => {
      const isTempBlocked =
        settings.tempBlockUntil && Date.now() < settings.tempBlockUntil;
      const isScheduledBlocked =
        settings.scheduleBlockEnabled &&
        settings.scheduleBlockStart &&
        settings.scheduleBlockEnd &&
        isCurrentTimeInRange(
          settings.scheduleBlockStart,
          settings.scheduleBlockEnd,
        );

      // ⚠️ CREATE-only. This callback fires for EVERY DOM change on the page
      // (YouTube mutates constantly). Its only job is to re-create the
      // overlay if YouTube's SPA tears it down. It must NEVER touch the
      // overlay's text when it already exists — writing textContent here
      // re-triggered this very observer in an infinite microtask loop that
      // froze the tab (and the countdown with it). Text updates belong to
      // the 500ms countdown ticker and the 1s rule check.
      if (
        (isTempBlocked || isScheduledBlocked) &&
        !document.getElementById("yfp-time-block-overlay")
      ) {
        if (isTempBlocked) {
          showBlockOverlay("Focus Timer Active", settings.tempBlockUntil);
        } else {
          showBlockOverlay("Scheduled Block", getScheduledEndTimestamp());
        }
      }
    });

    overlayObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function getScheduledEndTimestamp() {
    const nowDate = new Date();
    const [endH, endM] = settings.scheduleBlockEnd.split(":").map(Number);
    const endDate = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate(),
      endH,
      endM,
      0,
      0,
    );

    if (endDate < nowDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return endDate.getTime();
  }

  /**
   * Check all blocking rules
   */
  function checkBlockingRules() {
    // 1. Check Master Switch
    if (settings.extensionEnabled === false) {
      removeBlockOverlay();
      return;
    }

    // 2. Check Temporary Block
    const now = Date.now();
    if (settings.tempBlockUntil && now < settings.tempBlockUntil) {
      showBlockOverlay("Focus Timer Active", settings.tempBlockUntil);
      return;
    } else if (
      settings.tempBlockUntil &&
      Date.now() >= settings.tempBlockUntil
    ) {
      // Clean up expired timer
      // We don't saveSettings here to avoid race conditions/perf, just ignore it locally
    }

    // 3. Check Scheduled Block
    if (
      settings.scheduleBlockEnabled &&
      settings.scheduleBlockStart &&
      settings.scheduleBlockEnd
    ) {
      if (
        isCurrentTimeInRange(
          settings.scheduleBlockStart,
          settings.scheduleBlockEnd,
        )
      ) {
        const nowDate = new Date();
        const [endH, endM] = settings.scheduleBlockEnd.split(":").map(Number);
        let endDate = new Date(
          nowDate.getFullYear(),
          nowDate.getMonth(),
          nowDate.getDate(),
          endH,
          endM,
          0,
          0,
        );

        // Handle overnight schedules (e.g. 23:00 to 07:00)
        // If the end time is earlier than now, it means it ends tomorrow
        if (endDate < nowDate) {
          endDate.setDate(endDate.getDate() + 1);
        }

        showBlockOverlay("Scheduled Block", endDate.getTime());
        return;
      }
    }

    // 4. v1.17.0 — Sleep Guard: a named, evening-first preset. Evidence:
    // late-night screens delay sleep and shrink next-day attention
    // (Twengo/Krizan/Hisler 2017); removing the option beats willpower at
    // the hour willpower is weakest.
    if (
      settings.sleepGuardEnabled &&
      settings.sleepGuardStart &&
      settings.sleepGuardEnd
    ) {
      if (
        isCurrentTimeInRange(
          settings.sleepGuardStart,
          settings.sleepGuardEnd,
        )
      ) {
        const nowDate = new Date();
        const [endH, endM] = settings.sleepGuardEnd.split(":").map(Number);
        let endDate = new Date(
          nowDate.getFullYear(),
          nowDate.getMonth(),
          nowDate.getDate(),
          endH,
          endM,
          0,
          0,
        );
        if (endDate < nowDate) endDate.setDate(endDate.getDate() + 1);
        showBlockOverlay("Sleep Guard", endDate.getTime());
        return;
      }
    }

    // No blocking rules active
    removeBlockOverlay();
  }

  /**
   * Helper: Check if current time is in range HH:MM - HH:MM
   */
  function isCurrentTimeInRange(startStr, endStr) {
    if (!startStr || !endStr) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startStr.split(":").map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = endStr.split(":").map(Number);
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Same day (e.g., 09:00 - 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Crosses midnight (e.g., 22:00 - 06:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  /**
   * Format remaining time as a ticking clock label.
   * `H:MM:SS` once over an hour, else `MM:SS` — the old fixed `mm:ss`
   * rendered 90 minutes as a nonsense "90:00".
   */
  function formatRemainingLabel(remainingMs) {
    const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  /** "21:47" — wall-clock time the block lifts, shown as a caption. */
  function formatClockLabel(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  /**
   * ⚠️ Write-only-if-changed text setter. The overlay lives under a
   * document-wide MutationObserver (childList+subtree): assigning textContent
   * — even with an identical string — replaces text nodes, which re-fires the
   * observer, which writes again… an unbounded microtask feedback storm that
   * froze the page AND the countdown (the original "timer is not real time"
   * bug). Every periodic DOM write below must go through this guard.
   */
  function setTextIfChanged(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  /**
   * Single source of truth for the countdown UI.
   * Writes BOTH the big SF Mono timer chip (#yfp-block-timer) and the
   * caption (#yfp-block-message). Pure DOM + Date math — safe to call
   * from any interval, and safe even in an orphaned content script.
   */
  function updateCountdownUI(overlay) {
    if (!overlay) return;
    const endTs = overlay.dataset.endTs ? Number(overlay.dataset.endTs) : 0;
    const prefix = overlay.dataset.prefix || "";
    const timerEl = document.getElementById("yfp-block-timer");
    const msgEl = document.getElementById("yfp-block-message");

    if (!endTs) {
      // No deadline — render the indefinite caption chip, not a clock.
      if (timerEl) {
        if (!timerEl.classList.contains("lg-block-timer--indefinite")) {
          timerEl.classList.add("lg-block-timer--indefinite");
        }
        setTextIfChanged(timerEl, "Until you turn FocusTube back on");
      }
      setTextIfChanged(msgEl, prefix);
      return;
    }

    const remainingMs = Math.max(0, endTs - Date.now());
    if (timerEl) {
      if (timerEl.classList.contains("lg-block-timer--indefinite")) {
        timerEl.classList.remove("lg-block-timer--indefinite");
      }
      setTextIfChanged(timerEl, formatRemainingLabel(remainingMs));
    }
    if (msgEl) {
      setTextIfChanged(
        msgEl,
        `${prefix} · Unblocks at ${formatClockLabel(endTs)}`,
      );
    }
  }

  /**
   * Dedicated countdown ticker — 500ms so a dropped/throttled tick never
   * leaves the clock visually frozen for a whole second. Background tabs
   * throttle setInterval to ~1/min, so on `visibilitychange` we sync
   * immediately instead of showing stale time after returning to the tab.
   */
  function startCountdownTicker(overlay) {
    if (overlay.dataset.tickInterval) return;
    const tick = setInterval(() => {
      const ov = document.getElementById("yfp-time-block-overlay");
      if (!ov) {
        clearInterval(tick);
        return;
      }
      updateCountdownUI(ov);
    }, 500);
    overlay.dataset.tickInterval = String(tick);
  }

  function stopCountdownTicker(overlay) {
    if (overlay && overlay.dataset.tickInterval) {
      clearInterval(parseInt(overlay.dataset.tickInterval, 10));
      delete overlay.dataset.tickInterval;
    }
  }

  // Instant clock correction when the tab becomes visible again
  // (background-tab timer throttling makes intervals lazy).
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        const ov = document.getElementById("yfp-time-block-overlay");
        if (ov) updateCountdownUI(ov);
      }
    });
  }

  /**
   * Show Blocking Overlay
   */
  function showBlockOverlay(message, endTs) {
    if (!document.documentElement) {
      return;
    }

    if (document.getElementById("yfp-time-block-overlay")) {
      // Already showing — refresh deadline + countdown text in place.
      // dataset/text writes are change-guarded above: redundant writes here
      // would re-trigger the document observer (see setTextIfChanged).
      const overlay = document.getElementById("yfp-time-block-overlay");
      if (overlay) {
        const nextEnd = endTs ? String(endTs) : "";
        const nextPrefix = message || "";
        if (overlay.dataset.endTs !== nextEnd) overlay.dataset.endTs = nextEnd;
        if (overlay.dataset.prefix !== nextPrefix) {
          overlay.dataset.prefix = nextPrefix;
        }
        updateCountdownUI(overlay);
      }
      return;
    }

    // Create overlay — uses Liquid Glass design system classes.
    // liquid-glass.css is loaded via the manifest content_scripts.css
    // for YouTube pages, so these classes are already available.
    blockOverlay = document.createElement("div");
    blockOverlay.id = "yfp-time-block-overlay";
    blockOverlay.className = "lg-block-overlay";

    // Build the card with DOM APIs (no innerHTML for untrusted content).
    const card = document.createElement("div");
    card.className = "lg-block-card";

    // Banner image — display:block so it owns its line (an inline img would
    // share the card's centered line box with the lock chip below it).
    const bannerURL = chrome.runtime.getURL("src/icons/banner.png");
    const bannerImg = document.createElement("img");
    bannerImg.className = "yfp-banner";
    bannerImg.src = bannerURL;
    bannerImg.alt = "FocusTube";
    Object.assign(bannerImg.style, {
      display: "block",
      height: "56px",
      width: "auto",
      objectFit: "contain",
      margin: "0 auto 20px",
    });
    bannerImg.onerror = async () => {
      try {
        const resp = await fetch(bannerURL);
        const blob = await resp.blob();
        bannerImg.src = URL.createObjectURL(blob);
      } catch {
        bannerImg.style.display = "none";
      }
    };
    card.appendChild(bannerImg);

    // Icon
    const icon = document.createElement("div");
    icon.className = "lg-block-icon";
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    card.appendChild(icon);

    // Title
    const title = document.createElement("h1");
    title.className = "lg-block-title";
    title.style.color = "var(--ios-red)";
    title.textContent = "YouTube is Blocked";
    card.appendChild(title);

    // Countdown — the hero element. Big SF Mono tabular-numeral chip so the
    // tick is impossible to miss (the old one-line sentence read as static).
    const timerChip = document.createElement("div");
    timerChip.id = "yfp-block-timer";
    timerChip.className = "lg-block-timer";
    timerChip.setAttribute("role", "timer");
    timerChip.setAttribute("aria-live", "off");
    card.appendChild(timerChip);

    // Caption under the chip: "Focus Timer Active · Unblocks at 21:47"
    const msgEl = document.createElement("p");
    msgEl.id = "yfp-block-message";
    msgEl.className = "lg-block-reason";
    msgEl.style.marginTop = "12px";
    msgEl.style.fontSize = "var(--ios-text-sm)";
    msgEl.style.color = "var(--ios-label-2)";
    card.appendChild(msgEl);

    // Sub-message
    const subMsg = document.createElement("p");
    subMsg.className = "lg-block-message";
    subMsg.style.maxWidth = "460px";
    subMsg.textContent =
      "Protect this session. A few focused minutes now will feel much better than another accidental binge.";
    card.appendChild(subMsg);

    // Footer
    const footer = document.createElement("div");
    footer.className = "lg-block-message";
    footer.style.marginTop = "12px";
    footer.style.fontSize = "var(--ios-text-xs)";
    footer.style.color = "var(--ios-label-3)";
    footer.textContent = "FocusTube Extension";
    card.appendChild(footer);

    blockOverlay.appendChild(card);

    blockOverlay.dataset.endTs = endTs ? String(endTs) : "";
    blockOverlay.dataset.prefix = message || "";
    updateCountdownUI(blockOverlay);
    startCountdownTicker(blockOverlay);

    // Prevent scrolling and hide main content
    if (document.body) {
      document.body.style.overflow = "hidden";
    }
    document.documentElement.style.overflow = "hidden";

    // Add aggressive blocking style
    const blockStyle = document.createElement("style");
    blockStyle.id = "yfp-block-style";
    blockStyle.textContent = `
      ytd-app, #page-manager, #masthead-container, #guide, #content, #player, .ytd-page-manager {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      body {
        overflow: hidden !important;
        background-color: #0f0f0f !important;
      }
      html {
        overflow: hidden !important;
        background-color: #0f0f0f !important;
      }
      #yfp-time-block-overlay {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(blockStyle);

    // Add to DOM
    document.documentElement.appendChild(blockOverlay);

    // Stop any playing video
    const video = document.querySelector("video");
    if (video) {
      video.pause();
      video.src = ""; // Force stop buffering
    }

    // Anti-tamper check (ensure overlay stays on top)
    if (!blockOverlay.dataset.tamperInterval) {
      const tamperInterval = setInterval(() => {
        const overlay = document.getElementById("yfp-time-block-overlay");
        if (!overlay) {
          // Do NOT recursively call showBlockOverlay here — that creates a
          // re-entrancy loop if the user is actively disabling the block.
          // The next checkBlockingRules tick will re-create the overlay if
          // still needed.
          return;
        }
        if (document.documentElement.lastElementChild !== overlay) {
          document.documentElement.appendChild(overlay);
        }
        if (document.body && document.body.style.overflow !== "hidden") {
          document.body.style.overflow = "hidden";
        }
        if (document.documentElement.style.overflow !== "hidden") {
          document.documentElement.style.overflow = "hidden";
        }
        // Keep the clock honest even if the dedicated ticker ever dies.
        updateCountdownUI(overlay);
      }, 1000);
      blockOverlay.dataset.tamperInterval = String(tamperInterval);
    }
  }

  /**
   * Remove Blocking Overlay
   */
  function removeBlockOverlay() {
    const overlay = document.getElementById("yfp-time-block-overlay");
    const blockStyle = document.getElementById("yfp-block-style");

    if (blockStyle) {
      blockStyle.remove();
    }

    if (overlay) {
      if (overlay.dataset.tamperInterval) {
        clearInterval(parseInt(overlay.dataset.tamperInterval));
      }
      stopCountdownTicker(overlay);
      overlay.remove();
      if (document.body) {
        document.body.style.overflow = "";
      }
      document.documentElement.style.overflow = "";
      blockOverlay = null;
    }
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    checkBlockingRules();
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === "function") {
    onSettingsChanged((changes) => {
      const keys = [
        "extensionEnabled",
        "tempBlockUntil",
        "scheduleBlockEnabled",
        "scheduleBlockStart",
        "scheduleBlockEnd",
        "sleepGuardEnabled",
        "sleepGuardStart",
        "sleepGuardEnd",
      ];
      let shouldUpdate = false;
      let newVals = {};

      keys.forEach((key) => {
        if (changes[key] && changes[key].newValue !== undefined) {
          newVals[key] = changes[key].newValue;
          shouldUpdate = true;
        }
      });

      if (shouldUpdate) {
        updateSettings(newVals);
      }
    });
  }

  // Export module
  window.YFPTimeBlocker = {
    init,
    updateSettings,
    checkBlockingRules,
  };
})();
