/**
 * Popup Script
 * Handles settings UI, navigation, and Chrome storage operations
 */

// Default settings
const DEFAULT_SETTINGS = {
  // Master Switch
  extensionEnabled: true,

  // Blocking Controls
  tempBlockUntil: 0,
  scheduleBlockEnabled: false,
  scheduleBlockStart: "09:00",
  scheduleBlockEnd: "17:00",

  // User Profile & API
  aiProvider: "gemini",
  aiModel: "gemini-1.5-flash",
  aiModelByProvider: {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    mistral: "mistral-small-latest",
    deepseek: "deepseek-chat",
    grok: "grok-2-mini",
  },
  geminiApiKey: "",
  openaiApiKey: "",
  mistralApiKey: "",
  deepseekApiKey: "",
  grokApiKey: "",
  geminiModel: "gemini-1.5-flash",
  profileName: "Guest User",
  profileImage: "",
  profileGoal: "",
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
  useTranscript: false,
  transcriptLang: "en",
  shortcutsEnabled: true,
  floatingToolbarEnabled: false,

  // Universal Site Blocking
  blockedSites: [], // Array of {domain, blockUntil (timestamp), reason}

  // Enhanced UI Controls
  hideComments: false,
  hideInfoCards: false,
  autoTheaterMode: false,
  modernGlassTheme: false,
};

const PROVIDER_MODELS = {
  gemini: [
    { value: "gemini-2.0-flash-exp", label: "(Free) Gemini 2.0 Flash (Exp)" },
    { value: "gemini-1.5-flash", label: "(Free) Gemini 1.5 Flash" },
    { value: "gemini-1.5-pro", label: "(Free) Gemini 1.5 Pro" },
    { value: "gemini-1.0-pro", label: "(Free) Gemini 1.0 Pro" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "o1-mini", label: "o1 Mini" },
  ],
  mistral: [
    { value: "mistral-small-latest", label: "Mistral Small" },
    { value: "mistral-medium-latest", label: "Mistral Medium" },
    { value: "mistral-large-latest", label: "Mistral Large" },
    { value: "pixtral-large-latest", label: "Pixtral Large" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat (V3)" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
  ],
  grok: [
    { value: "grok-2-mini", label: "Grok 2 Mini" },
    { value: "grok-2", label: "Grok 2" },
  ],
};

const PROVIDER_KEY_FIELDS = {
  gemini: "geminiApiKey",
  openai: "openaiApiKey",
  mistral: "mistralApiKey",
  deepseek: "deepseekApiKey",
  grok: "grokApiKey",
};

const PROVIDER_KEY_PLACEHOLDERS = {
  gemini: "AIza...",
  openai: "sk-...",
  mistral: "mistral-...",
  deepseek: "sk-...",
  grok: "xai-...",
};

/**
 * Load settings from Chrome storage
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get(null);
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.error("Error loading settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to Chrome storage
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.local.set(settings);
    console.log("Settings saved:", settings);
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
}

function getProviderApiKey(settings, provider) {
  return settings[PROVIDER_KEY_FIELDS[provider]] || "";
}

function getActiveApiKeyInput() {
  return document.getElementById("activeApiKey");
}

function refreshAiKeyField(settings) {
  const provider = document.getElementById("aiProvider")?.value || "gemini";
  const keyInput = getActiveApiKeyInput();
  const hint = document.getElementById("activeApiKeyHint");
  if (!keyInput) return;

  keyInput.value = getProviderApiKey(settings, provider);
  keyInput.placeholder =
    PROVIDER_KEY_PLACEHOLDERS[provider] || "Enter API key";

  if (hint) {
    hint.textContent = `${provider.charAt(0).toUpperCase() + provider.slice(1)} key is stored only on this device.`;
  }
}

async function recordMetric(metric, amount) {
  try {
    await chrome.runtime.sendMessage({ action: "recordMetric", metric, amount });
  } catch (error) {
    console.warn("Metric record failed:", error);
  }
}

/**
 * Initialize popup UI
 */
const TOGGLES_LIST = [
  "skipVideoAds",
  "hideBannerAds",
  "hideShorts",
  "hideComments",
  "disableAutoplay",
  "hideSuggestions",
  "hideTrending",
  "hidePeopleAlsoWatched",
  "hideSidebar",
  "hideNavShorts",
  "hideNavExplore",
  "hideNavGaming",
  "hideNavTrending",
  "autoTheaterMode",
  "hideInfoCards",
  "hideEndScreens",
  "hideLiveChat",
  "showSummaryButton",
  "forceHighestQuality",
  "useNativePlayer",
  "hideNotifications",
  "hideVoiceSearch",
  "hideCreateButton",
  "hideNextVideo",
  "hideMoreVideos",
  "hideVideoMetrics",
  "hideVideoDuration",
  "hideMerch",
  "hideShareButtons",
  "useTranscript",
  "modernGlassTheme",
  "shortcutsEnabled",
  "floatingToolbarEnabled",
];

let quizState = {
  active: false,
  questionsLeft: 5,
  currentTopic: "",
  timer: null,
  timeLeft: 30,
  currentQuestion: null,
  pendingAction: null,
};

async function handleDisableAttempt(callback) {
  // Always trigger the quiz to deter users from unblocking!
  startQuiz(callback);
  return false;
}

function startQuiz(callback) {
  quizState.active = true;
  quizState.questionsLeft = 5;
  quizState.pendingAction = callback;

  if (typeof QUIZ_QUESTIONS === "undefined") {
    // fallback if missing
    callback();
    return;
  }

  const topics = Object.keys(QUIZ_QUESTIONS);
  quizState.currentTopic = topics[Math.floor(Math.random() * topics.length)];

  document.getElementById("quiz-topic-label").textContent =
    quizState.currentTopic.charAt(0).toUpperCase() +
    quizState.currentTopic.slice(1);
  document.getElementById("quiz-overlay").classList.remove("yfp-hidden");
  document.getElementById("quiz-overlay").style.display = "flex";

  const ansEl = document.getElementById("quiz-answer");
  if (ansEl) {
    ansEl.addEventListener("paste", (e) => e.preventDefault());
  }

  nextQuestion();
}

function nextQuestion() {
  if (quizState.questionsLeft <= 0) {
    document.getElementById("quiz-overlay").classList.add("yfp-hidden");
    document.getElementById("quiz-overlay").style.display = "none";
    clearInterval(quizState.timer);
    if (quizState.pendingAction) quizState.pendingAction();
    return;
  }

  document.getElementById("quiz-progress").textContent =
    `${5 - quizState.questionsLeft}/5`;
  const ansInput = document.getElementById("quiz-answer");
  ansInput.value = "";
  setTimeout(() => ansInput.focus(), 100);

  const pool = QUIZ_QUESTIONS[quizState.currentTopic];
  quizState.currentQuestion = pool[Math.floor(Math.random() * pool.length)];

  document.getElementById("quiz-question").textContent =
    quizState.currentQuestion.q;

  quizState.timeLeft = 30;
  document.getElementById("quiz-timer").textContent = quizState.timeLeft;
  clearInterval(quizState.timer);
  quizState.timer = setInterval(() => {
    quizState.timeLeft--;
    document.getElementById("quiz-timer").textContent = quizState.timeLeft;
    if (quizState.timeLeft <= 0) failQuiz();
  }, 1000);
}

function checkQuizAnswer() {
  const answer = document
    .getElementById("quiz-answer")
    .value.trim()
    .toLowerCase();
  if (answer === quizState.currentQuestion.a.toLowerCase()) {
    quizState.questionsLeft--;
    const container = document.getElementById("quiz-question-container");
    container.style.background = "rgba(46, 204, 113, 0.2)";
    setTimeout(() => {
      container.style.background = "rgba(255,255,255,0.05)";
      nextQuestion();
    }, 400);
  } else {
    const container = document.getElementById("quiz-question-container");
    container.style.background = "rgba(231, 76, 60, 0.2)";
    setTimeout(() => {
      container.style.background = "rgba(255,255,255,0.05)";
    }, 400);
  }
}

function failQuiz() {
  clearInterval(quizState.timer);

  recordMetric("quitsEarly", 1);

  alert("Time's up! You failed to unblock. Stay focused!");
  document.getElementById("quiz-overlay").classList.add("yfp-hidden");
  document.getElementById("quiz-overlay").style.display = "none";
  const ms = document.getElementById("extensionEnabled");
  ms.checked = true;
  updateStatusText(true);
}

function initQuizListeners() {
  const subBtn = document.getElementById("quiz-submit-btn");
  if (subBtn) subBtn.addEventListener("click", checkQuizAnswer);

  const ansInp = document.getElementById("quiz-answer");
  if (ansInp)
    ansInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkQuizAnswer();
    });

  const cclBtn = document.getElementById("quiz-cancel-btn");
  if (cclBtn)
    cclBtn.addEventListener("click", () => {
      clearInterval(quizState.timer);

      recordMetric("quitsEarly", 1);

      document.getElementById("quiz-overlay").classList.add("yfp-hidden");
      document.getElementById("quiz-overlay").style.display = "none";
      const ms = document.getElementById("extensionEnabled");
      ms.checked = true;
      updateStatusText(true);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing popup...");

  // Load settings
  let settings = await loadSettings();
  try {
    const profileResponse = await chrome.runtime.sendMessage({
      action: "getUserProfile",
    });
    if (profileResponse?.success && profileResponse.profile) {
      settings = { ...settings, ...profileResponse.profile };
    }
  } catch (err) {
    console.warn("[FocusTube] getUserProfile failed on init:", err);
  }

  // Initialize Views
  initNavigation();

  // Populate UI with current settings
  populateUI(settings);
  populateProfile(settings);
  renderBlockedKeywords(settings.blockedKeywords || []);
  
  // Render active blocks on load
  await renderActiveBlocks();
  
  // Update active blocks every 5 seconds
  setInterval(() => renderActiveBlocks(), 5000);

  // Add event listeners
  addEventListeners();
  addBlockingListeners();
  addProfileListeners();
  addKeywordBlocklistListeners();
  addSiteBlockingListeners();
  initQuizListeners();

  // Dashboard Button
  const dashBtn = document.getElementById("open-dashboard-btn");
  if (dashBtn) {
    dashBtn.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/dashboard/dashboard.html"),
      });
    });
  }

  // Screenshot Button
  const screenshotBtn = document.getElementById("capture-screenshot-btn");
  if (screenshotBtn) {
    screenshotBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage(
        { action: "captureScreenshot" },
        (response) => {
          if (chrome.runtime.lastError) {
            showFeedback("capture-screenshot-btn", "Error");
            console.warn(
              "[FocusTube] Screenshot send error:",
              chrome.runtime.lastError.message,
            );
            return;
          }
          if (response && response.success) {
            showFeedback("capture-screenshot-btn", "SS Taken!");
          } else {
            showFeedback("capture-screenshot-btn", "Failed");
            console.error(
              "[FocusTube] Screenshot failed:",
              response ? response.error : "Unknown error",
            );
          }
        },
      );
    });
  }

  // Recording Button
  const recordBtn = document.getElementById("toggle-recording-btn");
  if (recordBtn) {
    // Update button state from background
    function updateRecordingUI(isRecording) {
      recordBtn.textContent = isRecording ? "⏹ Stop" : "🔴 Rec";
      recordBtn.style.background = isRecording
        ? "linear-gradient(to right, #4b5563, #374151)"
        : "linear-gradient(to right, #ef4444, #dc2626)";
      recordBtn.title = isRecording ? "Stop Recording (Ctrl+Shift+R)" : "Start Recording (Ctrl+Shift+R)";
    }

    // Check initial recording state
    function checkRecordingState() {
      chrome.runtime.sendMessage({ action: "getRecordingStatus" }, (response) => {
        if (chrome.runtime.lastError) {
          // Background may be asleep; safe to assume not recording.
          updateRecordingUI(false);
          return;
        }
        if (response && response.isRecording) {
          updateRecordingUI(true);
        } else {
          updateRecordingUI(false);
        }
      });
    }

    recordBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "toggleRecording" }, (response) => {
        if (chrome.runtime.lastError) {
          showFeedback(
            "toggle-recording-btn",
            "Error: " + chrome.runtime.lastError.message,
          );
          return;
        }
        if (response && response.success) {
          updateRecordingUI(response.isRecording);
          showFeedback(
            "toggle-recording-btn",
            response.isRecording ? "Recording Started..." : "Recording Saved!",
          );
        } else {
          showFeedback("toggle-recording-btn", "Error: " + (response?.error || "Unknown error"));
          console.error(
            "[FocusTube] Recording failed:",
            response ? response.error : "Unknown error",
          );
        }
      });
    });

    // Check state when popup opens
    checkRecordingState();

    // Also listen for recording status messages from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "recordingStatusChanged") {
        updateRecordingUI(message.isRecording);
      }
    });
  }
});

/**
 * Navigation Logic
 */
function initNavigation() {
  const views = {
    home: document.getElementById("home-view"),
    settings: document.getElementById("settings-view"),
    profile: document.getElementById("profile-view"),
  };

  const navBtns = {
    settings: document.getElementById("nav-settings"),
    profile: document.getElementById("nav-profile"),
  };

  const backBtns = document.querySelectorAll(".back-btn");

  function switchView(viewName) {
    Object.values(views).forEach((el) => {
      if (el) el.classList.remove("active");
    });
    if (views[viewName]) {
      views[viewName].classList.add("active");
    } else {
      console.error(`[FocusTube] View not found: ${viewName}`);
    }
  }

  // Add settings navigation listener
  if (navBtns.settings) {
    navBtns.settings.addEventListener("click", () => switchView("settings"));
  } else {
    console.error("[FocusTube] Settings nav button not found");
  }

  // Add profile navigation listener
  if (navBtns.profile) {
    navBtns.profile.addEventListener("click", () => {
      switchView("profile");
      // Fetch fresh profile data when entering profile view
      chrome.runtime.sendMessage({ action: "getUserProfile" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[FocusTube] getUserProfile (nav):",
            chrome.runtime.lastError.message,
          );
          return;
        }
        if (response && response.success && response.profile) {
          populateProfile(response.profile);
        }
      });
    });
  } else {
    console.error("[FocusTube] Profile nav button not found");
  }

  backBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (views[target.split("-")[0]]) {
        switchView(target.split("-")[0]);
      } else {
        // Fallback to home if target id format differs
        switchView("home");
      }
    });
  });
}

/**
 * Populate UI with settings
 */
function populateUI(settings) {
  // Master Switch
  const extEnabled = document.getElementById("extensionEnabled");
  if (extEnabled) {
    extEnabled.checked = settings.extensionEnabled;
  }
  updateStatusText(settings.extensionEnabled);

  // Blocking Schedule
  const scheduleStart = document.getElementById("schedule-start");
  const scheduleEnd = document.getElementById("schedule-end");
  const scheduleEnabled = document.getElementById("scheduleBlockEnabled");
  
  if (scheduleStart) scheduleStart.value = settings.scheduleBlockStart;
  if (scheduleEnd) scheduleEnd.value = settings.scheduleBlockEnd;
  if (scheduleEnabled) scheduleEnabled.checked = settings.scheduleBlockEnabled;

  // Settings View Inputs
  const providerSel = document.getElementById("aiProvider");
  if (providerSel) {
    providerSel.value = settings.aiProvider || "gemini";
    // Populate models based on provider
    updateModelDropdown(providerSel.value, settings);
  }
  
  refreshAiKeyField(settings);
  
  const homePageRedirect = document.getElementById("homePageRedirect");
  if (homePageRedirect) {
    homePageRedirect.value = settings.homePageRedirect || "none";
  }
  
  const tl = document.getElementById("transcriptLang");
  if (tl) tl.value = settings.transcriptLang || "en";

  // Toggles
  TOGGLES_LIST.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = settings[id];
  });
}

function updateStatusText(enabled) {
  const text = document.getElementById("status-text");
  const powerBtn = document.getElementById("nav-power");
  if (enabled) {
    text.textContent = "Active and protecting";
    text.style.color = "var(--success-color)";
    if (powerBtn) {
      powerBtn.style.color = "var(--success-color)";
      powerBtn.style.opacity = "1";
    }
  } else {
    text.textContent = "Extension disabled";
    text.style.color = "var(--danger-color)";
    if (powerBtn) {
      powerBtn.style.color = "var(--danger-color)";
      powerBtn.style.opacity = "0.7";
    }
  }
}

/**
 * Populate Profile Data
 */
function populateProfile(settings) {
  const profileNameDisplay = document.getElementById("profile-name-display");
  if (profileNameDisplay) {
    profileNameDisplay.textContent = settings.profileName || "Guest User";
  }
  
  const profileEmailDisplay = document.getElementById("profile-email-display");
  if (profileEmailDisplay) {
    profileEmailDisplay.textContent = settings.profileEmail || "Not logged in";
  }
  
  const profileGoalDisplay = document.getElementById("profile-goal-display");
  if (profileGoalDisplay) {
    profileGoalDisplay.textContent = settings.profileGoal || "No goal set";
  }

  const avatarContainer = document.querySelector(".profile-avatar");
  if (avatarContainer) {
    if (settings.profileImage) {
      // SECURITY: build the avatar with DOM APIs so a malicious profileImage
      // value (e.g. javascript: URL) cannot execute script in the popup.
      avatarContainer.textContent = "";
      const img = document.createElement("img");
      img.style.cssText =
        "width: 100%; height: 100%; border-radius: 50%; object-fit: cover;";
      // Only allow http(s) URLs.
      const src = String(settings.profileImage);
      if (/^https?:\/\//i.test(src)) {
        img.src = src;
        avatarContainer.appendChild(img);
      } else {
        avatarContainer.textContent = "👤";
      }
    } else {
      avatarContainer.textContent = "👤";
    }
  }

  const profileNameInput = document.getElementById("profileName");
  if (profileNameInput) {
    profileNameInput.value = settings.profileName || "";
  }
  
  const profileGoalInput = document.getElementById("profileGoal");
  if (profileGoalInput) {
    profileGoalInput.value = settings.profileGoal || "";
  }

  const statsTimeSaved = document.getElementById("stats-time-saved");
  if (statsTimeSaved) {
    statsTimeSaved.textContent = formatTime(settings.statsTimeSaved);
  }
  
  const statsAdsBlocked = document.getElementById("stats-ads-blocked");
  if (statsAdsBlocked) {
    statsAdsBlocked.textContent = settings.statsAdsBlocked || "0";
  }
}

function formatTime(minutes) {
  if (!minutes) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Add General Event Listeners
 */
function addEventListeners() {
  // Master Switch
  const extEnabled = document.getElementById("extensionEnabled");
  if (extEnabled) {
    extEnabled.addEventListener("change", async (e) => {
      const enabled = e.target.checked;
      if (!enabled) {
        e.target.checked = true; // visually keep it on until test resolves
        handleDisableAttempt(async () => {
          e.target.checked = false;
          await saveSettings({ extensionEnabled: false, tempBlockUntil: 0 });
          updateStatusText(false);
          notifyContentScript();
        });
      } else {
        await saveSettings({ extensionEnabled: true });
        updateStatusText(true);
        notifyContentScript();
      }
    });
  } else {
    console.error("[FocusTube] extensionEnabled element not found");
  }

  const navPower = document.getElementById("nav-power");
  if (navPower) {
    navPower.addEventListener("click", async () => {
      const ms = document.getElementById("extensionEnabled");
      if (!ms) return;
      const currentState = ms.checked;

      if (currentState) {
        handleDisableAttempt(async () => {
          ms.checked = false;
          await saveSettings({ extensionEnabled: false, tempBlockUntil: 0 });
          updateStatusText(false);
          notifyContentScript();
        });
      } else {
        ms.checked = true;
        await saveSettings({ extensionEnabled: true });
        updateStatusText(true);
        notifyContentScript();
      }
    });
  }

  // Schedule Inputs
  const scheduleInputs = [
    "schedule-start",
    "schedule-end",
    "scheduleBlockEnabled",
  ];
  scheduleInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", async () => {
        const startEl = document.getElementById("schedule-start");
        const endEl = document.getElementById("schedule-end");
        const enabledEl = document.getElementById("scheduleBlockEnabled");
        if (!startEl || !endEl || !enabledEl) return;
        
        const settings = {
          scheduleBlockStart: startEl.value,
          scheduleBlockEnd: endEl.value,
          scheduleBlockEnabled: enabledEl.checked,
        };
        await chrome.runtime.sendMessage({
          action: "updateScheduleBlock",
          ...settings,
        });
        notifyContentScript();
      });
    }
  });

  // Settings Toggles
  TOGGLES_LIST.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", async (e) => {
        await saveSettings({ [id]: e.target.checked });
        notifyContentScript();
      });
    }
  });

  // Home Page Redirect
  const homePageRedirect = document.getElementById("homePageRedirect");
  if (homePageRedirect) {
    homePageRedirect.addEventListener("change", async (e) => {
      await saveSettings({ homePageRedirect: e.target.value });
      notifyContentScript();
    });
  }

  // API Key
  const saveApiKeyBtn = document.getElementById("saveApiKey");
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener("click", async () => {
      const providerNow = document.getElementById("aiProvider")?.value;
      const modelNow = document.getElementById("aiModel")?.value;
      if (!providerNow || !modelNow) return;
      
      const current = await loadSettings();
      const byProvider = Object.assign({}, current.aiModelByProvider || {});
      byProvider[providerNow] = modelNow;
      const keyField = PROVIDER_KEY_FIELDS[providerNow];
      const keyInput = getActiveApiKeyInput();
      const settingsToSave = {
        aiProvider: providerNow,
        aiModel: modelNow,
        aiModelByProvider: byProvider,
        [keyField]: keyInput?.value?.trim() || "",
      };
      await saveSettings(settingsToSave);
      showFeedback("saveApiKey", "AI Saved!");
      notifyContentScript();
    });
  }

  const providerSel2 = document.getElementById("aiProvider");
  if (providerSel2) {
    providerSel2.addEventListener("change", async (e) => {
      const p = e.target.value;
      const s = await loadSettings();
      updateModelDropdown(p, s);
      refreshAiKeyField(s);

      // Save new provider and current model for that provider
      const aiModelInput = document.getElementById("aiModel");
      const newModel = aiModelInput?.value;
      if (newModel) {
        await saveSettings({ aiProvider: p, aiModel: newModel });
        notifyContentScript();
      }
    });
  }

  const aiModelInput = document.getElementById("aiModel");
  if (aiModelInput) {
    aiModelInput.addEventListener("change", async (e) => {
      const modelVal = e.target.value;
      const providerEl = document.getElementById("aiProvider");
      const provider = providerEl?.value;
      if (!provider) return;
      
      const s = await loadSettings();
      const byProvider = s.aiModelByProvider || {};
      byProvider[provider] = modelVal;

      await saveSettings({
        aiModel: modelVal,
        aiModelByProvider: byProvider,
      });
      notifyContentScript();
    });
  }
  
  const tlSel = document.getElementById("transcriptLang");
  if (tlSel) {
    tlSel.addEventListener("change", async (e) => {
      await saveSettings({ transcriptLang: e.target.value });
      notifyContentScript();
    });
  }
}

/**
 * Blocking Logic Listeners
 */
function addBlockingListeners() {
  const buttons = {
    "block-5min": 5,
    "block-15min": 15,
    "block-30min": 30,
    "block-1hr": 60,
  };

  Object.entries(buttons).forEach(([id, minutes]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => setTempBlock(minutes));
    }
  });

  const customDurationInput = document.getElementById("custom-block-duration");
  if (customDurationInput) {
    customDurationInput.addEventListener("input", (e) => {
      const el = e.target;
      const cleaned = sanitizeMinutesInput(el.value);
      if (cleaned !== el.value) el.value = cleaned;
    });
    customDurationInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const blockCustomBtn = document.getElementById("block-custom");
        if (blockCustomBtn) blockCustomBtn.click();
      }
    });
  }

  const blockCustomBtn = document.getElementById("block-custom");
  if (blockCustomBtn) {
    blockCustomBtn.addEventListener("click", () => {
      const mins = parseCustomDurationMinutes(customDurationInput?.value || "");
      if (mins > 0) {
        if (customDurationInput) customDurationInput.value = String(mins);
        setTempBlock(mins);
      }
    });
  }
}

function sanitizeMinutesInput(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function parseCustomDurationMinutes(value) {
  const normalized = sanitizeMinutesInput(value);
  if (!normalized) return 0;
  const mins = Number.parseInt(normalized, 10);
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  return Math.min(mins, 9999999);
}

/**
 * Keyword Blocklist UI
 */
function renderBlockedKeywords(list) {
  const container = document.getElementById("blockedKeywordsList");
  if (!container) return;
  container.innerHTML = "";
  (list || []).forEach((k) => {
    const wrapper = document.createElement("span");
    wrapper.className = "yfp-tag";
    const text = document.createElement("span");
    text.textContent = k;
    const remove = document.createElement("button");
    remove.textContent = "✕";
    remove.dataset.keyword = k;
    remove.className = "yfp-tag-remove";
    wrapper.appendChild(text);
    wrapper.appendChild(remove);
    container.appendChild(wrapper);
  });
}

async function addKeywordBlocklistListeners() {
  const addBtn = document.getElementById("addBlockedKeyword");
  const input = document.getElementById("blockedKeywordInput");
  const listEl = document.getElementById("blockedKeywordsList");

  if (addBtn && input) {
    addBtn.addEventListener("click", async () => {
      const val = (input.value || "").trim();
      if (!val) return;
      const current = (await loadSettings()).blockedKeywords || [];
      if (!current.includes(val)) {
        const next = [...current, val];
        await saveSettings({ blockedKeywords: next });
        renderBlockedKeywords(next);
        notifyContentScript();
      }
      input.value = "";
    });
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addBtn.click();
      }
    });
  }

  if (listEl) {
    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest(".yfp-tag-remove");
      if (!btn) return;
      const kw = btn.dataset.keyword;
      const current = (await loadSettings()).blockedKeywords || [];
      const next = current.filter((k) => k !== kw);
      await saveSettings({ blockedKeywords: next });
      renderBlockedKeywords(next);
      notifyContentScript();
    });
  }
}

async function setTempBlock(minutes) {
  const until = Date.now() + minutes * 60 * 1000;
  await chrome.runtime.sendMessage({
    action: "setTempBlock",
    until,
    minutes,
  });
  notifyContentScript();

  // Visual feedback
  const btn = document.activeElement;
  if (btn && btn.classList.contains("timer-btn")) {
    const originalText = btn.textContent;
    btn.textContent = "Blocked!";
    btn.classList.add("active");
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove("active");
    }, 2000);
  }
}

/**
 * Universal Site Blocking Listeners
 */
async function renderActiveBlocks() {
  try {
    const settings = await loadSettings();
    const blockedSites = settings.blockedSites || [];
    const container = document.getElementById("active-blocks-list");
    if (!container) return;

    const now = Date.now();
    const activeBlocks = blockedSites.filter(b => b && b.domain && b.blockUntil > now);

    if (activeBlocks.length === 0) {
      container.innerHTML = '<p style="color: #888; font-size: 12px; text-align: center; padding: 8px;">No active blocks</p>';
      return;
    }

    container.innerHTML = '';
    activeBlocks.forEach((block, index) => {
      try {
        const remaining = Math.max(0, block.blockUntil - now);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        const item = document.createElement('div');
        item.style.cssText = `
          background: rgba(255,255,255,0.05);
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          border-left: 3px solid #667eea;
          transition: all 0.2s ease;
        `;
        
        const info = document.createElement('div');
        info.style.cssText = 'color: #fff; flex: 1;';
        const domainName = String(block.domain || '').replace(/^(https?:\/\/)?(www\.)?/, '');
        // SECURITY: use DOM APIs to avoid XSS via a stored domain payload.
        const strong = document.createElement('strong');
        strong.style.cssText = 'color: #fff; display: block;';
        strong.textContent = domainName;
        const span = document.createElement('span');
        span.style.cssText = 'color: #aaa; font-size: 11px;';
        span.textContent = `${timeStr} remaining`;
        info.appendChild(strong);
        info.appendChild(span);
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.style.cssText = `
          background: rgba(255,67,67,0.2);
          border: 1px solid rgba(255,67,67,0.4);
          color: #ff6b6b;
          border-radius: 4px;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: bold;
          transition: all 0.2s ease;
          margin-left: 8px;
        `;
        removeBtn.onmouseover = () => {
          removeBtn.style.background = 'rgba(255,67,67,0.4)';
        };
        removeBtn.onmouseout = () => {
          removeBtn.style.background = 'rgba(255,67,67,0.2)';
        };
        
        removeBtn.addEventListener('click', async () => {
          // Use domain-based removal via background for consistency with
          // the rest of the message-based API.
          await chrome.runtime.sendMessage({
            action: 'removeBlockedSite',
            site: block.domain,
          });
          await renderActiveBlocks();
          notifyContentScript();
        });
        
        item.appendChild(info);
        item.appendChild(removeBtn);
        container.appendChild(item);
      } catch (err) {
        console.error('[FocusTube] Error rendering block item:', err);
      }
    });
  } catch (error) {
    console.error('[FocusTube] Error rendering active blocks:', error);
  }
}

async function blockSiteForDuration(domain, minutes, reason) {
  try {
    if (!domain || domain.trim().length === 0) {
      alert('❌ Please enter a website domain (e.g., instagram.com, reddit.com)');
      return false;
    }

    if (minutes <= 0 || minutes > 9999999) {
      alert('❌ Please enter valid minutes (1 to 9999999)');
      return false;
    }

    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0];

    if (!cleanDomain || cleanDomain.length === 0) {
      alert('❌ Invalid domain format');
      return false;
    }

    const blockUntil = Date.now() + (minutes * 60 * 1000);
    const blockReason = reason && reason.trim().length > 0 ? reason.trim() : cleanDomain;

    const settings = await loadSettings();
    const blockedSites = settings.blockedSites || [];
    
    // Remove existing block for this domain
    const filtered = blockedSites.filter(b => 
      !b || !b.domain ? false : 
      b.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] !== cleanDomain
    );
    
    // Add new block
    filtered.push({
      domain: cleanDomain,
      blockUntil: blockUntil,
      reason: blockReason
    });

    await saveSettings({ blockedSites: filtered });
    
    // Visual feedback
    const input = document.getElementById('site-to-block');
    const reasonInput = document.getElementById('block-reason');
    if (input) input.value = '';
    if (reasonInput) reasonInput.value = '';
    
    // Show success message
    showFeedback('site-block-30min', `✓ ${cleanDomain} blocked!`);
    
    // Update active blocks list
    await renderActiveBlocks();
    
    // Notify all tabs
    notifyContentScript();
    
    return true;
  } catch (error) {
    console.error('[FocusTube] Error blocking site:', error);
    alert('❌ Error blocking site. Check console.');
    return false;
  }
}

function addSiteBlockingListeners() {
  try {
    const siteInput = document.getElementById('site-to-block');
    const reasonInput = document.getElementById('block-reason');
    const customInput = document.getElementById('site-custom-duration');

    // Quick block buttons
    const quickButtons = {
      'site-block-30min': 30,
      'site-block-1hr': 60,
      'site-block-3hr': 180,
    };

    Object.entries(quickButtons).forEach(([id, minutes]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', async () => {
          const domain = (siteInput?.value || '').trim();
          if (domain) {
            const reason = (reasonInput?.value || '').trim();
            await blockSiteForDuration(domain, minutes, reason);
          } else {
            alert('❌ Please enter a website domain');
          }
        });
      }
    });

    // Custom duration toggle button
    const customBtn = document.getElementById('site-block-custom');
    if (customBtn) {
      customBtn.addEventListener('click', () => {
        const customBlock = document.getElementById('site-custom-block');
        if (customBlock) {
          const isHidden = customBlock.style.display === 'none' || customBlock.style.display === '';
          customBlock.style.display = isHidden ? 'flex' : 'none';
          customBtn.textContent = isHidden ? 'Custom ▼' : 'Custom ▶';
        }
      });
    }

    // Custom block submit button
    const blockBtn = document.getElementById('site-block-btn');
    if (blockBtn) {
      blockBtn.addEventListener('click', async () => {
        const domain = (siteInput?.value || '').trim();
        const reason = (reasonInput?.value || '').trim();
        const minutes = parseCustomDurationMinutes(customInput?.value || '');
        
        if (!domain) {
          alert('❌ Please enter a domain');
          return;
        }
        
        if (minutes <= 0) {
          alert('❌ Please enter valid minutes');
          return;
        }
        
        const success = await blockSiteForDuration(domain, minutes, reason);
        if (success && customInput) {
          customInput.value = '';
          const customBlock = document.getElementById('site-custom-block');
          if (customBlock) {
            customBlock.style.display = 'none';
            customBtn.textContent = 'Custom ▶';
          }
        }
      });
    }

    // Keyboard shortcuts for inputs
    if (siteInput) {
      siteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          document.getElementById('site-block-30min')?.click();
        }
      });
    }

    if (reasonInput) {
      reasonInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          document.getElementById('site-block-30min')?.click();
        }
      });
    }

    if (customInput) {
      customInput.addEventListener('input', (e) => {
        const el = e.target;
        const cleaned = sanitizeMinutesInput(el.value);
        if (cleaned !== el.value) el.value = cleaned;
      });
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('site-block-btn')?.click();
        }
      });
    }

    // Initial render of active blocks
    renderActiveBlocks();
    
    // Update active blocks every 5 seconds
    setInterval(() => renderActiveBlocks(), 5000);
  } catch (error) {
    console.error('[FocusTube] Error setting up site blocking listeners:', error);
  }
}

/**
 * Profile Logic Listeners
 */
function addProfileListeners() {
  const saveProfileBtn = document.getElementById("saveProfile");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
      const profileNameEl = document.getElementById("profileName");
      const profileGoalEl = document.getElementById("profileGoal");
      if (!profileNameEl || !profileGoalEl) return;
      
      const settings = {
        profileName: profileNameEl.value,
        profileGoal: profileGoalEl.value,
      };
      await saveSettings(settings);
      populateProfile({ ...(await loadSettings()), ...settings });
      showFeedback("saveProfile", "Profile Saved!");
    });
  }
}

/**
 * Helper: Notify Content Script
 */
async function notifyContentScript() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && !tab.url.startsWith("chrome://")) {
        chrome.tabs
          .sendMessage(tab.id, { action: "reloadSettings" })
          .catch(() => {});
      }
    }
  } catch (e) {
    console.warn("[FocusTube] Error notifying tabs:", e);
  }
}

async function notifyTimeBlockUpdate(partialSettings) {
  try {
    const tabs = await chrome.tabs.query({ url: ["https://*.youtube.com/*"] });
    for (const tab of tabs) {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "timeBlockUpdated",
          settings: partialSettings,
        })
        .catch(() => {});
    }
  } catch (error) {
    console.warn("[FocusTube] Error notifying time blocker:", error);
  }
}

/**
 * Helper: Show Feedback Button Animation
 */
function showFeedback(buttonId, message) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  const originalText = button.textContent;
  button.textContent = "✓ " + message;
  button.style.background = "var(--success-color)";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = "";
  }, 2000);
}

function updateModelDropdown(provider, settings) {
  const modelSelect = document.getElementById("aiModel");
  if (!modelSelect) return;

  const models = PROVIDER_MODELS[provider] || [];
  modelSelect.innerHTML = models
    .map((m) => `<option value="${m.value}">${m.label}</option>`)
    .join("");

  // Select current model
  const byProvider = settings.aiModelByProvider || {};
  const defaults = {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    mistral: "mistral-small-latest",
    deepseek: "deepseek-chat",
    grok: "grok-2-mini",
  };

  const currentModel =
    byProvider[provider] || settings.aiModel || defaults[provider];

  // Check if current model exists in options, if not select first or add it
  const exists = models.some((m) => m.value === currentModel);
  if (exists) {
    modelSelect.value = currentModel;
  } else if (models.length > 0) {
    modelSelect.value = models[0].value;
  }
}
