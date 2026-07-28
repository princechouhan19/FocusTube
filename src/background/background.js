/**
 * Background Service Worker
 * Handles extension lifecycle, tab updates, messaging, AI summarization,
 * transcript extraction, recording coordination, and analytics.
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
};

function debugLog(...args) {
  if (DEBUG_LOGS) {
    console.log("[FocusTube BG]", ...args);
  }
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
  shortcutsEnabled: true,
  floatingToolbarEnabled: false,

  // Universal Site Blocking
  blockedSites: [], // Array of {domain, blockUntil (timestamp), reason}
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
  debugLog("Extension installed/updated:", details.reason);

  const settings = await chrome.storage.local.get(null);
  if (Object.keys(settings).length === 0) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  }

  if (details.reason === "install") {
    try {
      await chrome.tabs.create({
        url: "https://www.youtube.com",
        active: true,
      });
      debugLog("Opened YouTube after installation");
    } catch (err) {
      console.error("[FocusTube BG] Error opening YouTube:", err);
    }
  }

  // Initial user fetch (best-effort, ignore failures)
  fetchYouTubeUser().catch(() => {});
});

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
  return new Date(timestamp).toISOString().slice(0, 10);
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

  return { success: true };
}

async function getDashboardStats() {
  const stored = await chrome.storage.local.get([
    ANALYTICS_KEY,
    "statsShortsSkipped",
    "statsAdsBlocked",
    "statsSummariesGenerated",
    "statsQuitsEarly",
    "statsTimeSaved",
    "profileName",
    "profileImage",
    "profileEmail",
    "profileGoal",
  ]);

  const lifetime = {
    shortsSkipped: Number(stored.statsShortsSkipped) || 0,
    adsBlocked: Number(stored.statsAdsBlocked) || 0,
    summariesGenerated: Number(stored.statsSummariesGenerated) || 0,
    quitsEarly: Number(stored.statsQuitsEarly) || 0,
    timeSavedMinutes: Number(stored.statsTimeSaved) || 0,
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
  const ranges = { day: 1, week: 7, month: 30 };
  const metricKeys = Object.keys(METRIC_TO_TOTAL_KEY);

  const report = {};
  for (const [label, days] of Object.entries(ranges)) {
    const totals = Object.fromEntries(metricKeys.map((k) => [k, 0]));
    const points = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = getDayKey(date.getTime());
      const dayMetrics = analytics[key] || {};
      const point = { key };

      metricKeys.forEach((metric) => {
        const value = Number(dayMetrics[metric]) || 0;
        totals[metric] += value;
        point[metric] = value;
      });

      points.push(point);
    }
    report[label] = { totals, points };
  }

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

async function fetchTranscript({ videoId, preferredLang = "en", useAutoCaptions = true }) {
  if (!isNonEmptyString(videoId, 20) || !/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) {
    return { success: false, error: "Invalid videoId" };
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
  return {
    success: true,
    text: combined.slice(0, MAX_TRANSCRIPT_LENGTH),
    lang: preferred.languageCode,
  };
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
// Screenshot Capture
// ---------------------------------------------------------------------------

async function handleScreenshotCapture(message, sendResponse) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `FocusTube-Screen-${timestamp}.png`;

  debugLog(
    "Background capture triggered:",
    !!message.dataUrl ? "Data Provided" : "Requesting Capture",
  );

  const downloadDataUrl = (dataUrl) => {
    if (!dataUrl) {
      console.warn("[FocusTube BG] downloadDataUrl called with no data");
      if (sendResponse) sendResponse({ success: false, error: "No image data" });
      return;
    }
    chrome.downloads.download(
      {
        url: dataUrl,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message;
          console.error("[FocusTube BG] Download failed:", errMsg);
          if (sendResponse) sendResponse({ success: false, error: errMsg });
        } else {
          debugLog("Screenshot downloaded successfully ID:", downloadId);
          if (sendResponse)
            sendResponse({ success: true, downloadId });
        }
      },
    );
  };

  if (message.dataUrl) {
    downloadDataUrl(message.dataUrl);
    return;
  }

  try {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    let targetTab = tabs[0];
    if (!targetTab) {
      const allTabs = await chrome.tabs.query({ active: true });
      targetTab = allTabs[0];
    }
    if (!targetTab) {
      console.error("[FocusTube BG] No active tab found for capture");
      if (sendResponse) sendResponse({ success: false, error: "Tab not found" });
      return;
    }

    chrome.tabs.sendMessage(
      targetTab.id,
      { action: "captureVideoFrame" },
      (response) => {
        if (
          !chrome.runtime.lastError &&
          response?.success &&
          response.dataUrl
        ) {
          debugLog("Content script returned frame successfully");
          downloadDataUrl(response.dataUrl);
          return;
        }
        debugLog("Content script capture failed, trying fallback...");
        chrome.tabs.captureVisibleTab(
          targetTab.windowId,
          { format: "png" },
          (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
              console.error(
                "[FocusTube BG] Viewport capture failed:",
                chrome.runtime.lastError?.message,
              );
              if (sendResponse)
                sendResponse({ success: false, error: "Capture failed" });
            } else {
              debugLog("Viewport capture successful");
              downloadDataUrl(dataUrl);
            }
          },
        );
      },
    );
  } catch (err) {
    console.error("[FocusTube BG] handleScreenshotCapture fatal error:", err);
    if (sendResponse) sendResponse({ success: false, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Recording (tabCapture via offscreen document)
// ---------------------------------------------------------------------------

chrome.commands.onCommand.addListener(async (command) => {
  debugLog("Command received:", command);
  const settings = await chrome.storage.local.get(["shortcutsEnabled"]);
  if (settings.shortcutsEnabled === false) return;

  if (command === "take-screenshot") {
    handleScreenshotCapture({ action: "captureScreenshot" });
  } else if (command === "toggle-recording") {
    handleToggleRecording();
  }
});

let isRecording = false;

async function handleToggleRecording(sendResponse) {
  try {
    if (isRecording) {
      console.log("[FocusTube BG] Stopping recording...");
      const stopResponse = await chrome.runtime.sendMessage({
        action: "stopRecording",
        target: "offscreen",
      });
      if (!stopResponse?.success) {
        throw new Error(stopResponse?.error || "Failed to stop recording");
      }
      isRecording = false;
      broadcastRecordingStatus(false);
      await closeOffscreenDocument();
      console.log("[FocusTube BG] Recording stopped successfully");
      if (sendResponse) sendResponse({ success: true, isRecording: false });
    } else {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab) {
        throw new Error("No active tab found");
      }
      console.log("[FocusTube BG] Starting recording for tab:", tab.title);

      if (!(await chrome.offscreen.hasDocument())) {
        console.log("[FocusTube BG] Creating offscreen document...");
        await chrome.offscreen.createDocument({
          url: "src/offscreen/offscreen.html",
          reasons: ["USER_MEDIA"],
          justification: "Capturing screen and audio for recording.",
        });
        console.log("[FocusTube BG] Offscreen document created");
      }

      console.log("[FocusTube BG] Requesting media stream ID...");
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tab.id,
      });
      debugLog("Stream ID received:", streamId);

      const startResponse = await chrome.runtime.sendMessage({
        action: "startRecording",
        target: "offscreen",
        streamId,
        tabTitle: tab.title,
      });
      if (!startResponse?.success) {
        await closeOffscreenDocument();
        throw new Error(startResponse?.error || "Failed to start recording");
      }
      isRecording = true;
      broadcastRecordingStatus(true);
      console.log("[FocusTube BG] Recording started successfully");
      if (sendResponse) sendResponse({ success: true, isRecording: true });
    }
  } catch (err) {
    console.error("[FocusTube BG] Recording error:", err);
    isRecording = false;
    await closeOffscreenDocument().catch(() => {});
    if (sendResponse) sendResponse({ success: false, error: err.message });
  }
}

function broadcastRecordingStatus(recording) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          action: recording ? "startRecording" : "recordingStopped",
        })
        .catch(() => {});
    });
  });
  chrome.runtime
    .sendMessage({
      action: "recordingStatusChanged",
      isRecording: recording,
    })
    .catch(() => {});
}

async function closeOffscreenDocument() {
  try {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument();
    }
  } catch (err) {
    debugLog("Failed to close offscreen document:", err);
  }
}

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
  } catch (err) {
    console.error("[FocusTube BG] Error removing blocked site:", err);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    sendResponse({ success: false, error: "Invalid message" });
    return false;
  }
  debugLog("Message received:", message.action);

  (async () => {
    try {
      switch (message.action) {
        case "captureScreenshot":
          // Fire-and-forget download; respond immediately, then download
          // completion is reported via the inner callback.
          handleScreenshotCapture(message, sendResponse);
          // handleScreenshotCapture will call sendResponse itself.
          return;

        case "toggleRecording":
          await handleToggleRecording(sendResponse);
          return;

        case "getRecordingStatus":
          sendResponse({ success: true, isRecording });
          return;

        case "recordingStopped":
          isRecording = false;
          broadcastRecordingStatus(false);
          await closeOffscreenDocument().catch((err) =>
            console.error("[FocusTube BG] Error closing offscreen:", err),
          );
          sendResponse({ success: true });
          return;

        case "recordMetric":
          if (
            !isNonEmptyString(message.metric, 64) ||
            !METRIC_TO_TOTAL_KEY[message.metric]
          ) {
            sendResponse({
              success: false,
              error: "Unsupported metric",
            });
            return;
          }
          await recordMetric(message.metric, message.amount);
          sendResponse({ success: true });
          return;

        case "getDashboardStats":
          sendResponse({ success: true, data: await getDashboardStats() });
          return;

        case "setTempBlock": {
          const until = Number(message.until);
          if (!Number.isFinite(until) || until < 0) {
            sendResponse({ success: false, error: "Invalid until" });
            return;
          }
          const minutes = Number(message.minutes) || 0;
          await chrome.storage.local.set({ tempBlockUntil: until });
          if (minutes > 0 && Number.isFinite(minutes)) {
            await recordMetric("timeSavedMinutes", minutes);
          }
          await notifyAllTabs();
          sendResponse({ success: true, until });
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
