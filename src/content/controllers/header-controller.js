/**
 * Header Controller Module
 * Controls visibility of header elements (notifications, create button, voice search)
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let headerObserver = null;

  // DOM selectors for header elements
  const HEADER_SELECTORS = {
    // Main header
    masthead: 'ytd-masthead',
    
    // Notifications
    notifications: 'ytd-notification-topbar-button-renderer',
    notificationsButton: '#notification-button, [aria-label*="notification"]',
    
    // Create button
    createButton: 'ytd-topbar-create-button-renderer',
    createButtonAlt: '[aria-label*="Create"], [aria-label*="create"]',
    
    // Voice search
    voiceSearch: '#voice-search-button, [aria-label*="Voice search"]',
    
    // App menu (three dots in mini player)
    appMenu: 'ytd-app-guide-renderer',
    
    // Search bar
    searchContainer: '#search-container',
    searchInput: '#search-input'
  };

  /**
   * Initialize the header controller
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }
    
    if (settings.hideNotifications || 
        settings.hideCreateButton || 
        settings.hideVoiceSearch) {
      hideHeaderElements();
      setupHeaderObserver();
    }
  }

  /**
   * Hide selected header elements
   */
  function hideHeaderElements() {
    // Hide notifications
    if (settings.hideNotifications) {
      const notificationButtons = document.querySelectorAll(
        HEADER_SELECTORS.notifications + ', ' + HEADER_SELECTORS.notificationsButton
      );
      
      notificationButtons.forEach(button => {
        if (button && isElementVisible(button)) {
          console.log('[YFP] Hiding notifications button');
          hideElement(button, 'display');
        }
      });
    }

    // Hide create button
    if (settings.hideCreateButton) {
      const createButtons = document.querySelectorAll(
        HEADER_SELECTORS.createButton + ', ' + HEADER_SELECTORS.createButtonAlt
      );
      
      createButtons.forEach(button => {
        const container = button.closest('ytd-topbar-create-button-renderer') ||
                         button.closest('#top-bar-buttons')?.children?.[1] ||
                         button;
        
        if (container && isElementVisible(container)) {
          console.log('[YFP] Hiding create button');
          hideElement(container, 'display');
        }
      });
    }

    // Hide voice search
    if (settings.hideVoiceSearch) {
      const voiceButtons = document.querySelectorAll(HEADER_SELECTORS.voiceSearch);
      
      voiceButtons.forEach(button => {
        if (button && isElementVisible(button)) {
          console.log('[YFP] Hiding voice search button');
          hideElement(button, 'display');
        }
      });
    }
  }

  /**
   * Setup observer for header changes
   */
  function setupHeaderObserver() {
    if (headerObserver) {
      headerObserver.disconnect();
    }

    headerObserver = new MutationObserver(debounce(() => {
      hideHeaderElements();
    }, 200));

    // Observe the masthead (header) area
    const masthead = document.querySelector(HEADER_SELECTORS.masthead) || document.querySelector('header') || document.body;
    
    headerObserver.observe(masthead, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const shouldHide = newSettings.hideNotifications || 
                      newSettings.hideCreateButton || 
                      newSettings.hideVoiceSearch;
    
    const wasHiding = settings.hideNotifications || 
                     settings.hideCreateButton || 
                     settings.hideVoiceSearch;

    settings = { ...settings, ...newSettings };
    
    if (shouldHide) {
      hideHeaderElements();
      if (!wasHiding) {
        setupHeaderObserver();
      }
    } else {
      // Optionally restore elements
      if (headerObserver) {
        headerObserver.disconnect();
        headerObserver = null;
      }
      showAllHeaderElements();
    }
  }

  /**
   * Show all header elements (for restoration)
   */
  function showAllHeaderElements() {
    const elements = document.querySelectorAll(
      HEADER_SELECTORS.notifications + ', ' +
      HEADER_SELECTORS.notificationsButton + ', ' +
      HEADER_SELECTORS.createButton + ', ' +
      HEADER_SELECTORS.createButtonAlt + ', ' +
      HEADER_SELECTORS.voiceSearch
    );
    
    elements.forEach(element => {
      showElement(element, 'display');
    });
  }

  /**
   * Toggle header element visibility dynamically
   */
  function toggleElement(elementName, hide) {
    switch (elementName) {
      case 'notifications':
        settings.hideNotifications = hide;
        break;
      case 'create':
        settings.hideCreateButton = hide;
        break;
      case 'voice':
        settings.hideVoiceSearch = hide;
        break;
    }
    
    hideHeaderElements();
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      const relevantKeys = ['hideNotifications', 'hideCreateButton', 'hideVoiceSearch'];
      
      relevantKeys.forEach(key => {
        if (changes[key] && changes[key].newValue !== undefined) {
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
  window.YFPHeaderController = {
    init,
    hideHeaderElements,
    showAllHeaderElements,
    toggleElement,
    updateSettings
  };

})();
