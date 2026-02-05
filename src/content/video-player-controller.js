/**
 * Video Player Controller Module
 * Handles HTML5 player toggle and other player-related features
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let playerObserver = null;
  let isNativePlayerActive = false;

  /**
   * Initialize* player controller
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }
    
    if (settings.useNativePlayer) {
      enableNativePlayer();
      setupPlayerObserver();
    }
  }

  /**
   * Enable native HTML5 player
   * Attempts to disable YouTube's custom UI overlays
   */
  function enableNativePlayer() {
    try {
      console.log('[YFP] Enabling native HTML5 player');

      // Get the video element
      const video = document.querySelector('video');
      if (!video) {
        console.log('[YFP] Video element not found yet');
        setTimeout(enableNativePlayer, 500);
        return;
      }

      // Hide YouTube's custom controls
      const customControls = document.querySelectorAll(
        '.ytp-chrome-bottom, ' +
        '.ytp-chrome-controls, ' +
        '.html5-video-player .ytp-gradient-bottom, ' +
        '.html5-video-player .ytp-gradient-top'
      );

      customControls.forEach(control => {
        hideElement(control, 'display');
      });

      // Enable native video controls
      video.controls = true;

      // Hide YouTube's annotations and overlays
      const overlays = document.querySelectorAll(
        '.ytp-annotation, ' +
        '.ytp-cards-teaser, ' +
        '.ytp-paid-content-overlay'
      );

      overlays.forEach(overlay => {
        hideElement(overlay, 'display');
      });

      isNativePlayerActive = true;

    } catch (error) {
      console.warn('[YFP] Error enabling native player:', error);
      console.warn('[YFP] This feature may not work if YouTube blocks custom player modifications');
    }
  }

  /**
   * Disable native player (restore YouTube's UI)
   */
  function disableNativePlayer() {
    try {
      console.log('[YFP] Restoring YouTube player UI');

      const video = document.querySelector('video');
      if (video) {
        video.controls = false;
      }

      // Show YouTube's custom controls again
      const customControls = document.querySelectorAll(
        '.ytp-chrome-bottom, ' +
        '.ytp-chrome-controls, ' +
        '.html5-video-player .ytp-gradient-bottom, ' +
        '.html5-video-player .ytp-gradient-top'
      );

      customControls.forEach(control => {
        showElement(control, 'display');
      });

      isNativePlayerActive = false;

    } catch (error) {
      console.warn('[YFP] Error disabling native player:', error);
    }
  }

  /**
   * Setup observer to maintain native player state
   */
  function setupPlayerObserver() {
    if (playerObserver) {
      playerObserver.disconnect();
    }

    playerObserver = new MutationObserver(debounce(() => {
      if (settings.useNativePlayer) {
        // Re-apply native player settings
        const video = document.querySelector('video');
        if (video && !video.controls) {
          enableNativePlayer();
        }
      }
    }, 300));

    // Observe the player area
    const playerArea = document.querySelector('#movie_player') || document.body;
    if (playerArea) {
      playerObserver.observe(playerArea, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['controls']
      });
    }
  }

  /**
   * Toggle native player mode
   */
  function toggleNativePlayer(enable) {
    if (enable) {
      enableNativePlayer();
      setupPlayerObserver();
    } else {
      disableNativePlayer();
      if (playerObserver) {
        playerObserver.disconnect();
        playerObserver = null;
      }
    }
  }

  /**
   * Check if native player is active
   */
  function isNativeMode() {
    return isNativePlayerActive;
  }

  /**
   * Show warning about potential issues
   */
  function showNativePlayerWarning() {
    // Only show warning once per session
    if (sessionStorage.getItem('yfp-native-player-warning')) {
      return;
    }

    console.warn('[YFP] Native HTML5 Player Mode:');
    console.warn('- This mode uses browser\'s native video controls instead of YouTube\'s custom UI');
    console.warn('- Some YouTube features may not work (annotations, cards, etc.)');
    console.warn('- YouTube may update and block this feature in the future');

    sessionStorage.setItem('yfp-native-player-warning', 'true');
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const oldUseNative = settings.useNativePlayer;
    settings = { ...settings, ...newSettings };
    
    if (settings.useNativePlayer !== oldUseNative) {
      toggleNativePlayer(settings.useNativePlayer);
      
      if (settings.useNativePlayer) {
        showNativePlayerWarning();
      }
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      Object.keys(changes).forEach(key => {
        if (key === 'useNativePlayer' && changes[key].newValue !== undefined) {
          updateSettings({ useNativePlayer: changes[key].newValue });
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
  window.YFPVideoPlayerController = {
    init,
    enableNativePlayer,
    disableNativePlayer,
    toggleNativePlayer,
    isNativeMode,
    updateSettings
  };

})();
