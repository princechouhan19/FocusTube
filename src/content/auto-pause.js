/**
 * Auto-Pause Module
 * Pauses video when tab is not active (like GoodTube)
 * Saves bandwidth and reduces distractions
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let isPaused = false;
  let visibilityObserver = null;

  /**
   * Initialize auto-pause
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    if (settings.autoPauseInactive) {
      setupVisibilityListener();
    }
  }

  /**
   * Setup visibility change listener
   */
  function setupVisibilityListener() {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleTabBlur);
    window.addEventListener('focus', handleTabFocus);

    console.log('[YFP] Auto-pause enabled');
  }

  /**
   * Handle visibility change (API standard)
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      pauseVideo();
    } else {
      resumeVideo();
    }
  }

  /**
   * Handle tab blur (window focus lost)
   */
  function handleTabBlur() {
    pauseVideo();
  }

  /**
   * Handle tab focus (window focused)
   */
  function handleTabFocus() {
    resumeVideo();
  }

  /**
   * Pause the video
   */
  function pauseVideo() {
    if (!settings.autoPauseInactive) return;

    const video = document.querySelector('video');
    if (!video) return;

    // Only pause if video is currently playing
    if (!video.paused && !isPaused) {
      console.log('[YFP] Auto-pausing video (tab inactive)');

      // Get current playback position
      const currentTime = video.currentTime;

      // Pause the video
      video.pause();

      // Save position for resume
      video.dataset.savedTime = currentTime.toString();
      isPaused = true;

      // Show auto-pause indicator
      showPauseIndicator();
    }
  }

  /**
   * Resume the video
   */
  function resumeVideo() {
    if (!settings.autoPauseInactive) return;

    const video = document.querySelector('video');
    if (!video) return;

    // Only resume if video was auto-paused
    if (isPaused) {
      console.log('[YFP] Auto-resuming video (tab active)');

      // Restore playback position if available
      if (video.dataset.savedTime) {
        const savedTime = parseFloat(video.dataset.savedTime);
        video.currentTime = savedTime;
      }

      // Resume playback
      video.play().catch(error => {
        console.log('[YFP] Could not auto-resume:', error);
        // This is normal if video requires user interaction first
      });

      isPaused = false;
      hidePauseIndicator();
    }
  }

  /**
   * Show pause indicator overlay
   */
  function showPauseIndicator() {
    // Remove existing indicator
    const existing = document.querySelector('.yfp-pause-indicator');
    if (existing) existing.remove();

    // Create indicator
    const indicator = createElement('div', {
      className: 'yfp-pause-indicator',
      style: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '2147483646',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: 'yfpFadeIn 0.3s ease'
      },
      innerHTML: `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        <span>Auto-Paused</span>
      `
    });

    // Add to page
    document.body.appendChild(indicator);

    // Auto-hide after 2 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 2000);
  }

  /**
   * Hide pause indicator
   */
  function hidePauseIndicator() {
    const indicator = document.querySelector('.yfp-pause-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Clean up listeners
   */
  function cleanup() {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleTabBlur);
    window.removeEventListener('focus', handleTabFocus);

    if (visibilityObserver) {
      visibilityObserver.disconnect();
      visibilityObserver = null;
    }
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const oldAutoPause = settings.autoPauseInactive;
    settings = { ...settings, ...newSettings };

    if (settings.autoPauseInactive && !oldAutoPause) {
      setupVisibilityListener();
    } else if (!settings.autoPauseInactive && oldAutoPause) {
      cleanup();
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      if (changes.autoPauseInactive && changes.autoPauseInactive.newValue !== undefined) {
        updateSettings({ autoPauseInactive: changes.autoPauseInactive.newValue });
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
  window.YFPAutoPause = {
    init,
    pauseVideo,
    resumeVideo,
    cleanup,
    updateSettings
  };

  // Add animation keyframes safely
  if (document.head) {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes yfpFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

})();
