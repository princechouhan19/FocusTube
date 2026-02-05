/**
 * Storage Utilities Module
 * Handles all Chrome storage operations with default settings
 */

// Default settings configuration
const DEFAULT_SETTINGS = {
  aiProvider: 'gemini',
  aiModel: 'gemini-pro',
  aiModelByProvider: {
    gemini: 'gemini-pro',
    openai: 'gpt-4o-mini',
    mistral: 'mistral-small',
    deepseek: 'deepseek-chat',
    grok: 'grok-2-mini'
  },
  aiProviderDefaultModels: {
    gemini: 'gemini-pro',
    openai: 'gpt-4o-mini',
    mistral: 'mistral-small',
    deepseek: 'deepseek-chat',
    grok: 'grok-2-mini'
  },
  openaiApiKey: '',
  mistralApiKey: '',
  deepseekApiKey: '',
  grokApiKey: '',
  // AI Settings
  geminiApiKey: '',
  geminiModel: 'gemini-pro',
  useTranscript: true,
  transcriptLang: 'en',
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
  homePageRedirect: 'none', // 'none', 'subscriptions', 'search', 'blank'

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

  // Productivity Features (Optional)
  focusMode: false,
  scheduledBlocking: false,
  passwordProtection: false,
  blockedKeywords: [],
  blockedChannels: [],
  blockedPatterns: [], // URL patterns to block

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
 * Load settings from Chrome storage
 * Merges with defaults to ensure all settings exist
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(null);
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save a specific setting
 */
async function saveSetting(key, value) {
  try {
    await chrome.storage.sync.set({ [key]: value });
    return true;
  } catch (error) {
    console.error('Error saving setting:', error);
    return false;
  }
}

/**
 * Save multiple settings at once
 */
async function saveSettingsAll(settings) {
  try {
    await chrome.storage.sync.set(settings);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Reset all settings to defaults
 */
async function resetSettings() {
  try {
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    return true;
  } catch (error) {
    console.error('Error resetting settings:', error);
    return false;
  }
}

/**
 * Export settings as JSON (for backup)
 */
async function exportSettings() {
  try {
    const settings = await loadSettings();
    return JSON.stringify(settings, null, 2);
  } catch (error) {
    console.error('Error exporting settings:', error);
    return null;
  }
}

/**
 * Import settings from JSON
 */
async function importSettings(jsonString) {
  try {
    const settings = JSON.parse(jsonString);
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(settings);
    return true;
  } catch (error) {
    console.error('Error importing settings:', error);
    return false;
  }
}

/**
 * Listen for setting changes
 */
function onSettingsChanged(callback) {
  if (chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        callback(changes);
      }
    });
  }
}

// Export functions to global scope for other content scripts
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
window.loadSettings = loadSettings;
window.saveSetting = saveSetting;
window.saveSettings = saveSettingsAll;
window.resetSettings = resetSettings;
window.exportSettings = exportSettings;
window.importSettings = importSettings;
window.onSettingsChanged = onSettingsChanged;

// Also export as module for environments that support it
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_SETTINGS,
    loadSettings,
    saveSetting,
    saveSettings: saveSettingsAll,
    resetSettings,
    exportSettings,
    importSettings,
    onSettingsChanged
  };
}
