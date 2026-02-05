/**
 * Autoplay Controller Module
 * Forces autoplay OFF and prevents YouTube from re-enabling it
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let autoplayObserver = null;

  /**
   * Initialize the autoplay controller
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }
    
    if (settings.disableAutoplay) {
      disableAutoplay();
      setupAutoplayObserver();
    }
    
    // Listen for video changes
    setupVideoChangeListener();
  }

  /**
   * Disable autoplay for the current video
   */
  function disableAutoplay() {
    // Try multiple methods as YouTube changes DOM structure
    
    // Method 1: Click autoplay toggle button
    const toggleButtons = document.querySelectorAll(
      'ytd-compact-autoplay-renderer #toggle-button, ' +
      'ytd-player-legacy-desktop-watch-ads-renderer #toggle-button, ' +
      'button.ytp-autonav-toggle-button, ' +
      '#ytd-player #top-level-buttons-computed ytd-toggle-button-renderer'
    );
    
    toggleButtons.forEach(button => {
      try {
        // Check if autoplay is currently enabled
        const isChecked = button.getAttribute('aria-pressed') === 'true' ||
                         button.querySelector('[aria-pressed="true"]');
        
        if (isChecked) {
          console.log('[YFP] Disabling autoplay');
          button.click();
        }
      } catch (error) {
        console.warn('[YFP] Could not toggle autoplay:', error);
      }
    });

    // Method 2: Use YouTube's internal API if available
    const player = document.querySelector('#movie_player');
    if (player && player.setAutoplay) {
      try {
        player.setAutoplay(false);
      } catch (error) {
        console.warn('[YFP] Could not use player API:', error);
      }
    }

    // Method 3: Direct DOM manipulation (less reliable but fallback)
    const autoplayToggle = document.querySelector('#autoplay-checkbox');
    if (autoplayToggle) {
      autoplayToggle.checked = false;
    }

    // Method 4: Remove autoplay from data attributes
    const videoElement = document.querySelector('video');
    if (videoElement) {
      videoElement.removeAttribute('autoplay');
    }
  }

  /**
   * Setup MutationObserver to keep autoplay disabled
   */
  function setupAutoplayObserver() {
    if (autoplayObserver) {
      autoplayObserver.disconnect();
    }

    autoplayObserver = new MutationObserver(debounce(() => {
      if (settings.disableAutoplay) {
        disableAutoplay();
      }
    }, 300));

    // Observe the player area
    const playerArea = document.querySelector('#columns') || document.body;
    autoplayObserver.observe(playerArea, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-pressed', 'checked']
    });
  }

  /**
   * Setup video change listener for navigation within playlists
   */
  function setupVideoChangeListener() {
    // Watch for video URL changes
    let lastVideoId = getVideoId();
    
    const checkVideoChange = debounce(() => {
      const currentVideoId = getVideoId();
      if (currentVideoId && currentVideoId !== lastVideoId) {
        lastVideoId = currentVideoId;
        console.log('[YFP] Video changed, reapplying settings');
        
        if (settings.disableAutoplay) {
          setTimeout(disableAutoplay, 500);
        }
      }
    }, 200);

    // Listen for URL changes (YouTube SPA)
    new MutationObserver(checkVideoChange).observe(document, {
      subtree: true,
      childList: true
    });

    // Also check periodically as fallback
    setInterval(checkVideoChange, 2000);
  }

  /**
   * Extract video ID from URL
   */
  function getVideoId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('v');
  }

  /**
   * Enable autoplay (for when setting is disabled)
   */
  function enableAutoplay() {
    const toggleButtons = document.querySelectorAll(
      'ytd-compact-autoplay-renderer #toggle-button, ' +
      'ytd-player-legacy-desktop-watch-ads-renderer #toggle-button'
    );
    
    toggleButtons.forEach(button => {
      try {
        const isChecked = button.getAttribute('aria-pressed') === 'true';
        if (!isChecked) {
          button.click();
        }
      } catch (error) {
        console.warn('[YFP] Could not enable autoplay:', error);
      }
    });
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const oldDisableAutoplay = settings.disableAutoplay;
    settings = { ...settings, ...newSettings };
    
    if (settings.disableAutoplay && !oldDisableAutoplay) {
      disableAutoplay();
      setupAutoplayObserver();
    } else if (!settings.disableAutoplay && oldDisableAutoplay) {
      if (autoplayObserver) {
        autoplayObserver.disconnect();
        autoplayObserver = null;
      }
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      Object.keys(changes).forEach(key => {
        if (key === 'disableAutoplay' && changes[key].newValue !== undefined) {
          updateSettings({ disableAutoplay: changes[key].newValue });
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
  window.YFPAutoplayController = {
    init,
    disableAutoplay,
    enableAutoplay,
    updateSettings
  };

})();
