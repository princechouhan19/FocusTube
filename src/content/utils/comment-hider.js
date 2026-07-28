/**
 * Comment Hider Module
 * Hides comments section to reduce distractions
 * Inspired by No YouTube Recommendations and GoodTube
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  
  // CSS Selectors for reliable hiding
  const COMMENT_SELECTORS = [
    '#comments',
    'ytd-comments',
    'ytd-comments-secondary-renderer',
    'ytd-comments-entry-point-renderer',
    'ytd-toggle-button-renderer:has([aria-label*="Comments"])',
    '#count[aria-label*="comment"]',
    '.comment-count',
    'ytd-comments-header-renderer',
    // Mobile/Responsive
    'ytm-comments-entry-point-header-renderer',
    'ytm-item-section-renderer[section-identifier="comments-entry-point"]'
  ].join(',\n');

  /**
   * Initialize comment hider
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    if (settings.hideComments) {
      enableCommentHiding();
    }
  }

  /**
   * Enable comment hiding using CSS injection
   */
  function enableCommentHiding() {
    console.log('[YFP] Enabling comment hiding');
    
    // Inject CSS for reliable hiding
    if (typeof injectStyles === 'function') {
      injectStyles('yfp-hide-comments', `${COMMENT_SELECTORS} { display: none !important; }`);
    } else {
      // Fallback if injectStyles is not available yet
      const style = document.createElement('style');
      style.id = 'yfp-hide-comments';
      style.textContent = `${COMMENT_SELECTORS} { display: none !important; }`;
      (document.head || document.documentElement).appendChild(style);
    }
  }

  /**
   * Disable comment hiding
   */
  function disableCommentHiding() {
    console.log('[YFP] Disabling comment hiding');
    
    if (typeof removeStyles === 'function') {
      removeStyles('yfp-hide-comments');
    } else {
      const style = document.getElementById('yfp-hide-comments');
      if (style) style.remove();
    }
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const oldHideComments = settings.hideComments;
    settings = { ...settings, ...newSettings };

    if (settings.hideComments !== oldHideComments) {
      if (settings.hideComments) {
        enableCommentHiding();
      } else {
        disableCommentHiding();
      }
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      if (changes.hideComments && changes.hideComments.newValue !== undefined) {
        updateSettings({ hideComments: changes.hideComments.newValue });
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
  window.YFPCommentHider = {
    init,
    updateSettings
  };

})();
