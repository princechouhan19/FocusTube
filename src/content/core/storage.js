/**
 * Storage Utilities Module
 * Handles all Chrome storage operations with default settings
 */

// Default settings configuration
let hasLoggedContextInvalidation = false;

const DEFAULT_SETTINGS = {
  extensionEnabled: true,
  tempBlockUntil: 0,
  scheduleBlockEnabled: false,
  scheduleBlockStart: "09:00",
  scheduleBlockEnd: "17:00",
  aiProvider: "gemini",
  aiModel: "gemini-1.5-flash",
  aiModelByProvider: {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    mistral: "mistral-small-latest",
    deepseek: "deepseek-chat",
    grok: "grok-2-mini",
  },
  aiProviderDefaultModels: {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    mistral: "mistral-small-latest",
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
  profileName: "Guest User",
  profileEmail: "",
  profileImage: "",
  profileGoal: "",
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

  // Universal Site Blocking
  blockedSites: [], // Array of {domain, blockUntil (timestamp), reason}

  // ----- v1.1.0 new features -----
  // Smart Lists
  smartListsEnabled: [],

  // Pomodoro
  pomodoroFocusMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  pomodoroCyclesBeforeLongBreak: 4,
  pomodoroDeepWork: false,
  pomodoroAdaptiveFocus: true,
  pomodoroFocusShield: true,
  pomodoroSessionHistory: [],
  pomodoroAutoStartBreaks: true,
  pomodoroAutoStartFocus: false,
  pomodoroNotify: true,
  pomodoroState: null,

  // AI Nudge
  aiNudgeEnabled: false,

  // Quiz Overhaul
  quizDifficulty: "easy",
  quizStreakMultiplier: false,

  // Tab Manager
  workspaces: {},

  // Analytics v2
  productivityScore: 0,

  // Stats (extended)
  statsTimeSaved: 0,
  statsAdsBlocked: 0,
  statsShortsSkipped: 0,
  statsSummariesGenerated: 0,
  statsQuitsEarly: 0,
  statsWillpowerPoints: 0,
  statsPomodoroCompleted: 0,
  siteLogos: {},
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
    const stored = await chrome.storage.local.get(null);
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
    await chrome.storage.local.set({ [key]: value });
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
    await chrome.storage.local.set(settings);
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
    await chrome.storage.local.clear();
    await chrome.storage.local.set(DEFAULT_SETTINGS);
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
    await chrome.storage.local.clear();
    await chrome.storage.local.set(settings);
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
      if (namespace === "local") {
        const currentRaw = await chrome.storage.local.get(null);

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
