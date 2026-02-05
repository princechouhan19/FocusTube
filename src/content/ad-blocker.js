/**
 * Ad Blocker Module
 * Handles hiding banner ads, sidebar ads, promoted videos, and skipping video ads
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let skipInterval = null;

  // DOM selectors for various ad types
  const AD_SELECTORS = {
    // Banner ads
    mastheadAd: '#masthead-ad',
    topBanner: '.ytd-display-ad-renderer',
    bannerAd: '#top-level-buttons-computed',
    
    // In-feed promoted videos
    promotedVideo: 'ytd-promoted-video-renderer',
    adBadge: '[aria-label*="Ad"]',
    sponsoredBadge: '.badge-style-type-ad',
    inFeedAd: 'ytd-in-feed-ad-layout-renderer',
    
    // Sidebar ads
    sidebarAd: '#player-ads',
    companionAd: '.ytd-companion-ad-renderer',
    
    // Video player ads
    videoAd: '.ytp-ad-player-overlay',
    adOverlay: '.ytp-ad-overlay-container',
    skipButton: '.ytp-ad-skip-button',
    skipButtonModern: '.ytp-ad-skip-button-modern',
    
    // General ad indicators
    adIndicator: '#ad-text',
    adLabel: '.ytp-ad-simple-ad-badge'
  };

  /**
   * Initialize the ad blocker with settings
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }
    
    if (settings.hideBannerAds) {
      hideBannerAds();
    }
    
    if (settings.skipVideoAds) {
      skipVideoAds();
    }
    
    // Setup MutationObserver for dynamically loaded ads
    setupAdObserver();
  }

  /**
   * Hide all banner and in-feed ads
   */
  function hideBannerAds() {
    // Hide top banner ads
    const bannerAds = document.querySelectorAll(
      AD_SELECTORS.mastheadAd + ', ' +
      AD_SELECTORS.topBanner + ', ' +
      AD_SELECTORS.bannerAd
    );
    
    bannerAds.forEach(ad => {
      if (ad) {
        hideElement(ad, 'display');
      }
    });

    // Hide in-feed promoted videos
    const promotedVideos = document.querySelectorAll(
      AD_SELECTORS.promotedVideo + ', ' +
      AD_SELECTORS.inFeedAd
    );
    
    promotedVideos.forEach(video => {
      if (video) {
        hideElement(video, 'display');
      }
    });

    // Hide sidebar ads
    const sidebarAds = document.querySelectorAll(
      AD_SELECTORS.sidebarAd + ', ' +
      AD_SELECTORS.companionAd
    );
    
    sidebarAds.forEach(ad => {
      if (ad) {
        hideElement(ad, 'display');
      }
    });

    // Hide videos with ad badges
    const videosWithAds = document.querySelectorAll('ytd-rich-item-renderer');
    videosWithAds.forEach(video => {
      const adBadge = video.querySelector(AD_SELECTORS.adBadge);
      const sponsoredBadge = video.querySelector(AD_SELECTORS.sponsoredBadge);
      if (adBadge || sponsoredBadge) {
        hideElement(video, 'display');
      }
    });
  }

  /**
   * Skip video ads with fallback to mute and speed up
   */
  function skipVideoAds() {
    if (skipInterval) {
      clearInterval(skipInterval);
    }

    // Check every 100ms for ads
    skipInterval = setInterval(() => {
      const video = document.querySelector('video');
      if (!video) return;

      // Check if we're in an ad
      const isAd = document.querySelector(AD_SELECTORS.videoAd) ||
                   document.querySelector(AD_SELECTORS.adOverlay) ||
                   video.classList.contains('ad-interrupting') ||
                   video.classList.contains('ad-showing');

      if (isAd) {
        // Try to click skip button
        const skipButton = document.querySelector(AD_SELECTORS.skipButton) ||
                          document.querySelector(AD_SELECTORS.skipButtonModern);

        if (skipButton && skipButton.offsetParent !== null) {
          // Click skip button if it's visible and enabled
          try {
            skipButton.click();
            console.log('[YFP] Skipped ad');
            return;
          } catch (error) {
            console.warn('[YFP] Could not click skip button:', error);
          }
        }

        // Fallback: Mute and speed up if skippable button not available
        if (!skipButton || skipButton.offsetParent === null) {
          console.warn('[YFP] Skippable button not available, using fallback');

          // Mute the video
          if (!video.muted) {
            video.muted = true;
            console.log('[YFP] Ad muted');
          }

          // Speed up playback
          if (video.playbackRate < 16) {
            video.playbackRate = 16;
            console.log('[YFP] Ad sped up to 16x');
          }

          // Show warning to user
          showAdWarning();
        }
      } else {
        // Restore normal playback when ad ends
        if (video.playbackRate > 1) {
          video.playbackRate = 1;
        }
      }
    }, 100);
  }

  /**
   * Show warning about ad block detection risk
   */
  function showAdWarning() {
    // Check if warning already exists
    if (document.querySelector('.yfp-ad-warning')) {
      return;
    }

    const warning = createElement('div', {
      className: 'yfp-ad-warning',
      innerHTML: '⚠️ <strong>Ad Detected:</strong> Skipping not available. Playing at 16x speed with audio muted. This may trigger YouTube\'s ad-block detection.'
    });

    const player = document.querySelector('#above-the-fold');
    if (player) {
      insertBefore(warning, player);
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (warning && warning.parentNode) {
        warning.remove();
      }
    }, 5000);
  }

  /**
   * Setup MutationObserver to catch dynamically loaded ads
   */
  function setupAdObserver() {
    const observer = new MutationObserver(debounce(() => {
      if (settings.hideBannerAds) {
        hideBannerAds();
      }
    }, 200));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    
    if (settings.hideBannerAds) {
      hideBannerAds();
    } else {
      // Optionally restore ads if setting is disabled
    }
    
    if (settings.skipVideoAds) {
      skipVideoAds();
    } else {
      if (skipInterval) {
        clearInterval(skipInterval);
        skipInterval = null;
      }
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      Object.keys(changes).forEach(key => {
        if (changes[key].newValue !== undefined) {
          updateSettings({ [key]: changes[key].newValue });
        }
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.YFPAdBlocker = {
    init,
    hideBannerAds,
    skipVideoAds,
    updateSettings
  };

})();
