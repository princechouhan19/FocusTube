/**
 * Time Blocker Module
 * Blocks YouTube based on temporary timers or daily schedules
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let checkInterval = null;
  let blockOverlay = null;

  /**
   * Initialize Time Blocker
   */
  async function init() {
    // Load settings
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    } else {
      // Fallback if storage helper not loaded yet
      settings = await new Promise(resolve => {
        chrome.storage.sync.get(null, resolve);
      });
    }

    // Start checking
    checkBlockingRules();
    
    // Set up regular check (every 1 second)
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(checkBlockingRules, 1000);
  }

  /**
   * Check all blocking rules
   */
  function checkBlockingRules() {
    // 1. Check Master Switch
    if (settings.extensionEnabled === false) {
      removeBlockOverlay();
      return;
    }

    // 2. Check Temporary Block
    const now = Date.now();
    if (settings.tempBlockUntil && now < settings.tempBlockUntil) {
      const remainingMs = settings.tempBlockUntil - now;
      const mm = Math.floor(remainingMs / 60000).toString().padStart(2, '0');
      const ss = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
      showBlockOverlay('Focus Timer Active', settings.tempBlockUntil);
      return;
    } else if (settings.tempBlockUntil && Date.now() >= settings.tempBlockUntil) {
      // Clean up expired timer
      // We don't saveSettings here to avoid race conditions/perf, just ignore it locally
    }

    // 3. Check Scheduled Block
    if (settings.scheduleBlockEnabled && settings.scheduleBlockStart && settings.scheduleBlockEnd) {
      if (isCurrentTimeInRange(settings.scheduleBlockStart, settings.scheduleBlockEnd)) {
        const nowDate = new Date();
        const [endH, endM] = settings.scheduleBlockEnd.split(':').map(Number);
        const endDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), endH, endM, 0, 0);
        if (endDate < nowDate) endDate.setDate(endDate.getDate() + 1);
        const remainingMs = endDate.getTime() - nowDate.getTime();
        const mm = Math.floor(remainingMs / 60000).toString().padStart(2, '0');
        const ss = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
        showBlockOverlay('Scheduled Block', endDate.getTime());
        return;
      }
    }

    // No blocking rules active
    removeBlockOverlay();
  }

  /**
   * Helper: Check if current time is in range HH:MM - HH:MM
   */
  function isCurrentTimeInRange(startStr, endStr) {
    if (!startStr || !endStr) return false;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startStr.split(':').map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = endStr.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Same day (e.g., 09:00 - 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Crosses midnight (e.g., 22:00 - 06:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  /**
   * Show Blocking Overlay
   */
  function showBlockOverlay(message, endTs) {
    if (document.getElementById('yfp-time-block-overlay')) {
      // Update message if exists
      const msgEl = document.getElementById('yfp-block-message');
      if (msgEl) {
        const now = Date.now();
        const remainingMs = Math.max(0, (endTs || now) - now);
        const mm = Math.floor(remainingMs / 60000).toString().padStart(2, '0');
        const ss = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
        msgEl.textContent = `${message}: ${mm}:${ss} remaining`;
      }
      const overlay = document.getElementById('yfp-time-block-overlay');
      if (overlay) {
        overlay.dataset.endTs = endTs ? String(endTs) : '';
        overlay.dataset.prefix = message || '';
      }
      return;
    }

    // Create overlay
    blockOverlay = document.createElement('div');
    blockOverlay.id = 'yfp-time-block-overlay';
    Object.assign(blockOverlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0f0f0f',
      zIndex: '2147483647', // Max z-index
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Segoe UI, sans-serif',
      pointerEvents: 'all' // Ensure it captures all clicks
    });

    // Content
    const bannerURL = chrome.runtime.getURL('src/icons/banner.png');
    blockOverlay.innerHTML = `
      <div style="text-align: center;">
        <img class="yfp-banner" src="${bannerURL}" alt="FocusTube" style="height:100px; width:120px; object-fit:cover; margin-bottom:16px;" />
        <div style="font-size: 64px; margin-bottom: 24px;">🚫</div>
        <h1 style="font-size: 32px; margin-bottom: 16px; color: #ff7675;">YouTube is Blocked</h1>
        <p id="yfp-block-message" style="font-size: 18px; opacity: 0.8; margin-bottom: 32px;"></p>
        <div style="font-size: 14px; color: #666;">
          FocusTube Extension
        </div>
      </div>
    `;
    blockOverlay.dataset.endTs = endTs ? String(endTs) : '';
    blockOverlay.dataset.prefix = message || '';
    (function setInitialText() {
      const now = Date.now();
      const end = endTs || now;
      const remainingMs = Math.max(0, end - now);
      const mm = Math.floor(remainingMs / 60000).toString().padStart(2, '0');
      const ss = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
      const msgEl = blockOverlay.querySelector('#yfp-block-message');
      if (msgEl) msgEl.textContent = `${message}: ${mm}:${ss} remaining`;
    })();
    const bannerImg = blockOverlay.querySelector('.yfp-banner');
    if (bannerImg) {
      bannerImg.onerror = async () => {
        try {
          const resp = await fetch(bannerURL);
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          bannerImg.src = blobUrl;
        } catch {
          bannerImg.style.display = 'none';
        }
      };
    }

    // Prevent scrolling and hide main content
    document.body.style.overflow = 'hidden';
    
    // Add aggressive blocking style
    const blockStyle = document.createElement('style');
    blockStyle.id = 'yfp-block-style';
    blockStyle.textContent = `
      ytd-app, #page-manager, #masthead-container, #guide, #content, #player, .ytd-page-manager {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      body {
        overflow: hidden !important;
        background-color: #0f0f0f !important;
      }
      #yfp-time-block-overlay {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(blockStyle);
    
    // Add to DOM
    document.documentElement.appendChild(blockOverlay);
    
    // Stop any playing video
    const video = document.querySelector('video');
    if (video) {
      video.pause();
      video.src = ''; // Force stop buffering
    }

    // Anti-tamper check (ensure overlay stays on top)
    if (!blockOverlay.dataset.tamperInterval) {
      const tamperInterval = setInterval(() => {
        const overlay = document.getElementById('yfp-time-block-overlay');
        if (!overlay) {
          showBlockOverlay(message, endTs);
          return;
        }
        if (document.documentElement.lastElementChild !== overlay) {
          document.documentElement.appendChild(overlay);
        }
        if (document.body.style.overflow !== 'hidden') {
          document.body.style.overflow = 'hidden';
        }
        const end = overlay.dataset.endTs ? parseInt(overlay.dataset.endTs) : 0;
        const prefix = overlay.dataset.prefix || message || '';
        if (end > 0) {
          const now = Date.now();
          const remainingMs = Math.max(0, end - now);
          const mm = Math.floor(remainingMs / 60000).toString().padStart(2, '0');
          const ss = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
          const msgEl = document.getElementById('yfp-block-message');
          if (msgEl) msgEl.textContent = `${prefix}: ${mm}:${ss} remaining`;
        }
      }, 1000);
      blockOverlay.dataset.tamperInterval = tamperInterval;
    }
  }

  /**
   * Remove Blocking Overlay
   */
  function removeBlockOverlay() {
    const overlay = document.getElementById('yfp-time-block-overlay');
    const blockStyle = document.getElementById('yfp-block-style');
    
    if (blockStyle) {
      blockStyle.remove();
    }

    if (overlay) {
      if (overlay.dataset.tamperInterval) {
        clearInterval(parseInt(overlay.dataset.tamperInterval));
      }
      overlay.remove();
      document.body.style.overflow = '';
      blockOverlay = null;
    }
  }

  /**
   * Update settings when they change
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    checkBlockingRules();
  }

  // Listen for settings changes
  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      const keys = ['extensionEnabled', 'tempBlockUntil', 'scheduleBlockEnabled', 'scheduleBlockStart', 'scheduleBlockEnd'];
      let shouldUpdate = false;
      let newVals = {};

      keys.forEach(key => {
        if (changes[key] && changes[key].newValue !== undefined) {
          newVals[key] = changes[key].newValue;
          shouldUpdate = true;
        }
      });

      if (shouldUpdate) {
        updateSettings(newVals);
      }
    });
  }

  // Export module
  window.YFPTimeBlocker = {
    init,
    updateSettings,
    checkBlockingRules
  };

})();
