/**
 * Info Cards & Annotations Hider Module
 * Hides info cards, end screens, and overlays
 * Inspired by GoodTube's overlay control features
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let cardsObserver = null;

  /**
   * Initialize info cards hider
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    if (settings.hideInfoCards) {
      hideInfoCards();
      setupCardsObserver();
    }

    if (settings.hideEndScreens) {
      hideEndScreens();
    }
  }

  /**
   * Hide info cards and annotations
   */
  function hideInfoCards() {
    console.log('[YFP] Hiding info cards and annotations');

    // YouTube info cards (video suggestions that pop up)
    const infoCards = document.querySelectorAll('.ytp-ce-element');
    infoCards.forEach(card => {
      hideElement(card, 'display');
    });

    // Video cards
    const videoCards = document.querySelectorAll('.ytp-ce-video');
    videoCards.forEach(card => {
      hideElement(card, 'display');
    });

    // Channel cards
    const channelCards = document.querySelectorAll('.ytp-ce-channel');
    channelCards.forEach(card => {
      hideElement(card, 'display');
    });

    // Playlist cards
    const playlistCards = document.querySelectorAll('.ytp-ce-playlist');
    playlistCards.forEach(card => {
      hideElement(card, 'display');
    });

    // All card elements (fallback)
    const allCards = document.querySelectorAll('.ytp-ce');
    allCards.forEach(card => {
      hideElement(card, 'display');
    });

    // YouTube annotations
    const annotations = document.querySelectorAll('.ytp-annotation');
    annotations.forEach(annotation => {
      hideElement(annotation, 'display');
    });

    // Annotation container
    const annotationContainer = document.querySelector('#annotation-shape-container');
    if (annotationContainer) {
      hideElement(annotationContainer, 'display');
    });

    // Engagement panels (info, description)
    const engagementPanels = document.querySelectorAll(
      'ytd-engagement-panel-section-list-renderer, ' +
      'ytd-expander ytd-metadata-row-renderer, ' +
      '#expander yt-attributed-string'
    );

    engagementPanels.forEach(panel => {
      // Only hide if it's not the main description
      const parent = panel.closest('ytd-expander');
      if (!parent || !parent.closest('#description-inner')) {
        hideElement(panel, 'display');
      }
    });

    // "Shop the products in this video" section
    const productShelf = document.querySelectorAll(
      'ytd-shelf-renderer:has([aria-label*="Products"]), ' +
      'ytd-shelf-renderer:has([aria-label*="merch"]), ' +
      'ytd-merch-shelf-renderer'
    );

    productShelf.forEach(shelf => {
      hideElement(shelf, 'display');
    });

    // Channel membership shelf
    const membershipShelf = document.querySelectorAll(
      'ytd-membership-offer-renderer'
    );

    membershipShelf.forEach(shelf => {
      hideElement(shelf, 'display');
    });

    // "People also watched" cards
    const peopleAlsoWatched = document.querySelectorAll(
      'ytd-item-section-renderer:has(#title:contains("also watched")), ' +
      'ytd-shelf-renderer:has(#title:contains("also watched"))'
    );

    peopleAlsoWatched.forEach(section => {
      hideElement(section, 'display');
    });
  }

  /**
   * Hide end screens
   */
  function hideEndScreens() {
    console.log('[YFP] Hiding end screens');

    // End screen overlay
    const endScreenOverlay = document.querySelectorAll('.ytp-ce4-shown');
    endScreenOverlay.forEach(element => {
      hideElement(element, 'display');
    });

    // HTML5 end screen
    const html5EndScreen = document.querySelectorAll('.html5-endscreen');
    html5EndScreen.forEach(element => {
      hideElement(element, 'display');
    });

    // End screen content
    const endScreenContent = document.querySelectorAll('.ytp-endscreen-content');
    endScreenContent.forEach(content => {
      hideElement(content, 'display');
    });

    // Next video overlay at end
    const nextVideoOverlay = document.querySelectorAll(
      '.ytp-autonav-endscreen-upnext-overlay, ' +
      '.ytp-next-up-next, ' +
      '.html5-next-up-overlay'
    );

    nextVideoOverlay.forEach(overlay => {
      hideElement(overlay, 'display');
    });
  }

  /**
   * Show info cards
   */
  function showInfoCards() {
    console.log('[YFP] Showing info cards');

    const hiddenElements = document.querySelectorAll(
      '.ytp-ce-element[style*="display"], ' +
      '.ytp-annotation[style*="display"], ' +
      '.ytp-ce[style*="display"], ' +
      '#annotation-shape-container[style*="display"]'
    );

    hiddenElements.forEach(element => {
      showElement(element, 'display');
    });
  }

  /**
   * Show end screens
   */
  function showEndScreens() {
    console.log('[YFP] Showing end screens');

    const hiddenElements = document.querySelectorAll(
      '.ytp-ce4-shown[style*="display"], ' +
      '.html5-endscreen[style*="display"], ' +
      '.ytp-endscreen-content[style*="display"]'
    );

    hiddenElements.forEach(element => {
      showElement(element, 'display');
    });
  }

  /**
   * Setup observer for dynamically loaded cards
   */
  function setupCardsObserver() {
    if (cardsObserver) {
      cardsObserver.disconnect();
    }

    cardsObserver = new MutationObserver(debounce(() => {
      if (settings.hideInfoCards) {
        hideInfoCards();
      }
      if (settings.hideEndScreens) {
        hideEndScreens();
      }
    }, 150));

    cardsObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Disable info cards (for testing/settings toggle)
   */
  function toggleInfoCards(hide) {
    if (hide) {
      hideInfoCards();
      if (!cardsObserver) {
        setupCardsObserver();
      }
    } else {
      showInfoCards();
      // Don't disconnect observer if end screens are still hidden
      if (!settings.hideEndScreens && cardsObserver) {
        cardsObserver.disconnect();
        cardsObserver = null;
      }
    }
  }

  /**
   * Disable end screens (for testing/settings toggle)
   */
  function toggleEndScreens(hide) {
    if (hide) {
      hideEndScreens();
      if (!cardsObserver) {
        setupCardsObserver();
      }
    } else {
      showEndScreens();
      // Don't disconnect observer if info cards are still hidden
      if (!settings.hideInfoCards && cardsObserver) {
        cardsObserver.disconnect();
        cardsObserver = null;
      }
    }
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    const oldHideInfoCards = settings.hideInfoCards;
    const oldHideEndScreens = settings.hideEndScreens;

    settings = { ...settings, ...newSettings };

    if (settings.hideInfoCards !== oldHideInfoCards) {
      toggleInfoCards(settings.hideInfoCards);
    }

    if (settings.hideEndScreens !== oldHideEndScreens) {
      toggleEndScreens(settings.hideEndScreens);
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      const newSettings = {};

      if (changes.hideInfoCards && changes.hideInfoCards.newValue !== undefined) {
        newSettings.hideInfoCards = changes.hideInfoCards.newValue;
      }

      if (changes.hideEndScreens && changes.hideEndScreens.newValue !== undefined) {
        newSettings.hideEndScreens = changes.hideEndScreens.newValue;
      }

      if (Object.keys(newSettings).length > 0) {
        updateSettings(newSettings);
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
  window.YFPCardsHider = {
    init,
    hideInfoCards,
    hideEndScreens,
    showInfoCards,
    showEndScreens,
    toggleInfoCards,
    toggleEndScreens,
    updateSettings
  };

})();
