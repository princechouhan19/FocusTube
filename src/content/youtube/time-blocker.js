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

      if (isTempBlocked) {
        showBlockOverlay("Focus Timer Active", settings.tempBlockUntil);
      } else if (isScheduledBlocked) {
        showBlockOverlay("Scheduled Block", getScheduledEndTimestamp());
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
      const remainingMs = settings.tempBlockUntil - now;
      const mm = Math.floor(remainingMs / 60000)
        .toString()
        .padStart(2, "0");
      const ss = Math.floor((remainingMs % 60000) / 1000)
        .toString()
        .padStart(2, "0");
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
   * Show Blocking Overlay
   */
  function showBlockOverlay(message, endTs) {
    if (!document.documentElement) {
      return;
    }

    if (document.getElementById("yfp-time-block-overlay")) {
      // Update message if exists
      const msgEl = document.getElementById("yfp-block-message");
      if (msgEl) {
        const now = Date.now();
        const remainingMs = Math.max(0, (endTs || now) - now);
        const mm = Math.floor(remainingMs / 60000)
          .toString()
          .padStart(2, "0");
        const ss = Math.floor((remainingMs % 60000) / 1000)
          .toString()
          .padStart(2, "0");
        msgEl.textContent = `${message}: ${mm}:${ss} remaining`;
      }
      const overlay = document.getElementById("yfp-time-block-overlay");
      if (overlay) {
        overlay.dataset.endTs = endTs ? String(endTs) : "";
        overlay.dataset.prefix = message || "";
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

    // Banner image
    const bannerURL = chrome.runtime.getURL("src/icons/banner.png");
    const bannerImg = document.createElement("img");
    bannerImg.className = "yfp-banner";
    bannerImg.src = bannerURL;
    bannerImg.alt = "FocusTube";
    Object.assign(bannerImg.style, {
      height: "60px",
      width: "auto",
      objectFit: "contain",
      marginBottom: "16px",
      borderRadius: "8px",
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
    icon.textContent = "🚫";
    card.appendChild(icon);

    // Title
    const title = document.createElement("h1");
    title.className = "lg-block-title";
    title.style.color = "var(--lg-danger)";
    title.textContent = "YouTube is Blocked";
    card.appendChild(title);

    // Message (timer countdown)
    const msgEl = document.createElement("p");
    msgEl.id = "yfp-block-message";
    msgEl.className = "lg-block-reason";
    msgEl.style.fontSize = "var(--lg-text-lg)";
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
    footer.style.fontSize = "var(--lg-text-xs)";
    footer.style.color = "var(--lg-text-faint)";
    footer.textContent = "FocusTube Extension";
    card.appendChild(footer);

    blockOverlay.appendChild(card);

    blockOverlay.dataset.endTs = endTs ? String(endTs) : "";
    blockOverlay.dataset.prefix = message || "";
    (function setInitialText() {
      const now = Date.now();
      const end = endTs || now;
      const remainingMs = Math.max(0, end - now);
      const mm = Math.floor(remainingMs / 60000)
        .toString()
        .padStart(2, "0");
      const ss = Math.floor((remainingMs % 60000) / 1000)
        .toString()
        .padStart(2, "0");
      if (msgEl) msgEl.textContent = `${message}: ${mm}:${ss} remaining`;
    })();

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
        const end = overlay.dataset.endTs ? parseInt(overlay.dataset.endTs) : 0;
        const prefix = overlay.dataset.prefix || message || "";
        if (end > 0) {
          const now = Date.now();
          const remainingMs = Math.max(0, end - now);
          const mm = Math.floor(remainingMs / 60000)
            .toString()
            .padStart(2, "0");
          const ss = Math.floor((remainingMs % 60000) / 1000)
            .toString()
            .padStart(2, "0");
          const msgEl = document.getElementById("yfp-block-message");
          if (msgEl) msgEl.textContent = `${prefix}: ${mm}:${ss} remaining`;
        }
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
