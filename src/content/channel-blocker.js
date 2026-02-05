/**
 * Channel Blocker Module
 * Blocks videos from specific channels
 * Inspired by YouTube Recommendation Blocker and No YouTube Recommendations
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let blockedChannels = [];
  let channelObserver = null;

  /**
   * Initialize channel blocker
   */
  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }

    // Load blocked channels
    blockedChannels = settings.blockedChannels || [];

    if (blockedChannels.length > 0) {
      blockChannelVideos();
      setupChannelObserver();
    }
  }

  /**
   * Block videos from channels in blocklist
   */
  function blockChannelVideos() {
    if (blockedChannels.length === 0) return;

    console.log('[YFP] Blocking videos from', blockedChannels.length, 'channels');

    // Block videos on home page
    const homeVideos = document.querySelectorAll('ytd-rich-item-renderer');
    homeVideos.forEach(video => {
      const channelName = getChannelName(video);
      if (channelName && blockedChannels.includes(channelName.toLowerCase())) {
        console.log('[YFP] Blocking video from channel:', channelName);
        hideElement(video, 'display');
      }
    });

    // Block videos in sidebar/recommendations
    const sidebarVideos = document.querySelectorAll('ytd-compact-video-renderer');
    sidebarVideos.forEach(video => {
      const channelName = getChannelName(video);
      if (channelName && blockedChannels.includes(channelName.toLowerCase())) {
        hideElement(video, 'display');
      }
    });

    // Block videos in search results
    const searchVideos = document.querySelectorAll('ytd-video-renderer');
    searchVideos.forEach(video => {
      const channelName = getChannelName(video);
      if (channelName && blockedChannels.includes(channelName.toLowerCase())) {
        hideElement(video, 'display');
      }
    });

    // Block videos in playlist/related
    const playlistVideos = document.querySelectorAll('ytd-playlist-panel-video-renderer');
    playlistVideos.forEach(video => {
      const channelName = getChannelName(video);
      if (channelName && blockedChannels.includes(channelName.toLowerCase())) {
        hideElement(video, 'display');
      }
    });
  }

  /**
   * Extract channel name from video element
   * Multiple selectors for different YouTube layouts
   */
  function getChannelName(videoElement) {
    if (!videoElement) return null;

    try {
      // Method 1: ytd-video-owner-block-renderer
      const ownerBlock = videoElement.querySelector('ytd-video-owner-block-renderer');
      if (ownerBlock) {
        const name = ownerBlock.querySelector('#channel-name yt-formatted-string')?.textContent ||
                    ownerBlock.querySelector('.ytd-channel-name')?.textContent ||
                    ownerBlock.querySelector('#text')?.textContent;
        if (name) return name.trim().toLowerCase();
      }

      // Method 2: ytd-channel-name element
      const channelNameEl = videoElement.querySelector('ytd-channel-name');
      if (channelNameEl) {
        const name = channelNameEl.querySelector('#text')?.textContent ||
                    channelNameEl.textContent;
        if (name) return name.trim().toLowerCase();
      }

      // Method 3: #channel-name (direct selector)
      const channelName = videoElement.querySelector('#channel-name');
      if (channelName) {
        const name = channelName.textContent;
        if (name) return name.trim().toLowerCase();
      }

      // Method 4: aria-label on channel link
      const channelLink = videoElement.querySelector('a[href^="/@"], a[href^="/channel/"], a[href^="/c/"]');
      if (channelLink) {
        const name = channelLink.getAttribute('aria-label') ||
                    channelLink.querySelector('#text')?.textContent;
        if (name) return name.trim().toLowerCase();
      }

      // Method 5: yt-formatted-string with channel info
      const formattedStrings = videoElement.querySelectorAll('yt-formatted-string');
      for (const str of formattedStrings) {
        const text = str.textContent;
        // Channel names are typically 3-30 characters
        if (text && text.length >= 3 && text.length <= 30) {
          // Check if it's not a video title (titles are usually longer)
          const parent = str.closest('ytd-video-meta-block');
          if (!parent) {
            return text.trim().toLowerCase();
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('[YFP] Error extracting channel name:', error);
      return null;
    }
  }

  /**
   * Setup observer for dynamically loaded videos
   */
  function setupChannelObserver() {
    if (channelObserver) {
      channelObserver.disconnect();
    }

    channelObserver = new MutationObserver(debounce(() => {
      blockChannelVideos();
    }, 200));

    channelObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Add a channel to blocklist
   */
  async function addChannel(channelName) {
    if (!channelName || channelName.trim() === '') return;

    const normalized = channelName.trim().toLowerCase();

    if (!blockedChannels.includes(normalized)) {
      blockedChannels.push(normalized);

      // Save to storage
      if (typeof saveSetting === 'function') {
        await saveSetting('blockedChannels', blockedChannels);
      }

      // Immediately block videos
      blockChannelVideos();
    }

    return normalized;
  }

  /**
   * Remove a channel from blocklist
   */
  async function removeChannel(channelName) {
    const normalized = channelName.trim().toLowerCase();
    blockedChannels = blockedChannels.filter(ch => ch !== normalized);

    // Save to storage
    if (typeof saveSetting === 'function') {
      await saveSetting('blockedChannels', blockedChannels);
    }

    // Refresh page to show unblocked videos
    location.reload();
  }

  /**
   * Get current channel on watch page
   */
  function getCurrentChannelName() {
    try {
      const ownerElement = document.querySelector('ytd-video-owner-renderer');
      if (ownerElement) {
        const name = ownerElement.querySelector('#channel-name yt-formatted-string')?.textContent ||
                    ownerElement.querySelector('#text')?.textContent;
        return name ? name.trim().toLowerCase() : null;
      }
      return null;
    } catch (error) {
      console.warn('[YFP] Error getting current channel:', error);
      return null;
    }
  }

  /**
   * Inject "Block Channel" button on watch page
   */
  function injectBlockChannelButton() {
    const ownerElement = document.querySelector('ytd-video-owner-renderer');
    if (!ownerElement) return;

    // Check if button already exists
    if (ownerElement.querySelector('.yfp-block-channel-btn')) {
      return;
    }

    const currentChannel = getCurrentChannelName();
    if (!currentChannel) return;

    // Find action buttons container
    const actionsContainer = ownerElement.querySelector('#top-level-buttons-computed');
    if (!actionsContainer) return;

    // Create block channel button
    const blockButton = createElement('button', {
      className: 'yfp-block-channel-btn',
      style: {
        background: '#ff4757',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        marginLeft: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      },
      innerHTML: `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
          <line x1="12" y1="2" x2="12" y2="12"></line>
        </svg>
        Block Channel
      `
    });

    blockButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const confirmed = confirm(`Block all videos from "${currentChannel}"?`);
      if (confirmed) {
        await addChannel(currentChannel);
        blockButton.textContent = '✓ Blocked';
        blockButton.style.background = '#2ed573';

        setTimeout(() => {
          location.reload();
        }, 1500);
      }
    });

    actionsContainer.appendChild(blockButton);
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    blockedChannels = settings.blockedChannels || [];

    if (blockedChannels.length > 0) {
      blockChannelVideos();
      if (!channelObserver) {
        setupChannelObserver();
      }
    }
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      if (changes.blockedChannels) {
        updateSettings({ blockedChannels: changes.blockedChannels.newValue });
      }
    });
  }

  // Inject block button on watch pages
  if (window.location.href.includes('/watch')) {
    const buttonObserver = new MutationObserver(debounce(() => {
      injectBlockChannelButton();
    }, 500));

    buttonObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.YFPChannelBlocker = {
    init,
    addChannel,
    removeChannel,
    getCurrentChannelName,
    blockChannelVideos
  };

})();
