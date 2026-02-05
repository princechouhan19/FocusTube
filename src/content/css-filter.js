/**
 * CSS Filter Blocker Module
 * Uses CSS-based blocking for better performance
 * Inspired by uBlock Origin's element-based blocking strategies
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let styleElement = null;

  // CSS rules for blocking various elements
  const CSS_FILTERS = {
    // Ads (element-based)
    ads: [
      'ytd-display-ad-renderer',
      'ytd-promoted-video-renderer',
      'ytd-in-feed-ad-layout-renderer',
      '.ytp-ad-player-overlay',
      '.ytp-ad-overlay-container',
      '#masthead-ad',
      '#player-ads',
      'ytd-companion-ad-renderer',
      '[aria-label*="Ad"]',
      '.badge-style-type-ad'
    ].join(', '),

    // Shorts
    shorts: [
      'ytd-reel-item-renderer',
      'ytd-shelf-renderer[is-shorts]',
      'ytd-rich-shelf-renderer',
      'ytd-reel-shelf-renderer',
      'ytd-horizontal-shelf-renderer[title*="Shorts"]'
    ].join(', '),

    // Sidebar recommendations
    recommendations: [
      'ytd-compact-video-renderer',
      'ytd-watch-next-secondary-results-renderer',
      '#related'
    ].join(', '),

    // Home Page Suggestions
    homeSuggestions: [
      'ytd-rich-grid-renderer',
      '#primary ytd-rich-grid-renderer',
      'ytd-browse[page-subtype="home"] #contents',
      'ytd-browse[page-subtype="home"] #primary',
      '#contents.ytd-rich-grid-renderer'
    ].join(', '),

    // Sidebar Navigation
    sidebar: [
      '#guide',
      'ytd-guide-renderer',
      'ytd-mini-guide-renderer',
      '#guide-button',
      '#guide-wrapper',
      '#guide-content',
      'ytd-app > #guide',
      '#sections.ytd-guide-renderer'
    ].join(', '),

    // Comments
    comments: [
      '#comments',
      'ytd-comments',
      'ytd-comment-thread-renderer'
    ].join(', '),

    // Info cards and annotations
    infoCards: [
      '.ytp-ce-element',
      '.ytp-ce-video',
      '.ytp-ce-channel',
      '.ytp-ce',
      'ytd-engagement-panel-section-list-renderer',
      '.ytp-annotation',
      '#annotation-shape-container'
    ].join(', '),

    // End screens
    endScreens: [
      '.ytp-ce4-shown',
      '.html5-endscreen',
      '.ytp-endscreen-content'
    ].join(', '),

    // Live chat
    liveChat: [
      '#chat',
      'ytd-live-chat-frame',
      'ytd-chat-renderer'
    ].join(', '),

    // Trending sections
    trending: [
      'ytd-browse[page-subtype="home"] ytd-shelf-renderer',
      'ytd-shelf-renderer:has([href*="/feed/trending"])',
      '.ytd-shelf-renderer:has([aria-label*="Trending"])'
    ].join(', '),

    // Next video overlay
    nextVideo: [
      '.ytp-autonav-endscreen-upnext-overlay',
      '.ytp-next-up-next',
      '.html5-next-up-overlay'
    ].join(', '),

    // More videos button
    moreVideos: [
      '.ytp-more-videos',
      '.ytp-show-related',
      'ytd-grid-renderer'
    ].join(', '),

    // Share buttons
    shareButtons: [
      '#share-button',
      'ytd-button-renderer[aria-label*="Share"]',
      'ytd-subscribe-button-renderer:has([aria-label*="Share"])'
    ].join(', '),

    // Video metadata (views, likes)
    metadata: [
      '#count',
      '#owner-sub-count',
      '.view-count',
      '#metadata-line',
      'ytd-video-primary-info-renderer #count',
      '#text[aria-label*="views"]',
      '#text[aria-label*="like"]',
      '#text[aria-label*="dislike"]'
    ].join(', '),

    // Duration on thumbnails
    duration: [
      'ytd-thumbnail-overlay-time-status-renderer',
      '.ytd-thumbnail-overlay-time-status-renderer',
      '#overlay ytd-thumbnail-overlay-time-status-renderer',
      '.ytp-time-display',
      '#ytd-player .ytp-time-duration'
    ].join(', '),

    // Merchandise and memberships
    merch: [
      'ytd-merch-shelf-renderer',
      'ytd-membership-offer-renderer',
      'ytd-grid-renderer:has([aria-label*="Merch"])'
    ].join(', ')
  };

  /**
   * Initialize CSS filter blocker
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    applyCSSFilters();
    setupFilterObserver();
  }

  /**
   * Apply CSS filters based on settings
   */
  function applyCSSFilters() {
    // Remove existing style element
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }

    // Create style element
    styleElement = document.createElement('style');
    styleElement.id = 'yfp-css-filters';

    let cssRules = '';

    // Add rules based on enabled settings
    if (settings.hideBannerAds) {
      cssRules += generateCSSRule(CSS_FILTERS.ads, 'display', 'none');
    }

    if (settings.hideShorts) {
      cssRules += generateCSSRule(CSS_FILTERS.shorts, 'display', 'none');
    }

    if (settings.hideSuggestions) {
      cssRules += generateCSSRule(CSS_FILTERS.recommendations, 'display', 'none');
      cssRules += generateCSSRule(CSS_FILTERS.homeSuggestions, 'display', 'none');
    }

    if (settings.hideSidebar) {
      cssRules += generateCSSRule(CSS_FILTERS.sidebar, 'display', 'none');
    }

    if (settings.hideComments) {
      cssRules += generateCSSRule(CSS_FILTERS.comments, 'display', 'none');
    }

    if (settings.hideInfoCards) {
      cssRules += generateCSSRule(CSS_FILTERS.infoCards, 'display', 'none');
    }

    if (settings.hideEndScreens) {
      cssRules += generateCSSRule(CSS_FILTERS.endScreens, 'display', 'none');
    }

    if (settings.hideLiveChat) {
      cssRules += generateCSSRule(CSS_FILTERS.liveChat, 'display', 'none');
    }

    if (settings.hideTrending) {
      cssRules += generateCSSRule(CSS_FILTERS.trending, 'display', 'none');
    }

    if (settings.hideNextVideo) {
      cssRules += generateCSSRule(CSS_FILTERS.nextVideo, 'display', 'none');
    }

    if (settings.hideMoreVideos) {
      cssRules += generateCSSRule(CSS_FILTERS.moreVideos, 'display', 'none');
    }

    if (settings.hideShareButtons) {
      cssRules += generateCSSRule(CSS_FILTERS.shareButtons, 'display', 'none');
    }

    if (settings.hideVideoMetrics) {
      cssRules += generateCSSRule(CSS_FILTERS.metadata, 'display', 'none');
    }

    if (settings.hideVideoDuration) {
      cssRules += generateCSSRule(CSS_FILTERS.duration, 'display', 'none');
    }

    if (settings.hideMerch) {
      cssRules += generateCSSRule(CSS_FILTERS.merch, 'display', 'none');
    }

    // Add custom rules from settings
    if (settings.customCSSRules && settings.customCSSRules.length > 0) {
      cssRules += settings.customCSSRules.join('\n');
    }

    // Apply the CSS
    styleElement.textContent = cssRules;
    document.head.appendChild(styleElement);

    console.log('[YFP] CSS filters applied');
  }

  /**
   * Generate CSS rule for selectors
   */
  function generateCSSRule(selectors, property, value) {
    return `${selectors} { ${property}: ${value} !important; }\n`;
  }

  /**
   * Add custom CSS rule
   */
  function addCustomRule(rule) {
    if (!rule || rule.trim() === '') return;

    if (!settings.customCSSRules) {
      settings.customCSSRules = [];
    }

    if (!settings.customCSSRules.includes(rule)) {
      settings.customCSSRules.push(rule.trim());
      applyCSSFilters();
    }

    return rule;
  }

  /**
   * Remove custom CSS rule
   */
  function removeCustomRule(rule) {
    if (!settings.customCSSRules) return;

    settings.customCSSRules = settings.customCSSRules.filter(r => r !== rule);
    applyCSSFilters();
  }

  /**
   * Setup observer for re-applying filters
   */
  function setupFilterObserver() {
    // YouTube sometimes removes style elements
    const observer = new MutationObserver(debounce(() => {
      if (!document.querySelector('#yfp-css-filters')) {
        console.log('[YFP] Re-applying CSS filters');
        applyCSSFilters();
      }
    }, 500));

    observer.observe(document.head, {
      childList: true
    });
  }

  /**
   * Update settings and reapply filters
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    applyCSSFilters();
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      const newSettings = {};
      Object.keys(changes).forEach(key => {
        if (changes[key].newValue !== undefined) {
          newSettings[key] = changes[key].newValue;
        }
      });
      updateSettings(newSettings);
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.YFPCSSFilter = {
    init,
    applyCSSFilters,
    addCustomRule,
    removeCustomRule,
    updateSettings,
    filters: CSS_FILTERS
  };

})();
