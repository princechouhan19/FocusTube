/**
 * Main Content Script
 * Coordinates all feature modules and initializes them
 */

(function() {
  'use strict';

  console.log('[YFP] FocusTube - Content Script Loaded');

  /**
   * Initialize all feature modules
   */
  async function initializeAll() {
    console.log('[YFP] Initializing all feature modules...');

    // Wait for DOM to be ready
    await waitForDOM();

    // Initialize all controllers (they will check their own settings)
    const modules = [
      { name: 'TimeBlocker', init: () => window.YFPTimeBlocker?.init() },
      { name: 'AdBlocker', init: () => window.YFPAdBlocker?.init() },
      { name: 'ShortsBlocker', init: () => window.YFPShortsBlocker?.init() },
      { name: 'AutoplayController', init: () => window.YFPAutoplayController?.init() },
      { name: 'QualityController', init: () => window.YFPQualityController?.init() },
      { name: 'HomeController', init: () => window.YFPHomeController?.init() },
      { name: 'NavigationController', init: () => window.YFPNavigationController?.init() },
      { name: 'HeaderController', init: () => window.YFPHeaderController?.init() },
      { name: 'SummaryButton', init: () => window.YFPSummaryButton?.init() },
      { name: 'VideoPlayerController', init: () => window.YFPVideoPlayerController?.init() },
      { name: 'ChannelBlocker', init: () => window.YFPChannelBlocker?.init() },
      { name: 'URLBlocker', init: () => window.YFPURLBlocker?.init() },
      { name: 'AutoPause', init: () => window.YFPAutoPause?.init() },
      { name: 'TheaterMode', init: () => window.YFPTheaterMode?.init() },
      { name: 'MetricsHider', init: () => window.YFPMetricsHider?.init() },
      { name: 'CSSFilter', init: () => window.YFPCSSFilter?.init() },
      { name: 'CommentHider', init: () => window.YFPCommentHider?.init() },
      { name: 'CardsHider', init: () => window.YFPCardsHider?.init() }
    ];

    // Initialize each module
    for (const module of modules) {
      try {
        if (typeof module.init === 'function') {
          await module.init();
          console.log(`[YFP] ${module.name} initialized`);
        }
      } catch (error) {
        console.error(`[YFP] Error initializing ${module.name}:`, error);
      }
    }

    console.log('[YFP] All modules initialized successfully');

    // Show extension is active
    showExtensionActive();
  }

  /**
   * Wait for DOM to be ready
   */
  function waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
        return;
      }

      const checkReady = () => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * Show that extension is active (console log only)
   */
  function showExtensionActive() {
    console.log('%c🎯 FocusTube', 'color: #667eea; font-size: 20px; font-weight: bold;');
    console.log('%cDistraction-free YouTube is now active!', 'color: #764ba2; font-size: 14px;');
    console.log('%cClick extension icon to configure settings.', 'color: #666; font-size: 12px;');
  }

  /**
   * Handle messages from popup/background scripts
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[YFP] Message received:', message);

    switch (message.action) {
      case 'reloadSettings':
        // Reload and reapply settings
        initializeAll().then(() => {
          sendResponse({ success: true });
        });
        return true;

      case 'hideShorts':
        {
          const flag = message.value === undefined ? true : !!message.value;
          window.YFPShortsBlocker?.updateSettings({ hideShorts: flag });
        }
        sendResponse({ success: true });
        break;

      case 'hideAds':
        window.YFPAdBlocker?.hideBannerAds();
        sendResponse({ success: true });
        break;

      case 'disableAutoplay':
        window.YFPAutoplayController?.disableAutoplay();
        sendResponse({ success: true });
        break;

      case 'setQuality':
        window.YFPQualityController?.setHighestQuality();
        sendResponse({ success: true });
        break;

      case 'showSummary':
        // Trigger summary generation
        const summaryButton = document.querySelector('.yfp-summary-button');
        if (summaryButton) {
          summaryButton.click();
        }
        sendResponse({ success: true });
        break;

      default:
        console.log('[YFP] Unknown message action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }

    return true; // Keep message channel open for async response
  });

  /**
   * Listen for storage changes and update modules
   */
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      console.log('[YFP] Settings changed:', changes);

      // Reload settings and reapply
      if (typeof loadSettings === 'function') {
        loadSettings().then(settings => {
          // Each module will handle its own settings via onSettingsChanged
          // This is just for logging
          console.log('[YFP] Settings reloaded:', settings);
        });
      }
    });
  }

  /**
   * Handle YouTube's SPA navigation
   */
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[YFP] Page navigation detected:', currentUrl);

      // Reinitialize modules on page navigation
      setTimeout(initializeAll, 500);
    }
  });

  urlObserver.observe(document, {
    subtree: true,
    childList: true
  });

  /**
   * Periodic maintenance check
   */
  setInterval(() => {
    // Ensure features are still active
    if (window.YFPShortsBlocker) {
      window.YFPShortsBlocker.updateSettings({ hideShorts: true });
    }

    if (window.YFPAdBlocker && typeof loadSettings === 'function') {
      loadSettings().then(settings => {
        if (settings.hideBannerAds) {
          window.YFPAdBlocker.hideBannerAds();
        }
      });
    }
  }, 10000); // Check every 10 seconds

  /**
   * Global error handler
   */
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('YFP')) {
      console.error('[YFP] Error:', event.error);
    }
  });

  // Initialize everything when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAll);
  } else {
    initializeAll();
  }

  // Export main controller
  window.YFPContentScript = {
    initializeAll,
    waitForDOM
  };

})();
