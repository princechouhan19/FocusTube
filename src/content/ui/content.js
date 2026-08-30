/**
 * Main Content Script
 * Coordinates all feature modules and initializes them
 */

(function() {
  'use strict';

  console.log('[YFP] FocusTube - Content Script Loaded');

  function getYouTubeProfileFromPage() {
    const ytcfgData =
      (window.ytcfg && typeof window.ytcfg.get === 'function' && {
        name: window.ytcfg.get('ACCOUNT_NAME'),
        email: window.ytcfg.get('SESSION_INDEX_EMAIL'),
        avatar: window.ytcfg.get('LOGGED_IN_AVATAR_URL')
      }) || {};

    let profileName = ytcfgData.name || '';
    let profileEmail = ytcfgData.email || '';
    let profileImage = ytcfgData.avatar || '';

    const avatarImg =
      document.querySelector('button#avatar-btn img') ||
      document.querySelector('img#img[draggable="false"].style-scope.yt-img-shadow') ||
      document.querySelector('img#img.yt-img-shadow') ||
      document.querySelector('ytd-topbar-menu-button-renderer img');
    if (!profileImage && avatarImg?.src) {
      profileImage = avatarImg.src;
    }

    if (!profileName && avatarImg?.alt) {
      profileName = avatarImg.alt.replace(/avatar image for/i, '').trim();
    }

    const accountButton =
      document.querySelector('button[aria-label*="Google Account"]') ||
      document.querySelector('button[aria-label*="Account"]');
    if (!profileName && accountButton?.getAttribute('aria-label')) {
      profileName = accountButton
        .getAttribute('aria-label')
        .replace(/google account:/i, '')
        .replace(/account/i, '')
        .trim();
    }

    if (!profileEmail) {
      const html = document.documentElement.innerHTML;
      const emailMatch = html.match(/"SESSION_INDEX_EMAIL":"([^"]+)"/);
      if (emailMatch?.[1]) {
        profileEmail = emailMatch[1];
      }
    }

    const accountNameNode =
      document.querySelector(
        'yt-formatted-string#account-name.style-scope.ytd-active-account-header-renderer',
      ) ||
      document.querySelector('#channel-container yt-formatted-string#account-name');
    if (!profileName && accountNameNode?.textContent) {
      profileName = accountNameNode.textContent.trim();
    }

    const activeHeaderAvatar = document.querySelector(
      '#channel-container img#img.style-scope.yt-img-shadow',
    );
    if (!profileImage && activeHeaderAvatar?.src) {
      profileImage = activeHeaderAvatar.src;
    }

    if (!profileName && !profileImage && !profileEmail) {
      return null;
    }

    return {
      profileName: profileName || 'Guest User',
      profileImage: profileImage || '',
      profileEmail: profileEmail || ''
    };
  }

  /**
   * Initialize all feature modules
   */
  async function initializeAll() {
    console.log('[YFP] Initializing all feature modules...');

    // Start blocker as early as possible so YouTube cannot flash through.
    if (window.YFPTimeBlocker?.init) {
      try {
        await window.YFPTimeBlocker.init();
      } catch (error) {
        console.error('[YFP] Error initializing TimeBlocker:', error);
      }
    }

    // Wait for DOM-heavy modules afterwards.
    await waitForDOM();

    // Initialize all controllers (they will check their own settings)
    const modules = [
      { name: 'AdBlocker', init: () => window.YFPAdBlocker?.init() },
      { name: 'ShortsBlocker', init: () => window.YFPShortsBlocker?.init() },
      { name: 'AutoplayController', init: () => window.YFPAutoplayController?.init() },
      { name: 'QualityController', init: () => window.YFPQualityController?.init() },
      { name: 'HomeController', init: () => window.YFPHomeController?.init() },
      { name: 'NavigationController', init: () => window.YFPNavigationController?.init() },
      { name: 'HeaderController', init: () => window.YFPHeaderController?.init() },
      { name: 'SummaryButton', init: () => window.YFPSummaryButton?.init() },
      { name: 'VideoPlayerController', init: () => window.YFPVideoPlayerController?.init() },
      { name: 'KeywordBlocker', init: () => window.YFPKeywordBlocker?.init() },
      { name: 'ChannelBlocker', init: () => window.YFPChannelBlocker?.init() },
      { name: 'URLBlocker', init: () => window.YFPURLBlocker?.init() },
      { name: 'AutoPause', init: () => window.YFPAutoPause?.init() },
      { name: 'TheaterMode', init: () => window.YFPTheaterMode?.init() },
      { name: 'MetricsHider', init: () => window.YFPMetricsHider?.init() },
      { name: 'GlassTheme', init: () => window.YFPGlassTheme?.init() },
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
    return;
  }

  /**
   * Handle messages from popup/background scripts.
   * Only return `true` (keep channel open) for genuinely async handlers.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[YFP] Message received:', message);

    switch (message.action) {
      case 'reloadSettings':
        initializeAll().then(() => {
          sendResponse({ success: true });
        }).catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
        return true; // async

      case 'hideShorts':
        {
          const flag = message.value === undefined ? true : !!message.value;
          window.YFPShortsBlocker?.updateSettings({ hideShorts: flag });
        }
        sendResponse({ success: true });
        return false;

      case 'hideAds':
        window.YFPAdBlocker?.hideBannerAds();
        sendResponse({ success: true });
        return false;

      case 'disableAutoplay':
        window.YFPAutoplayController?.disableAutoplay();
        sendResponse({ success: true });
        return false;

      case 'setQuality':
        window.YFPQualityController?.setHighestQuality();
        sendResponse({ success: true });
        return false;

      case 'showSummary': {
        // Trigger summary generation
        const summaryButton = document.querySelector('.yfp-summary-button');
        if (summaryButton) {
          summaryButton.click();
        }
        sendResponse({ success: true });
        return false;
      }

      case 'getYouTubeProfileFromPage':
        sendResponse({
          success: true,
          profile: getYouTubeProfileFromPage()
        });
        return false;

      case 'timeBlockUpdated':
        window.YFPTimeBlocker?.updateSettings(message.settings || {});
        sendResponse({ success: true });
        return false;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
        return false;
    }
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
   * Handle YouTube's SPA navigation via yt-navigate-finish event
   * (much cheaper than a subtree MutationObserver on the whole document).
   */
  let lastUrl = location.href;
  window.addEventListener('yt-navigate-finish', () => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[YFP] Page navigation detected:', currentUrl);
      setTimeout(initializeAll, 500);
    }
  }, { passive: true });

  // Fallback: poll URL every 2s in case yt-navigate-finish doesn't fire
  // (e.g. on /embed/ pages or non-standard navigation). Cheap and bounded.
  setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[YFP] URL change detected (polling fallback):', currentUrl);
      setTimeout(initializeAll, 500);
    }
  }, 2000);

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
