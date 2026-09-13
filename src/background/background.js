/**
 * Background Service Worker
 * Handles extension lifecycle, tab updates, messaging, AI summarization,
 * transcript extraction, and analytics.
 *
 * SECURITY NOTE:
 *  - API keys are stored in chrome.storage.local and NEVER logged.
 *  - All inputs from content scripts are validated before use.
 *  - The message listener is registered exactly once and uses async/await
 *    with `return true` so that `sendResponse` is preserved.
 */

const DEBUG_LOGS = false;
const ANALYTICS_KEY = "focusAnalyticsDaily";
const ANALYTICS_RETENTION_DAYS = 120;
const MAX_TRANSCRIPT_LENGTH = 20000;
const MAX_AI_PROMPT_LENGTH = 16000;
const MAX_AI_RESPONSE_LENGTH = 20000;
const REQUEST_TIMEOUT_MS = 30000;

const METRIC_TO_TOTAL_KEY = {
  adsBlocked: "statsAdsBlocked",
  shortsSkipped: "statsShortsSkipped",
  summariesGenerated: "statsSummariesGenerated",
  quitsEarly: "statsQuitsEarly",
  timeSavedMinutes: "statsTimeSaved",
  willpowerPoints: "statsWillpowerPoints",
  pomodoroCompleted: "statsPomodoroCompleted",
};

function debugLog(...args) {
  // Always log to the SW console — helps diagnose issues in chrome://extensions
  console.log("%c[FocusTube BG]", "color:#d9a62e;font-weight:bold", ...args);
}

// Default settings (kept in sync with popup.js / storage.js
// so that any of the three entry points can seed first-run state).
const DEFAULT_SETTINGS = {
  // Master Switch
  extensionEnabled: true,
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

  // Blocking Controls
  tempBlockUntil: 0,
  scheduleBlockEnabled: false,
  scheduleBlockStart: "09:00",
  scheduleBlockEnd: "17:00",

  // User Profile & API
  geminiApiKey: "",
  geminiModel: "gemini-1.5-flash",
  openaiApiKey: "",
  mistralApiKey: "",
  deepseekApiKey: "",
  grokApiKey: "",
  profileName: "Guest User",
  profileEmail: "",
  profileImage: "",
  profileGoal: "",
  statsTimeSaved: 0,
  statsAdsBlocked: 0,
  statsShortsSkipped: 0,
  statsSummariesGenerated: 0,
  statsQuitsEarly: 0,

  // Video Page Features
  showSummaryButton: true,
  hideShorts: true,
  hideBannerAds: true,
  skipVideoAds: true,
  disableAutoplay: true,
  forceHighestQuality: true,
  useNativePlayer: false,
  useTranscript: true,
  transcriptLang: "en",

  // Home Page Features
  hideSuggestions: false,
  hideTrending: false,
  hidePeopleAlsoWatched: false,
  homePageRedirect: "none",

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
  blockedPatterns: [],

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
  smartListsEnabled: [], // Array of category ids, e.g. ["social", "shopping"]

  // Pomodoro (also has runtime state in `pomodoroState`)
  pomodoroFocusMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  pomodoroCyclesBeforeLongBreak: 4,
  pomodoroDeepWork: false,
  // Learns a comfortable focus length from the last few completed sessions.
  pomodoroAdaptiveFocus: true,
  pomodoroFocusShield: true,
  pomodoroSessionHistory: [],
  pomodoroAutoStartBreaks: true,
  pomodoroAutoStartFocus: false,
  pomodoroNotify: true,
  pomodoroState: null, // runtime: { phase, cycle, endsAt, pausedRemaining, ... }

  // AI Nudge
  aiNudgeEnabled: false, // false = local library only; true = call AI

  // Quiz Overhaul
  quizDifficulty: "easy", // "easy" | "medium" | "hard"
  quizStreakMultiplier: false, // harder quizzes when focus streak is high

  // Tab Manager
  workspaces: {}, // { name: { savedAt, tabs: [{url, title, pinned}] } }

  // Analytics v2
  productivityScore: 0, // 0-100, computed by dashboard

  // Stats (extended)
  statsWillpowerPoints: 0,
  statsPomodoroCompleted: 0,

  // v1.3.0 — Time Limits
  timeLimits: {}, // { "reddit.com": 30 } — minutes/day
  timeUsage: {}, // { "2026-08-01": { "reddit.com": 1800 } } — seconds
  // Domain → the favicon Chrome discovered while the site was visited.
  siteLogos: {},
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isNonEmptyString(value, maxLength = 5000) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength
  );
}

function isFinitePositiveNumber(value, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= max;
}

function sanitizeDomain(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .split(/[\/\s?#]/)[0]
    .slice(0, 253);
}

function sanitizeBlockedSiteEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const domain = sanitizeDomain(raw.domain);
  if (!domain) return null;
  const blockUntil =
    Number(raw.blockUntil) > 0 ? Number(raw.blockUntil) : 0;
  if (!Number.isFinite(blockUntil)) return null;
  const reason = isNonEmptyString(raw.reason, 500)
    ? String(raw.reason).slice(0, 500)
    : domain;
  return { domain, blockUntil, reason };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async (details) => {
  debugLog("🎉 Extension installed/updated:", details.reason);

  const settings = await chrome.storage.local.get(null);
  if (Object.keys(settings).length === 0) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
    debugLog("Initialized DEFAULT_SETTINGS");
  }

  if (details.reason === "install") {
    try {
      // v1.13.0: first-run opens the Apple-style onboarding flow instead of
      // dropping the user straight onto YouTube. Onboarding's final step
      // hands off to YouTube (and writes the chosen settings).
      const flag = await chrome.storage.local.get("onboardingComplete");
      if (!flag.onboardingComplete) {
        await chrome.tabs.create({
          url: chrome.runtime.getURL("src/onboarding/onboarding.html"),
          active: true,
        });
      } else {
        await chrome.tabs.create({
          url: "https://www.youtube.com",
          active: true,
        });
      }
      debugLog("Opened post-install page");
    } catch (err) {
      console.error("[FocusTube BG] Error opening post-install page:", err);
    }
  }

  // Initial user fetch (best-effort, ignore failures)
  fetchYouTubeUser().catch(() => {});

  // Clean up any expired transcript cache entries from previous sessions.
  cleanupTranscriptCache().catch(() => {});

  // Sync DNR rules on install.
  syncSmartListsDNR().catch(() => {});
  syncTimeLimitDNR().catch(() => {});
  pruneOldUsage().catch(() => {});
  resumeTimeLimitTracking().catch(() => {});

  // Chrome clears alarms on extension reload/update — always recreate them
  // here so time tracking and file sync never stall after an update.
  chrome.alarms.create(timeLimitAlarmName, { periodInMinutes: 0.5 });
  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: 1 });
  syncNow("installed").catch(() => {});
});

// SW startup log — fires every time Chrome wakes the SW.
debugLog("🚀 Service worker started");

// Sweep expired transcript cache entries on browser startup (distinct
// from onInstalled, which only fires on install/update). This catches
// the case where the browser was closed and reopened without an
// extension update.
chrome.runtime.onStartup.addListener(() => {
  cleanupTranscriptCache().catch(() => {});
  openDailyDigestIfDue().catch(() => {});
  openSleepGuardWindDownIfDue().catch(() => {});
});

// ---------------------------------------------------------------------------
// Sleep Guard wind-down (v1.17.0) — 30 minutes before the guard window
// starts, open the evening digest once per day. Evidence: the fresh-start
// effect has a mirror image — night is the worst time to start anything
// (Dai/Milkman/Riis 2014), so the wind-down arrives while there is still
// time to choose the evening on purpose.
// ---------------------------------------------------------------------------
async function openSleepGuardWindDownIfDue() {
  try {
    const stored = await chrome.storage.local.get([
      "sleepGuardEnabled",
      "sleepGuardStart",
      "sleepGuardWindDownShown",
      "onboardingComplete",
    ]);
    if (!stored.sleepGuardEnabled || !stored.sleepGuardStart) return;
    if (!stored.onboardingComplete) return;

    const [h, m] = String(stored.sleepGuardStart).split(":").map(Number);
    if (!Number.isFinite(h)) return;
    const now = new Date();
    const start = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), h, m || 0, 0, 0,
    );
    const windDownAt = new Date(start.getTime() - 30 * 60 * 1000);
    if (now < windDownAt || now >= start) return;

    const pad = (n) => String(n).padStart(2, "0");
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    if (stored.sleepGuardWindDownShown === todayKey) return;

    await chrome.storage.local.set({ sleepGuardWindDownShown: todayKey });
    await chrome.tabs.create({
      url: chrome.runtime.getURL("src/digest/digest.html?mode=evening"),
      active: true,
    });
    debugLog("🌙 Sleep Guard wind-down digest opened");
  } catch (err) {
    debugLog("Sleep Guard wind-down error:", err);
  }
}

// ---------------------------------------------------------------------------
// Daily Briefing (v1.14.0) — src/digest/
// ---------------------------------------------------------------------------
// Once per calendar day, on the FIRST browser start, open the digest page:
//   05:00–12:59 → morning briefing (yesterday reviewed + today's plan)
//   13:00–22:59 → evening wind-down (today so far + sleep-protective tips)
//   23:00–04:59 → suppressed entirely (nothing about a focus app should
//                 interrupt sleep)
// UX grounding (see IMPROVEMENTS.md v1.14.0): a MORNING recap wins for
// behavior change (fresh-start effect, Dai/Milkman/Riis 2014; planning
// before exposure beats willpower during it), while the evening slot is
// the fallback recap, reframed as a gentle wind-down. New users who
// haven't finished onboarding get onboarding instead — never both.
async function openDailyDigestIfDue() {
  try {
    const stored = await chrome.storage.local.get([
      "digestLastShown",
      "onboardingComplete",
    ]);
    if (!stored.onboardingComplete) return;

    const now = new Date();
    const h = now.getHours();
    if (h < 5 || h >= 23) return;

    const pad = (n) => String(n).padStart(2, "0");
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    if (stored.digestLastShown === todayKey) return;

    const mode = h < 13 ? "morning" : "evening";
    await chrome.storage.local.set({
      digestLastShown: todayKey,
      digestLastMode: mode,
    });
    await chrome.tabs.create({
      url: chrome.runtime.getURL(
        `src/digest/digest.html?mode=${mode}`,
      ),
      active: true,
    });
    debugLog(`📊 Daily digest opened (${mode})`);
  } catch (err) {
    debugLog("Daily digest error:", err);
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || !tab.url.includes("youtube.com")) return;
  debugLog("YouTube tab updated:", tab.url);
  setTimeout(() => {
    notifyContentScript(tabId).catch(() => {});
  }, 1000);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes("youtube.com")) {
      debugLog("YouTube tab activated");
      await notifyContentScript(activeInfo.tabId);
    }
  } catch (err) {
    debugLog("Error handling tab activation:", err);
  }
});

async function notifyContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "reloadSettings" });
    const settings = await chrome.storage.local.get([
      "extensionEnabled",
      "tempBlockUntil",
      "scheduleBlockEnabled",
      "scheduleBlockStart",
      "scheduleBlockEnd",
    ]);
    await chrome.tabs.sendMessage(tabId, {
      action: "timeBlockUpdated",
      settings,
    });
  } catch (err) {
    debugLog("Could not send message to tab:", err?.message);
  }
}

// ---------------------------------------------------------------------------
// Profile fetching (scrapes public DOM via content script; never touches
// the YouTube Data API, so no Google-account OAuth scope is required).
// ---------------------------------------------------------------------------

async function fetchYouTubeUser() {
  try {
    const youtubeTabs = await chrome.tabs.query({
      url: ["https://*.youtube.com/*"],
    });

    for (const tab of youtubeTabs) {
      try {
        const profile = await chrome.tabs.sendMessage(tab.id, {
          action: "getYouTubeProfileFromPage",
        });

        if (profile?.success && profile.profile) {
          // Only persist fields we actually expect, never accept arbitrary keys.
          const safe = {
            profileName:
              isNonEmptyString(profile.profile.profileName, 200)
                ? String(profile.profile.profileName).slice(0, 200)
                : "Guest User",
            profileImage: isNonEmptyString(profile.profile.profileImage, 2000)
              ? String(profile.profile.profileImage).slice(0, 2000)
              : "",
            profileEmail: isNonEmptyString(profile.profile.profileEmail, 200)
              ? String(profile.profile.profileEmail).slice(0, 200)
              : "",
          };
          await chrome.storage.local.set(safe);
          return safe;
        }
      } catch (err) {
        debugLog("Could not read profile from tab:", err?.message);
      }
    }

    const stored = await chrome.storage.local.get([
      "profileName",
      "profileImage",
      "profileEmail",
    ]);
    if (stored.profileName || stored.profileImage || stored.profileEmail) {
      return {
        profileName: stored.profileName || "Guest User",
        profileImage: stored.profileImage || "",
        profileEmail: stored.profileEmail || "",
      };
    }
    return null;
  } catch (err) {
    console.error("[FocusTube BG] Critical error in user fetch:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

function getDayKey(timestamp = Date.now()) {
  // Local-time day key. Must match getDashboardStats/getDayKeyLocal so
  // metrics land on the day the user actually experienced them (a UTC key
  // shifts morning/evening activity to the adjacent day outside UTC+0).
  const d = new Date(timestamp);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Inverse of getDayKey: parse "YYYY-MM-DD" into a local-midnight Date.
// Returns null for malformed keys so callers can fall back to today.
function parseDayKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function recordMetric(metric, amount = 1) {
  const safeAmount = Number(amount) || 0;
  if (!metric || safeAmount === 0) {
    return { success: false, error: "Invalid metric payload" };
  }
  const totalKey = METRIC_TO_TOTAL_KEY[metric];
  if (!totalKey) {
    return { success: false, error: "Unsupported metric" };
  }

  const todayKey = getDayKey();
  const stored = await chrome.storage.local.get([ANALYTICS_KEY, totalKey]);
  const analytics = { ...(stored[ANALYTICS_KEY] || {}) };
  const todayMetrics = { ...(analytics[todayKey] || {}) };

  todayMetrics[metric] = (Number(todayMetrics[metric]) || 0) + safeAmount;
  analytics[todayKey] = todayMetrics;

  const trimmed = Object.fromEntries(
    Object.entries(analytics)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-ANALYTICS_RETENTION_DAYS),
  );

  await chrome.storage.local.set({
    [ANALYTICS_KEY]: trimmed,
    [totalKey]: (Number(stored[totalKey]) || 0) + safeAmount,
  });

  scheduleFileSync();

  return { success: true };
}

async function getDashboardStats(options = {}) {
  const stored = await chrome.storage.local.get([
    ANALYTICS_KEY,
    "statsShortsSkipped",
    "statsAdsBlocked",
    "statsSummariesGenerated",
    "statsQuitsEarly",
    "statsTimeSaved",
    "statsWillpowerPoints",
    "statsPomodoroCompleted",
    "profileName",
    "profileImage",
    "profileEmail",
    "profileGoal",
    "timeUsage",
    "topicStats",
    "topicSeconds",
    "siteLogos",
  ]);

  const lifetime = {
    shortsSkipped: Number(stored.statsShortsSkipped) || 0,
    adsBlocked: Number(stored.statsAdsBlocked) || 0,
    summariesGenerated: Number(stored.statsSummariesGenerated) || 0,
    quitsEarly: Number(stored.statsQuitsEarly) || 0,
    timeSavedMinutes: Number(stored.statsTimeSaved) || 0,
    willpowerPoints: Number(stored.statsWillpowerPoints) || 0,
    pomodoroCompleted: Number(stored.statsPomodoroCompleted) || 0,
  };

  let analytics = stored[ANALYTICS_KEY] || {};
  if (
    Object.keys(analytics).length === 0 &&
    Object.values(lifetime).some((v) => v > 0)
  ) {
    const todayKey = getDayKey();
    analytics = {
      [todayKey]: { ...lifetime },
    };
    await chrome.storage.local.set({ [ANALYTICS_KEY]: analytics });
  }

  // Day navigation (v1.10.0): the dashboard can anchor the whole report on a
  // past day via options.anchorKey ("YYYY-MM-DD"). Future or malformed keys
  // clamp back to today, so a stale anchor can never leak tomorrow's (empty)
  // data into the UI.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const anchor = (() => {
    const parsed = parseDayKey(options && options.anchorKey);
    if (!parsed) return today;
    return parsed.getTime() > today.getTime() ? today : parsed;
  })();
  const anchorKey = getDayKey(anchor.getTime());
  const sameMonthAsToday =
    anchor.getFullYear() === today.getFullYear() &&
    anchor.getMonth() === today.getMonth();

  // "Month" is a calendar-month view, not a rolling 30-day approximation.
  // On Sep 3 it has 3 points (Sep 1–3); on Feb 29 it has 29 points.
  // Anchored on a past month it expands to that full month instead.
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = sameMonthAsToday
    ? today
    : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const monthDays =
    Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000) + 1;
  const ranges = {
    day: { end: anchor, days: 1 },
    week: { end: anchor, days: 7 },
    month: { end: monthEnd, days: monthDays },
  };
  const metricKeys = Object.keys(METRIC_TO_TOTAL_KEY);

  const timeUsage = stored.timeUsage || {};
  const topicStats = stored.topicStats || {};
  const topicSeconds = stored.topicSeconds || {};

  const report = {};
  const watchTime = {}; // seconds watched per range (all tracked domains)
  const topics = {}; // top topics per range: [{topic, count, minutes, prevCount}]
  const siteUsage = {}; // seconds per domain for each dashboard range
  for (const [label, window] of Object.entries(ranges)) {
    const totals = Object.fromEntries(metricKeys.map((k) => [k, 0]));
    const points = [];
    let secondsWatched = 0;
    const topicAgg = {};
    const topicSecAgg = {};
    const siteAgg = {};

    for (let offset = window.days - 1; offset >= 0; offset -= 1) {
      // setDate (not ms arithmetic) keeps each point on the intended calendar
      // day across DST shifts.
      const date = new Date(window.end);
      date.setDate(date.getDate() - offset);
      const key = getDayKey(date.getTime());
      const dayMetrics = analytics[key] || {};
      const point = { key };

      metricKeys.forEach((metric) => {
        const value = Number(dayMetrics[metric]) || 0;
        totals[metric] += value;
        point[metric] = value;
      });

      const dayUsage = timeUsage[key] || {};
      let pointSeconds = 0;
      for (const sec of Object.values(dayUsage)) {
        const safeSeconds = Number(sec) || 0;
        pointSeconds += safeSeconds;
        secondsWatched += safeSeconds;
      }
      for (const [domain, sec] of Object.entries(dayUsage)) {
        siteAgg[domain] = (siteAgg[domain] || 0) + (Number(sec) || 0);
      }
      point.timeSpentSeconds = pointSeconds;
      point.activeSites = Object.keys(dayUsage).length;

      const dayTopics = topicStats[key] || {};
      for (const [topic, count] of Object.entries(dayTopics)) {
        const t = String(topic).slice(0, 40);
        topicAgg[t] = (topicAgg[t] || 0) + (Number(count) || 0);
      }
      const dayTopicSeconds = topicSeconds[key] || {};
      for (const [topic, sec] of Object.entries(dayTopicSeconds)) {
        const t = String(topic).slice(0, 40);
        topicSecAgg[t] = (topicSecAgg[t] || 0) + (Number(sec) || 0);
      }

      points.push(point);
    }

    // Trend comparison: the window immediately BEFORE this range, of the
    // same length, so the dashboard can show "▲ 42%" vs the previous
    // period instead of an absolute number in a vacuum.
    const prevAgg = {};
    {
      const prevEnd = new Date(window.end);
      prevEnd.setDate(prevEnd.getDate() - window.days);
      for (let offset = 0; offset < window.days; offset += 1) {
        const date = new Date(prevEnd);
        date.setDate(date.getDate() - offset);
        const key = getDayKey(date.getTime());
        for (const [topic, count] of Object.entries(topicStats[key] || {})) {
          const t = String(topic).slice(0, 40);
          prevAgg[t] = (prevAgg[t] || 0) + (Number(count) || 0);
        }
      }
    }

    report[label] = { totals, points };
    watchTime[label] = secondsWatched;
    topics[label] = Object.entries(topicAgg)
      .map(([topic, count]) => ({
        topic,
        count,
        minutes: Math.round((topicSecAgg[topic] || 0) / 60),
        prevCount: prevAgg[topic] || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    siteUsage[label] = siteAgg;
  }

  // Oldest day key with any recorded data (analytics, time usage or topics).
  // The dashboard uses this to stop the "< previous day" button at the first
  // day that could possibly hold history (storage keeps 120 days).
  const dataKeys = [
    ...Object.keys(analytics),
    ...Object.keys(timeUsage),
    ...Object.keys(topicStats),
  ].filter((k) => parseDayKey(k));
  const dataEarliestKey =
    dataKeys.length > 0
      ? dataKeys.reduce((min, k) => (k < min ? k : min))
      : anchorKey;

  return {
    success: true,
    profile: {
      profileName: stored.profileName || "Guest User",
      profileImage: stored.profileImage || "",
      profileEmail: stored.profileEmail || "",
      profileGoal: stored.profileGoal || "",
    },
    lifetime,
    report,
    watchTime,
    topics,
    siteUsage,
    siteLogos: stored.siteLogos || {},
    generatedAt: Date.now(),
    anchorKey,
    todayKey: getDayKey(now.getTime()),
    dataEarliestKey,
    calendar: {
      monthLabel: anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      monthDaysElapsed: sameMonthAsToday ? now.getDate() : monthDays,
      daysInMonth: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate(),
    },
  };
}

// ---------------------------------------------------------------------------
// Transcript extraction (scraped server-side by the SW so we avoid CORS).
// We do NOT log transcript contents; they may contain private speech.
// ---------------------------------------------------------------------------

function decodeXmlEntities(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseCaptionTracks(pageHtml) {
  if (!pageHtml) return [];

  // Method 1: ytInitialPlayerResponse
  let playerResponse = null;
  const playerRespMatch = pageHtml.match(
    /ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s|<\/script>)/s,
  );
  if (playerRespMatch && playerRespMatch[1]) {
    try {
      playerResponse = JSON.parse(playerRespMatch[1]);
    } catch (_) {
      try {
        const startIdx = pageHtml.indexOf("ytInitialPlayerResponse = ");
        if (startIdx !== -1) {
          let bracketCount = 0;
          let jsonStr = "";
          for (
            let i = startIdx + "ytInitialPlayerResponse = ".length;
            i < pageHtml.length;
            i++
          ) {
            const char = pageHtml[i];
            if (char === "{") bracketCount++;
            if (char === "}") bracketCount--;
            jsonStr += char;
            if (bracketCount === 0) break;
          }
          playerResponse = JSON.parse(jsonStr);
        }
      } catch (_) {}
    }
  }

  if (playerResponse) {
    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(tracks)) return tracks;
  }

  // Method 2: Direct captionTracks match
  const directTracksMatch = pageHtml.match(
    /"captionTracks":\s*(\[[\s\S]*?\])/,
  );
  if (directTracksMatch && directTracksMatch[1]) {
    try {
      const tracks = JSON.parse(directTracksMatch[1]);
      if (Array.isArray(tracks)) return tracks;
    } catch (_) {}
  }
  return [];
}

function matchesLang(trackLang, preferredLang) {
  const tl = (trackLang || "").toLowerCase();
  const pl = (preferredLang || "").toLowerCase();
  if (!tl || !pl) return false;
  return tl === pl || tl.startsWith(`${pl}-`) || pl.startsWith(`${tl}-`);
}

// ---------------------------------------------------------------------------
// Transcript cache
// ---------------------------------------------------------------------------
//
// Transcripts are cached in chrome.storage.local under `transcripts:<videoId>`
// with a 1-hour TTL. This avoids re-fetching the YouTube watch page + XML
// transcript on every AI Summary click for the same video.
//
// Cleanup: on `chrome.runtime.onStartup`, we sweep all `transcripts:*` keys
// and remove expired entries. This keeps storage from growing unboundedly
// over months of use.

const TRANSCRIPT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const TRANSCRIPT_CACHE_PREFIX = "transcripts:";

async function transcriptCacheGet(videoId) {
  const key = TRANSCRIPT_CACHE_PREFIX + videoId;
  const stored = await chrome.storage.local.get(key);
  const entry = stored[key];
  if (!entry || typeof entry !== "object") return null;
  if (!entry.fetchedAt || Date.now() - entry.fetchedAt > TRANSCRIPT_CACHE_TTL_MS) {
    // Expired — delete and return miss.
    try {
      await chrome.storage.local.remove(key);
    } catch (_) {}
    return null;
  }
  return entry;
}

async function transcriptCacheSet(videoId, data) {
  const key = TRANSCRIPT_CACHE_PREFIX + videoId;
  await chrome.storage.local.set({
    [key]: { fetchedAt: Date.now(), ...data },
  });
}

async function cleanupTranscriptCache() {
  try {
    const all = await chrome.storage.local.get(null);
    const now = Date.now();
    const toRemove = [];
    for (const [key, value] of Object.entries(all)) {
      if (!key.startsWith(TRANSCRIPT_CACHE_PREFIX)) continue;
      if (!value || typeof value !== "object") {
        toRemove.push(key);
        continue;
      }
      if (!value.fetchedAt || now - value.fetchedAt > TRANSCRIPT_CACHE_TTL_MS) {
        toRemove.push(key);
      }
    }
    if (toRemove.length > 0) {
      await chrome.storage.local.remove(toRemove);
      debugLog(`Cleaned up ${toRemove.length} expired transcript cache entries`);
    }
  } catch (err) {
    debugLog("Transcript cache cleanup failed:", err);
  }
}

async function fetchTranscript({ videoId, preferredLang = "en", useAutoCaptions = true }) {
  if (!isNonEmptyString(videoId, 20) || !/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) {
    return { success: false, error: "Invalid videoId" };
  }

  // Check cache first — avoids re-fetching the watch page + XML on every
  // AI Summary click for the same video within the TTL window.
  const cached = await transcriptCacheGet(videoId);
  if (cached && cached.text) {
    return { success: true, text: cached.text, lang: cached.lang, cached: true };
  }

  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Accept-Language": `${preferredLang || "en"},en;q=0.5`,
      },
    });
  } catch (err) {
    clearTimeout(timer);
    return { success: false, error: `Network error: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }

  const html = await response.text();
  const tracks = parseCaptionTracks(html);
  if (!tracks.length) {
    return { success: false, error: "No captions available" };
  }

  // Prefer manual tracks in the requested language, then auto tracks in the
  // requested language, then any track in the requested language, then any.
  const pickBy = (pred) => tracks.find(pred);
  const preferred =
    pickBy(
      (t) =>
        !t.kind && matchesLang(t.languageCode, preferredLang),
    ) ||
    pickBy(
      (t) =>
        (useAutoCaptions || !t.kind) &&
        matchesLang(t.languageCode, preferredLang),
    ) ||
    pickBy((t) => matchesLang(t.languageCode, preferredLang)) ||
    pickBy((t) => !t.kind) ||
    (useAutoCaptions ? tracks[0] : pickBy((t) => !t.kind)) ||
    tracks[0];

  if (!preferred || !preferred.baseUrl) {
    return { success: false, error: "Caption track has no URL" };
  }

  let captionResp;
  try {
    captionResp = await fetch(preferred.baseUrl, {
      credentials: "include",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    return { success: false, error: `Caption fetch failed: ${err.message}` };
  }
  if (!captionResp.ok) {
    return { success: false, error: `Caption HTTP ${captionResp.status}` };
  }
  const xml = await captionResp.text();

  // Parse <text start="..." dur="..."> ... </text>
  const segments = [];
  const re = /<text[^>]*start="([\d.]+)"[^>]*(?:dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const text = decodeXmlEntities(m[3]).replace(/<[^>]+>/g, "");
    if (text) segments.push(text);
  }
  const combined = segments.join(" ").replace(/\s+/g, " ").trim();
  if (!combined) {
    return { success: false, error: "Transcript was empty" };
  }
  const result = {
    success: true,
    text: combined.slice(0, MAX_TRANSCRIPT_LENGTH),
    lang: preferred.languageCode,
  };
  // Cache for subsequent requests within the TTL window.
  await transcriptCacheSet(videoId, {
    text: result.text,
    lang: result.lang,
  });
  return result;
}

// ---------------------------------------------------------------------------
// AI Summarization
// ---------------------------------------------------------------------------

function redactForLog(obj) {
  // Returns a shallow copy with all `*ApiKey` fields replaced by "REDACTED".
  if (!obj || typeof obj !== "object") return obj;
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (/ApiKey/i.test(k)) out[k] = out[k] ? "[REDACTED]" : "";
  }
  return out;
}

async function aiSummarize({ provider = "gemini", model, prompt }) {
  if (!isNonEmptyString(prompt, MAX_AI_PROMPT_LENGTH)) {
    return { success: false, error: "Invalid or too-long prompt" };
  }
  const settings = await chrome.storage.local.get([
    "aiProvider",
    "aiModel",
    "aiModelByProvider",
    "aiProviderDefaultModels",
    "geminiApiKey",
    "openaiApiKey",
    "mistralApiKey",
    "deepseekApiKey",
    "grokApiKey",
  ]);

  const PROVIDER_DEFAULTS = {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    mistral: "mistral-small-latest",
    deepseek: "deepseek-chat",
    grok: "grok-2-mini",
  };

  const keyFieldMap = {
    gemini: "geminiApiKey",
    openai: "openaiApiKey",
    mistral: "mistralApiKey",
    deepseek: "deepseekApiKey",
    grok: "grokApiKey",
  };

  const keyField = keyFieldMap[provider];
  if (!keyField) {
    return { success: false, error: `Unsupported provider: ${provider}` };
  }
  const apiKey = settings[keyField];
  if (!isNonEmptyString(apiKey, 500)) {
    return { success: false, error: `Missing API key for ${provider}` };
  }

  const resolvedModel =
    (model && String(model).slice(0, 100)) ||
    (settings.aiModelByProvider && settings.aiModelByProvider[provider]) ||
    (settings.aiProviderDefaultModels &&
      settings.aiProviderDefaultModels[provider]) ||
    PROVIDER_DEFAULTS[provider];

  try {
    let textResponse = "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      if (provider === "gemini") {
        textResponse = await callOpenAICompatible({
          url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            resolvedModel,
          )}:generateContent?key=${encodeURIComponent(apiKey)}`,
          apiKey,
          body: {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
          },
          extract: (data) =>
            data?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text || "")
              .join("") || "",
          signal: controller.signal,
        });
      } else if (provider === "openai") {
        textResponse = await callOpenAICompatible({
          url: "https://api.openai.com/v1/chat/completions",
          apiKey,
          body: {
            model: resolvedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1500,
          },
          extract: (data) => data?.choices?.[0]?.message?.content || "",
          signal: controller.signal,
        });
      } else if (provider === "mistral") {
        textResponse = await callOpenAICompatible({
          url: "https://api.mistral.ai/v1/chat/completions",
          apiKey,
          body: {
            model: resolvedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1500,
          },
          extract: (data) => data?.choices?.[0]?.message?.content || "",
          signal: controller.signal,
        });
      } else if (provider === "deepseek") {
        textResponse = await callOpenAICompatible({
          url: "https://api.deepseek.com/v1/chat/completions",
          apiKey,
          body: {
            model: resolvedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1500,
          },
          extract: (data) => data?.choices?.[0]?.message?.content || "",
          signal: controller.signal,
        });
      } else if (provider === "grok") {
        textResponse = await callOpenAICompatible({
          url: "https://api.x.ai/v1/chat/completions",
          apiKey,
          body: {
            model: resolvedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1500,
          },
          extract: (data) => data?.choices?.[0]?.message?.content || "",
          signal: controller.signal,
        });
      } else {
        return { success: false, error: `Unknown provider: ${provider}` };
      }
    } finally {
      clearTimeout(timer);
    }

    if (!textResponse) {
      return { success: false, error: "Empty AI response" };
    }
    return {
      success: true,
      text: String(textResponse).slice(0, MAX_AI_RESPONSE_LENGTH),
    };
  } catch (err) {
    console.error(
      "[FocusTube BG] AI request failed:",
      err.message,
      redactForLog({ provider, model: resolvedModel }),
    );
    return { success: false, error: err.message || "AI request failed" };
  }
}

async function callOpenAICompatible({ url, apiKey, body, extract, signal }) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  return extract(data);
}

// ---------------------------------------------------------------------------
// declarativeNetRequest — network-level blocking for Smart Lists
// ---------------------------------------------------------------------------
//
// The content-script site-blocker only hides pages AFTER they load. For
// Smart Lists we also block at the network level so that:
//   1. Embedded iframes/widgets from blocked domains never load.
//   2. SPA navigation (YouTube, Twitter) is caught even when the
//      content script's storage check misses it.
//   3. Sub-resources (images, scripts, XHR) from blocked domains are
//      cancelled, which breaks "related content" embeds.
//
// This mirrors the approach used by uBlock Origin's "My filters" —
// dynamic rules added via chrome.declarativeNetRequest.updateDynamicRules.
//
// Rule IDs: we use the range 1000000–1999999 for Smart Lists rules to
// avoid colliding with any future static rule sets.

const DNR_RULE_ID_START = 1000000;
const DNR_RULE_ID_TIME_LIMIT = 2000000;

// Mirror of the category definitions in smart-lists.js (content script).
// The content script can't pass the domain list to the background via
// message fast enough for the initial block check, so the background
// needs its own copy for rule generation.
const SMART_LIST_CATEGORIES = [
  { id: "social", domains: ["instagram.com","tiktok.com","reddit.com","twitter.com","x.com","facebook.com","threads.net","pinterest.com","tumblr.com","snapchat.com","linkedin.com","vk.com","weibo.com","mastodon.social","bsky.app"] },
  { id: "shopping", domains: ["amazon.com","amazon.in","amazon.co.uk","amazon.de","ebay.com","etsy.com","aliexpress.com","alibaba.com","walmart.com","target.com","flipkart.com","myntra.com","bestbuy.com","wayfair.com","asos.com"] },
  { id: "gaming", domains: ["store.steampowered.com","steamcommunity.com","epicgames.com","gog.com","itch.io","twitch.tv","kick.com","discord.com","discordapp.com","ign.com","kotaku.com","polygon.com","rockpapershotgun.com","gamefaqs.com","nexusmods.com"] },
  { id: "news", domains: ["cnn.com","bbc.com","bbc.co.uk","nytimes.com","washingtonpost.com","theguardian.com","reuters.com","apnews.com","bloomberg.com","wsj.com","ft.com","economist.com","news.ycombinator.com","techmeme.com","engadget.com"] },
  { id: "messaging", domains: ["web.whatsapp.com","web.telegram.org","slack.com","discord.com","messenger.com","messages.google.com","mail.google.com","outlook.live.com","outlook.office.com","proton.me","icloud.com"] },
  { id: "streaming", domains: ["netflix.com","primevideo.com","disneyplus.com","hbomax.com","max.com","hulu.com","paramountplus.com","appletv.com","tv.apple.com","peacocktv.com","crunchyroll.com","spotify.com","soundcloud.com"] },
  { id: "adult", domains: ["pornhub.com","xvideos.com","xnxx.com","redtube.com","youporn.com","onlyfans.com","xhamster.com","spankbang.com","brazzers.com","chaturbate.com"] },
];

// This function is fired from several places that can overlap within the
// same service-worker wake (top-level init, onInstalled, onStartup,
// storage.onChanged). Two concurrent get→update cycles make the loser add
// rules whose IDs the winner just created — Chrome rejects that with
// "Rule with id X does not have a unique ID". Serialize runs; a call that
// arrives mid-sync coalesces into a single trailing re-run.
let smartListsDnrSyncing = false;
let smartListsDnrSyncQueued = false;

async function syncSmartListsDNR() {
  if (smartListsDnrSyncing) {
    smartListsDnrSyncQueued = true;
    return;
  }
  smartListsDnrSyncing = true;
  try {
    do {
      smartListsDnrSyncQueued = false;
      await runSmartListsDnrSync();
    } while (smartListsDnrSyncQueued);
  } finally {
    smartListsDnrSyncing = false;
  }
}

async function runSmartListsDnrSync() {
  if (!chrome.declarativeNetRequest) {
    debugLog("DNR not available; Smart Lists falls back to content-script only");
    return;
  }
  try {
    const stored = await chrome.storage.local.get("smartListsEnabled");
    const enabled = Array.isArray(stored.smartListsEnabled)
      ? stored.smartListsEnabled
      : [];

    // Build the set of domains to block.
    const domainsToBlock = new Set();
    for (const cat of SMART_LIST_CATEGORIES) {
      if (enabled.includes(cat.id)) {
        for (const d of cat.domains) domainsToBlock.add(d);
      }
    }

    // Get existing dynamic rules in our ID range so we know what to remove.
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existingRules
      .filter((r) => r.ruleId >= DNR_RULE_ID_START && r.ruleId < DNR_RULE_ID_START + 100000)
      .map((r) => r.ruleId);

    // Build new rules. Each domain gets up to 2 rules:
    //   - Block main-frame navigations (redirect to our block page)
    //   - Block sub-frame / sub-resource requests (cancel)
    const newRules = [];
    let ruleId = DNR_RULE_ID_START;
    for (const domain of domainsToBlock) {
      // Main-frame: redirect to a blank blocked page.
      newRules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/src/block-page/blocked.html?d=" + encodeURIComponent(domain) },
        },
        condition: {
          urlFilter: "||" + domain + "^",
          resourceTypes: ["main_frame"],
        },
      });
      // Sub-resources: just block (cancel the request).
      newRules.push({
        id: ruleId++,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: "||" + domain + "^",
          resourceTypes: ["sub_frame", "script", "image", "xmlhttprequest", "media", "websocket", "other"],
        },
      });
    }

    // Include the new IDs in the removal set so the update is idempotent:
    // the read above can be stale by the time this lands, and Chrome
    // rejects addRules that collide with IDs it didn't see removed.
    const removeRuleIds = [
      ...new Set([...existingIds, ...newRules.map((r) => r.id)]),
    ];
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: newRules,
    });
    debugLog(`🛡️ DNR: synced ${newRules.length} rules for ${domainsToBlock.size} domains (enabled: [${enabled.join(", ")}])`);
  } catch (err) {
    console.error("[FocusTube BG] DNR sync failed:", err);
  }
}

// Re-sync DNR rules whenever Smart Lists settings change.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.smartListsEnabled || changes.timeLimits) {
    syncSmartListsDNR().catch(() => {});
    syncTimeLimitDNR().catch(() => {});
  }
});

// Initial sync on SW startup.
syncSmartListsDNR().catch(() => {});

// ---------------------------------------------------------------------------
// Time Limit Engine — daily per-domain time budgets
// ---------------------------------------------------------------------------
//
// Tracks how long the user spends on each domain and auto-blocks the
// domain once they exceed their daily limit. Resets at local midnight.
//
// Storage layout:
//   timeLimits: { "reddit.com": 30, "youtube.com": 60 }   // minutes/day
//   timeUsage:  { "2026-08-01": { "reddit.com": 12, "youtube.com": 45 } }
//
// Tracking: a ~30-second chrome.alarms tick accumulates the elapsed time
// on the currently-active tab's domain. chrome.idle.queryState() is used
// to pause tracking when the user has been idle for >30 seconds.
//
// Blocking: when usage exceeds the limit, a DNR rule is added that
// redirects the domain to the block page until midnight.

let timeLimitActiveTab = null; // { tabId, domain, url }
let timeLimitAlarmName = "focustube-time-tick";
let timeTickLastAt = null; // epoch ms of the previous tick (mirrored to storage.session)

// Chrome clamps alarm periods to a 30s minimum (1 min before Chrome 120),
// so a tick cannot assume it fires every second — accumulate the real
// elapsed time instead, capped so a slept/missed alarm can't inflate usage.
const TIME_TICK_MAX_SECONDS = 300;

function getFallbackFaviconUrl(domain) {
  return `https://${domain}/favicon.ico`;
}

function sanitizeSiteLogoUrl(raw) {
  if (typeof raw !== "string" || raw.length > 2048) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (_) {
    return "";
  }
}

async function rememberSiteLogo(domain, candidateUrl = "") {
  const safeDomain = sanitizeDomain(domain);
  if (!safeDomain) return "";
  const discovered = sanitizeSiteLogoUrl(candidateUrl);
  const stored = await chrome.storage.local.get("siteLogos");
  const logos = stored.siteLogos && typeof stored.siteLogos === "object"
    ? stored.siteLogos
    : {};
  const current = sanitizeSiteLogoUrl(logos[safeDomain]?.url || logos[safeDomain]);
  // Prefer Chrome's page-discovered favicon, but retain a previously
  // discovered logo when the tab has not supplied one yet.
  const url = discovered || current || getFallbackFaviconUrl(safeDomain);
  if (current !== url) {
    await chrome.storage.local.set({
      siteLogos: { ...logos, [safeDomain]: { url, updatedAt: Date.now() } },
    });
    scheduleFileSync();
  }
  return url;
}

async function getDayKeyLocal() {
  return getDayKey();
}

async function timeLimitTick() {
  const now = Date.now();
  const elapsedSec = timeTickLastAt
    ? Math.min(
        Math.max(1, Math.round((now - timeTickLastAt) / 1000)),
        TIME_TICK_MAX_SECONDS,
      )
    : 30; // first tick after a SW restart: assume one alarm period
  timeTickLastAt = now;
  try {
    chrome.storage.session.set({ timeTickLastAt: now }).catch(() => {});
  } catch (_) {}

  if (!timeLimitActiveTab) return;
  try {
    // Check if user is idle (>30s threshold).
    const state = await chrome.idle.queryState(30);
    if (state !== "active") return;

    const dayKey = await getDayKeyLocal();
    const stored = await chrome.storage.local.get(["timeUsage", "timeLimits"]);
    const usage = stored.timeUsage || {};
    const limits = stored.timeLimits || {};
    const today = usage[dayKey] || {};

    const domain = timeLimitActiveTab.domain;
    if (!domain) return;

    // Accumulate elapsed time since the last tick.
    today[domain] = (today[domain] || 0) + elapsedSec;
    usage[dayKey] = today;
    await chrome.storage.local.set({ timeUsage: usage });

    // Check if limit exceeded.
    const limitSec = (limits[domain] || 0) * 60;
    if (limitSec > 0 && today[domain] >= limitSec) {
      debugLog(`⏱️ Time limit reached: ${domain} = ${Math.round(today[domain]/60)}min / ${limits[domain]}min`);
      // Auto-block until midnight.
      await autoBlockDomain(domain, dayKey);
    }
  } catch (err) {
    debugLog("Time limit tick error:", err);
  }
}

async function autoBlockDomain(domain, dayKey) {
  // Calculate midnight (local time) as the block expiry.
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const blockUntil = midnight.getTime();

  // Add to blockedSites so the content-script overlay also fires.
  const settings = await loadSettings();
  const blockedSites = settings.blockedSites || [];
  // Remove any existing entry for this domain.
  const filtered = blockedSites.filter(
    (s) => sanitizeDomain(s.domain) !== domain,
  );
  filtered.push({
      domain,
      blockUntil,
      reason: "Daily time limit exceeded",
    });
    await updateSettings({ blockedSites: filtered });
    await touchSyncMeta("blockedSitesUpdatedAt");
    scheduleFileSync();
    await notifyAllTabs();

  // Also add a DNR rule for network-level enforcement.
  await addTimeLimitDNR(domain, blockUntil);

  // Notification.
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "public/icons/icon128.png",
      title: "FocusTube — Time Limit Reached",
      message: `You've spent your daily limit on ${domain}. Blocked until midnight.`,
      priority: 2,
    });
  } catch (_) {}
}

async function addTimeLimitDNR(domain, blockUntil) {
  if (!chrome.declarativeNetRequest) return;
  // Use a hash of domain+blockUntil for a unique rule ID in the time-limit range.
  const ruleId =
    DNR_RULE_ID_TIME_LIMIT +
    (Math.abs(hashString(domain)) % 900000);

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      // Removing the same ID we're adding makes re-runs idempotent:
      // syncTimeLimitDNR re-adds on every SW wake, and without this
      // Chrome rejects the add with a duplicate-ID error.
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          priority: 2, // higher than Smart Lists
          action: {
            type: "redirect",
            redirect: { extensionPath: "/src/block-page/blocked.html?d=" + encodeURIComponent(domain) + "&reason=time&until=" + blockUntil },
          },
          condition: {
            urlFilter: "||" + domain + "^",
            resourceTypes: ["main_frame"],
          },
        },
      ],
    });

    // Schedule rule removal at midnight.
    const msUntilMidnight = blockUntil - Date.now();
    if (msUntilMidnight > 0) {
      setTimeout(async () => {
        try {
          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ruleId],
          });
        } catch (_) {}
      }, msUntilMidnight + 5000);
    }
  } catch (err) {
    debugLog("addTimeLimitDNR failed:", err);
  }
}

async function syncTimeLimitDNR() {
  // On startup, re-add DNR rules for any domain that is currently
  // time-limit-blocked (so SW restarts don't lose enforcement).
  try {
    const settings = await loadSettings();
    const now = Date.now();
    const blocked = (settings.blockedSites || []).filter(
      (s) => s && s.domain && s.blockUntil > now && s.reason === "Daily time limit exceeded",
    );
    for (const b of blocked) {
      await addTimeLimitDNR(sanitizeDomain(b.domain), b.blockUntil);
    }
  } catch (_) {}
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

// Track active tab changes.
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    updateActiveTab(tab);
  } catch (_) {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  // Only track if this is the active tab in its window.
  try {
    const active = await chrome.tabs.query({ active: true, currentWindow: true });
    if (active[0] && active[0].id === tabId) {
      updateActiveTab(tab);
    }
  } catch (_) {}
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    timeLimitActiveTab = null;
    return;
  }
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    if (tabs[0]) updateActiveTab(tabs[0]);
  } catch (_) {}
});

async function updateActiveTab(tab) {
  if (!tab || !tab.url) {
    timeLimitActiveTab = null;
    return;
  }
  // Don't track chrome:// or extension pages.
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    timeLimitActiveTab = null;
    return;
  }
  let domain = "";
  try {
    domain = new URL(tab.url).hostname.replace(/^www\./, "");
  } catch (_) {
    timeLimitActiveTab = null;
    return;
  }
  if (!domain) {
    timeLimitActiveTab = null;
    return;
  }
  timeLimitActiveTab = { tabId: tab.id, domain, url: tab.url };
  // favIconUrl is collected by Chrome from the page itself; it lets us use
  // each site's actual mark instead of maintaining a hard-coded logo list.
  rememberSiteLogo(domain, tab.favIconUrl).catch(() => {});
}

// Chrome may stop an MV3 service worker while the user stays on one tab.
// On wake, tab events are not replayed, so restore the active site instead
// of leaving time tracking idle until the user navigates again.
async function resumeTimeLimitTracking() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs[0]) {
      await updateActiveTab(tabs[0]);
      return;
    }
    const fallback = await chrome.tabs.query({ active: true, currentWindow: true });
    if (fallback[0]) await updateActiveTab(fallback[0]);
  } catch (_) {
    // No browser window is normal during startup; tab events will retry.
  }
}

// Rehydrate on every service-worker boot, not only full browser startup.
resumeTimeLimitTracking().catch(() => {});

// Tick alarm. Creating an alarm with an existing name RESETS its schedule,
// so only create it when missing — otherwise every SW wake would push the
// next tick out and usage would silently stop accumulating.
// 0.5 min is Chrome's minimum period (older versions clamp it to 1 min);
// elapsed-based accounting keeps the recorded time accurate either way.
chrome.alarms
  .get(timeLimitAlarmName)
  .then((existing) => {
    if (!existing) {
      chrome.alarms.create(timeLimitAlarmName, { periodInMinutes: 0.5 });
    }
  })
  .catch(() => {});

// Restore the last-tick timestamp across SW restarts (session-scoped).
try {
  chrome.storage.session
    .get("timeTickLastAt")
    .then((stored) => {
      if (stored && stored.timeTickLastAt) {
        timeTickLastAt = stored.timeTickLastAt;
      }
    })
    .catch(() => {});
} catch (_) {}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === timeLimitAlarmName) {
    timeLimitTick().catch(() => {});
  } else if (alarm.name === SYNC_ALARM_NAME) {
    syncNow("alarm").catch(() => {});
    // v1.17.0 — catch the wind-down window even if the browser has been
    // open across the whole evening (cheap: storage read short-circuits).
    openSleepGuardWindDownIfDue().catch(() => {});
  }
});

// On startup, sync DNR rules and prune old usage data.
chrome.runtime.onStartup.addListener(() => {
  syncSmartListsDNR().catch(() => {});
  syncTimeLimitDNR().catch(() => {});
  pruneOldUsage().catch(() => {});
  cleanupTranscriptCache().catch(() => {});
  syncNow("startup").catch(() => {});
});

async function pruneOldUsage() {
  try {
    const stored = await chrome.storage.local.get("timeUsage");
    const usage = stored.timeUsage || {};
    const today = await getDayKeyLocal();
    const keys = Object.keys(usage).sort();
    // Keep only the last 30 days.
    const toKeep = keys.slice(-30);
    if (toKeep.length < keys.length) {
      const newUsage = {};
      for (const k of toKeep) newUsage[k] = usage[k];
      await chrome.storage.local.set({ timeUsage: newUsage });
    }
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Cross-Browser Local File Sync
// ---------------------------------------------------------------------------
//
// Users often run FocusTube in more than one browser. chrome.storage.local
// is per-browser-profile, so each install would otherwise keep its own
// island of stats and limits. This engine lets every browser share ONE
// JSON file on disk (e.g. in Documents, or a Dropbox/OneDrive folder for
// true cross-machine sharing):
//
//   1. The user picks the file once on the dashboard (File System Access
//      API); the handle is persisted in IndexedDB (handles cannot be
//      serialized into chrome.storage).
//   2. On startup, on data changes, and once a minute the engine does
//      read file → union-merge → apply to chrome.storage.local → write
//      the merged file back.
//   3. Merge rules: per-day/per-domain counters take the max (each browser
//      only ever adds locally, so max = union without double counting);
//      config (timeLimits/blockedSites) takes the newest update
//      timestamp; blocked sites union by domain keeping the later
//      blockUntil.
//
// Concurrency between browsers is last-writer-wins on the file, but since
// every browser keeps its own local copy, the next merge cycle restores
// anything a racing write dropped — eventual consistency, no data loss.
//
// Browsers without the File System Access API (e.g. Firefox) fall back to
// Export/Import of the same JSON file from the dashboard.

const SYNC_DB_NAME = "focustube-file-sync";
const SYNC_DB_VERSION = 1;
const SYNC_STORE = "handles";
const SYNC_HANDLE_KEY = "dataFile";
// v1.16.0 — monthly archive mode. When the user picks a FOLDER instead of a
// file, the engine writes one JSON file per calendar month inside it and
// rotates automatically when the month ends: focustube-September-2025.json →
// focustube-October-2025.json. Old months remain on disk as archives.
const SYNC_DIR_KEY = "dataDir";
const SYNC_STATUS_KEY = "syncStatus";
const SYNC_ALARM_NAME = "focustube-file-sync-tick";
const SYNC_FILE_VERSION = 2;
const SYNC_LIFETIME_KEYS = Object.values(METRIC_TO_TOTAL_KEY);
const SYNC_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The archive file for the current month, e.g. "focustube-September-2025.json". */
function currentMonthFileName(now = new Date()) {
  return `focustube-${SYNC_MONTH_NAMES[now.getMonth()]}-${now.getFullYear()}.json`;
}

/** "YYYY-MM" for the current month — the prefix shared by its day keys. */
function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Keep only the day-keyed sections that belong to `monthKey` ("YYYY-MM").
 * Config sections (settings, limits, block lists, logos) are month-agnostic
 * and ride along so a monthly file can still configure a fresh browser.
 */
function filterPayloadDaysToMonth(payload, monthKey) {
  if (!payload || typeof payload !== "object") return payload;
  const prefix = `${monthKey}-`;
  const filterMap = (map) => {
    const out = {};
    for (const [day, value] of Object.entries(map || {})) {
      if (String(day).startsWith(prefix)) out[day] = value;
    }
    return out;
  };
  return {
    ...payload,
    analyticsDaily: filterMap(payload.analyticsDaily),
    timeUsage: filterMap(payload.timeUsage),
    topicStats: filterMap(payload.topicStats),
  };
}

// A deliberate allowlist: credentials, browser handles, runtime state, and
// machine-specific UI state never enter the portable data file.
const SYNC_PROFILE_KEYS = ["profileName", "profileImage", "profileGoal"];
const SYNC_SETTINGS_KEYS = [
  "extensionEnabled", "focusMode", "scheduleBlockEnabled", "scheduleBlockStart", "scheduleBlockEnd",
  "hideSuggestions", "hideTrending", "hidePeopleAlsoWatched", "hideShorts", "hideBannerAds",
  "skipVideoAds", "disableAutoplay", "forceHighestQuality", "useNativePlayer", "useTranscript",
  "transcriptLang", "hideNavShorts", "hideNavExplore", "hideNavGaming", "hideNavTrending",
  "hideNotifications", "hideCreateButton", "hideVoiceSearch", "hideShareButtons", "hideComments",
  "hideInfoCards", "hideEndScreens", "hideLiveChat", "hideNextVideo", "hideMoreVideos",
  "hideVideoMetrics", "hideVideoDuration", "hideMerch", "autoPauseInactive", "autoTheaterMode",
  "smartListsEnabled", "pomodoroFocusMinutes", "pomodoroShortBreakMinutes",
  "pomodoroLongBreakMinutes", "pomodoroCyclesBeforeLongBreak", "pomodoroDeepWork",
  "pomodoroAdaptiveFocus", "pomodoroFocusShield", "pomodoroAutoStartBreaks",
  "pomodoroAutoStartFocus", "pomodoroNotify", "aiNudgeEnabled", "quizDifficulty",
  "quizStreakMultiplier",
];
const SYNC_BLOCK_RULE_KEYS = ["blockedKeywords", "blockedChannels", "blockedPatterns"];
const SYNC_META_FIELDS = [
  "timeLimitsUpdatedAt", "blockedSitesUpdatedAt", "profileUpdatedAt",
  "settingsUpdatedAt", "blockedTopicsUpdatedAt", "lastMergedAt",
];

function syncOpenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function syncIdbOp(mode, fn) {
  const db = await syncOpenDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_STORE, mode);
      const req = fn(tx.objectStore(SYNC_STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function syncGetFileHandle() {
  try {
    return (await syncIdbOp("readonly", (s) => s.get(SYNC_HANDLE_KEY))) || null;
  } catch (err) {
    debugLog("syncGetFileHandle failed:", err);
    return null;
  }
}

async function syncGetDirHandle() {
  try {
    return (await syncIdbOp("readonly", (s) => s.get(SYNC_DIR_KEY))) || null;
  } catch (err) {
    debugLog("syncGetDirHandle failed:", err);
    return null;
  }
}

async function syncClearFileHandleSafe() {
  try {
    await syncIdbOp("readwrite", (s) => {
      s.delete(SYNC_HANDLE_KEY);
      s.delete(SYNC_DIR_KEY);
    });
  } catch (err) {
    debugLog("syncClearFileHandle failed:", err);
  }
}

function sanitizeTimeLimits(raw) {
  const out = {};
  for (const [domain, minutes] of Object.entries(raw || {})) {
    const d = sanitizeDomain(domain);
    const m = Number(minutes);
    if (d && Number.isFinite(m) && m > 0 && m <= 1440) {
      out[d] = Math.round(m);
    }
  }
  return out;
}

function pickSyncFields(source, keys) {
  const out = {};
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 500);
    }
  }
  return out;
}

function sanitizeSyncedSettings(raw) {
  const candidate = pickSyncFields(raw, SYNC_SETTINGS_KEYS);
  const safe = {};
  for (const [key, value] of Object.entries(candidate)) {
    const defaultValue = DEFAULT_SETTINGS[key];
    if (typeof defaultValue === "boolean" && typeof value === "boolean") {
      safe[key] = value;
    } else if (typeof defaultValue === "number" && Number.isFinite(value)) {
      safe[key] = Math.max(0, Math.min(1440, value));
    } else if (typeof defaultValue === "string" && typeof value === "string" && value.length <= 500) {
      safe[key] = value;
    } else if (Array.isArray(defaultValue) && Array.isArray(value)) {
      safe[key] = sanitizeSyncedTextList(value);
    }
  }
  return safe;
}

function sanitizeSyncedProfile(raw) {
  const profile = pickSyncFields(raw, SYNC_PROFILE_KEYS);
  const out = {};
  if (typeof profile.profileName === "string" && profile.profileName.length <= 200) out.profileName = profile.profileName;
  if (typeof profile.profileGoal === "string" && profile.profileGoal.length <= 1000) out.profileGoal = profile.profileGoal;
  if (typeof profile.profileImage === "string" && profile.profileImage.length <= 2048) out.profileImage = profile.profileImage;
  return out;
}

function sanitizeSyncedTextList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 500))].slice(0, 500);
}

function sanitizeSyncedBlockRules(raw) {
  return {
    blockedKeywords: sanitizeSyncedTextList(raw?.blockedKeywords),
    blockedChannels: sanitizeSyncedTextList(raw?.blockedChannels),
    blockedPatterns: sanitizeSyncedTextList(raw?.blockedPatterns),
  };
}

function newestSection(local, remote, localMeta, remoteMeta, key) {
  return Number(remoteMeta?.[key]) > Number(localMeta?.[key]) ? remote : local;
}

function pickSyncMeta(raw) {
  const meta = {};
  for (const key of SYNC_META_FIELDS) {
    const value = Number(raw?.[key]);
    if (Number.isFinite(value) && value >= 0) meta[key] = value;
  }
  return meta;
}

async function syncBuildLocalPayload() {
  const keys = [
    ANALYTICS_KEY,
    "timeUsage",
    "siteLogos",
    "timeLimits",
    "blockedSites",
    "topicStats",
    "syncMeta",
    ...SYNC_PROFILE_KEYS,
    ...SYNC_SETTINGS_KEYS,
    ...SYNC_BLOCK_RULE_KEYS,
    ...SYNC_LIFETIME_KEYS,
  ];
  const stored = await chrome.storage.local.get(keys);
  const lifetime = {};
  for (const k of SYNC_LIFETIME_KEYS) {
    lifetime[k] = Number(stored[k]) || 0;
  }
  return {
    version: SYNC_FILE_VERSION,
    lifetime,
    analyticsDaily: stored[ANALYTICS_KEY] || {},
    timeUsage: stored.timeUsage || {},
    siteLogos: stored.siteLogos || {},
    timeLimits: sanitizeTimeLimits(stored.timeLimits),
    blockedSites: Array.isArray(stored.blockedSites)
      ? stored.blockedSites
      : [],
    topicStats: stored.topicStats || {},
    profile: sanitizeSyncedProfile(stored),
    settings: sanitizeSyncedSettings(stored),
    // Named explicitly in the file so users can recognize their block rules.
    blockedTopics: sanitizeSyncedBlockRules(stored),
    syncMeta: pickSyncMeta(stored.syncMeta),
  };
}

function syncMergeDayMaps(localMap, remoteMap) {
  const out = {};
  const days = new Set([
    ...Object.keys(localMap || {}),
    ...Object.keys(remoteMap || {}),
  ]);
  // Keep the same retention window as the in-browser analytics.
  const sortedDays = [...days].sort().slice(-ANALYTICS_RETENTION_DAYS);
  for (const day of sortedDays) {
    const l = localMap?.[day] || {};
    const r = remoteMap?.[day] || {};
    const fields = new Set([...Object.keys(l), ...Object.keys(r)]);
    const mergedDay = {};
    for (const f of fields) {
      mergedDay[f] = Math.max(Number(l[f]) || 0, Number(r[f]) || 0);
    }
    out[day] = mergedDay;
  }
  return out;
}

function syncMergeSiteLogos(localLogos, remoteLogos) {
  const merged = {};
  const domains = new Set([
    ...Object.keys(localLogos || {}),
    ...Object.keys(remoteLogos || {}),
  ]);
  for (const domain of domains) {
    const local = localLogos?.[domain];
    const remote = remoteLogos?.[domain];
    const localUrl = sanitizeSiteLogoUrl(local?.url || local);
    const remoteUrl = sanitizeSiteLogoUrl(remote?.url || remote);
    const localUpdated = Number(local?.updatedAt) || 0;
    const remoteUpdated = Number(remote?.updatedAt) || 0;
    const chosen = remoteUrl && remoteUpdated > localUpdated
      ? { url: remoteUrl, updatedAt: remoteUpdated }
      : localUrl
      ? { url: localUrl, updatedAt: localUpdated }
      : remoteUrl
      ? { url: remoteUrl, updatedAt: remoteUpdated }
      : null;
    if (chosen) merged[domain] = chosen;
  }
  return merged;
}

function syncMergeBlockedSites(localList, remoteList) {
  const byDomain = new Map();
  const now = Date.now();
  for (const raw of [...(localList || []), ...(remoteList || [])]) {
    const site = sanitizeBlockedSiteEntry(raw);
    if (!site) continue;
    if (site.blockUntil > 0 && site.blockUntil <= now) continue; // expired
    const existing = byDomain.get(site.domain);
    if (!existing || site.blockUntil > existing.blockUntil) {
      byDomain.set(site.domain, site);
    }
  }
  // Deterministic order keeps re-merges stable across browsers.
  return [...byDomain.values()].sort((a, b) =>
    a.domain.localeCompare(b.domain),
  );
}

function syncMergePayloads(local, remote) {
  const lm = local.syncMeta || {};
  const rm = remote.syncMeta || {};

  const timeLimits =
    (Number(rm.timeLimitsUpdatedAt) || 0) >
    (Number(lm.timeLimitsUpdatedAt) || 0)
      ? sanitizeTimeLimits(remote.timeLimits)
      : sanitizeTimeLimits(local.timeLimits);
  const profile = newestSection(local.profile || {}, remote.profile || {}, lm, rm, "profileUpdatedAt");
  const settings = newestSection(local.settings || {}, remote.settings || {}, lm, rm, "settingsUpdatedAt");
  // Last-write-wins here intentionally preserves removals from a block list.
  const blockedTopics = sanitizeSyncedBlockRules(newestSection(
    local.blockedTopics || {}, remote.blockedTopics || {}, lm, rm, "blockedTopicsUpdatedAt",
  ));

  const merged = {
    version: SYNC_FILE_VERSION,
    lifetime: {},
    analyticsDaily: syncMergeDayMaps(
      local.analyticsDaily,
      remote.analyticsDaily,
    ),
    timeUsage: syncMergeDayMaps(local.timeUsage, remote.timeUsage),
    siteLogos: syncMergeSiteLogos(local.siteLogos, remote.siteLogos),
    topicStats: syncMergeDayMaps(local.topicStats, remote.topicStats),
    profile: sanitizeSyncedProfile(profile),
    settings: sanitizeSyncedSettings(settings),
    blockedTopics,
    timeLimits,
    blockedSites: syncMergeBlockedSites(
      local.blockedSites,
      remote.blockedSites,
    ),
    syncMeta: {
      timeLimitsUpdatedAt: Math.max(
        Number(lm.timeLimitsUpdatedAt) || 0,
        Number(rm.timeLimitsUpdatedAt) || 0,
      ),
      blockedSitesUpdatedAt: Math.max(
        Number(lm.blockedSitesUpdatedAt) || 0,
        Number(rm.blockedSitesUpdatedAt) || 0,
      ),
      profileUpdatedAt: Math.max(Number(lm.profileUpdatedAt) || 0, Number(rm.profileUpdatedAt) || 0),
      settingsUpdatedAt: Math.max(Number(lm.settingsUpdatedAt) || 0, Number(rm.settingsUpdatedAt) || 0),
      blockedTopicsUpdatedAt: Math.max(Number(lm.blockedTopicsUpdatedAt) || 0, Number(rm.blockedTopicsUpdatedAt) || 0),
      lastMergedAt: Date.now(),
    },
  };
  for (const k of SYNC_LIFETIME_KEYS) {
    merged.lifetime[k] = Math.max(
      Number(local.lifetime?.[k]) || 0,
      Number(remote.lifetime?.[k]) || 0,
    );
  }
  return merged;
}

let syncApplyingPayload = false;

async function syncApplyPayload(merged) {
  const stored = await chrome.storage.local.get([
    ANALYTICS_KEY,
    "timeUsage",
    "siteLogos",
    "timeLimits",
    "blockedSites",
    "topicStats",
    ...SYNC_PROFILE_KEYS,
    ...SYNC_SETTINGS_KEYS,
    ...SYNC_BLOCK_RULE_KEYS,
    ...SYNC_LIFETIME_KEYS,
  ]);
  const updates = { syncMeta: merged.syncMeta };
  let configChanged = false;

  if (
    JSON.stringify(merged.analyticsDaily) !==
    JSON.stringify(stored[ANALYTICS_KEY] || {})
  ) {
    updates[ANALYTICS_KEY] = merged.analyticsDaily;
  }
  if (
    JSON.stringify(merged.timeUsage) !==
    JSON.stringify(stored.timeUsage || {})
  ) {
    updates.timeUsage = merged.timeUsage;
  }
  if (JSON.stringify(merged.siteLogos) !== JSON.stringify(stored.siteLogos || {})) {
    updates.siteLogos = merged.siteLogos;
  }
  if (
    JSON.stringify(merged.topicStats) !==
    JSON.stringify(stored.topicStats || {})
  ) {
    updates.topicStats = merged.topicStats;
  }
  const syncedProfile = sanitizeSyncedProfile(merged.profile);
  const syncedSettings = sanitizeSyncedSettings(merged.settings);
  const syncedRules = sanitizeSyncedBlockRules(merged.blockedTopics);
  for (const [key, value] of Object.entries({ ...syncedProfile, ...syncedSettings, ...syncedRules })) {
    if (JSON.stringify(stored[key]) !== JSON.stringify(value)) {
      updates[key] = value;
      configChanged = true;
    }
  }
  for (const k of SYNC_LIFETIME_KEYS) {
    if ((Number(merged.lifetime[k]) || 0) > (Number(stored[k]) || 0)) {
      updates[k] = Number(merged.lifetime[k]) || 0;
    }
  }
  if (
    JSON.stringify(merged.timeLimits) !==
    JSON.stringify(sanitizeTimeLimits(stored.timeLimits))
  ) {
    updates.timeLimits = merged.timeLimits;
    configChanged = true;
  }
  const localBlocked = JSON.stringify(
    (Array.isArray(stored.blockedSites) ? stored.blockedSites : [])
      .map(sanitizeBlockedSiteEntry)
      .filter(Boolean)
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  );
  if (JSON.stringify(merged.blockedSites) !== localBlocked) {
    updates.blockedSites = merged.blockedSites;
    configChanged = true;
  }

  if (Object.keys(updates).length > 1) {
    syncApplyingPayload = true;
    try {
      await chrome.storage.local.set(updates);
    } finally {
      syncApplyingPayload = false;
    }
  }
  return configChanged;
}

async function syncReadFile(handle) {
  let text = "";
  try {
    const file = await handle.getFile();
    text = await file.text();
  } catch (err) {
    debugLog("syncReadFile: could not read file:", err?.message);
    return null;
  }
  if (!text || !text.trim()) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    debugLog("syncReadFile: invalid JSON:", err?.message);
    return null;
  }
}

async function syncWriteFile(handle, payload) {
  const writable = await handle.createWritable({ keepExistingData: false });
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}

async function syncSetStatus(patch) {
  try {
    const stored = await chrome.storage.local.get(SYNC_STATUS_KEY);
    const status = { ...(stored[SYNC_STATUS_KEY] || {}), ...patch };
    await chrome.storage.local.set({ [SYNC_STATUS_KEY]: status });
    return status;
  } catch (err) {
    debugLog("syncSetStatus failed:", err);
    return null;
  }
}

async function syncGetStatus() {
  const [handle, dirHandle] = await Promise.all([
    syncGetFileHandle(),
    syncGetDirHandle(),
  ]);
  const stored = await chrome.storage.local.get([SYNC_STATUS_KEY, "syncMeta"]);
  const status = stored[SYNC_STATUS_KEY] || {};
  const monthly = !!dirHandle;
  return {
    ...status,
    hasFile: !!handle || monthly,
    syncMode: monthly ? "monthly" : "file",
    folderName: monthly ? dirHandle.name || "" : "",
    monthFileName: monthly ? currentMonthFileName() : "",
    fileName: monthly ? currentMonthFileName() : handle?.name || status.fileName || "",
    pendingChanges: !!stored.syncMeta?.pendingSince,
    pendingSince: Number(stored.syncMeta?.pendingSince) || 0,
  };
}

let syncInFlight = false;

async function syncNow(reason = "manual") {
  if (syncInFlight) {
    return { success: false, error: "sync already running" };
  }
  syncInFlight = true;
  try {
    // Monthly folder mode (v1.16.0) or the legacy single-file mode.
    const dirHandle = await syncGetDirHandle();
    let handle = null;
    let monthly = false;
    if (dirHandle) {
      monthly = true;
      handle = dirHandle;
    } else {
      handle = await syncGetFileHandle();
    }
    if (!handle) {
      await syncSetStatus({ connected: false, needsPermission: false });
      return { success: false, error: "no-file" };
    }

    // The SW cannot show permission prompts; if access was revoked the
    // dashboard surfaces a "reconnect" action (page context can prompt).
    let permission = "granted";
    try {
      if (typeof handle.queryPermission === "function") {
        permission = await handle.queryPermission({ mode: "readwrite" });
      }
    } catch (_) {}
    if (permission !== "granted") {
      await syncSetStatus({
        connected: true,
        needsPermission: true,
        lastResult: "needs-permission",
      });
      return { success: false, error: "needs-permission" };
    }

    // In monthly mode the file name is computed EVERY cycle — that is the
    // whole rotation mechanism: when the calendar month flips, the next
    // sync simply creates and fills the new month's archive file.
    if (monthly) {
      try {
        handle = await dirHandle.getFileHandle(currentMonthFileName(), {
          create: true,
        });
      } catch (err) {
        debugLog("syncNow: cannot open month file:", err?.message);
        await syncSetStatus({
          connected: true,
          needsPermission: true,
          lastResult: "needs-permission",
          lastError: String(err?.message || err),
        });
        return { success: false, error: "needs-permission" };
      }
    }

    const monthKey = currentMonthKey();
    const remoteRaw = await syncReadFile(handle);
    // A monthly archive must only ever merge days of its own month — a
    // stray foreign day would be written back and then never rotate away.
    const remote = monthly && remoteRaw
      ? filterPayloadDaysToMonth(remoteRaw, monthKey)
      : remoteRaw;
    const local = await syncBuildLocalPayload();
    const merged = syncMergePayloads(local, remote || {});
    const configChanged = await syncApplyPayload(merged);
    // The file gets the month-scoped view of the merge (config rides along);
    // chrome.storage keeps the FULL merge, so older months stay browsable.
    const filePayload = monthly
      ? filterPayloadDaysToMonth(merged, monthKey)
      : merged;
    const fileJson = JSON.stringify(filePayload, null, 2);
    await syncWriteFile(handle, filePayload);
    await syncSetStatus({
      connected: true,
      needsPermission: false,
      fileName: handle.name || "focustube-data.json",
      syncMode: monthly ? "monthly" : "file",
      folderName: monthly ? dirHandle.name || "" : "",
      lastResult: "ok",
      lastSyncAt: Date.now(),
      lastWriteAt: Date.now(),
      fileBytes: fileJson.length,
      lastError: "",
      pendingChanges: false,
      pendingSince: 0,
    });
    const metaStored = await chrome.storage.local.get("syncMeta");
    if (metaStored.syncMeta?.pendingSince) {
      await chrome.storage.local.set({
        syncMeta: { ...metaStored.syncMeta, pendingSince: 0 },
      });
    }

    if (configChanged) {
      await notifyAllTabs();
      syncTimeLimitDNR().catch(() => {});
    }
    debugLog(`🔄 File sync ok (${reason})`);
    return { success: true };
  } catch (err) {
    const msg = String(err?.message || err);
    debugLog("File sync failed:", msg);
    await syncSetStatus({
      connected: true,
      lastResult: "error",
      lastError: msg,
    });
    return { success: false, error: msg };
  } finally {
    syncInFlight = false;
  }
}

// Best-effort push shortly after local data changes; the 1-minute alarm
// below is the reliable fallback if the SW dies before the timer fires.
function scheduleFileSync(debounceMs = 8000) {
  setTimeout(() => {
    syncNow("change").catch(() => {});
  }, debounceMs);
}

async function touchSyncMeta(key) {
  try {
    const stored = await chrome.storage.local.get("syncMeta");
    const meta = stored.syncMeta || {};
    meta[key] = Date.now();
    await chrome.storage.local.set({ syncMeta: meta });
  } catch (_) {}
}

async function markSyncPending(changes) {
  if (syncApplyingPayload) return;
  const changedKeys = Object.keys(changes || {});
  const now = Date.now();
  const stored = await chrome.storage.local.get("syncMeta");
  const meta = stored.syncMeta || {};
  if (changedKeys.some((key) => SYNC_PROFILE_KEYS.includes(key))) {
    meta.profileUpdatedAt = now;
  }
  if (changedKeys.some((key) => SYNC_SETTINGS_KEYS.includes(key))) {
    meta.settingsUpdatedAt = now;
  }
  if (changedKeys.some((key) => SYNC_BLOCK_RULE_KEYS.includes(key))) {
    meta.blockedTopicsUpdatedAt = now;
  }
  if (!meta.pendingSince) meta.pendingSince = now;
  await chrome.storage.local.set({ syncMeta: meta });
  await syncSetStatus({ pendingChanges: true, pendingSince: meta.pendingSince });
}

// Near-real-time file sync: watch every local data mutation — the ~30s time
// tick, metric recordings, limit/block edits — and push to the shared file
// shortly after. This catches writes from code paths that don't call
// scheduleFileSync themselves (notably timeLimitTick). The 1-minute alarm
// stays as the reliability fallback if the SW is killed before the debounce
// fires.
//
// Convergence: syncNow's apply step only writes storage keys when the merged
// values actually differ, and `syncMeta`/`syncStatus` are not watched, so a
// completed sync does not re-trigger this listener.
const SYNC_WATCHED_KEYS = new Set([
  ANALYTICS_KEY,
  "timeUsage",
  "siteLogos",
  "timeLimits",
  "blockedSites",
  "topicStats",
  ...SYNC_PROFILE_KEYS,
  ...SYNC_SETTINGS_KEYS,
  ...SYNC_BLOCK_RULE_KEYS,
  ...SYNC_LIFETIME_KEYS,
]);

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;
  if (Object.keys(changes).some((k) => SYNC_WATCHED_KEYS.has(k))) {
    markSyncPending(changes).catch(() => {});
    scheduleFileSync(10000);
  }
});

// Periodic sync: merges file → local and local → file once a minute.
chrome.alarms
  .get(SYNC_ALARM_NAME)
  .then((existing) => {
    if (!existing) {
      chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: 1 });
    }
  })
  .catch(() => {});

// Initial sync when the SW (re)starts, e.g. woken by a browser event.
syncNow("sw-start").catch(() => {});

// ---------------------------------------------------------------------------
// Single message listener (registered exactly once)
// ---------------------------------------------------------------------------

async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get(null);
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (err) {
    console.error("[FocusTube BG] Error loading settings:", err);
    return DEFAULT_SETTINGS;
  }
}

async function updateSettings(settings) {
  try {
    // Only persist known setting keys; ignore anything else (defensive).
    const allowedKeys = new Set(Object.keys(DEFAULT_SETTINGS));
    const filtered = {};
    for (const [k, v] of Object.entries(settings || {})) {
      if (allowedKeys.has(k)) filtered[k] = v;
    }
    await chrome.storage.local.set(filtered);
    return true;
  } catch (err) {
    console.error("[FocusTube BG] Error saving settings:", err);
    return false;
  }
}

async function notifyAllTabs() {
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
    console.warn("[FocusTube BG] Error notifying tabs:", e);
  }
}

async function getBlockedSites() {
  try {
    const settings = await loadSettings();
    return settings.blockedSites || [];
  } catch (err) {
    console.error("[FocusTube BG] Error getting blocked sites:", err);
    return [];
  }
}

async function addBlockedSite(rawSite) {
  try {
    const site = sanitizeBlockedSiteEntry(rawSite);
    if (!site) return;
    const settings = await loadSettings();
    const blockedSites = settings.blockedSites || [];
    if (!blockedSites.find((s) => s.domain === site.domain)) {
      blockedSites.push(site);
      await updateSettings({ blockedSites });
      await touchSyncMeta("blockedSitesUpdatedAt");
      scheduleFileSync();
    }
  } catch (err) {
    console.error("[FocusTube BG] Error adding blocked site:", err);
  }
}

async function removeBlockedSite(domainOrSite) {
  try {
    // Accept either a string domain or a {domain} object for backward
    // compatibility with older callers.
    const domain =
      typeof domainOrSite === "string"
        ? sanitizeDomain(domainOrSite)
        : sanitizeDomain(domainOrSite?.domain);
    if (!domain) return;
    const settings = await loadSettings();
    const blockedSites = (settings.blockedSites || []).filter(
      (s) => s.domain !== domain,
    );
    await updateSettings({ blockedSites });
    await touchSyncMeta("blockedSitesUpdatedAt");
    scheduleFileSync();
  } catch (err) {
    console.error("[FocusTube BG] Error removing blocked site:", err);
  }
}

// ---------------------------------------------------------------------------
// Pomodoro Engine
// ---------------------------------------------------------------------------
//
// State machine that lives in the background service worker.
// Persists current cycle state to chrome.storage.local so that a SW
// restart (Chrome kills SWs after 30s of inactivity) doesn't lose the
// active session.
//
// Cycle structure:
//   focus (25min) → short break (5min) → focus → short break →
//   focus → short break → focus → long break (15min) → repeat
//
// Configurable via `pomodoroFocusMinutes`, `pomodoroShortBreakMinutes`,
// `pomodoroLongBreakMinutes`, `pomodoroCyclesBeforeLongBreak`.
//
// Deep Work mode (`pomodoroDeepWork`): when enabled, the focus phase
// additionally enables the "social" Smart List category for the
// duration of the focus, then restores the previous state on break.

const POMODORO_DEFAULTS = {
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
};

let pomodoroTimer = null; // setInterval id
let pomodoroState = null; // { phase, cycle, endsAt, pausedRemaining, focusBlocksAdded }

const FOCUS_SHIELD_CATEGORIES = ["social", "gaming", "streaming", "shopping"];

function clampPomodoroMinutes(value, fallback) {
  const minutes = Number(value);
  return Number.isFinite(minutes) ? Math.max(1, Math.min(120, minutes)) : fallback;
}

// This is intentionally conservative: a plan only changes in 5-minute steps
// after a pattern is clear, and always stays between 15 and 50 minutes.
function getAdaptiveFocusMinutes(settings) {
  const base = clampPomodoroMinutes(settings.pomodoroFocusMinutes, 25);
  if (settings.pomodoroAdaptiveFocus === false) return base;
  const history = Array.isArray(settings.pomodoroSessionHistory)
    ? settings.pomodoroSessionHistory.slice(-6)
    : [];
  if (history.length < 3) return base;
  const completed = history.filter((entry) => entry && entry.completed).length;
  const rate = completed / history.length;
  if (rate >= 0.75) return Math.min(50, base + 5);
  if (rate <= 0.4) return Math.max(15, base - 5);
  return base;
}

async function recordPomodoroOutcome(completed, minutes) {
  const stored = await chrome.storage.local.get("pomodoroSessionHistory");
  const history = Array.isArray(stored.pomodoroSessionHistory)
    ? stored.pomodoroSessionHistory.slice(-11)
    : [];
  history.push({ completed: !!completed, minutes: clampPomodoroMinutes(minutes, 25), finishedAt: Date.now() });
  await chrome.storage.local.set({ pomodoroSessionHistory: history });
}

function getFocusBlockCategories(settings) {
  const categories = new Set();
  if (settings.pomodoroDeepWork) categories.add("social");
  if (settings.pomodoroFocusShield !== false) {
    FOCUS_SHIELD_CATEGORIES.forEach((category) => categories.add(category));
  }
  return [...categories];
}

async function applyFocusBlocks(settings) {
  const targets = getFocusBlockCategories(settings);
  if (!targets.length) return [];
  const current = await chrome.storage.local.get("smartListsEnabled");
  const enabled = Array.isArray(current.smartListsEnabled) ? current.smartListsEnabled : [];
  const added = targets.filter((category) => !enabled.includes(category));
  if (added.length) {
    await chrome.storage.local.set({ smartListsEnabled: [...enabled, ...added] });
  }
  return added;
}

async function releaseFocusBlocks() {
  const added = Array.isArray(pomodoroState?.focusBlocksAdded)
    ? pomodoroState.focusBlocksAdded
    : [];
  if (!added.length) return;
  const current = await chrome.storage.local.get("smartListsEnabled");
  const enabled = Array.isArray(current.smartListsEnabled) ? current.smartListsEnabled : [];
  // Remove only categories this session added. Manual category changes made
  // while focusing are otherwise retained instead of restoring a stale snapshot.
  await chrome.storage.local.set({ smartListsEnabled: enabled.filter((category) => !added.includes(category)) });
  pomodoroState.focusBlocksAdded = [];
}

async function loadPomodoroState() {
  if (pomodoroState) return pomodoroState;
  try {
    const stored = await chrome.storage.local.get(["pomodoroState"]);
    if (stored.pomodoroState) {
      pomodoroState = stored.pomodoroState;
      // If the SW was killed and restarted, resume the timer.
      if (pomodoroState && pomodoroState.endsAt && !pomodoroState.pausedRemaining) {
        startPomodoroTick();
      }
    }
  } catch (_) {}
  return pomodoroState;
}

async function savePomodoroState() {
  if (!pomodoroState) return;
  try {
    await chrome.storage.local.set({ pomodoroState });
  } catch (_) {}
}

async function getPomodoroSettings() {
  const keys = Object.keys(POMODORO_DEFAULTS);
  const stored = await chrome.storage.local.get(keys);
  return { ...POMODORO_DEFAULTS, ...stored };
}

function pomodoroPhaseMinutes(phase, settings) {
  if (phase === "focus") return getAdaptiveFocusMinutes(settings);
  if (phase === "short-break") return settings.pomodoroShortBreakMinutes;
  if (phase === "long-break") return settings.pomodoroLongBreakMinutes;
  return 25;
}

async function pomodoroStart() {
  await loadPomodoroState();
  const settings = await getPomodoroSettings();

  // If we have a paused state, resume it.
  if (pomodoroState && pomodoroState.pausedRemaining) {
    pomodoroState.endsAt = Date.now() + pomodoroState.pausedRemaining;
    pomodoroState.pausedRemaining = null;
  } else if (pomodoroState && pomodoroState.phase === "focus" && pomodoroState.endsAt > Date.now()) {
    // Already running.
    return pomodoroState;
  } else {
    // Fresh start.
    pomodoroState = {
      phase: "focus",
      cycle: 1,
      endsAt: Date.now() + getAdaptiveFocusMinutes(settings) * 60 * 1000,
      pausedRemaining: null,
      focusMinutes: getAdaptiveFocusMinutes(settings),
      focusBlocksAdded: [],
      startedAt: Date.now(),
    };
    pomodoroState.focusBlocksAdded = await applyFocusBlocks(settings);
  }

  await savePomodoroState();
  startPomodoroTick();
  await pomodoroNotify("Focus phase", `Pomodoro cycle ${pomodoroState.cycle} started. Stay focused!`);
  return pomodoroState;
}

async function pomodoroPause() {
  await loadPomodoroState();
  if (!pomodoroState || pomodoroState.pausedRemaining) return pomodoroState;
  pomodoroState.pausedRemaining = Math.max(0, pomodoroState.endsAt - Date.now());
  pomodoroState.endsAt = null;
  stopPomodoroTick();
  await savePomodoroState();
  return pomodoroState;
}

async function pomodoroSkip() {
  await loadPomodoroState();
  if (!pomodoroState) return null;
  await pomodoroAdvancePhase(true);
  return pomodoroState;
}

async function pomodoroStop() {
  stopPomodoroTick();
  if (pomodoroState) await releaseFocusBlocks();
  pomodoroState = null;
  try {
    await chrome.storage.local.remove("pomodoroState");
  } catch (_) {}
}

async function pomodoroAdvancePhase(skipped = false) {
  if (!pomodoroState) return;
  const settings = await getPomodoroSettings();

  if (pomodoroState.phase === "focus") {
    await recordPomodoroOutcome(!skipped, pomodoroState.focusMinutes || settings.pomodoroFocusMinutes);
    if (!skipped) await recordMetric("pomodoroCompleted", 1);
    await releaseFocusBlocks();
  }

  // Determine the next phase.
  let nextPhase;
  let nextCycle = pomodoroState.cycle;
  if (pomodoroState.phase === "focus") {
    nextPhase =
      pomodoroState.cycle % settings.pomodoroCyclesBeforeLongBreak === 0
        ? "long-break"
        : "short-break";
  } else {
    nextPhase = "focus";
    if (pomodoroState.phase === "long-break") nextCycle += 1;
  }

  pomodoroState.phase = nextPhase;
  pomodoroState.cycle = nextCycle;
  pomodoroState.focusMinutes = nextPhase === "focus"
    ? getAdaptiveFocusMinutes(settings)
    : null;
  pomodoroState.endsAt = Date.now() + (nextPhase === "focus"
    ? pomodoroState.focusMinutes
    : pomodoroPhaseMinutes(nextPhase, settings)) * 60 * 1000;
  pomodoroState.pausedRemaining = null;

  if (nextPhase === "focus") {
    pomodoroState.focusBlocksAdded = await applyFocusBlocks(settings);
  }

  await savePomodoroState();

  const label =
    nextPhase === "focus"
      ? `Focus cycle ${nextCycle}`
      : nextPhase === "short-break"
      ? "Short break"
      : "Long break";
  const msg =
    nextPhase === "focus"
      ? "Break's over. Time to focus."
      : "Great work! Take a breather.";
  await pomodoroNotify(label, msg);

  // Auto-start next phase if configured.
  const autoStart =
    (nextPhase === "focus" && settings.pomodoroAutoStartFocus) ||
    (nextPhase !== "focus" && settings.pomodoroAutoStartBreaks);
  if (autoStart) {
    startPomodoroTick();
  } else {
    stopPomodoroTick();
    pomodoroState.pausedRemaining = pomodoroState.endsAt - Date.now();
    pomodoroState.endsAt = null;
    await savePomodoroState();
  }
}

function startPomodoroTick() {
  stopPomodoroTick();
  pomodoroTimer = setInterval(async () => {
    if (!pomodoroState || !pomodoroState.endsAt) {
      stopPomodoroTick();
      return;
    }
    if (Date.now() >= pomodoroState.endsAt) {
      await pomodoroAdvancePhase(false);
    }
  }, 1000);
}

function stopPomodoroTick() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }
}

async function pomodoroNotify(title, message) {
  const settings = await getPomodoroSettings();
  if (!settings.pomodoroNotify) return;
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "public/icons/icon128.png",
      title: `FocusTube — ${title}`,
      message,
      priority: 2,
    });
  } catch (_) {}
}

async function pomodoroGetStatus() {
  await loadPomodoroState();
  if (!pomodoroState) return { active: false };
  const settings = await getPomodoroSettings();
  const remaining =
    pomodoroState.pausedRemaining != null
      ? pomodoroState.pausedRemaining
      : pomodoroState.endsAt
      ? Math.max(0, pomodoroState.endsAt - Date.now())
      : 0;
  return {
    active: true,
    phase: pomodoroState.phase,
    cycle: pomodoroState.cycle,
    remainingMs: remaining,
    paused: pomodoroState.pausedRemaining != null,
    settings: {
      focusMinutes: settings.pomodoroFocusMinutes,
      shortBreakMinutes: settings.pomodoroShortBreakMinutes,
      longBreakMinutes: settings.pomodoroLongBreakMinutes,
      cyclesBeforeLongBreak: settings.pomodoroCyclesBeforeLongBreak,
      deepWork: settings.pomodoroDeepWork,
      adaptiveFocus: settings.pomodoroAdaptiveFocus !== false,
      focusShield: settings.pomodoroFocusShield !== false,
      plannedFocusMinutes: pomodoroState.focusMinutes || getAdaptiveFocusMinutes(settings),
    },
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    sendResponse({ success: false, error: "Invalid message" });
    return false;
  }
  debugLog("📨 Message:", message.action, message);

  (async () => {
    try {
      switch (message.action) {
        case "vimCloseTab": {
          // v1.17.0 — Vim-style nav exit key. Content scripts cannot close
          // tabs they didn't open; the background can. Guarded to the
          // sender's own tab so a page can't close arbitrary tabs.
          const tabId = sender && sender.tab ? sender.tab.id : null;
          if (tabId == null) {
            sendResponse({ success: false, error: "No sender tab" });
            return;
          }
          try {
            await chrome.tabs.remove(tabId);
            sendResponse({ success: true });
          } catch (err) {
            sendResponse({ success: false, error: String(err) });
          }
          return;
        }

        case "openDashboard": {
          // v1.17.0 — Companion quick action.
          try {
            await chrome.tabs.create({
              url: chrome.runtime.getURL("src/dashboard/dashboard.html"),
            });
            sendResponse({ success: true });
          } catch (err) {
            sendResponse({ success: false, error: String(err) });
          }
          return;
        }

        case "recordMetric": {
          // ⚠️ v1.13.0 anti-gaming: this message bus is reachable from every
          // content script. Background-computed metrics — timeSavedMinutes
          // (union-deduped in setTempBlock) and pomodoroCompleted — are NOT
          // externally writable, and externally allowed amounts are clamped.
          // Previously an unclamped amount let a single forged message
          // ({metric:"timeSavedMinutes", amount: 1e6}) max the score.
          const EXTERNAL_METRICS = new Set([
            "shortsSkipped",
            "adsBlocked",
            "summariesGenerated",
            "willpowerPoints",
          ]);
          const amount = Math.floor(Number(message.amount));
          if (
            !EXTERNAL_METRICS.has(message.metric) ||
            !Number.isFinite(amount) ||
            amount < 1
          ) {
            sendResponse({ success: false, error: "Unsupported metric" });
            return;
          }
          await recordMetric(message.metric, Math.min(100, amount));
          sendResponse({ success: true });
          return;
        }

        case "recordTopic": {
          // Topic Tracker v2 (v1.14.0): the content script sends weighted
          // topics plus the video's real duration, so topics are counted
          // per video AND credited watch seconds. v1 string arrays are
          // still accepted (weight defaults to 1, seconds to 0).
          const rawTopics = Array.isArray(message.topics) ? message.topics : [];
          let entries = rawTopics
            .map((t) =>
              typeof t === "string"
                ? { topic: t, weight: 1 }
                : t && typeof t.topic === "string"
                  ? { topic: t.topic, weight: Number(t.weight) || 1 }
                  : null,
            )
            .filter(Boolean)
            .map((e) => ({
              topic: e.topic
                .trim()
                .toLowerCase()
                .replace(/[^#\w\s-]/g, "")
                .slice(0, 40),
              weight: Math.max(0.1, Math.min(2, e.weight)),
            }))
            .filter((e) => e.topic.length > 1);

          // Deduplicate: same topic sent at several weights keeps the max.
          const deduped = new Map();
          for (const e of entries) {
            const prev = deduped.get(e.topic);
            if (!prev || e.weight > prev.weight) deduped.set(e.topic, e);
          }
          entries = [...deduped.values()].slice(0, 8);
          if (entries.length === 0) {
            sendResponse({ success: false, error: "No valid topics" });
            return;
          }

          const durationSeconds = Math.max(
            0,
            Math.min(43200, Number(message.durationSeconds) || 0),
          );
          // A video with 3 topics doesn't triple the watch time: each topic
          // receives a proportional share of the video's seconds.
          const totalWeight =
            entries.reduce((sum, e) => sum + e.weight, 0) || 1;

          const dayKey = getDayKey();
          const stored = await chrome.storage.local.get([
            "topicStats",
            "topicSeconds",
          ]);
          const stats = stored.topicStats || {};
          const seconds = stored.topicSeconds || {};
          const today = stats[dayKey] || {};
          const todaySeconds = seconds[dayKey] || {};
          for (const e of entries) {
            today[e.topic] = (Number(today[e.topic]) || 0) + 1;
            todaySeconds[e.topic] = Math.round(
              (Number(todaySeconds[e.topic]) || 0) +
                (durationSeconds * e.weight) / totalWeight,
            );
          }
          stats[dayKey] = today;
          seconds[dayKey] = todaySeconds;

          const trimmed = Object.fromEntries(
            Object.entries(stats)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-ANALYTICS_RETENTION_DAYS),
          );
          const trimmedSeconds = Object.fromEntries(
            Object.entries(seconds)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-ANALYTICS_RETENTION_DAYS),
          );

          await chrome.storage.local.set({
            topicStats: trimmed,
            topicSeconds: trimmedSeconds,
          });
          scheduleFileSync();
          sendResponse({ success: true, recorded: entries.length });
          return;
        }

        case "getDashboardStats":
          sendResponse({
            success: true,
            data: await getDashboardStats(message.options || {}),
          });
          return;

        case "setTempBlock": {
          const until = Number(message.until);
          if (!Number.isFinite(until) || until < 0) {
            sendResponse({ success: false, error: "Invalid until" });
            return;
          }
          const minutes = Number(message.minutes) || 0;
          await chrome.storage.local.set({ tempBlockUntil: until });
          // ⚠️ Honest "time saved" accounting (v1.13.0 anti-gaming).
          // v1 credited `minutes` on EVERY press — tapping "Block 30 min"
          // 100× inflated timeSavedMinutes by 3000 and pinned the Focus
          // Score at 100. Overlapping block windows describe ONE blocked
          // interval, so only union growth beyond the already-blocked window
          // is real time saved. Extending a block credits the extension;
          // re-pressing inside an active block credits ~0.
          const now = Date.now();
          const storedBlock = await chrome.storage.local.get("tempBlockUntilPrev");
          const prevUntil = Number(storedBlock.tempBlockUntilPrev) || 0;
          const prevRemaining = Math.max(0, prevUntil - now);
          const newRemaining = Math.max(0, until - now);
          const creditedMinutes = Math.max(
            0,
            Math.round(
              (Math.max(prevRemaining, newRemaining) - prevRemaining) / 60000,
            ),
          );
          if (creditedMinutes > 0) {
            await recordMetric("timeSavedMinutes", creditedMinutes);
          }
          // Remember this window's end for the next dedupe (separate key so
          // the live blocker keeps reading tempBlockUntil untouched).
          await chrome.storage.local.set({ tempBlockUntilPrev: until });

          await notifyAllTabs();
          sendResponse({ success: true, until, creditedMinutes });
          return;
        }

        case "setSiteTimer": {
          // v1.14.0 — per-site "Focus Timer" from the Time Limits capsules.
          // Reuses the site-blocker's existing `blockedSites` mechanism
          // (overlay + ticking countdown come for free). `minutes: 0`
          // ends the timer early; a permanent/manual block on the same
          // domain is never downgraded by a timer.
          const domain = sanitizeDomain(String(message.domain || ""));
          const minutes = Math.floor(Number(message.minutes) || 0);
          if (!domain || !domain.includes(".")) {
            sendResponse({ success: false, error: "Invalid domain" });
            return;
          }

          const settings = await loadSettings();
          const blockedSites = settings.blockedSites || [];
          const now = Date.now();
          const existingIdx = blockedSites.findIndex(
            (s) => s && sanitizeDomain(s.domain) === domain,
          );
          const existing = existingIdx >= 0 ? blockedSites[existingIdx] : null;

          if (minutes <= 0) {
            if (existing && existing.reason === "Focus Timer") {
              blockedSites.splice(existingIdx, 1);
              await updateSettings({ blockedSites });
              await touchSyncMeta("blockedSitesUpdatedAt");
              scheduleFileSync();
              await notifyAllTabs();
            }
            sendResponse({ success: true, until: 0 });
            return;
          }

          if (
            existing &&
            Number(existing.blockUntil) > now &&
            existing.reason !== "Focus Timer"
          ) {
            sendResponse({
              success: false,
              error: "Site already has an active block",
            });
            return;
          }

          const clamped = Math.max(1, Math.min(1440, minutes));
          const until = now + clamped * 60000;
          const entry = { domain, blockUntil: until, reason: "Focus Timer" };
          if (existingIdx >= 0) {
            blockedSites[existingIdx] = entry;
          } else {
            blockedSites.push(entry);
          }
          await updateSettings({ blockedSites });
          await touchSyncMeta("blockedSitesUpdatedAt");
          scheduleFileSync();
          await notifyAllTabs();

          // Honest accounting, same discipline as setTempBlock (v1.13.0):
          // only UNION growth of this domain's block window is credited.
          // Re-pressing "30 min" 100× credits 30 minutes, not 3000.
          const prevMapStored = await chrome.storage.local.get("siteTimerPrev");
          const prevMap = prevMapStored.siteTimerPrev || {};
          const prevUntil = Number(prevMap[domain]) || 0;
          const prevRemaining = Math.max(0, prevUntil - now);
          const newRemaining = Math.max(0, until - now);
          const creditedMinutes = Math.max(
            0,
            Math.round(
              (Math.max(prevRemaining, newRemaining) - prevRemaining) / 60000,
            ),
          );
          if (creditedMinutes > 0) {
            await recordMetric("timeSavedMinutes", creditedMinutes);
          }
          prevMap[domain] = until;
          await chrome.storage.local.set({ siteTimerPrev: prevMap });

          sendResponse({ success: true, until, creditedMinutes });
          return;
        }

        case "updateScheduleBlock": {
          const start = isNonEmptyString(message.scheduleBlockStart, 5)
            ? message.scheduleBlockStart
            : "09:00";
          const end = isNonEmptyString(message.scheduleBlockEnd, 5)
            ? message.scheduleBlockEnd
            : "17:00";
          await chrome.storage.local.set({
            scheduleBlockStart: start,
            scheduleBlockEnd: end,
            scheduleBlockEnabled: !!message.scheduleBlockEnabled,
          });
          await notifyAllTabs();
          sendResponse({ success: true });
          return;
        }

        case "getUserProfile":
          sendResponse({
            success: true,
            profile: await fetchYouTubeUser(),
          });
          return;

        case "getSettings":
          sendResponse({ success: true, settings: await loadSettings() });
          return;

        case "updateSettings":
          await updateSettings(message.settings || {});
          await notifyAllTabs();
          sendResponse({ success: true });
          return;

        case "getBlockedSites":
          sendResponse({
            success: true,
            blockedSites: await getBlockedSites(),
          });
          return;

        case "addBlockedSite":
          await addBlockedSite(message.site);
          await notifyAllTabs();
          sendResponse({ success: true });
          return;

        case "removeBlockedSite":
          // Accept either `message.site` (object/string) or `message.domain`
          await removeBlockedSite(message.site ?? message.domain);
          await notifyAllTabs();
          sendResponse({ success: true });
          return;

        // ----- AI / Transcript handlers (previously missing) -----
        case "getTranscript": {
          const result = await fetchTranscript({
            videoId: message.videoId,
            preferredLang: message.preferredLang || "en",
            useAutoCaptions: message.useAutoCaptions !== false,
          });
          sendResponse(result);
          return;
        }

        case "aiSummarize": {
          const result = await aiSummarize({
            provider: message.provider,
            model: message.model,
            prompt: message.prompt,
          });
          sendResponse(result);
          return;
        }

        // ----- Pomodoro handlers -----
        case "pomodoroStart":
          await pomodoroStart();
          sendResponse({ success: true, status: await pomodoroGetStatus() });
          return;

        case "pomodoroPause":
          await pomodoroPause();
          sendResponse({ success: true, status: await pomodoroGetStatus() });
          return;

        case "pomodoroSkip":
          await pomodoroSkip();
          sendResponse({ success: true, status: await pomodoroGetStatus() });
          return;

        case "pomodoroStop":
          await pomodoroStop();
          sendResponse({ success: true, status: await pomodoroGetStatus() });
          return;

        case "pomodoroStatus":
          sendResponse({ success: true, status: await pomodoroGetStatus() });
          return;

        // ----- Time Limit handlers -----
        case "getTimeLimits": {
          const stored = await chrome.storage.local.get("timeLimits");
          sendResponse({ success: true, limits: stored.timeLimits || {} });
          return;
        }

        case "setTimeLimit": {
          const domain = sanitizeDomain(message.domain);
          const minutes = Number(message.minutes);
          if (!domain || !Number.isFinite(minutes) || minutes < 0) {
            sendResponse({ success: false, error: "Invalid domain or minutes" });
            return;
          }
          const stored = await chrome.storage.local.get("timeLimits");
          const limits = stored.timeLimits || {};
          if (minutes === 0) {
            delete limits[domain];
          } else {
            limits[domain] = minutes;
          }
          await chrome.storage.local.set({ timeLimits: limits });
          await touchSyncMeta("timeLimitsUpdatedAt");
          scheduleFileSync();
          sendResponse({ success: true, limits });
          return;
        }

        case "getTimeUsage": {
          const dayKey = await getDayKeyLocal();
          const stored = await chrome.storage.local.get([
            "timeUsage",
            "timeLimits",
            "siteLogos",
            "blockedSites",
          ]);
          const usage = stored.timeUsage || {};
          const limits = stored.timeLimits || {};
          const today = usage[dayKey] || {};
          // v1.14.0 — active per-site Focus Timers, so the Time Limits
          // capsules can show a live countdown chip instead of the timer
          // button when a block is already running on that site.
          const siteTimers = {};
          for (const s of stored.blockedSites || []) {
            if (
              s &&
              s.reason === "Focus Timer" &&
              Number(s.blockUntil) > Date.now() &&
              s.domain
            ) {
              siteTimers[sanitizeDomain(s.domain)] = Number(s.blockUntil);
            }
          }
          // Backfill icon URLs for existing history/limits on first view.
          // New visits are upgraded to Chrome's page-discovered favicon by
          // updateActiveTab(), so this fallback never needs a brand list.
          const logoDomains = new Set([...Object.keys(today), ...Object.keys(limits)]);
          await Promise.all([...logoDomains].map((domain) => rememberSiteLogo(domain)));
          const refreshed = await chrome.storage.local.get("siteLogos");
          // Convert seconds to minutes for display.
          const todayMinutes = {};
          for (const [d, sec] of Object.entries(today)) {
            todayMinutes[d] = Math.round(sec / 60 * 10) / 10;
          }
          sendResponse({
            success: true,
            dayKey,
            today: todayMinutes,
            limits,
            logos: refreshed.siteLogos || {},
            siteTimers,
            blockedSites: stored.blockedSites || [],
          });
          return;
        }

        case "getTopSites": {
          // Return today's top sites by time, for the dashboard.
          const dayKey = await getDayKeyLocal();
          const stored = await chrome.storage.local.get("timeUsage");
          const usage = stored.timeUsage || {};
          const today = usage[dayKey] || {};
          const sorted = Object.entries(today)
            .map(([domain, sec]) => ({
              domain,
              minutes: Math.round(sec / 60 * 10) / 10,
            }))
            .sort((a, b) => b.minutes - a.minutes)
            .slice(0, 10);
          sendResponse({ success: true, sites: sorted });
          return;
        }

        // ----- Local file sync handlers -----
        case "syncNow": {
          const result = await syncNow(message.reason || "manual");
          sendResponse({ success: true, result, status: await syncGetStatus() });
          return;
        }

        case "syncGetStatus": {
          sendResponse({ success: true, status: await syncGetStatus() });
          return;
        }

        case "syncDisconnect": {
          await syncClearFileHandleSafe();
          await syncSetStatus({
            connected: false,
            needsPermission: false,
            lastResult: "",
            lastSyncAt: 0,
          });
          sendResponse({ success: true, status: await syncGetStatus() });
          return;
        }

        case "syncGetPayload": {
          // Export fallback for browsers without the File System Access API.
          sendResponse({
            success: true,
            payload: await syncBuildLocalPayload(),
          });
          return;
        }

        case "syncApplyImportedPayload": {
          // Import fallback: merge a user-selected JSON file into local
          // storage (same merge semantics as the live file sync).
          const remote = message.payload;
          if (!remote || typeof remote !== "object") {
            sendResponse({ success: false, error: "Invalid payload" });
            return;
          }
          const local = await syncBuildLocalPayload();
          const merged = syncMergePayloads(local, remote);
          const configChanged = await syncApplyPayload(merged);
          const dirHandle = await syncGetDirHandle();
          if (dirHandle) {
            // Monthly mode: only the current month's slice belongs in the
            // archive file — never write a full multi-month payload into it.
            try {
              const monthFile = await dirHandle.getFileHandle(
                currentMonthFileName(),
                { create: true },
              );
              await syncWriteFile(
                monthFile,
                filterPayloadDaysToMonth(merged, currentMonthKey()),
              );
            } catch (_) {}
          } else {
            const handle = await syncGetFileHandle();
            if (handle) {
              try {
                await syncWriteFile(handle, merged);
              } catch (_) {}
            }
          }
          if (configChanged) {
            await notifyAllTabs();
            syncTimeLimitDNR().catch(() => {});
          }
          sendResponse({ success: true });
          return;
        }

        // ----- Tab Manager handlers -----
        case "saveWorkspace": {
          const name = isNonEmptyString(message.name, 60) ? message.name : "Workspace";
          const tabs = await chrome.tabs.query({ currentWindow: true });
          const workspaceTabs = tabs
            .filter((t) => !t.url || !t.url.startsWith("chrome://"))
            .map((t) => ({ url: t.url, title: t.title, pinned: t.pinned }));
          const stored = await chrome.storage.local.get("workspaces");
          const workspaces = stored.workspaces || {};
          workspaces[name] = { savedAt: Date.now(), tabs: workspaceTabs };
          await chrome.storage.local.set({ workspaces });
          sendResponse({ success: true, count: workspaceTabs.length });
          return;
        }

        case "loadWorkspace": {
          const name = isNonEmptyString(message.name, 60) ? message.name : "";
          if (!name) {
            sendResponse({ success: false, error: "Missing workspace name" });
            return;
          }
          const stored = await chrome.storage.local.get("workspaces");
          const workspaces = stored.workspaces || {};
          const ws = workspaces[name];
          if (!ws || !Array.isArray(ws.tabs)) {
            sendResponse({ success: false, error: "Workspace not found" });
            return;
          }
          for (const t of ws.tabs) {
            try {
              await chrome.tabs.create({ url: t.url, pinned: !!t.pinned });
            } catch (_) {}
          }
          sendResponse({ success: true, count: ws.tabs.length });
          return;
        }

        case "listWorkspaces": {
          const stored = await chrome.storage.local.get("workspaces");
          const workspaces = stored.workspaces || {};
          const list = Object.entries(workspaces).map(([name, w]) => ({
            name,
            savedAt: w.savedAt,
            count: Array.isArray(w.tabs) ? w.tabs.length : 0,
          }));
          sendResponse({ success: true, workspaces: list });
          return;
        }

        case "closeAllTabs": {
          // Close every non-YouTube, non-extension tab in the current
          // window and open a single blank "focus" tab.
          const tabs = await chrome.tabs.query({ currentWindow: true });
          const toClose = tabs
            .filter((t) => t.id)
            .filter((t) => !t.url || !t.url.startsWith("chrome://"))
            .filter((t) => !t.url || !t.url.includes("youtube.com"))
            .map((t) => t.id);
          if (toClose.length > 0) {
            await chrome.tabs.remove(toClose);
          }
          await chrome.tabs.create({ url: "about:blank", active: true });
          sendResponse({ success: true, closed: toClose.length });
          return;
        }

        case "groupByDomain": {
          // Group all open tabs by registrable domain and assign each
          // group a color + name via chrome.tabGroups.
          const tabs = await chrome.tabs.query({ currentWindow: true });
          const groups = {};
          for (const t of tabs) {
            if (!t.url || t.url.startsWith("chrome://")) continue;
            let host = "";
            try {
              host = new URL(t.url).hostname.replace(/^www\./, "");
            } catch (_) {
              continue;
            }
            const parts = host.split(".");
            const regDomain =
              parts.length >= 2 ? parts.slice(-2).join(".") : host;
            if (!groups[regDomain]) groups[regDomain] = [];
            groups[regDomain].push(t.id);
          }
          const colors = [
            "blue", "red", "yellow", "green", "pink",
            "purple", "cyan", "orange",
          ];
          let i = 0;
          for (const [name, ids] of Object.entries(groups)) {
            if (ids.length < 2) continue;
            try {
              const groupId = await chrome.tabs.group({ tabIds: ids });
              await chrome.tabGroups.update(groupId, {
                title: name,
                color: colors[i % colors.length],
              });
              i++;
            } catch (_) {}
          }
          sendResponse({ success: true, groups: Object.keys(groups).length });
          return;
        }

        default:
          debugLog("Unknown message action:", message.action);
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (err) {
      console.error("[FocusTube BG] Message handler error:", err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  // Return true to keep the message channel open for async sendResponse.
  return true;
});
