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
    mistral: "mistral-small",
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

/**
 * Load settings from Chrome storage
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(null);
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
    await chrome.storage.sync.set(settings);
    console.log("Settings saved:", settings);
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
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

  // Increment stats
  try {
    chrome.storage.sync.get(["statsQuitsEarly"], (result) => {
      chrome.storage.sync.set({
        statsQuitsEarly: (result.statsQuitsEarly || 0) + 1,
      });
    });
  } catch (e) {}

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

      // Increment stats
      try {
        chrome.storage.sync.get(["statsQuitsEarly"], (result) => {
          chrome.storage.sync.set({
            statsQuitsEarly: (result.statsQuitsEarly || 0) + 1,
          });
        });
      } catch (e) {}

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
  const settings = await loadSettings();

  // Initialize Views
  initNavigation();

  // Populate UI with current settings
  populateUI(settings);
  populateProfile(settings);
  renderBlockedKeywords(settings.blockedKeywords || []);

  // Add event listeners
  addEventListeners();
  addBlockingListeners();
  addProfileListeners();
  addKeywordBlocklistListeners();
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
    let isRecording = false;
    recordBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "toggleRecording" }, (response) => {
        if (response && response.success) {
          isRecording = response.isRecording;
          recordBtn.textContent = isRecording ? "⏹ Stop" : "🔴 Rec";
          recordBtn.style.background = isRecording
            ? "linear-gradient(to right, #4b5563, #374151)"
            : "linear-gradient(to right, #ef4444, #dc2626)";
          showFeedback(
            "toggle-recording-btn",
            isRecording ? "Started!" : "Saved!",
          );
        } else {
          showFeedback("toggle-recording-btn", "Error");
          console.error(
            "[FocusTube] Recording failed:",
            response ? response.error : "Unknown error",
          );
        }
      });
    });

    // Check initial recording state
    chrome.runtime.sendMessage({ action: "getRecordingStatus" }, (response) => {
      if (response && response.isRecording) {
        isRecording = true;
        recordBtn.textContent = "⏹ Stop";
        recordBtn.style.background =
          "linear-gradient(to right, #4b5563, #374151)";
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
    Object.values(views).forEach((el) => el.classList.remove("active"));
    views[viewName].classList.add("active");
  }

  navBtns.settings.addEventListener("click", () => switchView("settings"));
  navBtns.profile.addEventListener("click", () => {
    switchView("profile");
    // Fetch fresh profile data when entering profile view
    chrome.runtime.sendMessage({ action: "getUserProfile" }, (response) => {
      if (response && response.success && response.profile) {
        populateProfile(response.profile);
      }
    });
  });

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
  extEnabled.checked = settings.extensionEnabled;
  updateStatusText(settings.extensionEnabled);

  // Blocking Schedule
  document.getElementById("schedule-start").value = settings.scheduleBlockStart;
  document.getElementById("schedule-end").value = settings.scheduleBlockEnd;
  document.getElementById("scheduleBlockEnabled").checked =
    settings.scheduleBlockEnabled;

  // Settings View Inputs
  document.getElementById("geminiApiKey").value = settings.geminiApiKey || "";
  document.getElementById("openaiApiKey").value = settings.openaiApiKey || "";
  document.getElementById("mistralApiKey").value = settings.mistralApiKey || "";
  document.getElementById("deepseekApiKey").value =
    settings.deepseekApiKey || "";
  document.getElementById("grokApiKey").value = settings.grokApiKey || "";
  const providerSel = document.getElementById("aiProvider");
  if (providerSel) providerSel.value = settings.aiProvider || "gemini";

  // Populate models based on provider
  updateModelDropdown(providerSel.value, settings);
  document.getElementById("homePageRedirect").value =
    settings.homePageRedirect || "none";
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
  document.getElementById("profile-name-display").textContent =
    settings.profileName || "Guest User";
  document.getElementById("profile-email-display").textContent =
    settings.profileEmail || "Not logged in";
  document.getElementById("profile-goal-display").textContent =
    settings.profileGoal || "No goal set";

  const avatarContainer = document.querySelector(".profile-avatar");
  if (settings.profileImage && avatarContainer) {
    avatarContainer.innerHTML = `<img src="${settings.profileImage}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
  }

  document.getElementById("profileName").value = settings.profileName || "";
  document.getElementById("profileGoal").value = settings.profileGoal || "";

  document.getElementById("stats-time-saved").textContent = formatTime(
    settings.statsTimeSaved,
  );
  document.getElementById("stats-ads-blocked").textContent =
    settings.statsAdsBlocked;
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
  document
    .getElementById("extensionEnabled")
    .addEventListener("change", async (e) => {
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

  const navPower = document.getElementById("nav-power");
  if (navPower) {
    navPower.addEventListener("click", async () => {
      const ms = document.getElementById("extensionEnabled");
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
    document.getElementById(id).addEventListener("change", async () => {
      const settings = {
        scheduleBlockStart: document.getElementById("schedule-start").value,
        scheduleBlockEnd: document.getElementById("schedule-end").value,
        scheduleBlockEnabled: document.getElementById("scheduleBlockEnabled")
          .checked,
      };
      await saveSettings(settings);
      notifyContentScript();
    });
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
  document
    .getElementById("homePageRedirect")
    .addEventListener("change", async (e) => {
      await saveSettings({ homePageRedirect: e.target.value });
      notifyContentScript();
    });

  // API Key
  document.getElementById("saveApiKey").addEventListener("click", async () => {
    const key = document.getElementById("geminiApiKey").value;
    const providerNow = document.getElementById("aiProvider").value;
    const modelNow = document.getElementById("aiModel").value;
    const current = await loadSettings();
    const byProvider = Object.assign({}, current.aiModelByProvider || {});
    byProvider[providerNow] = modelNow;
    const settingsToSave = {
      geminiApiKey: key,
      openaiApiKey: document.getElementById("openaiApiKey").value,
      mistralApiKey: document.getElementById("mistralApiKey").value,
      deepseekApiKey: document.getElementById("deepseekApiKey").value,
      grokApiKey: document.getElementById("grokApiKey").value,
      aiProvider: providerNow,
      aiModel: modelNow,
      aiModelByProvider: byProvider,
    };
    await saveSettings(settingsToSave);
    showFeedback("saveApiKey", "Key Saved!");
    notifyContentScript();
  });

  const providerSel2 = document.getElementById("aiProvider");
  if (providerSel2) {
    providerSel2.addEventListener("change", async (e) => {
      const p = e.target.value;
      const s = await loadSettings();
      updateModelDropdown(p, s);

      // Save new provider and current model for that provider
      const aiModelInput = document.getElementById("aiModel");
      const newModel = aiModelInput.value;
      await saveSettings({ aiProvider: p, aiModel: newModel });
      notifyContentScript();
    });
  }

  const aiModelInput = document.getElementById("aiModel");
  if (aiModelInput) {
    aiModelInput.addEventListener("change", async (e) => {
      const modelVal = e.target.value;
      const provider = document.getElementById("aiProvider").value;
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
    document
      .getElementById(id)
      .addEventListener("click", () => setTempBlock(minutes));
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
        document.getElementById("block-custom").click();
      }
    });
  }

  document.getElementById("block-custom").addEventListener("click", () => {
    const mins = parseCustomDurationMinutes(customDurationInput?.value || "");
    if (mins > 0) {
      if (customDurationInput) customDurationInput.value = String(mins);
      setTempBlock(mins);
    }
  });
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
  await saveSettings({ tempBlockUntil: until });
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
 * Profile Logic Listeners
 */
function addProfileListeners() {
  document.getElementById("saveProfile").addEventListener("click", async () => {
    const settings = {
      profileName: document.getElementById("profileName").value,
      profileGoal: document.getElementById("profileGoal").value,
    };
    await saveSettings(settings);
    populateProfile(settings); // Update display immediately
    showFeedback("saveProfile", "Profile Saved!");
  });
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
    mistral: "mistral-small",
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
