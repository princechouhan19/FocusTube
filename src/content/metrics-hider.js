/**
 * Video Metrics Hider Module
 * Hides likes, views, and other metrics to reduce "popularity bias"
 * Inspired by GoodTube's UI customization
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let metricsObserver = null;

  /**
   * Initialize metrics hider
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    if (settings.hideVideoMetrics) {
      hideMetrics();
      setupMetricsObserver();
    }
  }

  /**
   * Hide video metrics from page
   */
  function hideMetrics() {
    console.log('[YFP] Hiding video metrics');

    // Hide likes and dislikes on video player
    const likeButtons = document.querySelectorAll(
      '#segmented-like-button, ' +
      'ytd-toggle-button-renderer button[aria-label*="like"], ' +
      'ytd-toggle-button-renderer button[aria-label*="dislike"]'
    );

    likeButtons.forEach(button => {
      // Hide the count but keep the button functional
      const countElement = button.querySelector('#text');
      if (countElement) {
        hideElement(countElement, 'display');
      }
    });

    // Hide view count on video page
    const viewCount = document.querySelectorAll(
      '#count, ' +
      '#count yt-formatted-string, ' +
      '.view-count, ' +
      'ytd-video-primary-info-renderer #count'
    );

    viewCount.forEach(element => {
      hideElement(element, 'display');
    });

    // Hide metrics in video info section
    const infoBadges = document.querySelectorAll(
      'ytd-badge-supported-renderer, ' +
      '.ytd-badge-supported-renderer'
    );

    infoBadges.forEach(badge => {
      hideElement(badge, 'display');
    });

    // Hide subscriber counts
    const subscriberCounts = document.querySelectorAll(
      '#owner-sub-count, ' +
      '.ytd-subscribe-button-renderer #subscriber-count'
    );

    subscriberCounts.forEach(element => {
      hideElement(element, 'display');
    });

    // Hide metrics on home page video thumbnails
    const homeVideoMetrics = document.querySelectorAll(
      'ytd-rich-item-renderer #metadata-line span, ' +
      'ytd-rich-item-renderer #video-meta-block'
    );

    homeVideoMetrics.forEach(element => {
      // Keep the title but hide views/time
      const parent = element.closest('#metadata-line');
      if (parent) {
        const text = parent.textContent;
        // Only hide if it contains numbers (views/time)
        if (/\d/.test(text)) {
          hideElement(element, 'display');
        }
      }
    });

    // Hide metrics in sidebar recommendations
    const sidebarMetrics = document.querySelectorAll(
      'ytd-compact-video-renderer #metadata-line, ' +
      'ytd-compact-video-renderer #video-meta'
    );

    sidebarMetrics.forEach(element => {
      const text = element.textContent;
      if (/\d/.test(text)) {
        hideElement(element, 'display');
      }
    });

    // Hide metrics in search results
    const searchMetrics = document.querySelectorAll(
      'ytd-video-renderer #metadata-line, ' +
      'ytd-video-renderer #video-meta'
    );

    searchMetrics.forEach(element => {
      const text = element.textContent;
      if (/\d/.test(text)) {
        hideElement(element, 'display');
      }
    });

    // Hide video duration on thumbnails
    const durations = document.querySelectorAll(
      'ytd-thumbnail-overlay-time-status-renderer, ' +
      '.ytd-thumbnail-overlay-time-status-renderer'
    );

    if (settings.hideVideoDuration) {
      durations.forEach(element => {
        hideElement(element, 'display');
      });
    }

    // Hide "X people watching" on live streams
    const watchingCounts = document.querySelectorAll(
      '[aria-label*="watching"], ' +
      'yt-live-chat-view-count'
    );

    watchingCounts.forEach(element => {
      hideElement(element, 'display');
    });
  }

  /**
   * Show video metrics
   */
  function showMetrics() {
    console.log('[YFP] Showing video metrics');

    const hiddenElements = document.querySelectorAll(
      '#count[style*="display: none"], ' +
      '#metadata-line[style*="display: none"], ' +
      '#video-meta-block[style*="display: none"], ' +
      '#subscriber-count[style*="display: none"], ' +
      '.view-count[style*="display: none"], ' +
      'ytd-thumbnail-overlay-time-status-renderer[style*="display: none"]'
    );

    hiddenElements.forEach(element => {
      showElement(element, 'display');
    });
  }

  /**
   * Setup observer for dynamically loaded content
   */
  function setupMetricsObserver() {
    if (metricsObserver) {
      metricsObserver.disconnect();
    }

    metricsObserver = new MutationObserver(debounce(() => {
      if (settings.hideVideoMetrics || settings.hideVideoDuration) {
        hideMetrics();
      }
    }, 200));

    metricsObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };

    if (settings.hideVideoMetrics) {
      hideMetrics();
      if (!metricsObserver) {
        setupMetricsObserver();
      }
    } else {
      showMetrics();
      if (metricsObserver) {
        metricsObserver.disconnect();
        metricsObserver = null;
      }
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      if (changes.hideVideoMetrics || changes.hideVideoDuration) {
        const newSettings = {};
        if (changes.hideVideoMetrics) {
          newSettings.hideVideoMetrics = changes.hideVideoMetrics.newValue;
        }
        if (changes.hideVideoDuration) {
          newSettings.hideVideoDuration = changes.hideVideoDuration.newValue;
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
  window.YFPMetricsHider = {
    init,
    hideMetrics,
    showMetrics,
    updateSettings
  };

})();
