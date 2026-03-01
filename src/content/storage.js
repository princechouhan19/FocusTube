/**
 * Storage Utilities Module
 * Handles all Chrome storage operations with default settings
 */

// Default settings configuration
let hasLoggedContextInvalidation = false;

const DEFAULT_SETTINGS = {
  extensionEnabled: true,
  aiProvider: "gemini",
  aiModel: "gemini-1.5-flash",
  aiModelByProvider: {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    mistral: "mistral-small",
    deepseek: "deepseek-chat",
    grok: "grok-2-mini",
  },
  aiProviderDefaultModels: {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    mistral: "mistral-small",
    deepseek: "deepseek-chat",
    grok: "grok-2-mini",
  },
  openaiApiKey: "",
  mistralApiKey: "",
  deepseekApiKey: "",
  grokApiKey: "",
  // AI Settings
  geminiApiKey: "",
  geminiModel: "gemini-1.5-flash",
  useTranscript: true,
  transcriptLang: "en",
  profileEmail: "",
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
  homePageRedirect: "none", // 'none', 'subscriptions', 'search', 'blank'

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
  modernGlassTheme: false,
  hideComments: false,
  hideInfoCards: false,
  hideEndScreens: false,
  hideLiveChat: false,
  hideNextVideo: false,
  hideMoreVideos: false,
  hideVideoMetrics: false,
  hideVideoDuration: false,
  hideMerch: false,
  customCSSRules: [],
  blockedKeywords: [],
  // Stats
  statsTimeSaved: 0,
  statsAdsBlocked: 0,
  statsShortsSkipped: 0,
  statsSummariesGenerated: 0,
  statsQuitsEarly: 0,
};

function applyExtensionEnabledOverride(settings) {
  if (settings.extensionEnabled === false) {
    const falseOverrides = [
      "hideSuggestions",
      "hideTrending",
      "hidePeopleAlsoWatched",
      "hideNavShorts",
      "hideNavExplore",
      "hideNavGaming",
      "hideNavTrending",
      "hideNotifications",
      "hideCreateButton",
      "hideVoiceSearch",
      "hideShareButtons",
      "focusMode",
      "scheduledBlocking",
      "passwordProtection",
      "hideShorts",
      "hideBannerAds",
      "skipVideoAds",
      "disableAutoplay",
      "forceHighestQuality",
      "useNativePlayer",
      "autoPauseInactive",
      "autoTheaterMode",
      "modernGlassTheme",
      "hideComments",
      "hideInfoCards",
      "hideEndScreens",
      "hideLiveChat",
      "hideNextVideo",
      "hideMoreVideos",
      "hideVideoMetrics",
      "hideVideoDuration",
      "hideMerch",
      "showSummaryButton",
      "hideSidebar",
    ];
    for (const key of falseOverrides) {
      settings[key] = false;
    }
    settings.homePageRedirect = "none";
    settings.blockedKeywords = [];
    settings.blockedChannels = [];
    settings.blockedPatterns = [];
    settings.customCSSRules = [];
  }
  return settings;
}

/**
 * Load settings from Chrome storage
 * Merges with defaults to ensure all settings exist
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(null);
    return applyExtensionEnabledOverride({ ...DEFAULT_SETTINGS, ...stored });
  } catch (error) {
    const msg = String(error && error.message ? error.message : error || "");
    if (msg.includes("Extension context invalidated")) {
      if (!hasLoggedContextInvalidation) {
        hasLoggedContextInvalidation = true;
        console.warn(
          "Extension reloaded: content scripts will recover after page refresh.",
        );
      }
    } else {
      console.error("Error loading settings:", error);
    }
    return applyExtensionEnabledOverride({ ...DEFAULT_SETTINGS });
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
    const msg = String(error && error.message ? error.message : error || "");
    if (!msg.includes("Extension context invalidated")) {
      console.error("Error saving setting:", error);
    }
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
    const msg = String(error && error.message ? error.message : error || "");
    if (!msg.includes("Extension context invalidated")) {
      console.error("Error saving settings:", error);
    }
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
    const msg = String(error && error.message ? error.message : error || "");
    if (!msg.includes("Extension context invalidated")) {
      console.error("Error resetting settings:", error);
    }
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
    const msg = String(error && error.message ? error.message : error || "");
    if (!msg.includes("Extension context invalidated")) {
      console.error("Error exporting settings:", error);
    }
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
    const msg = String(error && error.message ? error.message : error || "");
    if (!msg.includes("Extension context invalidated")) {
      console.error("Error importing settings:", error);
    }
    return false;
  }
}

/**
 * Listen for setting changes
 */
function onSettingsChanged(callback) {
  if (chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace === "sync") {
        const currentRaw = await chrome.storage.sync.get(null);

        const oldRaw = { ...currentRaw };
        for (const key in changes) {
          oldRaw[key] =
            changes[key].oldValue !== undefined
              ? changes[key].oldValue
              : DEFAULT_SETTINGS[key];
        }

        const resolvedOld = applyExtensionEnabledOverride({
          ...DEFAULT_SETTINGS,
          ...oldRaw,
        });
        const resolvedNew = applyExtensionEnabledOverride({
          ...DEFAULT_SETTINGS,
          ...currentRaw,
        });

        const syntheticChanges = {};
        let hasSynthetic = false;
        for (const key in resolvedNew) {
          if (resolvedOld[key] !== resolvedNew[key]) {
            syntheticChanges[key] = {
              oldValue: resolvedOld[key],
              newValue: resolvedNew[key],
            };
            hasSynthetic = true;
          }
        }

        if (hasSynthetic) {
          callback(syntheticChanges);
        } else {
          callback(changes);
        }
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
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULT_SETTINGS,
    loadSettings,
    saveSetting,
    saveSettings: saveSettingsAll,
    resetSettings,
    exportSettings,
    importSettings,
    onSettingsChanged,
  };
}
