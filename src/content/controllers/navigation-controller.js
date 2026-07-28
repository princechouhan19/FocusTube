/**
 * Navigation Controller Module
 * Controls visibility of left navigation bar items
 */

(function() {
  'use strict';

  // Module state
  let settings = {};

  // CSS Selectors
  const NAV_SELECTORS = {
    sidebar: [
      'ytd-guide-renderer',
      '#guide',
      '#guide-wrapper',
      '#guide-content',
      'ytd-mini-guide-renderer',
      '#guide-button', // Menu button
      'tp-yt-app-drawer', // Drawer sidebar
      '#sections.ytd-guide-renderer'
    ].join(',\n'),
    
    shorts: [
      'ytd-guide-entry-renderer:has(a[href*="/shorts"])',
      'ytd-mini-guide-entry-renderer:has(a[href*="/shorts"])',
      '[title="Shorts"]'
    ].join(',\n'),
    
    explore: [
      'ytd-guide-entry-renderer:has(a[href*="/feed/explore"])',
      '[title="Explore"]'
    ].join(',\n'),
    
    gaming: [
      'ytd-guide-entry-renderer:has(a[href*="/gaming"])',
      '[title="Gaming"]'
    ].join(',\n'),
    
    trending: [
      'ytd-guide-entry-renderer:has(a[href*="/feed/trending"])',
      '[title="Trending"]'
    ].join(',\n')
  };

  /**
   * Initialize the navigation controller
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }
    
    updateVisibility();
  }

  /**
   * Update visibility based on settings using CSS injection
   */
  function updateVisibility() {
    // Hide entire sidebar
    if (settings.hideSidebar) {
      injectStyles('yfp-hide-sidebar', `${NAV_SELECTORS.sidebar} { display: none !important; }`);
    } else {
      removeStyles('yfp-hide-sidebar');
    }

    // Hide Shorts in navigation
    if (settings.hideNavShorts) {
      injectStyles('yfp-hide-nav-shorts', `${NAV_SELECTORS.shorts} { display: none !important; }`);
    } else {
      removeStyles('yfp-hide-nav-shorts');
    }

    // Hide Explore
    if (settings.hideNavExplore) {
      injectStyles('yfp-hide-nav-explore', `${NAV_SELECTORS.explore} { display: none !important; }`);
    } else {
      removeStyles('yfp-hide-nav-explore');
    }

    // Hide Gaming
    if (settings.hideNavGaming) {
      injectStyles('yfp-hide-nav-gaming', `${NAV_SELECTORS.gaming} { display: none !important; }`);
    } else {
      removeStyles('yfp-hide-nav-gaming');
    }

    // Hide Trending
    if (settings.hideNavTrending) {
      injectStyles('yfp-hide-nav-trending', `${NAV_SELECTORS.trending} { display: none !important; }`);
    } else {
      removeStyles('yfp-hide-nav-trending');
    }
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    updateVisibility();
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      const keys = ['hideSidebar', 'hideNavShorts', 'hideNavExplore', 'hideNavGaming', 'hideNavTrending'];
      let shouldUpdate = false;
      let newVals = {};

      keys.forEach(key => {
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

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.YFPNavigationController = {
    init,
    updateSettings
  };

})();
