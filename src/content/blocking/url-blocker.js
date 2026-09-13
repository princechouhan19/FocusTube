/**
 * URL Pattern Blocker Module
 * Blocks videos based on URL patterns
 * Inspired by YT Shorts Blocker - redirects or hides based on URL patterns
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let blockedPatterns = [];
  let urlObserver = null;

  /**
   * Initialize URL pattern blocker
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    // Load blocked patterns
    blockedPatterns = settings.blockedPatterns || [
      '/shorts',  // Always block shorts by default if hideShorts is on
      '/shorts/',
      'youtu.be/shorts/'
    ];

    // Add Shorts pattern if hideShorts is enabled
    if (settings.hideShorts) {
      if (!blockedPatterns.includes('/shorts')) {
        blockedPatterns.push('/shorts');
      }
      if (!blockedPatterns.includes('/shorts/')) {
        blockedPatterns.push('/shorts/');
      }
    }

    checkAndBlockURL();
    setupURLChangeListener();
    observeURLs();
  }

  /**
   * Check current URL and block if it matches
   */
  function checkAndBlockURL() {
    const currentURL = window.location.href;
    console.log('[YFP] Checking URL:', currentURL);

    for (const pattern of blockedPatterns) {
      if (currentURL.includes(pattern)) {
        console.log('[YFP] URL matches blocked pattern:', pattern);
        handleBlockedURL(pattern);
        return;
      }
    }
  }

  /**
   * Handle blocked URL - redirect or show blocked message
   */
  function handleBlockedURL(pattern) {
    const currentURL = window.location.href;

    // Check if this is a Shorts URL (most common use case)
    if (currentURL.includes('/shorts') || currentURL.includes('/shorts/')) {
      console.log('[YFP] Redirecting from Shorts');
      redirectToHome();
      return;
    }

    // For other patterns, show a blocked page
    showBlockedPage(pattern);
  }

  /**
   * Redirect to YouTube home
   */
  function redirectToHome() {
    window.location.href = 'https://www.youtube.com';
  }

  /**
   * Show a custom blocked page using the Liquid Glass design system.
   * Also fixes the selector bug: the hide-style now correctly targets
   * the overlay's actual id (not a className).
   */
  function showBlockedPage(pattern) {
    // Ensure the liquid-glass CSS is loaded (url-blocker only runs on
    // YouTube, where it's in the manifest content_scripts.css, but
    // belt-and-suspenders).
    if (
      !document.querySelector('link[href*="liquid-glass.css"]') &&
      !document.getElementById('focustube-liquid-glass-link')
    ) {
      try {
        const link = document.createElement('link');
        link.id = 'focustube-liquid-glass-link';
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('src/shared/liquid-glass.css');
        (document.head || document.documentElement).appendChild(link);
      } catch (_) {}
    }

    // Apple design-system skin (matches site-blocker parity injection).
    if (
      !document.querySelector('link[href*="apple-ui.css"]') &&
      !document.getElementById('focustube-apple-ui-link')
    ) {
      try {
        const appleLink = document.createElement('link');
        appleLink.id = 'focustube-apple-ui-link';
        appleLink.rel = 'stylesheet';
        appleLink.href = chrome.runtime.getURL('src/shared/apple-ui.css');
        (document.head || document.documentElement).appendChild(appleLink);
      } catch (_) {}
    }

    // Create overlay using liquid-glass classes (apple-ui.css is loaded via
    // the manifest for YouTube and injected below for parity with site-blocker).
    const blockedOverlay = document.createElement('div');
    blockedOverlay.id = 'yfp-blocked-overlay';  // FIX: set the id so the hide-style :not() selector works
    blockedOverlay.className = 'lg-block-overlay yfp-url-blocked-overlay';

    // Build card with DOM APIs (no innerHTML for safety)
    const card = document.createElement('div');
    card.className = 'lg-block-card';

    // Banner image — display:block so it owns its line instead of sharing
    // the card's centered line box with the lock chip (old side-by-side bug).
    const bannerURL = chrome.runtime.getURL('src/icons/banner.png');
    const bannerImg = document.createElement('img');
    bannerImg.className = 'yfp-banner';
    bannerImg.src = bannerURL;
    bannerImg.alt = 'FocusTube';
    Object.assign(bannerImg.style, {
      display: 'block',
      height: '56px',
      width: 'auto',
      objectFit: 'contain',
      margin: '0 auto 20px',
    });
    bannerImg.onerror = async () => {
      try {
        const resp = await fetch(bannerURL);
        const blob = await resp.blob();
        bannerImg.src = URL.createObjectURL(blob);
      } catch {
        bannerImg.style.display = 'none';
      }
    };
    card.appendChild(bannerImg);

    // Icon — same lock glyph as the other blocker surfaces (was a 🚫 emoji,
    // which broke the Apple design language).
    const icon = document.createElement('div');
    icon.className = 'lg-block-icon';
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    card.appendChild(icon);

    // Title
    const title = document.createElement('h1');
    title.className = 'lg-block-title';
    title.textContent = 'Content Blocked';
    card.appendChild(title);

    // Message
    const msg = document.createElement('p');
    msg.className = 'lg-block-reason';
    msg.textContent =
      'This content has been blocked based on your URL pattern settings.';
    card.appendChild(msg);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'lg-block-actions';

    const goHomeBtn = document.createElement('button');
    goHomeBtn.id = 'yfp-go-home';
    goHomeBtn.className = 'lg-btn lg-btn-primary';
    goHomeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Go to Home';

    const unblockBtn = document.createElement('button');
    unblockBtn.id = 'yfp-unblock-temp';
    unblockBtn.className = 'lg-btn lg-btn-ghost';
    unblockBtn.textContent = 'Temporarily Unblock';

    actions.appendChild(goHomeBtn);
    actions.appendChild(unblockBtn);
    card.appendChild(actions);

    blockedOverlay.appendChild(card);

    // Hide everything else on the page.
    // FIX: the selector now correctly targets #yfp-blocked-overlay (which
    // we set above), so the overlay itself is exempt from hiding.
    const hideStyle = document.createElement('style');
    hideStyle.id = 'focustube-url-block-hide-style';
    hideStyle.textContent = `
      body > *:not(#yfp-blocked-overlay) {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(hideStyle);

    document.body.appendChild(blockedOverlay);

    // Add event listeners
    goHomeBtn.addEventListener('click', () => {
      window.location.href = 'https://www.youtube.com';
    });

    unblockBtn.addEventListener('click', () => {
      // v1.17.0 — Graduated Unblock Friction: the one-click pass is now a
      // ladder (state reason → wait-out → quiz on strict/escalated tiers).
      // Evidence & design: docs/FEATURE_RESEARCH.md §4.
      const gateMount = document.createElement('div');
      gateMount.id = 'yfp-unblock-gate';
      gateMount.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);z-index:2147483647;';
      blockedOverlay.appendChild(gateMount);
      if (typeof FTUnblockGate !== 'undefined' && FTUnblockGate.renderInlineStyles) {
        FTUnblockGate.renderInlineStyles(gateMount);
      }
      const pass = () => {
        gateMount.remove();
        sessionStorage.setItem('yfp-temp-unblock', Date.now().toString());
        location.reload();
      };
      if (typeof FTUnblockGate !== 'undefined' && FTUnblockGate.runGate) {
        FTUnblockGate.runGate({ mount: gateMount, onPass: pass });
      } else {
        pass(); // module unavailable — never trap the user
      }
    });

    // Check for temporary unblock
    const tempUnblock = sessionStorage.getItem('yfp-temp-unblock');
    if (tempUnblock) {
      const unblockTime = parseInt(tempUnblock);
      const fiveMinutes = 5 * 60 * 1000;

      if (Date.now() - unblockTime < fiveMinutes) {
        blockedOverlay.remove();
      } else {
        sessionStorage.removeItem('yfp-temp-unblock');
      }
    }
  }

  /**
   * Setup URL change listener for SPA navigation
   */
  function setupURLChangeListener() {
    let lastURL = location.href;

    const checkURLChange = () => {
      const currentURL = location.href;
      if (currentURL !== lastURL) {
        lastURL = currentURL;
        console.log('[YFP] URL changed:', currentURL);

        checkAndBlockURL();
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', checkURLChange);
    window.addEventListener('pushstate', checkURLChange);
    window.addEventListener('replacestate', checkURLChange);

    // Use MutationObserver as fallback for YouTube's SPA navigation
    new MutationObserver(debounce(checkURLChange, 100)).observe(document, {
      subtree: true,
      childList: true
    });
  }

  /**
   * Observe for links and add click handlers
   */
  function observeURLs() {
    const observer = new MutationObserver(debounce(() => {
      interceptBlockedLinks();
    }, 300));

    const root = document.body || document.documentElement;
    if (!root) return;
    observer.observe(root, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Intercept clicks on links that match blocked patterns
   */
  function interceptBlockedLinks() {
    const links = document.querySelectorAll('a[href*="/shorts/"], a[href*="/shorts?"]');
    links.forEach(link => {
      if (link.classList.contains('yfp-link-intercepted')) {
        return;
      }

      link.classList.add('yfp-link-intercepted');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const targetURL = link.href;
        console.log('[YFP] Blocked Shorts link clicked');

        if (confirm('This content has been blocked (Shorts). Go to home instead?')) {
          window.location.href = 'https://www.youtube.com';
        }
      }, true);
    });
  }

  /**
   * Add a URL pattern to blocklist
   */
  async function addPattern(pattern) {
    if (!pattern || pattern.trim() === '') return;

    const normalized = pattern.trim();

    if (!blockedPatterns.includes(normalized)) {
      blockedPatterns.push(normalized);

      if (typeof saveSetting === 'function') {
        await saveSetting('blockedPatterns', blockedPatterns);
      }

      checkAndBlockURL();
    }

    return normalized;
  }

  /**
   * Remove a URL pattern from blocklist
   */
  async function removePattern(pattern) {
    const normalized = pattern.trim();
    blockedPatterns = blockedPatterns.filter(p => p !== normalized);

    if (typeof saveSetting === 'function') {
      await saveSetting('blockedPatterns', blockedPatterns);
    }

    location.reload();
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    blockedPatterns = settings.blockedPatterns || [];

    // Always include Shorts if hideShorts is enabled
    if (settings.hideShorts) {
      if (!blockedPatterns.includes('/shorts')) {
        blockedPatterns.push('/shorts');
      }
      if (!blockedPatterns.includes('/shorts/')) {
        blockedPatterns.push('/shorts/');
      }
    }

    checkAndBlockURL();
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      if (changes.blockedPatterns || changes.hideShorts) {
        const newSettings = {};
        if (changes.blockedPatterns) {
          newSettings.blockedPatterns = changes.blockedPatterns.newValue;
        }
        if (changes.hideShorts) {
          newSettings.hideShorts = changes.hideShorts.newValue;
        }
        updateSettings(newSettings);
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.YFPURLBlocker = {
    init,
    addPattern,
    removePattern,
    checkAndBlockURL,
    blockURLs: blockedPatterns
  };

})();
