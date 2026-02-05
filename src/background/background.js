/**
 * Background Service Worker
 * Handles extension lifecycle, tab updates, and messaging
 */

// Default settings (synced with other modules)
const DEFAULT_SETTINGS = {
  // Master Switch
  extensionEnabled: true,

  // Blocking Controls
  tempBlockUntil: 0,
  scheduleBlockEnabled: false,
  scheduleBlockStart: '09:00',
  scheduleBlockEnd: '17:00',

  // User Profile & API
  geminiApiKey: '',
  geminiModel: 'gemini-pro',
  profileName: 'Guest User',
  profileGoal: '',
  statsTimeSaved: 0,
  statsAdsBlocked: 0,

  // Video Page Features
  showSummaryButton: true,
  hideShorts: true,
  hideBannerAds: true,
  skipVideoAds: true,
  disableAutoplay: true,
  forceHighestQuality: true,
  useNativePlayer: false,

  // Home Page Features
  hideSuggestions: false,
  hideTrending: false,
  hidePeopleAlsoWatched: false,
  homePageRedirect: 'none',

  // Navigation Controls
  hideNavShorts: false,
  hideNavExplore: false,
  hideNavGaming: false,
  hideNavTrending: false,

  // Header Controls
  hideNotifications: false,
  hideCreateButton: false,
  hideVoiceSearch: false,
  hideShareButtons: false,

  // Productivity Features
  focusMode: false,
  scheduledBlocking: false,
  passwordProtection: false,
  blockedKeywords: [],
  blockedChannels: [],
  blockedPatterns: []

  // Enhanced UI Controls
  autoPauseInactive: false,
  autoTheaterMode: false,
  hideComments: false,
  hideInfoCards: false,
  hideEndScreens: false,
  hideLiveChat: false,
  hideNextVideo: false,
  hideMoreVideos: false,
  hideVideoMetrics: false,
  hideVideoDuration: false,
  hideMerch: false,
  customCSSRules: []
};

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[YFP Background] Extension installed/updated:', details.reason);

  // Set default settings if none exist
  const settings = await chrome.storage.sync.get(null);
  if (Object.keys(settings).length === 0) {
    console.log('[YFP Background] Setting default values');
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
  }

  // Show welcome message on first install
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'https://www.youtube.com',
      active: true
    }).then(() => {
      console.log('[YFP Background] Opened YouTube after installation');
    }).catch(error => {
      console.error('[YFP Background] Error opening YouTube:', error);
    });
  }
});

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when page is completely loaded
  if (changeInfo.status !== 'complete') {
    return;
  }

  // Only process YouTube tabs
  if (!tab.url || !tab.url.includes('youtube.com')) {
    return;
  }

  console.log('[YFP Background] YouTube tab updated:', tab.url);

  // Wait for content script to be ready
  setTimeout(() => {
    notifyContentScript(tabId);
  }, 1000);
});

/**
 * Handle tab activation
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    if (tab.url && tab.url.includes('youtube.com')) {
      console.log('[YFP Background] YouTube tab activated');
      notifyContentScript(activeInfo.tabId);
    }
  } catch (error) {
    console.error('[YFP Background] Error handling tab activation:', error);
  }
});

/**
 * Notify content script to reload settings
 */
function notifyContentScript(tabId) {
  chrome.tabs.sendMessage(tabId, {
    action: 'reloadSettings'
  }).catch(error => {
    // Content script might not be ready yet, that's okay
    console.log('[YFP Background] Could not send message to tab:', error.message);
  });
}

/**
 * Handle incoming messages
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[YFP Background] Message received:', message);

  switch (message.action) {
    case 'getTranscript': {
      (async () => {
        try {
          const videoId = message.videoId || '';
          const preferredLang = message.preferredLang || 'en';
          const useAuto = !!message.useAutoCaptions;
          if (!videoId) {
            sendResponse({ success: false, error: 'Missing videoId' });
            return;
          }
          const cacheKey = `transcripts:${videoId}`;
          const cached = await chrome.storage.local.get(cacheKey);
          const cachedVal = cached[cacheKey];
          if (cachedVal && cachedVal.text && Date.now() - (cachedVal.ts || 0) < 3600_000) {
            sendResponse({ success: true, text: cachedVal.text });
            return;
          }
          const langs = [preferredLang, 'en', 'en-US'];
          let textOut = '';
          for (const lang of langs) {
            const urls = [];
            urls.push(`https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}&fmt=json3`);
            urls.push(`https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}`);
            if (useAuto) {
              urls.push(`https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}&kind=asr`);
            }
            for (const u of urls) {
              try {
                const r = await fetch(u);
                if (!r.ok) continue;
                const ct = r.headers.get('content-type') || '';
                if (ct.includes('json')) {
                  const data = await r.json();
                  const events = Array.isArray(data.events) ? data.events : [];
                  const segText = events.map(ev => {
                    const segs = Array.isArray(ev.segs) ? ev.segs : [];
                    return segs.map(s => s.utf8 || '').join(' ');
                  }).join(' ');
                  textOut = segText.replace(/\s+/g, ' ').trim();
                } else {
                  const xml = await r.text();
                  const parts = Array.from(xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)).map(m => m[1]);
                  const decoded = parts.map(t => t.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')).join(' ');
                  textOut = decoded.replace(/\s+/g, ' ').trim();
                }
                if (textOut && textOut.length > 50) break;
              } catch {}
            }
            if (textOut && textOut.length > 50) break;
          }
          if (!textOut) {
            sendResponse({ success: false, error: 'Transcript not available' });
            return;
          }
          const limited = textOut.slice(0, 15000);
          await chrome.storage.local.set({ [cacheKey]: { text: limited, ts: Date.now() } });
          sendResponse({ success: true, text: limited });
        } catch (e) {
          sendResponse({ success: false, error: e.message || 'Transcript fetch failed' });
        }
      })();
      return true;
    }
    case 'aiSummarize': {
      (async () => {
        try {
          const stored = await chrome.storage.sync.get(null);
          const provider = message.provider || stored.aiProvider || 'gemini';
          const model = message.model || stored.aiModel || stored.geminiModel || 'gemini-pro';
          const prompt = message.prompt || '';
          let apiUrl = '';
          let headers = {};
          let body = {};

          if (provider === 'gemini') {
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${stored.geminiApiKey || ''}`;
            headers = { 'Content-Type': 'application/json' };
            body = { contents: [{ parts: [{ text: prompt }] }] };
          } else if (provider === 'openai') {
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${stored.openaiApiKey || ''}`
            };
            body = {
              model,
              messages: [
                { role: 'system', content: 'You are an assistant that summarizes YouTube videos.' },
                { role: 'user', content: prompt }
              ]
            };
          } else if (provider === 'mistral') {
            apiUrl = 'https://api.mistral.ai/v1/chat/completions';
            headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${stored.mistralApiKey || ''}`
            };
            body = {
              model,
              messages: [
                { role: 'system', content: 'You are an assistant that summarizes YouTube videos.' },
                { role: 'user', content: prompt }
              ]
            };
          } else if (provider === 'deepseek') {
            apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${stored.deepseekApiKey || ''}`
            };
            body = {
              model,
              messages: [
                { role: 'system', content: 'You are an assistant that summarizes YouTube videos.' },
                { role: 'user', content: prompt }
              ]
            };
          } else if (provider === 'grok') {
            apiUrl = 'https://api.x.ai/v1/chat/completions';
            headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${stored.grokApiKey || ''}`
            };
            body = {
              model,
              messages: [
                { role: 'system', content: 'You are an assistant that summarizes YouTube videos.' },
                { role: 'user', content: prompt }
              ]
            };
          }

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            let errMsg = 'AI request failed';
            try {
              const err = await response.json();
              errMsg = err.error?.message || JSON.stringify(err);
            } catch {}
            sendResponse({ success: false, error: errMsg });
            return;
          }

          let text = '';
          try {
            const data = await response.json();
            if (provider === 'gemini') {
              const candidate = (data.candidates && data.candidates[0]) || {};
              const parts = (candidate.content && candidate.content.parts) || [];
              text = (parts[0] && parts[0].text) ? parts[0].text : '';
            } else {
              const choice = (data.choices && data.choices[0]) || {};
              const msg = choice.message || choice.delta || {};
              text = msg.content || '';
            }
          } catch {
            text = '';
          }

          sendResponse({ success: true, text });
        } catch (e) {
          sendResponse({ success: false, error: e.message || 'Unknown error' });
        }
      })();
      return true;
    }
    case 'getSettings':
      // Return current settings
      chrome.storage.sync.get(null).then(settings => {
        sendResponse({ success: true, settings: { ...DEFAULT_SETTINGS, ...settings } });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async response

    case 'saveSettings':
      // Save settings
      chrome.storage.sync.set(message.settings).then(() => {
        sendResponse({ success: true });
        
        // Notify all YouTube tabs
        notifyAllTabs();
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'resetSettings':
      // Reset to defaults
      chrome.storage.sync.clear().then(() => {
        return chrome.storage.sync.set(DEFAULT_SETTINGS);
      }).then(() => {
        sendResponse({ success: true });
        notifyAllTabs();
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'exportSettings':
      // Export settings as JSON
      chrome.storage.sync.get(null).then(settings => {
        sendResponse({ success: true, data: JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }, null, 2) });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'importSettings':
      // Import settings from JSON
      try {
        const settings = JSON.parse(message.data);
        chrome.storage.sync.clear().then(() => {
          return chrome.storage.sync.set(settings);
        }).then(() => {
          sendResponse({ success: true });
          notifyAllTabs();
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } catch (error) {
        sendResponse({ success: false, error: 'Invalid JSON format' });
      }
      return true;

    default:
      console.log('[YFP Background] Unknown action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }

  return false; // No async response needed for default case
});

/**
 * Notify all YouTube tabs
 */
async function notifyAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
    
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'reloadSettings'
      }).catch(error => {
        console.log('[YFP Background] Could not notify tab:', tab.id, error.message);
      });
    });

    console.log(`[YFP Background] Notified ${tabs.length} YouTube tabs`);
  } catch (error) {
    console.error('[YFP Background] Error notifying tabs:', error);
  }
}

/**
 * Handle storage changes
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') {
    return;
  }

  console.log('[YFP Background] Storage changed:', changes);

  // Notify all YouTube tabs about settings changes
  notifyAllTabs();
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[YFP Background] Extension started');
  
  // Ensure default settings are set
  chrome.storage.sync.get(null).then(settings => {
    if (Object.keys(settings).length === 0) {
      chrome.storage.sync.set(DEFAULT_SETTINGS);
    }
  });
});

/**
 * Keep service worker alive (workaround for frequent termination)
 */
let heartbeatInterval;

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // Ping every minute to keep alive
  heartbeatInterval = setInterval(() => {
    // Just log something to show activity
    console.log('[YFP Background] Heartbeat');
  }, 60000);
}

startHeartbeat();

console.log('[YFP Background] Service worker initialized');
