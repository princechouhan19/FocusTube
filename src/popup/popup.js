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

  // Universal Site Blocking
  blockedSites: [], // Array of {domain, blockUntil (timestamp), reason}

  // Enhanced UI Controls
  hideComments: false,
  hideInfoCards: false,
  autoTheaterMode: false,
  pomodoroAdaptiveFocus: true,
  pomodoroFocusShield: true,
  siteLogos: {},
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
  // v1.1.0 new toggles
  "aiNudgeEnabled",
  "quizStreakMultiplier",
  "pomodoroDeepWork",
  "pomodoroAdaptiveFocus",
  "pomodoroFocusShield",
  "pomodoroNotify",
  // v1.17.0 — Companion + Vim nav (flat storage keys, read live by the
  // content scripts through their own storage listeners)
  "companionEnabled",
  "vimNavEnabled",
  "sleepGuardEnabled",
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

  // v1.1.0: pick topic based on user's configured difficulty.
  // Falls back to the legacy random-across-all-topics behavior if the
  // difficulty setting is missing or invalid.
  let candidateTopics;
  const difficulty =
    (window.__focusTubeSettings && window.__focusTubeSettings.quizDifficulty) ||
    "easy";

  if (
    typeof QUIZ_DIFFICULTY_TOPICS !== "undefined" &&
    Array.isArray(QUIZ_DIFFICULTY_TOPICS[difficulty]) &&
    QUIZ_DIFFICULTY_TOPICS[difficulty].length > 0
  ) {
    candidateTopics = QUIZ_DIFFICULTY_TOPICS[difficulty].filter(
      (t) => Array.isArray(QUIZ_QUESTIONS[t]) && QUIZ_QUESTIONS[t].length > 0,
    );
  }
  if (!candidateTopics || candidateTopics.length === 0) {
    candidateTopics = Object.keys(QUIZ_QUESTIONS);
  }

  // v1.1.0 streak multiplier: if user has a high pomodoro streak,
  // escalate the difficulty one level for this quiz.
  if (
    window.__focusTubeSettings &&
    window.__focusTubeSettings.quizStreakMultiplier
  ) {
    const completed = Number(window.__focusTubeSettings.statsPomodoroCompleted) || 0;
    if (completed >= 8 && difficulty === "easy") {
      candidateTopics = QUIZ_DIFFICULTY_TOPICS.medium.filter(
        (t) => Array.isArray(QUIZ_QUESTIONS[t]) && QUIZ_QUESTIONS[t].length > 0,
      );
    } else if (completed >= 16 && difficulty !== "hard") {
      candidateTopics = QUIZ_DIFFICULTY_TOPICS.hard.filter(
        (t) => Array.isArray(QUIZ_QUESTIONS[t]) && QUIZ_QUESTIONS[t].length > 0,
      );
    }
  }

  quizState.currentTopic =
    candidateTopics[Math.floor(Math.random() * candidateTopics.length)];

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
    container.style.background = "rgba(48, 209, 88, 0.22)";
    setTimeout(() => {
      container.style.background = "";
      nextQuestion();
    }, 400);
  } else {
    const container = document.getElementById("quiz-question-container");
    container.style.background = "rgba(255, 69, 58, 0.22)";
    setTimeout(() => {
      container.style.background = "";
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
  console.log("%c[FocusTube Popup] 🚀 Initializing popup...", "color:#d9a62e;font-weight:bold");

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

  // v1.1.0: expose settings globally so startQuiz() can read difficulty
  // and pomodoro-streak multiplier without re-loading from storage.
  window.__focusTubeSettings = settings;

  // Initialize Views
  initNavigation();

  // Populate UI with current settings
  populateUI(settings);
  populateProfile(settings);
  renderBlockedKeywords(settings.blockedKeywords || []);
  
  // Render active blocks + home summary on load
  await renderActiveBlocks();
  renderHomeSummary();

  // Keep block countdowns and the home summary fresh
  setInterval(() => {
    renderActiveBlocks();
    renderHomeSummary();
  }, 5000);

  // Version line in Settings → About
  const versionEl = document.getElementById("popup-version");
  if (versionEl) {
    try {
      versionEl.textContent = `FocusTube v${chrome.runtime.getManifest().version}`;
    } catch (_) {}
  }

  // Add event listeners
  addEventListeners();
  addBlockingListeners();
  addProfileListeners();
  addKeywordBlocklistListeners();
  addSiteBlockingListeners();
  initQuizListeners();

  // v1.1.0 new feature UIs
  initPomodoroUI();
  initSmartListsUI();
  initTabManagerUI();
  initTimeLimitUI();

  // Dashboard Button
  const dashBtn = document.getElementById("open-dashboard-btn");
  if (dashBtn) {
    dashBtn.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/dashboard/dashboard.html"),
      });
    });
  }

  // v1.15.0 — Focus Rings card "Details" jumps to the dashboard, where the
  // full-size rings, legend and streak live.
  const ringsDetailsBtn = document.getElementById("rings-open-dashboard");
  if (ringsDetailsBtn) {
    ringsDetailsBtn.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/dashboard/dashboard.html"),
      });
    });
  }

});

/**
 * Navigation Logic — v1.4.0 tab-based bottom nav
 */
function initNavigation() {
  const views = {
    home: document.getElementById("home-view"),
    focus: document.getElementById("focus-view"),
    youtube: document.getElementById("youtube-view"),
    settings: document.getElementById("settings-view"),
    profile: document.getElementById("profile-view"),
  };

  const tabBtns = document.querySelectorAll(".tab-btn");

  function switchView(viewName) {
    console.log("%c[FocusTube Popup] → switchView:", "color:#cf9448", viewName);
    Object.values(views).forEach((el) => {
      if (el) el.classList.remove("active");
    });
    if (views[viewName]) {
      views[viewName].classList.add("active");
    } else {
      console.error("[FocusTube] View not found:", viewName);
    }
    // Update tab bar active state
    tabBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === viewName);
    });
  }

  // Tab bar click handlers
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab) switchView(tab);
    });
  });

  // Profile nav button (top bar)
  const navProfile = document.getElementById("nav-profile");
  if (navProfile) {
    navProfile.addEventListener("click", () => {
      switchView("profile");
      chrome.runtime.sendMessage({ action: "getUserProfile" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[FocusTube] getUserProfile (nav):", chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success && response.profile) {
          populateProfile(response.profile);
        }
      });
    });
  }

  // Back buttons (for profile view)
  document.querySelectorAll(".back-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView("home");
    });
  });

  // Any element with data-goto jumps to that view — Home quick actions,
  // "Manage"/"Limits" card links, and the pomodoro chip use this.
  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => switchView(el.dataset.goto));
  });

  // Home quick action: start a Pomodoro and jump to the Focus tab.
  const quickFocus = document.getElementById("quick-focus-session");
  if (quickFocus) {
    quickFocus.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "pomodoroStart" }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp && resp.success) updatePomodoroDisplay(resp.status);
      });
      switchView("focus");
    });
  }

  // Home quick action: block YouTube for 30 minutes.
  const quickBlock = document.getElementById("quick-block-yt");
  if (quickBlock) {
    quickBlock.addEventListener("click", async () => {
      await setTempBlock(30);
      // Feedback on the inner label only — replacing textContent on the
      // button itself would drop its icon element.
      const label = quickBlock.querySelector("span");
      if (label) {
        const original = label.textContent;
        label.textContent = "✓ Blocked!";
        setTimeout(() => {
          label.textContent = original;
        }, 1600);
      }
      renderHomeSummary();
    });
  }
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

  // v1.1.0 — Quiz difficulty
  const quizDiffSel = document.getElementById("quizDifficulty");
  if (quizDiffSel) {
    quizDiffSel.value = ["easy", "medium", "hard"].includes(settings.quizDifficulty)
      ? settings.quizDifficulty
      : "easy";
  }

  // Toggles
  TOGGLES_LIST.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = settings[id];
  });
  // v1.17.0 — companion defaults ON (matches companion.js: enabled unless
  // explicitly set false); keep the popup toggle honest on first run.
  const companionToggle = document.getElementById("companionEnabled");
  if (companionToggle && settings.companionEnabled === undefined) {
    companionToggle.checked = true;
  }

  // v1.17.0 — Unblock friction tier + Sleep Guard times
  const gateSel = document.getElementById("unblockGateTier");
  if (gateSel) {
    gateSel.value = ["off", "standard", "strict"].includes(settings.unblockGateTier)
      ? settings.unblockGateTier
      : "standard";
  }
  const sgStart = document.getElementById("sleep-guard-start");
  const sgEnd = document.getElementById("sleep-guard-end");
  if (sgStart) sgStart.value = settings.sleepGuardStart || "22:30";
  if (sgEnd) sgEnd.value = settings.sleepGuardEnd || "07:00";
}

function updateStatusText(enabled) {
  const text = document.getElementById("status-text");
  const powerBtn = document.getElementById("nav-power");
  if (enabled) {
    if (text) {
      text.textContent = "Active and protecting";
      text.style.color = "var(--ios-green)";
    }
    if (powerBtn) {
      powerBtn.classList.remove("disabled");
    }
  } else {
    if (text) {
      text.textContent = "Extension disabled";
      text.style.color = "var(--ios-red)";
    }
    if (powerBtn) {
      powerBtn.classList.add("disabled");
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

  /**
   * Default avatar — design-system user icon (ink on amber).
   * Replaces the old emoji fallback so the popup stays on-palette.
   */
  function renderDefaultAvatar(container) {
    if (!container) return;
    container.textContent = "";
    const icon = document.createElement("i");
    icon.setAttribute("data-icon", "user");
    icon.className = "ft-icon ft-icon-xl";
    container.appendChild(icon);
    if (window.FocusTubeIcons) {
      window.FocusTubeIcons.injectAll(container);
    }
  }

  if (avatarContainer) {
    if (settings.profileImage) {
      // SECURITY: build the avatar with DOM APIs so a malicious profileImage
      // value (e.g. javascript: URL) cannot execute script in the popup.
      // referrerPolicy=no-referrer prevents leaking the extension's origin
      // to whoever hosts the avatar image.
      avatarContainer.textContent = "";
      const img = document.createElement("img");
      img.style.cssText =
        "width: 100%; height: 100%; border-radius: 50%; object-fit: cover;";
      img.referrerPolicy = "no-referrer";
      img.alt = "Profile avatar";
      // Only allow http(s) URLs.
      const src = String(settings.profileImage);
      if (/^https?:\/\//i.test(src)) {
        img.src = src;
        avatarContainer.appendChild(img);
      } else {
        renderDefaultAvatar(avatarContainer);
      }
    } else {
      renderDefaultAvatar(avatarContainer);
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

// v1.14.0 — human hours for per-site usage: "8h 10m" instead of "490.0 min".
// One decimal is kept only below 10 minutes, where precision still matters.
function formatUsageMinutes(minutes) {
  const safe = Number(minutes) || 0;
  if (safe >= 60) {
    const h = Math.floor(safe / 60);
    const m = Math.round(safe % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return safe > 0 && safe < 10 ? `${safe.toFixed(1)}m` : `${Math.round(safe)}m`;
}

// v1.15.0 — Focus Rings on Home: today's Apple-Fitness-style ritual at a
// glance. Reads today's daily analytics straight from storage (the same
// recordMetric shape the dashboard rings consume), so no extra messaging is
// needed and the card still renders when the service worker is asleep.
function fgTodayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function renderHomeRings() {
  const viz = document.getElementById("home-rings-viz");
  const status = document.getElementById("home-rings-status");
  if (!viz || typeof FGRings === "undefined") return;
  try {
    const stored = await chrome.storage.local.get(["focusAnalyticsDaily"]);
    const goals = await FGRings.readGoals();
    const analytics = (stored && stored.focusAnalyticsDaily) || {};
    const day = analytics[fgTodayKey()] || {};
    const ringData = FGRings.compute(day, goals);
    FGRings.render(viz, ringData, { size: 76, animate: true });
    // v1.16.0 — celebrate rings that closed since the last visit (deduped by
    // storage, so this never replays on a simple popup re-open).
    const todayKey = fgTodayKey();
    if (typeof FGRings.maybeCelebrate === "function") {
      FGRings.maybeCelebrate(viz, ringData, { dayKey: todayKey, todayKey }).catch(() => {});
    }
    if (status) {
      status.textContent = ringData.allClosed
        ? "All three closed — brilliant."
        : `${ringData.closedCount} of 3 closed — ${3 - ringData.closedCount} to go today`;
    }

    // v1.17.0 — insurance hint line (freezes banked / repair available).
    try {
      const insEl = document.getElementById("home-rings-insurance");
      if (insEl && typeof FGRings.insuranceFromPoints === "function") {
        const month = FGRings.monthPointsFromAnalytics
          ? FGRings.monthPointsFromAnalytics(analytics)
          : Object.keys(analytics)
              .sort()
              .slice(-28)
              .map((key) => ({ ...analytics[key], dayKey: key }));
        const ins = FGRings.insuranceFromPoints(month, goals);
        const parts = [];
        if (ins.freezesLeft > 0) parts.push(`🛡 ${ins.freezesLeft} freeze${ins.freezesLeft > 1 ? "s" : ""} banked`);
        if (ins.repair) {
          const remaining = Math.max(0, ins.repair.neededMinutes - ins.repair.haveMinutes);
          parts.push(`🔧 ${FGRings.formatMinutes(remaining)} focus left to repair`);
        }
        insEl.textContent = parts.join(" · ");
        insEl.hidden = parts.length === 0;
      }
    } catch (_) { /* insurance line is cosmetic */ }
  } catch (err) {
    if (status) status.textContent = "Rings unavailable right now";
    console.warn("[FocusTube] Home rings failed:", err);
  }
}

// ---------------------------------------------------------------------------
// v1.16.0 — Focus Rings goals editor (Settings → Focus Rings Goals).
// Writes the `focusRingsGoals` storage key that FGRings.readGoals() merges;
// the same key powers the dashboard, digest and popup rings.
// ---------------------------------------------------------------------------

const RINGS_GOALS_STORAGE_KEY = "focusRingsGoals";
const RINGS_GOAL_KEYS = { deflected: "deflected", focused: "focusMinutes", saved: "savedMinutes" };

function clampRingsGoal(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

async function loadRingsGoalsRaw() {
  try {
    const stored = await chrome.storage.local.get(RINGS_GOALS_STORAGE_KEY);
    const raw = stored && stored[RINGS_GOALS_STORAGE_KEY];
    return raw && typeof raw === "object" ? raw : {};
  } catch (_) {
    return {};
  }
}

async function initRingsGoalsEditor() {
  const panel = document.getElementById("rings-goals-panel");
  if (!panel || panel.dataset.bound) return;
  panel.dataset.bound = "1";

  const raw = await loadRingsGoalsRaw();
  const state = {
    deflected: clampRingsGoal(raw.deflected, 1, 200, 12),
    focusMinutes: clampRingsGoal(raw.focusMinutes, 15, 480, 120),
    savedMinutes: clampRingsGoal(raw.savedMinutes, 10, 480, 60),
  };

  const valueEls = {
    deflected: document.getElementById("rings-goal-deflected"),
    focused: document.getElementById("rings-goal-focused"),
    saved: document.getElementById("rings-goal-saved"),
  };

  const paint = () => {
    if (valueEls.deflected) valueEls.deflected.textContent = String(state.deflected);
    if (valueEls.focused) valueEls.focused.textContent = FGRings.formatMinutes(state.focusMinutes);
    if (valueEls.saved) valueEls.saved.textContent = FGRings.formatMinutes(state.savedMinutes);
  };
  paint();

  let saveTimer = null;
  const persistSoon = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      try {
        await chrome.storage.local.set({ [RINGS_GOALS_STORAGE_KEY]: { ...state } });
      } catch (_) {
        return;
      }
      // The rings read goals on every render — repaint the Home card now.
      renderHomeRings();
    }, 350);
  };

  panel.querySelectorAll(".rings-stepper").forEach((stepper) => {
    stepper.addEventListener("click", (e) => {
      const btn = e.target.closest(".rings-step-btn");
      if (!btn) return;
      const key = RINGS_GOAL_KEYS[stepper.dataset.ring];
      if (!key) return;
      const step = Number(stepper.dataset.step) || 1;
      const min = Number(stepper.dataset.min) || 1;
      const max = Number(stepper.dataset.max) || 480;
      const dir = Number(btn.dataset.dir) || 1;
      state[key] = Math.min(max, Math.max(min, state[key] + dir * step));
      paint();
      persistSoon();
    });
  });
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

  // v1.1.0 — Quiz difficulty selector
  const quizDiff = document.getElementById("quizDifficulty");
  if (quizDiff) {
    quizDiff.addEventListener("change", async (e) => {
      const val = e.target.value;
      if (["easy", "medium", "hard"].includes(val)) {
        await saveSettings({ quizDifficulty: val });
        if (window.__focusTubeSettings) {
          window.__focusTubeSettings.quizDifficulty = val;
        }
        notifyContentScript();
      }
    });
  }

  // v1.17.0 — Unblock friction tier (shared/unblock-gate.js reads it)
  const gateSel = document.getElementById("unblockGateTier");
  if (gateSel) {
    gateSel.addEventListener("change", async (e) => {
      const val = e.target.value;
      if (["off", "standard", "strict"].includes(val)) {
        await saveSettings({ unblockGateTier: val });
      }
    });
  }

  // v1.17.0 — Sleep Guard times (time-blocker + background wind-down read
  // sleepGuardStart / sleepGuardEnd straight from storage)
  const sgStart = document.getElementById("sleep-guard-start");
  const sgEnd = document.getElementById("sleep-guard-end");
  if (sgStart) {
    sgStart.addEventListener("change", async (e) => {
      if (/^\d{2}:\d{2}$/.test(e.target.value)) {
        await saveSettings({ sleepGuardStart: e.target.value });
        notifyContentScript();
      }
    });
  }
  if (sgEnd) {
    sgEnd.addEventListener("change", async (e) => {
      if (/^\d{2}:\d{2}$/.test(e.target.value)) {
        await saveSettings({ sleepGuardEnd: e.target.value });
        notifyContentScript();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// v1.1.0: Pomodoro Timer UI
// ---------------------------------------------------------------------------

let pomodoroPollInterval = null;

async function initPomodoroUI() {
  // Restore settings toggles
  const settings = await loadSettings();
  const deepWorkEl = document.getElementById("pomodoro-deep-work");
  const adaptiveEl = document.getElementById("pomodoro-adaptive-focus");
  const shieldEl = document.getElementById("pomodoro-focus-shield");
  const notifyEl = document.getElementById("pomodoro-notify");
  if (deepWorkEl) deepWorkEl.checked = !!settings.pomodoroDeepWork;
  if (adaptiveEl) adaptiveEl.checked = settings.pomodoroAdaptiveFocus !== false;
  if (shieldEl) shieldEl.checked = settings.pomodoroFocusShield !== false;
  if (notifyEl) notifyEl.checked = settings.pomodoroNotify !== false;

  // Wire up control buttons
  const wire = (id, action) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action }, (resp) => {
          if (chrome.runtime.lastError) {
            console.warn("[FocusTube Pomodoro]", chrome.runtime.lastError.message);
            return;
          }
          if (resp && resp.success) updatePomodoroDisplay(resp.status);
        });
      });
    }
  };
  wire("pomodoro-start", "pomodoroStart");
  wire("pomodoro-pause", "pomodoroPause");
  wire("pomodoro-skip", "pomodoroSkip");
  wire("pomodoro-stop", "pomodoroStop");

  // Wire up settings toggles
  if (deepWorkEl) {
    deepWorkEl.addEventListener("change", async (e) => {
      await saveSettings({ pomodoroDeepWork: e.target.checked });
    });
  }
  if (adaptiveEl) {
    adaptiveEl.addEventListener("change", async (e) => {
      await saveSettings({ pomodoroAdaptiveFocus: e.target.checked });
    });
  }
  if (shieldEl) {
    shieldEl.addEventListener("change", async (e) => {
      await saveSettings({ pomodoroFocusShield: e.target.checked });
    });
  }
  if (notifyEl) {
    notifyEl.addEventListener("change", async (e) => {
      await saveSettings({ pomodoroNotify: e.target.checked });
    });
  }

  // Initial status fetch
  chrome.runtime.sendMessage({ action: "pomodoroStatus" }, (resp) => {
    if (chrome.runtime.lastError) return;
    if (resp && resp.success) updatePomodoroDisplay(resp.status);
  });

  // Poll status every 1 second while popup is open
  pomodoroPollInterval = setInterval(() => {
    chrome.runtime.sendMessage({ action: "pomodoroStatus" }, (resp) => {
      if (chrome.runtime.lastError) return;
      if (resp && resp.success) updatePomodoroDisplay(resp.status);
    });
  }, 1000);
}

function updatePomodoroDisplay(status) {
  if (!status) return;
  const phaseEl = document.getElementById("pomodoro-phase-label");
  const timeEl = document.getElementById("pomodoro-time");
  const cycleEl = document.getElementById("pomodoro-cycle-label");
  if (!phaseEl || !timeEl || !cycleEl) return;

  // Home hero chip mirrors the countdown while a session runs.
  const chip = document.getElementById("home-pomodoro-chip");
  const chipTime = document.getElementById("home-pomodoro-time");

  if (!status.active) {
    phaseEl.textContent = "Ready";
    const planned = status.settings?.plannedFocusMinutes || 25;
    timeEl.textContent = `${String(planned).padStart(2, "0")}:00`;
    cycleEl.textContent = "Cycle 1 of 4";
    if (chip) chip.classList.add("yfp-hidden");
    return;
  }

  const phaseLabel = {
    focus: "🎯 Focus",
    "short-break": "☕ Short Break",
    "long-break": "🌿 Long Break",
  }[status.phase] || status.phase;

  phaseEl.textContent = (status.paused ? "⏸ Paused · " : "") + phaseLabel;
  const ms = status.remainingMs || 0;
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  timeEl.textContent = `${mm}:${ss}`;

  if (chip && chipTime) {
    chip.classList.remove("yfp-hidden");
    chipTime.textContent = `${mm}:${ss}`;
    chip.title = `${status.paused ? "Paused — " : ""}${phaseLabel} — open Focus`;
  }

  const cycles = status.settings?.cyclesBeforeLongBreak || 4;
  const cur = status.cycle || 1;
  const plan = status.settings?.adaptiveFocus
    ? ` · adaptive ${status.settings?.plannedFocusMinutes || 25}m`
    : "";
  cycleEl.textContent = `Cycle ${cur} of ${cycles}${plan}`;
}

// ---------------------------------------------------------------------------
// v1.1.0: Smart Lists UI
// ---------------------------------------------------------------------------

async function initSmartListsUI() {
  const grid = document.getElementById("smart-lists-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const settings = await loadSettings();
  const enabled = Array.isArray(settings.smartListsEnabled)
    ? settings.smartListsEnabled
    : [];

  // The popup has no content scripts, so the Smart Lists module isn't
  // loaded. We inline the categories here so the popup works standalone.
  // The content-script version (smart-lists.js) is the source of truth
  // for actually blocking requests; this inline copy is UI-only.
  // Colors follow the design-system palette (muted, editorial).
  const categories = [
    { id: "social", label: "Social Media", icon: "users", color: "#8a97c6" },
    { id: "shopping", label: "Shopping", icon: "cart", color: "#8fb77a" },
    { id: "gaming", label: "Gaming", icon: "gamepad", color: "#b18bc9" },
    { id: "news", label: "News", icon: "news", color: "#cf9448" },
    { id: "messaging", label: "Messaging", icon: "message", color: "#c9809b" },
    { id: "streaming", label: "Streaming", icon: "film", color: "#c96a62" },
    { id: "adult", label: "Adult Content", icon: "alert", color: "#a05050" },
  ];

  // Helper to update a chip's visual state.
  function applyState(chip, dot, cat, isOn) {
    Object.assign(chip.style, {
      background: isOn
        ? `rgba(${hexToRgb(cat.color)}, 0.18)`
        : "rgba(255,255,255,0.04)",
      borderColor: isOn ? cat.color : "rgba(255,255,255,0.08)",
    });
    dot.style.background = isOn ? cat.color : "rgba(255,255,255,0.2)";
    chip.setAttribute("aria-pressed", String(isOn));
    chip.title = `${isOn ? "Unblock" : "Block"} ${cat.label}`;
  }

  categories.forEach((cat) => {
    // Capture the initial state in a closure variable that we mutate.
    let isOn = enabled.includes(cat.id);

    const chip = document.createElement("div");
    chip.setAttribute("role", "button");
    chip.tabIndex = 0;
    Object.assign(chip.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 12px",
      borderRadius: "10px",
      cursor: "pointer",
      transition: "all 0.2s ease",
    });

    // Design-system stroke icon (matches the rest of the popup — no emojis).
    const iconHost = document.createElement("i");
    iconHost.setAttribute("data-icon", cat.icon);
    iconHost.className = "ft-icon ft-icon-md";
    iconHost.style.color = cat.color;
    iconHost.style.flexShrink = "0";
    chip.appendChild(iconHost);

    const label = document.createElement("span");
    label.style.cssText =
      "flex: 1; color: var(--ios-label); font-size: 12px; font-weight: 500;";
    label.textContent = cat.label;
    chip.appendChild(label);

    const dot = document.createElement("span");
    Object.assign(dot.style, {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
    });
    chip.appendChild(dot);

    // Render the SVG into the icon host (icons.js exposes injectAll).
    if (window.FocusTubeIcons) {
      window.FocusTubeIcons.injectAll(chip);
    }

    applyState(chip, dot, cat, isOn);

    chip.onmouseenter = () => {
      chip.style.transform = "translateY(-1px)";
    };
    chip.onmouseleave = () => {
      chip.style.transform = "translateY(0)";
    };
    const toggleCategory = async () => {
      const next = !isOn;
      isOn = next; // update closure
      applyState(chip, dot, cat, next);

      // Persist via background (which fans out to all content scripts).
      const newEnabled = next
        ? Array.from(new Set([...enabled, cat.id]))
        : enabled.filter((c) => c !== cat.id);
      try {
        await chrome.runtime.sendMessage({
          action: "updateSettings",
          settings: { smartListsEnabled: newEnabled },
        });
      } catch (_) {}

      // Refresh local cache so subsequent toggles see the new state.
      enabled.length = 0;
      enabled.push(...newEnabled);
    };
    chip.onclick = toggleCategory;
    chip.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCategory();
      }
    };

    grid.appendChild(chip);
  });
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return "255,255,255";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

// ---------------------------------------------------------------------------
// v1.1.0: Tab Manager UI
// ---------------------------------------------------------------------------

async function initTabManagerUI() {
  const saveBtn = document.getElementById("tab-save-workspace");
  const loadBtn = document.getElementById("tab-load-workspace");
  const groupBtn = document.getElementById("tab-group-domain");
  const closeBtn = document.getElementById("tab-close-all");

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const name = prompt("Workspace name?", "Work");
      if (!name) return;
      chrome.runtime.sendMessage(
        { action: "saveWorkspace", name },
        (resp) => {
          if (chrome.runtime.lastError) return;
          if (resp && resp.success) {
            showFeedback("tab-save-workspace", `Saved ${resp.count} tabs`);
            refreshWorkspaceList();
          }
        },
      );
    });
  }

  if (loadBtn) {
    loadBtn.addEventListener("click", async () => {
      const stored = await chrome.storage.local.get("workspaces");
      const workspaces = stored.workspaces || {};
      const names = Object.keys(workspaces);
      if (names.length === 0) {
        alert("No saved workspaces. Use 'Save' first.");
        return;
      }
      const name = prompt(`Load which workspace? (${names.join(", ")})`, names[0]);
      if (!name) return;
      chrome.runtime.sendMessage({ action: "loadWorkspace", name }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp && resp.success) {
          showFeedback("tab-load-workspace", `Loaded ${resp.count} tabs`);
        } else {
          alert(resp?.error || "Could not load workspace");
        }
      });
    });
  }

  if (groupBtn) {
    groupBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "groupByDomain" }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp && resp.success) {
          showFeedback("tab-group-domain", `${resp.groups} groups`);
        }
      });
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (!confirm("Close all non-YouTube tabs in this window?")) return;
      chrome.runtime.sendMessage({ action: "closeAllTabs" }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp && resp.success) {
          showFeedback("tab-close-all", `Closed ${resp.closed}`);
        }
      });
    });
  }

  refreshWorkspaceList();
}

async function refreshWorkspaceList() {
  const list = document.getElementById("workspace-list");
  if (!list) return;
  list.innerHTML = "";
  const stored = await chrome.storage.local.get("workspaces");
  const workspaces = stored.workspaces || {};
  for (const [name, w] of Object.entries(workspaces)) {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 8px",
      fontSize: "11px",
      color: "var(--ios-label-2)",
      background: "rgba(255,255,255,0.04)",
      borderRadius: "6px",
      marginBottom: "4px",
    });
    const left = document.createElement("span");
    left.textContent = `${name} · ${w.tabs?.length || 0} tabs`;
    row.appendChild(left);

    const del = document.createElement("button");
    del.textContent = "✕";
    Object.assign(del.style, {
      background: "transparent",
      border: "none",
      color: "var(--ios-red)",
      cursor: "pointer",
      fontSize: "12px",
    });
    del.onclick = async () => {
      const next = { ...workspaces };
      delete next[name];
      await chrome.storage.local.set({ workspaces: next });
      refreshWorkspaceList();
    };
    row.appendChild(del);
    list.appendChild(row);
  }
}

// ---------------------------------------------------------------------------
// v1.3.0: Time Limit UI
// ---------------------------------------------------------------------------

async function initTimeLimitUI() {
  const addBtn = document.getElementById("time-limit-add");
  const domainInput = document.getElementById("time-limit-domain");
  const minutesInput = document.getElementById("time-limit-minutes");

  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      const domain = (domainInput?.value || "").trim().toLowerCase();
      const minutes = parseInt(minutesInput?.value || "0", 10);
      if (!domain) {
        showFeedback("time-limit-add", "Enter domain");
        return;
      }
      if (!minutes || minutes < 1) {
        showFeedback("time-limit-add", "Enter minutes");
        return;
      }
      await chrome.runtime.sendMessage({
        action: "setTimeLimit",
        domain,
        minutes,
      });
      domainInput.value = "";
      minutesInput.value = "";
      showFeedback("time-limit-add", `Limit set: ${domain}`);
      refreshTimeUsage();
    });
  }

  // Enter key on either input
  [domainInput, minutesInput].forEach((el) => {
    if (el) {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addBtn?.click();
        }
      });
    }
  });

  // Initial render
  refreshTimeUsage();

  // Refresh every 5 seconds while popup is open
  setInterval(refreshTimeUsage, 5000);
}

// v1.14.0 — per-site Focus Timer UI (Time Limits capsules).
const FOCUS_TIMER_PRESETS = [15, 30, 60, 120];
const FOCUS_TIMER_CLOCK_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

function formatRemainingShort(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

let siteTimerTicker = null;

/** Live countdown for every visible Focus Timer chip (1s cadence). */
function startSiteTimerTicker() {
  if (siteTimerTicker) clearInterval(siteTimerTicker);
  siteTimerTicker = setInterval(() => {
    const chips = document.querySelectorAll(".site-timer-chip[data-until]");
    if (chips.length === 0) return;
    let expired = false;
    chips.forEach((chip) => {
      const until = Number(chip.dataset.until) || 0;
      const remaining = until - Date.now();
      if (remaining <= 0) {
        expired = true;
        return;
      }
      const label = formatRemainingShort(remaining);
      if (chip.textContent !== label) chip.textContent = label;
    });
    if (expired) refreshTimeUsage();
  }, 1000);
}

/** Open (or close) the inline duration picker inside one site capsule. */
function toggleTimerPicker(capsuleRow, domain) {
  const existing = capsuleRow.querySelector(".site-timer-picker");
  document
    .querySelectorAll(".site-timer-picker")
    .forEach((p) => p.remove());
  if (existing) return; // this capsule's picker was just closed

  const picker = document.createElement("div");
  picker.className = "site-timer-picker";
  picker.setAttribute("role", "group");
  picker.setAttribute("aria-label", `Focus timer duration for ${domain}`);

  const start = async (minutes) => {
    if (!minutes || minutes <= 0) return;
    // Close the picker FIRST: the guarded refresh skips re-rendering
    // while a picker is open, so the new countdown chip must be drawn
    // into a list without one.
    picker.remove();
    try {
      await chrome.runtime.sendMessage({
        action: "setSiteTimer",
        domain,
        minutes,
      });
    } catch (_) {}
    refreshTimeUsage();
  };

  FOCUS_TIMER_PRESETS.forEach((minutes) => {
    const preset = document.createElement("button");
    preset.className = "site-timer-preset";
    preset.textContent = minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`;
    preset.title = `Block ${domain} for ${minutes >= 60 ? `${minutes / 60} hour${minutes > 60 ? "s" : ""}` : `${minutes} minutes`}`;
    preset.addEventListener("click", () => start(minutes));
    picker.appendChild(preset);
  });

  const input = document.createElement("input");
  input.className = "site-timer-input glass-input";
  input.type = "number";
  input.min = "1";
  input.max = "1440";
  input.placeholder = "min";
  input.setAttribute("aria-label", "Custom minutes");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      start(parseCustomDurationMinutes(input.value));
    }
  });
  picker.appendChild(input);

  const go = document.createElement("button");
  go.className = "site-timer-start";
  go.textContent = "Start";
  go.addEventListener("click", () =>
    start(parseCustomDurationMinutes(input.value)),
  );
  picker.appendChild(go);

  capsuleRow.appendChild(picker);
  input.focus();
}

async function refreshTimeUsage() {
  const container = document.getElementById("time-usage-list");
  if (!container) return;

  // v1.14.0 — while a Focus Timer duration picker is open, skip the
  // periodic re-render: rebuilding the list would yank the picker (and
  // its input focus) out from under the user. Timer chips keep ticking
  // on their own 1s ticker meanwhile.
  if (container.querySelector(".site-timer-picker")) return;

  let resp;
  try {
    resp = await chrome.runtime.sendMessage({ action: "getTimeUsage" });
  } catch (_) {
    return;
  }
  if (!resp || !resp.success) return;

  const { today, limits, logos = {}, siteTimers = {} } = resp;
  container.innerHTML = "";

  // Build a combined set of domains: those with limits + those with usage today.
  const allDomains = new Set([
    ...Object.keys(limits || {}),
    ...Object.keys(today || {}),
  ]);

  if (allDomains.size === 0) {
    const empty = document.createElement("p");
    empty.style.cssText =
      "color: var(--ios-label-3); font-size: 11px; text-align: center; padding: 8px;";
    empty.textContent = "No time limits set. Add one above.";
    container.appendChild(empty);
    renderHomeUsage([], today || {}, limits || {});
    return;
  }

  // Sort by usage (desc), then by limit (desc).
  const sorted = Array.from(allDomains).sort((a, b) => {
    const ua = today[a] || 0;
    const ub = today[b] || 0;
    if (ub !== ua) return ub - ua;
    return (limits[b] || 0) - (limits[a] || 0);
  });

  for (const domain of sorted) {
    const usedMin = today[domain] || 0;
    const limitMin = limits[domain] || 0;
    const pct = limitMin > 0 ? Math.min(100, (usedMin / limitMin) * 100) : 0;
    const isOver = limitMin > 0 && usedMin >= limitMin;

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      padding: "8px 10px",
      marginBottom: "6px",
      background: isOver
        ? "var(--ios-red-soft)"
        : "var(--ios-fill-4)",
      border: `1px solid ${isOver ? "var(--ios-red-border)" : "var(--ios-sep)"}`,
      borderRadius: "var(--ios-r-md)",
    });

    // Top row: domain + delete
    const top = document.createElement("div");
    Object.assign(top.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    });

    const identity = document.createElement("div");
    Object.assign(identity.style, { display: "flex", alignItems: "center", gap: "7px", minWidth: 0 });
    const logo = document.createElement("img");
    const logoEntry = logos[domain];
    const logoUrl = typeof logoEntry === "string" ? logoEntry : logoEntry?.url;
    logo.src = /^https?:\/\//i.test(logoUrl || "") ? logoUrl : `https://${domain}/favicon.ico`;
    logo.alt = "";
    logo.setAttribute("aria-hidden", "true");
    Object.assign(logo.style, {
      width: "18px", height: "18px", flex: "0 0 18px", borderRadius: "5px",
      objectFit: "contain", background: "var(--ios-fill-4)",
    });
    logo.onerror = () => {
      logo.style.display = "none";
    };
    identity.appendChild(logo);

    const name = document.createElement("span");
    name.style.cssText =
      "color: var(--ios-label); font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
    name.textContent = domain;
    identity.appendChild(name);

    const del = document.createElement("button");
    del.textContent = "✕";
    Object.assign(del.style, {
      background: "transparent",
      border: "none",
      color: "var(--ios-label-3)",
      cursor: "pointer",
      fontSize: "12px",
      padding: "2px 6px",
    });
    del.onclick = async () => {
      await chrome.runtime.sendMessage({
        action: "setTimeLimit",
        domain,
        minutes: 0,
      });
      refreshTimeUsage();
    };

    // v1.14.0 — right-side Focus Timer control. Shows a live countdown
    // chip while a timer runs on this site, otherwise a compact button
    // that opens the inline duration picker. A site under a permanent /
    // daily-limit block shows a static "Blocked" tag instead.
    const right = document.createElement("div");
    Object.assign(right.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    });

    const timerUntil = Number(siteTimers[domain]) || 0;
    const permanentBlock = (resp.blockedSites || []).some(
      (b) =>
        b &&
        b.domain &&
        String(b.domain).replace(/^(https?:\/\/)?(www\.)?/, "") === domain &&
        Number(b.blockUntil) > Date.now() &&
        b.reason !== "Focus Timer",
    );

    if (timerUntil > Date.now()) {
      const chip = document.createElement("button");
      chip.className = "site-timer-chip";
      chip.dataset.until = String(timerUntil);
      chip.textContent = formatRemainingShort(timerUntil - Date.now());
      chip.title = "Focus Timer running — click to end early";
      chip.onclick = async () => {
        try {
          await chrome.runtime.sendMessage({
            action: "setSiteTimer",
            domain,
            minutes: 0,
          });
        } catch (_) {}
        refreshTimeUsage();
      };
      right.appendChild(chip);
    } else if (!permanentBlock) {
      const tbtn = document.createElement("button");
      tbtn.className = "site-timer-btn";
      tbtn.title = "Set a Focus Timer for this site";
      tbtn.setAttribute("aria-label", `Set a focus timer for ${domain}`);
      tbtn.innerHTML = FOCUS_TIMER_CLOCK_SVG;
      tbtn.onclick = (e) => {
        e.stopPropagation();
        toggleTimerPicker(row, domain);
      };
      right.appendChild(tbtn);
    } else {
      const locked = document.createElement("span");
      locked.className = "site-timer-locked";
      locked.textContent = "Blocked";
      locked.title = "A permanent block is already active on this site";
      right.appendChild(locked);
    }

    right.appendChild(del);
    top.appendChild(identity);
    top.appendChild(right);
    row.appendChild(top);

    // Progress bar
    if (limitMin > 0) {
      const barBg = document.createElement("div");
      Object.assign(barBg.style, {
        height: "6px",
        background: "var(--ios-fill-4)",
        borderRadius: "var(--ios-r-full)",
        overflow: "hidden",
      });

      const barFill = document.createElement("div");
      Object.assign(barFill.style, {
        height: "100%",
        width: `${pct}%`,
        background: isOver
          ? "var(--ios-red)"
          : pct > 80
          ? "var(--ios-orange)"
          : "var(--ios-blue)",
        borderRadius: "var(--ios-r-full)",
        transition: "width 0.3s var(--ios-ease)",
      });
      barBg.appendChild(barFill);
      row.appendChild(barBg);
    }

    // Usage text
    const usage = document.createElement("span");
    usage.style.cssText =
      "color: var(--ios-label-2); font-size: 11px;";
    if (limitMin > 0) {
      usage.textContent = isOver
        ? `${formatUsageMinutes(usedMin)} / ${formatUsageMinutes(limitMin)} — limit reached`
        : `${formatUsageMinutes(usedMin)} of ${formatUsageMinutes(limitMin)} used`;
    } else {
      usage.textContent = `${formatUsageMinutes(usedMin)} today (no limit set)`;
    }
    row.appendChild(usage);

    container.appendChild(row);
  }

  renderHomeUsage(sorted, today || {}, limits || {});
  // v1.14.0 — keep Focus Timer chips ticking every second (the 5s refresh
  // alone would read as a frozen timer — the v1.12.1 lesson).
  startSiteTimerTicker();
}

/**
 * Compact top-3 mirror of today's usage for the Home card.
 */
function renderHomeUsage(sortedDomains, today, limits) {
  const home = document.getElementById("home-time-usage");
  if (!home) return;
  home.textContent = "";

  const tracked = (sortedDomains || [])
    .filter((d) => (today[d] || 0) > 0)
    .slice(0, 3);

  if (tracked.length === 0) {
    const empty = document.createElement("p");
    empty.className = "protection-empty";
    empty.textContent = "No sites tracked yet today.";
    home.appendChild(empty);
    return;
  }

  for (const domain of tracked) {
    const usedMin = today[domain] || 0;
    const limitMin = limits[domain] || 0;
    const pct = limitMin > 0 ? Math.min(100, (usedMin / limitMin) * 100) : 0;
    const isOver = limitMin > 0 && usedMin >= limitMin;

    const row = document.createElement("div");
    row.className = "home-usage-row";

    const top = document.createElement("div");
    top.className = "home-usage-top";
    const name = document.createElement("span");
    name.textContent = domain;
    const val = document.createElement("span");
    val.textContent =
      limitMin > 0
        ? `${formatUsageMinutes(usedMin)} / ${formatUsageMinutes(limitMin)}`
        : formatUsageMinutes(usedMin);
    if (isOver) val.classList.add("over");
    top.appendChild(name);
    top.appendChild(val);
    row.appendChild(top);

    if (limitMin > 0) {
      const bg = document.createElement("div");
      bg.className = "home-usage-bar";
      const fill = document.createElement("div");
      fill.className = isOver ? "fill over" : "fill";
      fill.style.width = `${pct}%`;
      bg.appendChild(fill);
      row.appendChild(bg);
    }

    home.appendChild(row);
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
 * Home — one glance: today's stats plus everything currently protecting.
 */
async function renderHomeSummary() {
  const settings = await loadSettings();

  // v1.13.0: first-run hint — show until onboarding is completed.
  const banner = document.getElementById("setup-banner");
  if (banner) {
    const needsSetup = !settings.onboardingComplete;
    banner.hidden = !needsSetup;
    banner.classList.toggle("yfp-hidden", !needsSetup);
    if (needsSetup && !banner.dataset.bound) {
      banner.dataset.bound = "1";
      banner.addEventListener("click", () => {
        try {
          chrome.tabs.create({
            url: chrome.runtime.getURL("src/onboarding/onboarding.html"),
          });
          window.close();
        } catch {
          /* tabs API unavailable in some contexts */
        }
      });
    }
  }

  const time = document.getElementById("home-stats-time");
  const points = document.getElementById("home-stats-points");
  const ads = document.getElementById("home-stats-ads");
  if (time) time.textContent = formatTime(settings.statsTimeSaved);
  if (points) points.textContent = Number(settings.statsWillpowerPoints) || 0;
  if (ads) ads.textContent = Number(settings.statsAdsBlocked) || 0;

  // v1.15.0 — Focus Rings card (today's ritual, Apple-Fitness style).
  renderHomeRings();
  // v1.16.0 — editable ring goals in Settings.
  initRingsGoalsEditor();

  const list = document.getElementById("home-protection-list");
  if (!list) return;

  const now = Date.now();
  const rows = [];

  const tempLeft = Number(settings.tempBlockUntil) - now;
  if (tempLeft > 0) {
    const mins = Math.ceil(tempLeft / 60000);
    rows.push([
      "YouTube blocked",
      mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins}m left`,
    ]);
  }

  if (settings.scheduleBlockEnabled) {
    rows.push([
      "Scheduled block",
      `${settings.scheduleBlockStart || "09:00"}–${settings.scheduleBlockEnd || "17:00"} daily`,
    ]);
  }

  const active = (settings.blockedSites || []).filter(
    (b) => b && b.domain && b.blockUntil > now,
  );
  if (active.length > 0) {
    const names = active
      .slice(0, 3)
      .map((b) => String(b.domain).replace(/^(https?:\/\/)?(www\.)?/, ""));
    const extra = active.length > 3 ? ` +${active.length - 3}` : "";
    rows.push([
      `${active.length} site block${active.length > 1 ? "s" : ""}`,
      names.join(", ") + extra,
    ]);
  }

  const smart = Array.isArray(settings.smartListsEnabled)
    ? settings.smartListsEnabled
    : [];
  if (smart.length > 0) {
    rows.push(["Smart Lists", smart.join(", ")]);
  }

  list.textContent = "";
  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "protection-empty";
    empty.textContent = "Nothing active. Start a block or a focus session.";
    list.appendChild(empty);
    return;
  }

  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "protection-row";
    const l = document.createElement("span");
    l.className = "protection-label";
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "protection-value";
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    list.appendChild(row);
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
          background: rgba(255,255,255,0.04);
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          border-left: 3px solid var(--ios-blue);
          transition: all 0.2s ease;
        `;

        const info = document.createElement('div');
        info.style.cssText = 'color: var(--ios-label); flex: 1;';
        const domainName = String(block.domain || '').replace(/^(https?:\/\/)?(www\.)?/, '');
        // SECURITY: use DOM APIs to avoid XSS via a stored domain payload.
        const strong = document.createElement('strong');
        strong.style.cssText = 'color: var(--ios-label); display: block;';
        strong.textContent = domainName;
        const span = document.createElement('span');
        span.style.cssText = 'color: var(--ios-label-2); font-size: 11px;';
        span.textContent = `${timeStr} remaining`;
        info.appendChild(strong);
        info.appendChild(span);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.style.cssText = `
          background: var(--ios-red-soft);
          border: 1px solid var(--ios-red-border);
          color: var(--ios-red);
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
