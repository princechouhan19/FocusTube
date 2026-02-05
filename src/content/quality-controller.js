/**
 * Quality Controller Module
 * Forces video quality to highest available
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let qualityObserver = null;

  // Quality preferences (in order of preference)
  const QUALITY_PREFERENCES = [
    'auto',
    'highres',     // > 1080p
    'hd2160',      // 2160p (4K)
    'hd1440',      // 1440p (2K)
    'hd1080',      // 1080p
    'hd720',       // 720p
    'large',       // 480p
    'medium',      // 360p
    'small',       // 240p
    'tiny'         // 144p
  ];

  /**
   * Initialize the quality controller
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }
    
    if (settings.forceHighestQuality) {
      waitForVideoAndSetQuality();
      setupQualityObserver();
      setupVideoChangeListener();
    }
  }

  /**
   * Wait for video player to be ready then set quality
   */
  function waitForVideoAndSetQuality() {
    // Try to set quality immediately
    setHighestQuality();
    
    // Also try after video starts playing
    setTimeout(setHighestQuality, 1000);
    setTimeout(setHighestQuality, 3000);
  }

  /**
   * Set video quality to highest available
   */
  function setHighestQuality() {
    try {
      const player = document.querySelector('#movie_player');
      if (!player) return;

      // Check if player is ready
      if (!player.getAvailableQualityLevels) {
        console.log('[YFP] Player not ready yet');
        return;
      }

      const availableQualities = player.getAvailableQualityLevels();
      console.log('[YFP] Available qualities:', availableQualities);

      if (!availableQualities || availableQualities.length === 0) {
        return;
      }

      // Find the highest quality from our preferences
      let selectedQuality = null;
      for (const preference of QUALITY_PREFERENCES) {
        if (availableQualities.includes(preference)) {
          selectedQuality = preference;
          break;
        }
      }

      if (!selectedQuality) {
        // If none of our preferences match, use the first available
        selectedQuality = availableQualities[0];
      }

      console.log('[YFP] Setting quality to:', selectedQuality);

      // Set the quality
      if (player.setPlaybackQuality) {
        player.setPlaybackQuality(selectedQuality);
      }

      // Also set preferred quality for future videos
      if (player.setPlaybackQualityRange) {
        player.setPlaybackQualityRange(selectedQuality, selectedQuality);
      }

      // Try to click the quality menu and select highest quality (UI method)
      clickHighestQualityMenu();

    } catch (error) {
      console.warn('[YFP] Error setting quality:', error);
    }
  }

  /**
   * Click the quality menu and select highest quality (UI fallback)
   */
  function clickHighestQualityMenu() {
    try {
      // Find settings button in player
      const settingsButton = document.querySelector('.ytp-settings-button');
      if (!settingsButton || !settingsButton.offsetParent) {
        return;
      }

      // Open settings menu
      settingsButton.click();
      setTimeout(() => {
        // Find quality menu item
        const qualityMenu = Array.from(document.querySelectorAll('.ytp-menuitem')).find(item => 
          item.textContent && item.textContent.includes('Quality') ||
          item.querySelector('.ytp-menuitem-icon')?.title === 'Quality'
        );

        if (qualityMenu) {
          qualityMenu.click();
          
          setTimeout(() => {
            // Find all quality options
            const qualityOptions = document.querySelectorAll('.ytp-quality-menuitem');
            let highestQualityOption = null;
            let highestQualityIndex = -1;

            qualityOptions.forEach((option, index) => {
              const qualityText = option.textContent;
              const qualityIndex = QUALITY_PREFERENCES.findIndex(q => 
                qualityText.includes(q) || 
                qualityText.includes(q.replace('hd', '')) ||
                qualityText.includes(q.replace('highres', '4K'))
              );
              
              if (qualityIndex > highestQualityIndex) {
                highestQualityIndex = qualityIndex;
                highestQualityOption = option;
              }
            });

            if (highestQualityOption) {
              highestQualityOption.click();
              console.log('[YFP] Selected quality via UI');
            }

            // Close menu
            if (settingsButton) {
              settingsButton.click();
            }
          }, 300);
        }
      }, 300);
    } catch (error) {
      console.warn('[YFP] Error clicking quality menu:', error);
    }
  }

  /**
   * Setup observer to maintain quality setting
   */
  function setupQualityObserver() {
    if (qualityObserver) {
      qualityObserver.disconnect();
    }

    qualityObserver = new MutationObserver(debounce(() => {
      if (settings.forceHighestQuality) {
        // Check if video changed and reapply quality
        setHighestQuality();
      }
    }, 1000));

    // Observe player area
    const playerArea = document.querySelector('#movie_player') || document.body;
    if (playerArea) {
      qualityObserver.observe(playerArea, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  /**
   * Setup video change listener
   */
  function setupVideoChangeListener() {
    let lastVideoId = getVideoId();
    
    const checkVideoChange = debounce(() => {
      const currentVideoId = getVideoId();
      if (currentVideoId && currentVideoId !== lastVideoId) {
        lastVideoId = currentVideoId;
        console.log('[YFP] New video detected, setting quality');
        
        if (settings.forceHighestQuality) {
          setTimeout(setHighestQuality, 1000);
          setTimeout(setHighestQuality, 3000);
        }
      }
    }, 200);

    // Listen for URL changes
    new MutationObserver(checkVideoChange).observe(document, {
      subtree: true,
      childList: true
    });

    // Also check periodically
    setInterval(checkVideoChange, 3000);
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
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const oldForceQuality = settings.forceHighestQuality;
    settings = { ...settings, ...newSettings };
    
    if (settings.forceHighestQuality && !oldForceQuality) {
      waitForVideoAndSetQuality();
      setupQualityObserver();
      setupVideoChangeListener();
    } else if (!settings.forceHighestQuality && oldForceQuality) {
      if (qualityObserver) {
        qualityObserver.disconnect();
        qualityObserver = null;
      }
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      Object.keys(changes).forEach(key => {
        if (key === 'forceHighestQuality' && changes[key].newValue !== undefined) {
          updateSettings({ forceHighestQuality: changes[key].newValue });
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
  window.YFPQualityController = {
    init,
    setHighestQuality,
    updateSettings
  };

})();
