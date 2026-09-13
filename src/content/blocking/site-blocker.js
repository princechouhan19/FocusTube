/**
 * Universal Site Blocker - Enhanced
 * Blocks any website for specified time periods
 * Features: Time-based blocking, efficient domain matching, smooth animations
 */

let isBlocked = false;
let blockReason = '';
let blockEndTime = 0;
let timerInterval = null;
let blockOverlayDisplayed = false;

/**
 * Normalize domain for comparison
 */
function normalizeDomain(domain) {
  if (!domain) return '';
  return domain
    .toLowerCase()
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0];
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if two domains match (handles subdomains).
 *
 * Matching is one-directional: a blocked entry matches the current
 * page's domain AND any subdomain of it. The reverse (blocking
 * "old.reddit.com" should also block "reddit.com") is NOT done —
 * that was a previous bug where `blocked.endsWith('.' + current)`
 * caused over-blocking when a user blocked a specific subdomain.
 *
 * Examples:
 *   current="reddit.com",      blocked="reddit.com"       → true  (exact)
 *   current="old.reddit.com",  blocked="reddit.com"       → true  (subdomain)
 *   current="reddit.com",      blocked="old.reddit.com"   → false (would over-block)
 *   current="reddit.com",      blocked="google.com"       → false
 */
function domainsMatch(currentDomain, blockedDomain) {
  if (!currentDomain || !blockedDomain) return false;

  const current = normalizeDomain(currentDomain);
  const blocked = normalizeDomain(blockedDomain);

  if (!current || !blocked) return false;

  // Exact match, or current is a subdomain of blocked.
  return current === blocked || current.endsWith('.' + blocked);
}

/**
 * Check if current site is blocked.
 *
 * Two sources of "blocked":
 *   1. Per-site time-based blocks (stored in `blockedSites`).
 *   2. Smart Lists category blocks (sync O(1) lookup against the
 *      `FocusTubeSmartLists` cache built from `smartListsEnabled`).
 *
 * Smart Lists blocks have no expiry — they're either on or off — so we
 * synthesize a `blockEndTime` of `Infinity` for them. The overlay
 * formatter handles `Infinity` gracefully by showing "until disabled".
 */
async function checkIfSiteBlocked() {
  // 1. Smart Lists (fast sync check, no storage round-trip).
  try {
    if (
      window.FocusTubeSmartLists &&
      window.FocusTubeSmartLists.isDomainBlocked(window.location.href)
    ) {
      isBlocked = true;
      blockReason = 'Smart List category';
      blockEndTime = Number.MAX_SAFE_INTEGER;
      return true;
    }
  } catch (err) {
    console.warn('[FocusTube Blocker] SmartLists check error:', err);
  }

  // 2. Per-site time-based blocks (storage lookup).
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['blockedSites'], (data) => {
        if (chrome.runtime.lastError) {
          console.warn('[FocusTube Blocker] Storage access error:', chrome.runtime.lastError);
          resolve(false);
          return;
        }

        const blockedSites = (data && data.blockedSites) || [];
        const currentDomain = extractDomain(window.location.href);
        const currentTime = Date.now();

        for (const blockEntry of blockedSites) {
          // Validate block entry
          if (!blockEntry || !blockEntry.domain || typeof blockEntry.blockUntil !== 'number') {
            continue;
          }

          // Check if block is still active
          if (blockEntry.blockUntil > currentTime) {
            // Check domain match
            if (domainsMatch(currentDomain, blockEntry.domain)) {
              isBlocked = true;
              blockReason = blockEntry.reason || blockEntry.domain;
              blockEndTime = blockEntry.blockUntil;
              resolve(true);
              return;
            }
          }
        }
        resolve(false);
      });
    } catch (error) {
      console.warn('[FocusTube Blocker] Error checking blocks:', error);
      resolve(false);
    }
  });
}

/**
 * Format remaining time as a ticking clock (H:MM:SS / MM:SS).
 *
 * Seconds are ALWAYS shown so the overlay visibly updates every second —
 * the previous "2h 14m" format only changed once a minute, which read
 * as a frozen, non-realtime timer.
 *
 * Smart Lists blocks use `Number.MAX_SAFE_INTEGER` as the end time;
 * those render as "until disabled" rather than a huge number.
 */
function formatRemainingTime(endTime) {
  if (!Number.isFinite(endTime) || endTime >= Number.MAX_SAFE_INTEGER) {
    return 'until disabled';
  }
  const remaining = Math.max(0, endTime - Date.now());
  if (remaining <= 0) return '0:00';

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/**
 * Inject the Liquid Glass design system CSS if it isn\'t already loaded.
 * On YouTube pages, it\'s loaded via the manifest content_scripts.css.
 * On all other pages (where the <all_urls> site-blocker runs), we
 * inject it via a <link> tag from web_accessible_resources.
 */
function ensureLiquidGlassCSS() {
  if (document.getElementById('focustube-liquid-glass-link')) return;
  if (document.querySelector('link[href*="liquid-glass.css"]')) return;
  try {
    const link = document.createElement('link');
    link.id = 'focustube-liquid-glass-link';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('src/shared/liquid-glass.css');
    (document.head || document.documentElement).appendChild(link);
  } catch (_) {
    // If we can't load the CSS (e.g. restricted context), the overlay
    // will still work - it just won't have the liquid-glass styling.
  }
  try {
    if (document.getElementById('focustube-apple-ui-link')) return;
    const appleLink = document.createElement('link');
    appleLink.id = 'focustube-apple-ui-link';
    appleLink.rel = 'stylesheet';
    appleLink.type = 'text/css';
    appleLink.href = chrome.runtime.getURL('src/shared/apple-ui.css');
    (document.head || document.documentElement).appendChild(appleLink);
  } catch (_) {
    // If we can\'t load the CSS (e.g. restricted context), the overlay
    // will still work — it just won\'t have the liquid-glass styling.
  }
}

/**
 * Create and display block page using the Liquid Glass design system.
 */
function displayBlockPage() {
  if (blockOverlayDisplayed) return;
  if (document.getElementById('focus-site-block-overlay')) return;

  blockOverlayDisplayed = true;

  try {
    ensureLiquidGlassCSS();

    const hideStyle = document.createElement('style');
    hideStyle.id = 'focustube-block-hide-style';
    hideStyle.textContent = `
      body > *:not(#focus-site-block-overlay) {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(hideStyle);

    const blockPage = document.createElement('div');
    blockPage.id = 'focus-site-block-overlay';
    blockPage.className = 'lg-block-overlay';

    const card = document.createElement('div');
    card.className = 'lg-block-card';

    const icon = document.createElement('div');
    icon.className = 'lg-block-icon';
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

    const title = document.createElement('h1');
    title.className = 'lg-block-title';
    title.textContent = 'Site Blocked';

    const reason = document.createElement('p');
    reason.className = 'lg-block-reason';
    reason.textContent = `${blockReason} is blocked to help you focus`;

    const timerDisplay = document.createElement('div');
    timerDisplay.className = 'lg-block-timer';
    timerDisplay.id = 'block-timer';
    timerDisplay.textContent = formatRemainingTime(blockEndTime);
    if (!Number.isFinite(blockEndTime) || blockEndTime >= Number.MAX_SAFE_INTEGER) {
      // "until disabled" is a sentence, not a clock — shrink the chip so
      // it doesn't render as a giant wrapped headline.
      timerDisplay.classList.add('lg-block-timer--indefinite');
    }

    const message = document.createElement('p');
    message.className = 'lg-block-message';
    const strong = document.createElement('strong');
    strong.style.color = 'var(--ios-label)';
    strong.textContent = 'Stay Focused!';
    message.appendChild(strong);
    message.appendChild(document.createElement('br'));
    message.appendChild(
      document.createTextNode(
        'This site is temporarily blocked to help you maintain productivity.',
      ),
    );

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(reason);
    card.appendChild(timerDisplay);
    card.appendChild(message);

    const nudgeHost = document.createElement('div');
    nudgeHost.style.cssText = 'margin-top: 8px;';
    card.appendChild(nudgeHost);

    if (window.FocusTubeAINudge) {
      setTimeout(() => {
        try {
          window.FocusTubeAINudge.renderInto(nudgeHost, {
            domain: extractDomain(window.location.href),
            reason: blockReason,
          });
        } catch (err) {
          console.warn('[FocusTube Blocker] nudge render failed:', err);
        }
      }, 50);
    }

    blockPage.appendChild(card);

    document.documentElement.style.overflow = 'hidden';
    const root = document.body || document.documentElement;
    root.appendChild(blockPage);
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }

    startTimerUpdate();
  } catch (error) {
    console.error('[FocusTube Blocker] Error displaying block page:', error);
    blockOverlayDisplayed = false;
  }
}

/**
 * Start efficient timer using requestAnimationFrame.
 * Smart Lists blocks never expire, so we skip the reload-on-expiry path.
 */
function startTimerUpdate() {
  if (timerInterval) clearInterval(timerInterval);

  const isPermanent =
    !Number.isFinite(blockEndTime) || blockEndTime >= Number.MAX_SAFE_INTEGER;

  // Permanent blocks: update the display only when the storage changes
  // (handled separately), so a 1-second poll is enough.
  // Time-based blocks: poll every second and reload on expiry.
  timerInterval = setInterval(() => {
    const timer = document.getElementById('block-timer');
    if (!timer) {
      clearInterval(timerInterval);
      return;
    }

    const remaining = formatRemainingTime(blockEndTime);

    // Only update if changed
    if (timer.textContent !== remaining) {
      timer.textContent = remaining;
    }

    // If time is up, reload (skip for permanent blocks)
    if (!isPermanent && blockEndTime <= Date.now()) {
      clearInterval(timerInterval);
      window.location.reload();
    }
  }, 1000);
}

/**
 * Initialize site blocker early
 */
async function initSiteBlocker() {
  try {
    // Only run on actual page loads, not frames
    if (window !== window.top) return;

    const blocked = await checkIfSiteBlocked();
    if (blocked) {
      displayBlockPage();
    }
  } catch (error) {
    console.warn('[FocusTube Blocker] Init error:', error);
  }
}

// Run blocker at document_start if ready
if (document.readyState === 'loading') {
  // Document still loading
  if (document.documentElement) {
    initSiteBlocker();
  }
} else {
  // Document ready
  initSiteBlocker();
}

// Listen for storage changes from popup.
// Two triggers:
//   - blockedSites changed (per-site add/remove)
//   - smartListsEnabled changed (category toggle)
// We also reload if a Smart-List block was just removed, so the user
// doesn't have to manually refresh to unblock.
try {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.blockedSites && !isBlocked) {
      initSiteBlocker();
    }

    if (changes.smartListsEnabled) {
      // Smart Lists state changed. If we're currently blocked because of
      // a Smart List, check whether we're still blocked; if not, reload
      // to clear the overlay.
      if (isBlocked && blockEndTime >= Number.MAX_SAFE_INTEGER) {
        // Re-run the check; if it returns false, the category was disabled.
        checkIfSiteBlocked().then((stillBlocked) => {
          if (!stillBlocked) {
            window.location.reload();
          }
        });
      } else if (!isBlocked) {
        // Not currently blocked — re-check in case a category was enabled.
        initSiteBlocker();
      }
    }
  });
} catch (error) {
  console.warn('[FocusTube Blocker] Storage listener error:', error);
}
