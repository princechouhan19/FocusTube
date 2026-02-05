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
    // Method 1: Click theater mode button
    const theaterButton = findTheaterButton();
    if (theaterButton) {
      const isTheaterMode = theaterButton.getAttribute('aria-pressed') === 'true';

      if (!isTheaterMode) {
        console.log('[YFP] Enabling theater mode');
        theaterButton.click();
      } else {
        console.log('[YFP] Theater mode already enabled');
      }
    } else {
      console.log('[YFP] Theater button not found yet');
    }
  }

  /**
   * Find theater mode button
   * Multiple selector strategies for different YouTube layouts
   */
  function findTheaterButton() {
    // Method 1: ytd-player-size
    const playerSizeButton = document.querySelector('ytd-player-size button');
    if (playerSizeButton) {
      // Find the theater button (typically the second one after default)
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

    // Method 2: Direct aria-label search
    const allButtons = document.querySelectorAll('button');
    for (const button of allButtons) {
      const label = button.getAttribute('aria-label');
      if (label && label.toLowerCase().includes('theater')) {
        return button;
      }
    }

    // Method 3: Find button by icon or SVG path
    const theaterIconButtons = document.querySelectorAll('button[title*="Theater"], button[aria-label*="theater"]');
    if (theaterIconButtons.length > 0) {
      return theaterIconButtons[0];
    }

    // Method 4: Check for player container
    const player = document.querySelector('#movie_player');
    if (player) {
      // YouTube stores theater mode in player state
      const isTheater = player.classList.contains('ytp-autohide') ||
                      player.classList.contains('theater');

      // Try clicking the size button
      const sizeButton = player.querySelector('.ytp-size-button');
      if (sizeButton) {
        return sizeButton;
      }
    }

    return null;
  }

  /**
   * Disable theater mode
   */
  function disableTheaterMode() {
    const theaterButton = findTheaterButton();
    if (theaterButton) {
      const isTheaterMode = theaterButton.getAttribute('aria-pressed') === 'true';

      if (isTheaterMode) {
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
        // Check if theater mode is still enabled
        const theaterButton = findTheaterButton();
        if (theaterButton) {
          const isTheaterMode = theaterButton.getAttribute('aria-pressed') === 'true';

          if (!isTheaterMode) {
            console.log('[YFP] Re-enabling theater mode');
            setTimeout(enableTheaterMode, 500);
          }
        }
      }
    }, 500));

    theaterObserver.observe(document.body, {
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
