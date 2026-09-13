/**
 * Block page JS — reads URL params, customizes the message, and (for
 * time-limit blocks) runs a LIVE countdown that ticks every second.
 *
 * Timer sources, in priority order:
 *   1. chrome.storage.local `blockedSites` — the live source of truth.
 *      If the user extends/shortens the block from the popup, the
 *      countdown re-syncs instantly via storage.onChanged.
 *   2. `until` URL param (epoch ms) stamped into the DNR redirect by
 *      the background service worker — covers the brief window before
 *      storage is readable.
 *   3. Next midnight — the default expiry for daily time limits.
 */
(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var domain = params.get("d") || "";
  var reason = params.get("reason") || "";
  var untilParam = Number(params.get("until")) || 0;

  var iconEl = document.getElementById("block-icon");
  var titleEl = document.getElementById("block-title");
  var reasonEl = document.getElementById("block-reason");
  var timerEl = document.getElementById("block-timer");
  var untilEl = document.getElementById("block-until");
  var msgEl = document.getElementById("block-message");

  var LOCK_SVG =
    '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var CLOCK_SVG =
    '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

  if (reason === "time") {
    iconEl.innerHTML = CLOCK_SVG;
    titleEl.textContent = "Time Limit Reached";
    reasonEl.textContent = domain
      ? "You've spent your daily time limit on " + domain + "."
      : "You've spent your daily time limit on this site.";
    msgEl.textContent = "Take a break — the block lifts automatically. You earned it.";
  } else if (domain) {
    iconEl.innerHTML = LOCK_SVG;
    titleEl.textContent = "Site Blocked";
    reasonEl.textContent = domain + " is blocked by a FocusTube Smart List.";
    // Smart List blocks have no expiry — tell the user how to unblock.
    if (untilEl) {
      untilEl.textContent = "No expiry — turn off the list in the FocusTube dashboard to unblock.";
      untilEl.hidden = false;
    }
  }

  /* ---------------------------------------------------------------------
   * Live countdown (only for time-limit blocks).
   * ------------------------------------------------------------------- */

  var endAt = 0;
  var tickHandle = null;
  var expiryHandled = false;

  function nextMidnight() {
    var d = new Date();
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  }

  function normalizeDomain(d) {
    if (!d) return "";
    return d.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }

  function domainsMatch(a, b) {
    var x = normalizeDomain(a);
    var y = normalizeDomain(b);
    if (!x || !y) return false;
    return x === y || x.endsWith("." + y);
  }

  /** Look up the live block expiry for this domain in extension storage. */
  function findStoredEnd() {
    return new Promise(function (resolve) {
      var done = false;
      var finish = function (v) { if (!done) { done = true; resolve(v); } };
      // Never hang the countdown on a slow storage read.
      var bail = setTimeout(function () { finish(0); }, 1500);
      try {
        chrome.storage.local.get(["blockedSites"], function (data) {
          clearTimeout(bail);
          if (chrome.runtime.lastError || !data) { finish(0); return; }
          var list = (data && data.blockedSites) || [];
          var now = Date.now();
          for (var i = 0; i < list.length; i++) {
            var entry = list[i];
            if (
              entry &&
              typeof entry.blockUntil === "number" &&
              entry.blockUntil > now &&
              domainsMatch(entry.domain, domain)
            ) {
              finish(entry.blockUntil);
              return;
            }
          }
          finish(0);
        });
      } catch (_) {
        clearTimeout(bail);
        finish(0);
      }
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function formatCountdown(ms) {
    var totalSec = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : pad(m) + ":" + pad(s);
  }

  function showCaption() {
    if (!untilEl) return;
    try {
      var t = new Date(endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      untilEl.textContent = "Unblocks automatically at " + t;
    } catch (_) {
      untilEl.textContent = "Unblocks automatically when the timer ends.";
    }
    untilEl.hidden = false;
  }

  function stopTicker() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function render() {
    var remaining = endAt - Date.now();
    if (remaining <= 0) {
      timerEl.textContent = "00:00";
      stopTicker();
      handleExpiry();
      return;
    }
    timerEl.textContent = formatCountdown(remaining);
  }

  function startTicker() {
    stopTicker();
    render();
    tickHandle = setInterval(render, 1000);
  }

  /**
   * Block expired. Re-check storage before reloading so we don't bounce
   * against a DNR rule that is still being torn down (the background
   * removes it up to a few seconds after expiry).
   */
  function handleExpiry() {
    if (expiryHandled) return;
    expiryHandled = true;
    findStoredEnd().then(function (stored) {
      if (stored) {
        // Block was extended while we watched — keep counting.
        endAt = stored;
        expiryHandled = false;
        showCaption();
        startTicker();
      } else {
        window.location.reload();
      }
    });
  }

  function beginCountdown() {
    if (!timerEl) return;
    timerEl.hidden = false;
    showCaption();
    startTicker();
  }

  function initTimer() {
    if (reason !== "time") return; // Smart List blocks: no countdown.

    // Instant first paint from the URL param (or midnight fallback),
    // then refine with the live storage value.
    endAt = untilParam > Date.now() ? untilParam : nextMidnight();
    beginCountdown();

    findStoredEnd().then(function (stored) {
      if (stored && Math.abs(stored - endAt) > 1000) {
        endAt = stored;
        showCaption();
      }
    });

    // Live re-sync: the user extended or removed the block from the popup.
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local" || !changes.blockedSites) return;
        findStoredEnd().then(function (stored) {
          if (stored) {
            if (stored !== endAt) {
              endAt = stored;
              expiryHandled = false;
              showCaption();
              if (!tickHandle) startTicker();
            }
          } else if (!expiryHandled) {
            // Block removed — reload immediately so the user is unblocked.
            expiryHandled = true;
            window.location.reload();
          }
        });
      });
    } catch (_) {}
  }

  initTimer();
})();
