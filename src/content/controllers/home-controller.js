/**
 * Home Controller Module
 * Hides suggestions, trending, and implements home page redirect
 */

(function() {
  'use strict';

  // Module state
  let settings = {};

  // CSS Selectors
  const HOME_SELECTORS = {
    // Home feed (Suggestions)
    suggestions: [
      '#contents ytd-rich-grid-renderer',
      'ytd-two-column-browse-results-renderer[page-subtype="home"] #primary',
      'ytd-rich-grid-renderer',
      // Mobile/Responsive
      'ytm-rich-grid-renderer'
    ].join(',\n'),

    // Sidebar Suggestions (Watch Page)
    sidebarSuggestions: [
      '#related',
      '#secondary',
      'ytd-watch-next-secondary-results-renderer',
      'ytd-item-section-renderer[section-identifier="related-items"]'
    ].join(',\n'),
    
    // Trending
    trending: [
      'ytd-browse[page-subtype="trending"]',
      'ytd-shelf-renderer:has([href*="/feed/trending"])',
      'ytd-guide-entry-renderer:has(a[href*="/feed/trending"])'
    ].join(',\n')
  };

  /**
   * Initialize the home controller
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }
    
    // Handle home page redirect
    handleHomePageRedirect();
    
    // Update visibility based on settings
    updateVisibility();
    
    // Listen for navigation changes for redirect logic
    setupNavigationListener();
  }

  /**
   * Update visibility based on settings using CSS injection
   */
  function updateVisibility() {
    // Hide Home Feed Suggestions
    if (settings.hideSuggestions) {
      injectStyles('yfp-hide-home-suggestions', `${HOME_SELECTORS.suggestions} { display: none !important; }`);
      injectStyles('yfp-hide-sidebar-suggestions', `${HOME_SELECTORS.sidebarSuggestions} { display: none !important; }`);
    } else {
      removeStyles('yfp-hide-home-suggestions');
      removeStyles('yfp-hide-sidebar-suggestions');
    }

    // Hide Trending
    if (settings.hideTrending) {
      injectStyles('yfp-hide-trending', `${HOME_SELECTORS.trending} { display: none !important; }`);
    } else {
      removeStyles('yfp-hide-trending');
    }
  }

  /**
   * Handle home page redirect
   */
  function handleHomePageRedirect() {
    if (settings.homePageRedirect === 'none' || !settings.homePageRedirect) {
      return;
    }

    const currentUrl = window.location.href;
    // Check if on home page
    const isHomePage = currentUrl === 'https://www.youtube.com/' ||
                      currentUrl === 'https://youtube.com/' ||
                      currentUrl === 'https://www.youtube.com' ||
                      currentUrl === 'https://youtube.com';

    if (isHomePage) {
      console.log('[YFP] Home page redirect:', settings.homePageRedirect);

      switch (settings.homePageRedirect) {
        case 'subscriptions':
          window.location.replace('https://www.youtube.com/feed/subscriptions');
          break;
        case 'search':
          window.location.replace('https://www.youtube.com/results?search_query=');
          break;
        case 'blank':
          // Blank page is handled by hiding suggestions
          break;
        default:
          break;
      }
    }
  }

  /**
   * Setup navigation listener for redirects
   */
  function setupNavigationListener() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        handleHomePageRedirect();
      }
    }).observe(document, { subtree: true, childList: true });
    
    window.addEventListener('yt-navigate-finish', handleHomePageRedirect);
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    updateVisibility();
    handleHomePageRedirect();
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      const keys = ['hideSuggestions', 'hideTrending', 'homePageRedirect'];
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
  window.YFPHomeController = {
    init,
    updateSettings
  };

})();
