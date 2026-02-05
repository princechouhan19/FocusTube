/**
 * Shorts Blocker Module
 * Removes Shorts from home page, search results, recommendations, and navigation
 */

(function() {
  'use strict';

  // Module state
  let settings = {};

  // CSS Selectors for reliable Shorts hiding
  const SHORTS_SELECTORS = [
    // Shelves and Sections
    'ytd-rich-shelf-renderer[is-shorts]', 
    'ytd-reel-shelf-renderer', 
    'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
    'ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)',
    
    // Individual Items
    'ytd-reel-item-renderer',
    'ytd-video-renderer:has(a[href*="/shorts/"])',
    'ytd-grid-video-renderer:has(a[href*="/shorts/"])',
    'ytd-rich-item-renderer:has(a[href*="/shorts/"])',
    'ytd-compact-video-renderer:has(a[href*="/shorts/"])',
    
    // Navigation
    'ytd-guide-entry-renderer:has(a[href*="/shorts"])',
    'ytd-mini-guide-entry-renderer:has(a[href*="/shorts"])',
    'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
    '[title="Shorts"]',
    
    // Mobile/Responsive
    'ytm-rich-section-renderer:has(ytm-reel-shelf-renderer)',
    'ytm-pivot-bar-item-renderer:has(div.pivot-shorts)',
    
    // Tabs
    'tp-yt-paper-tab:has(.tab-content[aria-label="Shorts"])'
  ].join(',\n');

  /**
   * Initialize Shorts blocker
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    if (settings.hideShorts) {
      enableShortsBlocking();
    }

    // Redirect if currently on Shorts page
    redirectIfShortsPage();
  }

  /**
   * Enable Shorts blocking using CSS injection
   */
  function enableShortsBlocking() {
    console.log('[YFP] Enabling Shorts blocking');
    
    // Inject CSS for reliable hiding
    if (typeof injectStyles === 'function') {
      injectStyles('yfp-hide-shorts', `${SHORTS_SELECTORS} { display: none !important; }`);
    } else {
      // Fallback
      const style = document.createElement('style');
      style.id = 'yfp-hide-shorts';
      style.textContent = `${SHORTS_SELECTORS} { display: none !important; }`;
      (document.head || document.documentElement).appendChild(style);
    }
    
    // Add listener for URL changes (SPA navigation) to redirect
    window.addEventListener('yt-navigate-finish', redirectIfShortsPage);
    window.addEventListener('popstate', redirectIfShortsPage);
    
    // Observe for dynamic redirects
    setupRedirectObserver();
  }

  /**
   * Disable Shorts blocking
   */
  function disableShortsBlocking() {
    console.log('[YFP] Disabling Shorts blocking');
    
    if (typeof removeStyles === 'function') {
      removeStyles('yfp-hide-shorts');
    } else {
      const style = document.getElementById('yfp-hide-shorts');
      if (style) style.remove();
    }
    
    window.removeEventListener('yt-navigate-finish', redirectIfShortsPage);
    window.removeEventListener('popstate', redirectIfShortsPage);
  }

  /**
   * Redirect if on a Shorts page
   */
  function redirectIfShortsPage() {
    if (settings.hideShorts && window.location.pathname.startsWith('/shorts')) {
      console.log('[YFP] Redirecting from Shorts page');
      window.stop(); // Stop loading
      window.location.replace('https://www.youtube.com'); // Replace history entry
    }
  }

  /**
   * Setup observer to catch SPA navigations to Shorts
   */
  function setupRedirectObserver() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        redirectIfShortsPage();
      }
    }).observe(document, { subtree: true, childList: true });
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const oldHideShorts = settings.hideShorts;
    settings = { ...settings, ...newSettings };
    
    if (settings.hideShorts !== oldHideShorts) {
      if (settings.hideShorts) {
        enableShortsBlocking();
        redirectIfShortsPage();
      } else {
        disableShortsBlocking();
      }
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      if (changes.hideShorts && changes.hideShorts.newValue !== undefined) {
        updateSettings({ hideShorts: changes.hideShorts.newValue });
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
  window.YFPShortsBlocker = {
    init,
    updateSettings,
    redirectIfShortsPage
  };

})();
