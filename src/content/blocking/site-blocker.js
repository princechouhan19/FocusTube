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
 * Check if two domains match (handles subdomains)
 */
function domainsMatch(currentDomain, blockedDomain) {
  if (!currentDomain || !blockedDomain) return false;
  
  const current = normalizeDomain(currentDomain);
  const blocked = normalizeDomain(blockedDomain);
  
  if (!current || !blocked) return false;
  
  // Exact match or subdomain match
  return current === blocked || current.endsWith('.' + blocked) || blocked.endsWith('.' + current);
}

/**
 * Check if current site is blocked
 */
async function checkIfSiteBlocked() {
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
 * Format remaining time efficiently
 */
function formatRemainingTime(endTime) {
  const remaining = Math.max(0, endTime - Date.now());
  if (remaining <= 0) return '0s';

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Create and display block page efficiently
 */
function displayBlockPage() {
  // Prevent multiple overlays
  if (blockOverlayDisplayed) return;
  if (document.getElementById('focus-site-block-overlay')) return;

  blockOverlayDisplayed = true;

  try {
    // Inject a CSS rule that hides underlying site content without
    // destroying it. This is safer than clearing body.innerHTML, which
    // would destroy all other content scripts' state on the page (and
    // could break the block overlay itself if a mutation observer
    // recreated body).
    const hideStyle = document.createElement('style');
    hideStyle.id = 'focustube-block-hide-style';
    hideStyle.textContent = `
      body > *:not(#focus-site-block-overlay) {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(hideStyle);

    // Create overlay
    const blockPage = document.createElement('div');
    blockPage.id = 'focus-site-block-overlay';
    blockPage.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: rgba(255, 255, 255, 0.98);
      padding: 50px 40px;
      border-radius: 20px;
      text-align: center;
      max-width: 480px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.5);
      animation: focustube-slideIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes focustube-slideIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      @keyframes focustube-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      #block-timer-pulse {
        animation: focustube-pulse 1s ease-in-out infinite;
      }
    `;

    // Icon
    const icon = document.createElement('div');
    icon.style.cssText = `
      font-size: 70px;
      margin-bottom: 20px;
      display: block;
    `;
    icon.textContent = '🔒';

    // Title
    const title = document.createElement('h1');
    title.style.cssText = `
      margin: 0 0 12px 0;
      color: #333;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
    `;
    title.textContent = 'Site Blocked';

    // Reason
    const reason = document.createElement('p');
    reason.style.cssText = `
      margin: 0 0 20px 0;
      color: #666;
      font-size: 15px;
      line-height: 1.4;
    `;
    reason.textContent = `${blockReason} is blocked to help you focus`;

    // Timer
    const timeContainer = document.createElement('div');
    timeContainer.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px 30px;
      border-radius: 15px;
      margin: 25px 0;
      font-size: 36px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
    `;
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'block-timer';
    timerDisplay.textContent = formatRemainingTime(blockEndTime);
    timeContainer.appendChild(timerDisplay);

    // Message — built with DOM APIs so we never interpolate raw HTML.
    const message = document.createElement('p');
    message.style.cssText = `
      margin: 20px 0 0 0;
      color: #888;
      font-size: 13px;
      line-height: 1.6;
    `;
    const strong = document.createElement('strong');
    strong.style.color = '#333';
    strong.textContent = 'Stay Focused!';
    message.appendChild(strong);
    message.appendChild(document.createElement('br'));
    message.appendChild(
      document.createTextNode(
        'This site is temporarily blocked to help you maintain productivity.',
      ),
    );

    // Assemble
    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(reason);
    container.appendChild(timeContainer);
    container.appendChild(message);
    blockPage.appendChild(style);
    blockPage.appendChild(container);

    // Append the overlay to body without destroying the rest of the DOM.
    // We rely on the `focustube-block-hide-style` stylesheet above to hide
    // the underlying site content.
    document.documentElement.style.overflow = 'hidden';
    const root = document.body || document.documentElement;
    root.appendChild(blockPage);
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }

    // Start efficient timer
    startTimerUpdate();
  } catch (error) {
    console.error('[FocusTube Blocker] Error displaying block page:', error);
    blockOverlayDisplayed = false;
  }
}

/**
 * Start efficient timer using requestAnimationFrame
 */
function startTimerUpdate() {
  if (timerInterval) clearInterval(timerInterval);

  // Update every second with minimal reflow
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

    // If time is up, reload
    if (blockEndTime <= Date.now()) {
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

// Listen for storage changes from popup
try {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.blockedSites && !isBlocked) {
      initSiteBlocker();
    }
  });
} catch (error) {
  console.warn('[FocusTube Blocker] Storage listener error:', error);
}
