/**
 * Background Service Worker
 * Handles extension lifecycle, tab updates, and messaging
 */

// Default settings (synced with other modules)
const DEFAULT_SETTINGS = {
  // Master Switch
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
};

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[YFP Background] Extension installed/updated:", details.reason);

  // Set default settings if none exist
  const settings = await chrome.storage.sync.get(null);
  if (Object.keys(settings).length === 0) {
    console.log("[YFP Background] Setting default values");
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
  }

  // Show welcome message on first install
  if (details.reason === "install") {
    chrome.tabs
      .create({
        url: "https://www.youtube.com",
        active: true,
      })
      .then(() => {
        console.log("[YFP Background] Opened YouTube after installation");
      })
      .catch((error) => {
        console.error("[YFP Background] Error opening YouTube:", error);
      });
  }
});

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when page is completely loaded
  if (changeInfo.status !== "complete") {
    return;
  }

  // Only process YouTube tabs
  if (!tab.url || !tab.url.includes("youtube.com")) {
    return;
  }

  console.log("[YFP Background] YouTube tab updated:", tab.url);

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

    if (tab.url && tab.url.includes("youtube.com")) {
      console.log("[YFP Background] YouTube tab activated");
      notifyContentScript(activeInfo.tabId);
    }
  } catch (error) {
    console.error("[YFP Background] Error handling tab activation:", error);
  }
});

/**
 * Notify content script to reload settings
 */
function notifyContentScript(tabId) {
  chrome.tabs
    .sendMessage(tabId, {
      action: "reloadSettings",
    })
    .catch((error) => {
      // Content script might not be ready yet, that's okay
      console.log(
        "[YFP Background] Could not send message to tab:",
        error.message,
      );
    });
}

function decodeXmlEntities(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(Number.parseInt(h, 16)),
    )
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseCaptionTracks(pageHtml) {
  if (!pageHtml) return [];

  // Preferred: parse the full player response object.
  const playerRespMatch = pageHtml.match(
    /ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s|<\/script>)/s,
  );
  if (playerRespMatch && playerRespMatch[1]) {
    try {
      const playerData = JSON.parse(playerRespMatch[1]);
      const tracks =
        playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) return tracks;
    } catch {}
  }

  // Fallback: parse captionTracks array directly when full object parse fails.
  const directTracksMatch = pageHtml.match(/"captionTracks":\s*(\[[\s\S]*?\])/);
  if (directTracksMatch && directTracksMatch[1]) {
    try {
      const tracks = JSON.parse(directTracksMatch[1]);
      if (Array.isArray(tracks)) return tracks;
    } catch {}
  }

  return [];
}

function matchesLang(trackLang, preferredLang) {
  const tl = (trackLang || "").toLowerCase();
  const pl = (preferredLang || "").toLowerCase();
  if (!tl || !pl) return false;
  return tl === pl || tl.startsWith(`${pl}-`) || pl.startsWith(`${tl}-`);
}

/**
 * Handle incoming messages
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[YFP Background] Message received:", message);

  switch (message.action) {
    case "getTranscript": {
      (async () => {
        try {
          const videoId = message.videoId || "";
          const preferredLang = message.preferredLang || "en";
          if (!videoId) {
            sendResponse({ success: false, error: "Missing videoId" });
            return;
          }

          // Check cache first
          const cacheKey = `transcripts:${videoId}`;
          try {
            const cached = await chrome.storage.local.get(cacheKey);
            const cachedVal = cached[cacheKey];
            if (
              cachedVal &&
              cachedVal.text &&
              Date.now() - (cachedVal.ts || 0) < 3600_000
            ) {
              console.log("[YFP] Transcript cache hit for", videoId);
              sendResponse({ success: true, text: cachedVal.text });
              return;
            }
          } catch (e) {
            console.warn("[YFP] Cache read error:", e);
          }

          // Step 1: Fetch the YouTube watch page to get captionTracks
          const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
          let pageHtml = "";
          try {
            const pageResp = await fetch(watchUrl);
            if (pageResp.ok) {
              pageHtml = await pageResp.text();
            }
          } catch (e) {
            console.warn("[YFP] Failed to fetch watch page:", e);
          }

          // Step 2: Extract captionTracks from ytInitialPlayerResponse
          const captionTracks = parseCaptionTracks(pageHtml);

          // Step 3: Pick the best caption track
          let transcriptUrl = "";
          if (captionTracks.length > 0) {
            // Prefer manual captions in preferred language
            const preferred = captionTracks.find(
              (t) => matchesLang(t.languageCode, preferredLang) && t.kind !== "asr",
            );
            // Then manual captions in English
            const english = captionTracks.find(
              (t) => t.languageCode === "en" && t.kind !== "asr",
            );
            // Then any manual caption
            const anyManual = captionTracks.find((t) => t.kind !== "asr");
            // Then auto-generated in preferred language
            const autoPreferred = captionTracks.find(
              (t) => matchesLang(t.languageCode, preferredLang) && t.kind === "asr",
            );
            // Then auto-generated in English
            const autoEnglish = captionTracks.find(
              (t) => t.languageCode === "en" && t.kind === "asr",
            );
            // Then any auto-generated
            const anyAuto = captionTracks.find((t) => t.kind === "asr");
            // Then just the first track
            const track =
              preferred ||
              english ||
              anyManual ||
              autoPreferred ||
              autoEnglish ||
              anyAuto ||
              captionTracks[0];
            if (track && track.baseUrl) {
              transcriptUrl = track.baseUrl;
            }
          }

          // Step 4: Fetch the transcript XML
          let textOut = "";
          if (transcriptUrl) {
            try {
              // Fetch as JSON3 first (more structured)
              const json3Url =
                transcriptUrl +
                (transcriptUrl.includes("?") ? "&" : "?") +
                "fmt=json3";
              const r = await fetch(json3Url);
              if (r.ok) {
                const ct = r.headers.get("content-type") || "";
                if (ct.includes("json")) {
                  const data = await r.json();
                  const events = Array.isArray(data.events) ? data.events : [];
                  textOut = events
                    .map((ev) => {
                      const segs = Array.isArray(ev.segs) ? ev.segs : [];
                      return segs.map((s) => s.utf8 || "").join("");
                    })
                    .filter((s) => s.trim())
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
                }
              }
            } catch (e) {
              console.warn("[YFP] JSON3 transcript fetch failed:", e);
            }

            // Fallback to XML format
            if (!textOut || textOut.length < 50) {
              try {
                const r = await fetch(transcriptUrl);
                if (r.ok) {
                  const xml = await r.text();
                  if (xml && xml.includes("<text")) {
                    const parts = Array.from(
                      xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g),
                    ).map((m) => m[1]);
                    textOut = parts
                      .map((t) =>
                        decodeXmlEntities(t).replace(/\n/g, " "),
                      )
                      .join(" ")
                      .replace(/\s+/g, " ")
                      .trim();
                  }
                }
              } catch (e) {
                console.warn("[YFP] XML transcript fetch failed:", e);
              }
            }
          }

          if (!textOut || textOut.length < 20) {
            console.log("[YFP] No transcript found for", videoId);
            sendResponse({
              success: false,
              error: "Transcript not available for this video",
            });
            return;
          }

          const limited = textOut.slice(0, 15000);
          console.log(
            "[YFP] Transcript fetched:",
            limited.length,
            "chars for",
            videoId,
          );

          // Cache it
          try {
            await chrome.storage.local.set({
              [cacheKey]: { text: limited, ts: Date.now() },
            });
          } catch (e) {
            console.warn("[YFP] Cache write failed:", e);
          }

          sendResponse({ success: true, text: limited });
        } catch (e) {
          console.error("[YFP] Transcript fetch error:", e);
          sendResponse({
            success: false,
            error: e.message || "Transcript fetch failed",
          });
        }
      })();
      return true;
    }
    case "aiSummarize": {
      (async () => {
        try {
          const stored = await chrome.storage.sync.get(null);
          const provider = message.provider || stored.aiProvider || "gemini";
          const defaults = stored.aiProviderDefaultModels || {
            gemini: "gemini-1.5-flash",
            openai: "gpt-4o-mini",
            mistral: "mistral-small",
            deepseek: "deepseek-chat",
            grok: "grok-2-mini",
          };
          const byProvider = stored.aiModelByProvider || {};
          // Explicitly prefer the model passed in message, then per-provider setting, then global setting, then default
          const modelCandidate =
            message.model || byProvider[provider] || stored.aiModel;
          const model = modelCandidate || defaults[provider] || defaults.gemini;
          const prompt = message.prompt || "";
          let apiUrl = "";
          let headers = {};
          let body = {};
          const supportedProviders = ["gemini", "openai", "mistral", "deepseek", "grok"];
          if (!supportedProviders.includes(provider)) {
            sendResponse({ success: false, error: `Unsupported provider: ${provider}` });
            return;
          }

          const keyMap = {
            gemini: stored.geminiApiKey || "",
            openai: stored.openaiApiKey || "",
            mistral: stored.mistralApiKey || "",
            deepseek: stored.deepseekApiKey || "",
            grok: stored.grokApiKey || "",
          };
          if (!keyMap[provider]) {
            sendResponse({
              success: false,
              error: `Provider ${provider}: missing API key`,
            });
            return;
          }

          if (provider === "gemini") {
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyMap.gemini}`;
            headers = { "Content-Type": "application/json" };
            body = { contents: [{ parts: [{ text: prompt }] }] };
          } else if (provider === "openai") {
            apiUrl = "https://api.openai.com/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${keyMap.openai}`,
            };
            body = {
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are an assistant that summarizes YouTube videos.",
                },
                { role: "user", content: prompt },
              ],
            };
          } else if (provider === "mistral") {
            apiUrl = "https://api.mistral.ai/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${keyMap.mistral}`,
            };
            body = {
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are an assistant that summarizes YouTube videos.",
                },
                { role: "user", content: prompt },
              ],
            };
          } else if (provider === "deepseek") {
            apiUrl = "https://api.deepseek.com/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${keyMap.deepseek}`,
            };
            body = {
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are an assistant that summarizes YouTube videos.",
                },
                { role: "user", content: prompt },
              ],
            };
          } else if (provider === "grok") {
            apiUrl = "https://api.x.ai/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${keyMap.grok}`,
            };
            body = {
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are an assistant that summarizes YouTube videos.",
                },
                { role: "user", content: prompt },
              ],
            };
          }

          async function doFetch() {
            return fetch(apiUrl, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
            });
          }
          let response = await doFetch();

          // Gemini model names age quickly; transparently retry on model-not-found.
          if (provider === "gemini" && !response.ok && response.status === 404) {
            const fallbackModels = Array.from(
              new Set([
                model,
                byProvider.gemini,
                defaults.gemini,
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-pro",
              ].filter(Boolean)),
            );
            for (const fm of fallbackModels) {
              if (fm === model) continue;
              apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fm}:generateContent?key=${keyMap.gemini}`;
              response = await doFetch();
              if (response.ok) break;
            }
          }
          if (
            !response.ok &&
            (response.status === 429 || response.status >= 500)
          ) {
            await new Promise((r) => setTimeout(r, 800));
            response = await doFetch();
          }

          if (!response.ok) {
            let errMsg = `Provider ${provider}: HTTP ${response.status}`;
            try {
              const err = await response.json();
              const msg = err.error?.message || JSON.stringify(err);
              if (response.status === 401 || response.status === 403)
                errMsg += " (invalid or missing key)";
              if (response.status === 404) errMsg += " (model not found)";
              if (response.status === 429) errMsg += " (rate limit)";
              errMsg += ` - ${msg}`;
            } catch {}
            sendResponse({ success: false, error: errMsg });
            return;
          }

          let text = "";
          try {
            const data = await response.json();
            if (provider === "gemini") {
              const candidate = (data.candidates && data.candidates[0]) || {};
              const parts =
                (candidate.content && candidate.content.parts) || [];
              text = parts[0] && parts[0].text ? parts[0].text : "";
            } else {
              const choice = (data.choices && data.choices[0]) || {};
              const msg = choice.message || choice.delta || {};
              text = msg.content || "";
            }
          } catch {
            text = "";
          }

          sendResponse({ success: true, text });
        } catch (e) {
          sendResponse({ success: false, error: e.message || "Unknown error" });
        }
      })();
      return true;
    }
    case "getSettings":
      // Return current settings
      chrome.storage.sync
        .get(null)
        .then((settings) => {
          sendResponse({
            success: true,
            settings: { ...DEFAULT_SETTINGS, ...settings },
          });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response

    case "saveSettings":
      // Save settings
      chrome.storage.sync
        .set(message.settings)
        .then(() => {
          sendResponse({ success: true });

          // Notify all YouTube tabs
          notifyAllTabs();
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "resetSettings":
      // Reset to defaults
      chrome.storage.sync
        .clear()
        .then(() => {
          return chrome.storage.sync.set(DEFAULT_SETTINGS);
        })
        .then(() => {
          sendResponse({ success: true });
          notifyAllTabs();
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "exportSettings":
      // Export settings as JSON
      chrome.storage.sync
        .get(null)
        .then((settings) => {
          sendResponse({
            success: true,
            data: JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }, null, 2),
          });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "importSettings":
      // Import settings from JSON
      try {
        const settings = JSON.parse(message.data);
        chrome.storage.sync
          .clear()
          .then(() => {
            return chrome.storage.sync.set(settings);
          })
          .then(() => {
            sendResponse({ success: true });
            notifyAllTabs();
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message });
          });
      } catch (error) {
        sendResponse({ success: false, error: "Invalid JSON format" });
      }
      return true;

    default:
      console.log("[YFP Background] Unknown action:", message.action);
      sendResponse({ success: false, error: "Unknown action" });
  }

  return false; // No async response needed for default case
});

/**
 * Notify all YouTube tabs
 */
async function notifyAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });

    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "reloadSettings",
        })
        .catch((error) => {
          console.log(
            "[YFP Background] Could not notify tab:",
            tab.id,
            error.message,
          );
        });
    });

    console.log(`[YFP Background] Notified ${tabs.length} YouTube tabs`);
  } catch (error) {
    console.error("[YFP Background] Error notifying tabs:", error);
  }
}

/**
 * Handle storage changes
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "sync") {
    return;
  }

  console.log("[YFP Background] Storage changed:", changes);

  // Notify all YouTube tabs about settings changes
  notifyAllTabs();
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log("[YFP Background] Extension started");

  // Ensure default settings are set
  chrome.storage.sync.get(null).then((settings) => {
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
    console.log("[YFP Background] Heartbeat");
  }, 60000);
}

startHeartbeat();

console.log("[YFP Background] Service worker initialized");
