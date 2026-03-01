/**
 * Theater Mode Module
 * Automatically enables theater mode on video pages
 * Inspired by GoodTube's UI customization features
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let theaterObserver = null;

  /**
   * Initialize theater mode
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    if (settings.autoTheaterMode) {
      enableTheaterMode();
      setupTheaterObserver();
      watchVideoChanges();
    }
  }

  /**
   * Enable theater mode on current page
   */
  function enableTheaterMode() {
    const player = document.querySelector('#movie_player');
    if (!player) {
      console.log('[YFP] Player not found yet');
      return;
    }

    // Check if already in theater mode using player classes
    const isTheaterMode = player.classList.contains('ytp-autohide') || 
                         player.classList.contains('theater') ||
                         player.classList.contains('ytp-player-minimized') === false && 
                         document.querySelector('ytd-watch-flexy[theater]');

    if (!isTheaterMode) {
      const theaterButton = findTheaterButton();
      if (theaterButton) {
        console.log('[YFP] Enabling theater mode');
        theaterButton.click();
      } else {
        console.log('[YFP] Theater button not found');
      }
    } else {
      console.log('[YFP] Theater mode already enabled');
    }
  }

  /**
   * Find theater mode button
   * Multiple selector strategies for different YouTube layouts
   */
  function findTheaterButton() {
    // Method 1: ytp-size-button (Standard YouTube player size toggle)
    const sizeButton = document.querySelector('.ytp-size-button');
    if (sizeButton) return sizeButton;

    // Method 2: ytd-player-size
    const playerSizeButton = document.querySelector('ytd-player-size button');
    if (playerSizeButton) {
      const buttons = document.querySelectorAll('ytd-player-size button');
      for (const button of buttons) {
        const tooltip = button.getAttribute('aria-label') ||
                       button.getAttribute('title') ||
                       button.textContent;
        if (tooltip && (
            tooltip.toLowerCase().includes('theater') ||
            tooltip.includes('扩展')
        )) {
          return button;
        }
      }
    }

    // Method 3: Direct aria-label search
    const allButtons = document.querySelectorAll('button');
    for (const button of allButtons) {
      const label = button.getAttribute('aria-label');
      if (label && label.toLowerCase().includes('theater')) {
        return button;
      }
    }

    return null;
  }

  /**
   * Disable theater mode
   */
  function disableTheaterMode() {
    const player = document.querySelector('#movie_player');
    if (!player) return;

    const isTheaterMode = player.classList.contains('theater') || 
                         document.querySelector('ytd-watch-flexy[theater]');

    if (isTheaterMode) {
      const theaterButton = findTheaterButton();
      if (theaterButton) {
        console.log('[YFP] Disabling theater mode');
        theaterButton.click();
      }
    }
  }

  /**
   * Setup observer to maintain theater mode
   */
  function setupTheaterObserver() {
    if (theaterObserver) {
      theaterObserver.disconnect();
    }

    theaterObserver = new MutationObserver(debounce(() => {
      if (settings.autoTheaterMode) {
        const player = document.querySelector('#movie_player');
        if (!player) return;

        const isTheaterMode = player.classList.contains('theater') || 
                             document.querySelector('ytd-watch-flexy[theater]');

        if (!isTheaterMode) {
          // Use a smaller delay and only if we are actually on a video page
          if (window.location.pathname === '/watch') {
            enableTheaterMode();
          }
        }
      }
    }, 1000)); // Increased debounce to prevent rapid switching

    const root = document.querySelector('ytd-app') || document.body;
    if (!root) return;
    theaterObserver.observe(root, {
      attributes: true,
      attributeFilter: ['theater'],
      childList: true,
      subtree: true
    });
  }

  /**
   * Watch for video changes (YouTube SPA navigation)
   */
  function watchVideoChanges() {
    let lastVideoId = getVideoId();

    const checkVideoChange = debounce(() => {
      const currentVideoId = getVideoId();
      if (currentVideoId && currentVideoId !== lastVideoId) {
        lastVideoId = currentVideoId;
        console.log('[YFP] New video, enabling theater mode');

        if (settings.autoTheaterMode) {
          setTimeout(enableTheaterMode, 1000);
        }
      }
    }, 200);

    // Use MutationObserver to detect SPA navigation
    new MutationObserver(checkVideoChange).observe(document, {
      subtree: true,
      childList: true
    });

    // Also check URL periodically as fallback
    setInterval(checkVideoChange, 2000);
  }

  /**
   * Extract video ID from URL
   */
  function getVideoId() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('v');
    } catch {
      return null;
    }
  }

  /**
   * Toggle theater mode
   */
  function toggleTheaterMode(enable) {
    if (enable) {
      enableTheaterMode();
      setupTheaterObserver();
      watchVideoChanges();
    } else {
      disableTheaterMode();
      if (theaterObserver) {
        theaterObserver.disconnect();
        theaterObserver = null;
      }
    }
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const oldAutoTheater = settings.autoTheaterMode;
    settings = { ...settings, ...newSettings };

    if (settings.autoTheaterMode && !oldAutoTheater) {
      toggleTheaterMode(true);
    } else if (!settings.autoTheaterMode && oldAutoTheater) {
      toggleTheaterMode(false);
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      if (changes.autoTheaterMode && changes.autoTheaterMode.newValue !== undefined) {
        updateSettings({ autoTheaterMode: changes.autoTheaterMode.newValue });
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
  window.YFPTheaterMode = {
    init,
    enableTheaterMode,
    disableTheaterMode,
    toggleTheaterMode,
    updateSettings
  };

})();
