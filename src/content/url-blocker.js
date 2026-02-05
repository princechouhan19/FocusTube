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
   * Show a custom blocked page
   */
  function showBlockedPage(pattern) {
    // Create blocked message overlay
    const blockedOverlay = createElement('div', {
      className: 'yfp-url-blocked-overlay',
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: '#0f0f0f',
        zIndex: '2147483647',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
      }
    });
    const bannerURL = chrome.runtime.getURL('src/icons/banner.png');
    blockedOverlay.innerHTML = `
        <div style="text-align: center; max-width: 500px; padding: 20px;">
          <img class="yfp-banner" src="${bannerURL}" alt="FocusTube" style="height:48px; width:auto; object-fit:contain; margin-bottom:16px;" />
          <div style="font-size: 64px; margin-bottom: 20px;">🚫</div>
          <h1 style="color: white; font-size: 32px; margin-bottom: 16px;">
            Content Blocked
          </h1>
          <p style="color: #888; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            This content has been blocked based on your URL pattern settings.
          </p>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <button id="yfp-go-home" style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              padding: 12px 24px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
            ">
              🏠 Go to Home
            </button>
            <button id="yfp-unblock-temp" style="
              background: #2d2d2d;
              color: white;
              border: 1px solid #3d3d3d;
              border-radius: 8px;
              padding: 12px 24px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
            ">
              Temporarily Unblock
            </button>
          </div>
        </div>
      `;
    const bannerImg = blockedOverlay.querySelector('.yfp-banner');
    if (bannerImg) {
      bannerImg.onerror = async () => {
        try {
          const resp = await fetch(bannerURL);
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          bannerImg.src = blobUrl;
        } catch {
          bannerImg.style.display = 'none';
        }
      };
    }

    // Add to page
    document.body.innerHTML = '';
    document.body.appendChild(blockedOverlay);

    // Add event listeners
    const goHomeBtn = blockedOverlay.querySelector('#yfp-go-home');
    const unblockBtn = blockedOverlay.querySelector('#yfp-unblock-temp');

    goHomeBtn.addEventListener('click', () => {
      window.location.href = 'https://www.youtube.com';
    });

    unblockBtn.addEventListener('click', () => {
      // Temporarily unblock by reloading without extension check
      sessionStorage.setItem('yfp-temp-unblock', Date.now().toString());
      location.reload();
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

    observer.observe(document.body, {
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
