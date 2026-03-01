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
};

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[YFP Background] Extension installed/updated:", details.reason);

  // Try to restore from cookie if storage is empty
  const settings = await chrome.storage.sync.get(null);
  if (Object.keys(settings).length === 0) {
    console.log(
      "[YFP Background] Storage empty, checking for cookie-synced settings",
    );
    const restored = await loadSettingsFromCookie();
    if (!restored) {
      console.log("[YFP Background] No cookie found, setting default values");
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
    }
  } else {
    // If we have settings, ensure they are synced to cookie for other browsers/reinstalls
    syncSettingsToCookie();
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

  // Initial user fetch
  fetchYouTubeUser();
});

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Check for extension page to deter uninstallation
  if (
    tab.url &&
    (tab.url.startsWith("chrome://extensions") ||
      tab.url.startsWith("edge://extensions") ||
      tab.url.startsWith("brave://extensions"))
  ) {
    chrome.storage.sync.get(["extensionEnabled"], (settings) => {
      if (settings.extensionEnabled !== false) {
        chrome.tabs.remove(tabId).catch(() => {});
      }
    });
    return;
  }

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

/**
 * Fetch YouTube user profile data (name, avatar, and email)
 */
async function fetchYouTubeUser() {
  try {
    const response = await fetch("https://www.youtube.com/?gl=US&hl=en", {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const html = await response.text();

    // 1. Try to find the account name in raw HTML (extremely robust)
    let accountName = null;
    let imageUrl = null;

    const nameMatches = [
      /"accountName":\s*{\s*"simpleText":\s*"([^"]+)"/,
      /"accountName":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/,
      /,"name":\s*{\s*"simpleText":\s*"([^"]+)"\s*}/,
      /"label":\s*"Avatar image for ([^"]+)"/,
    ];

    for (const pattern of nameMatches) {
      const match = html.match(pattern);
      if (match && match[1]) {
        accountName = match[1];
        break;
      }
    }

    // 1.5. Try to find the email in ytcfg or raw HTML
    let accountEmail = null;
    const emailMatches = [
      /"VALID_USER_EMAIL":\s*"([^"]+)"/,
      /"email":\s*"([^"]+)"/,
      /,"email":\s*"([^"]+)"\s*/,
    ];

    for (const pattern of emailMatches) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].includes("@")) {
        accountEmail = match[1];
        break;
      }
    }
    const dataMatch = html.match(/ytInitialData\s*=\s*({.+?});/);
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1]);

        // Find avatar if not found yet
        if (!imageUrl) {
          const topbar = data.topbar?.desktopTopbarRenderer;
          const profileBtn = topbar?.topbarButtons?.find(
            (b) => b.topbarMenuButtonRenderer?.avatar,
          );
          const avatar = profileBtn?.topbarMenuButtonRenderer?.avatar;
          if (avatar && avatar.thumbnails) {
            imageUrl = avatar.thumbnails[avatar.thumbnails.length - 1]?.url;

            // Third fallback for name: check the avatar label if regex failed
            if (!accountName) {
              const label =
                avatar.accessibility?.accessibilityData?.label || "";
              accountName = label
                .replace(
                  "Account profile photo that opens list of alternate accounts",
                  "",
                )
                .replace(/Avatar image for/i, "")
                .replace(/Avatar image/i, "")
                .trim();
            }
          }
        }
      } catch (e) {
        console.warn(
          "[FocusTube] ytInitialData parse failed during fallback search",
        );
      }
    }

    // Still no name? Try one last generic regex for any name entry near an account link
    if (!accountName || accountName.toLowerCase().includes("avatar image")) {
      const fallbackMatch = html.match(/"name":\s*"([^"]+)"/);
      if (fallbackMatch) accountName = fallbackMatch[1];
    }

    if (accountName || imageUrl || accountEmail) {
      const profile = {
        profileName: accountName || "User",
        profileImage: imageUrl || "",
        profileEmail: accountEmail || "",
      };

      console.log(
        "[FocusTube] Successfully Synced Profile:",
        profile.profileName,
        profile.profileEmail,
      );
      await chrome.storage.sync.set(profile);
      return profile;
    }

    console.log(
      "[FocusTube] All extraction attempts failed (likely logged out)",
    );
    return null;
  } catch (error) {
    console.error("[FocusTube] Critical error in user fetch:", error);
    return null;
  }
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

  // Method 1: ytInitialPlayerResponse
  let playerResponse = null;
  const playerRespMatch = pageHtml.match(
    /ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s|<\/script>)/s,
  );
  if (playerRespMatch && playerRespMatch[1]) {
    try {
      playerResponse = JSON.parse(playerRespMatch[1]);
    } catch (e) {
      // If direct parse fails, try to extract it more carefully
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
      } catch (e2) {}
    }
  }

  if (playerResponse) {
    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(tracks)) return tracks;
  }

  // Method 2: Direct captionTracks match
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
 * Handle Screenshot Capture (from command or message)
 */
async function handleScreenshotCapture(message, sendResponse) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `FocusTube-Screen-${timestamp}.png`;

  console.log(
    "[FocusTube] Background capture triggered:",
    !!message.dataUrl ? "Data Provided" : "Requesting Capture",
  );

  const downloadDataUrl = (dataUrl) => {
    if (!dataUrl) {
      console.warn("[FocusTube] downloadDataUrl called with no data");
      if (sendResponse)
        sendResponse({ success: false, error: "No image data" });
      return;
    }
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message;
          console.error("[FocusTube] Download failed:", errMsg);
          if (sendResponse) sendResponse({ success: false, error: errMsg });
        } else {
          console.log(
            "[FocusTube] Screenshot downloaded successfully ID:",
            downloadId,
          );
          if (sendResponse)
            sendResponse({ success: true, downloadId: downloadId });
        }
      },
    );
  };

  // 1. Easy path: Content script already did the work
  if (message.dataUrl) {
    downloadDataUrl(message.dataUrl);
    return;
  }

  // 2. Full path: Background needs to initiate capture
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
      console.error("[FocusTube] No active tab found for capture");
      if (sendResponse)
        sendResponse({ success: false, error: "Tab not found" });
      return;
    }

    // Try content script messaging first
    chrome.tabs.sendMessage(
      targetTab.id,
      { action: "captureVideoFrame" },
      async (response) => {
        // If content script succeeds
        if (
          !chrome.runtime.lastError &&
          response?.success &&
          response.dataUrl
        ) {
          console.log("[FocusTube] Content script returned frame successfully");
          downloadDataUrl(response.dataUrl);
          return;
        }

        console.log(
          "[FocusTube] Content script capture failed, trying fallback...",
        );

        // Fallback 1: Manual Viewport Capture (High reliability)
        chrome.tabs.captureVisibleTab(
          targetTab.windowId,
          { format: "png" },
          (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
              console.error(
                "[FocusTube] Viewport capture failed:",
                chrome.runtime.lastError?.message,
              );
              if (sendResponse)
                sendResponse({ success: false, error: "Capture failed" });
            } else {
              console.log("[FocusTube] Viewport capture successful");
              downloadDataUrl(dataUrl);
            }
          },
        );
      },
    );
  } catch (err) {
    console.error("[FocusTube] handleScreenshotCapture fatal error:", err);
    if (sendResponse) sendResponse({ success: false, error: err.message });
  }
}

/**
 * Handle global commands
 */
chrome.commands.onCommand.addListener(async (command) => {
  console.log("[FocusTube] Command received:", command);
  const settings = await chrome.storage.sync.get(["shortcutsEnabled"]);
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
      isRecording = false;
      chrome.runtime.sendMessage({ action: "stopRecording" });
      broadcastRecordingStatus(false);
      if (sendResponse) sendResponse({ success: true, isRecording: false });
    } else {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab) {
        if (sendResponse)
          sendResponse({ success: false, error: "No active tab" });
        return;
      }

      // Check if we need to create the offscreen document
      if (!(await chrome.offscreen.hasDocument())) {
        await chrome.offscreen.createDocument({
          url: "src/offscreen/offscreen.html",
          reasons: ["USER_MEDIA"],
          justification: "Capturing tab content for recording.",
        });
      }

      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tab.id,
      });
      chrome.runtime.sendMessage({
        action: "startRecording",
        streamId: streamId,
        tabTitle: tab.title,
      });

      isRecording = true;
      broadcastRecordingStatus(true);
      if (sendResponse) sendResponse({ success: true, isRecording: true });
    }
  } catch (err) {
    console.error("[FocusTube] Recording toggle error:", err);
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
}

/**
 * Handle incoming messages
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[FocusTube] Message received:", message.action);

  // Use a dedicated handler for screenshot to keep this clean
  if (message.action === "captureScreenshot") {
    handleScreenshotCapture(message, sendResponse);
    return true; // Asynchronous response
  }

  if (message.action === "toggleRecording") {
    handleToggleRecording(sendResponse);
    return true;
  }

  if (message.action === "getRecordingStatus") {
    sendResponse({ success: true, isRecording: isRecording });
    return;
  }

  if (message.action === "recordingStopped") {
    isRecording = false;
    return;
  }

  if (message.action === "getUserProfile") {
    fetchYouTubeUser().then((profile) => {
      sendResponse({ success: true, profile });
    });
    return true;
  }

  // Handle other actions
  (async () => {
    try {
      switch (message.action) {
        case "getTranscript": {
          const videoId = message.videoId || "";
          const preferredLang = message.preferredLang || "en";
          if (!videoId) {
            sendResponse({ success: false, error: "Missing videoId" });
            return;
          }

          // Check cache
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

          const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
          let pageHtml = "";
          try {
            const pageResp = await fetch(watchUrl);
            if (pageResp.ok) pageHtml = await pageResp.text();
          } catch (e) {
            console.warn("[YFP] Failed to fetch watch page:", e);
          }

          const captionTracks = parseCaptionTracks(pageHtml);
          let transcriptUrl = "";
          if (captionTracks.length > 0) {
            const track =
              captionTracks.find(
                (t) =>
                  matchesLang(t.languageCode, preferredLang) &&
                  t.kind !== "asr",
              ) ||
              captionTracks.find(
                (t) => t.languageCode === "en" && t.kind !== "asr",
              ) ||
              captionTracks.find((t) => t.kind !== "asr") ||
              captionTracks.find(
                (t) =>
                  matchesLang(t.languageCode, preferredLang) &&
                  t.kind === "asr",
              ) ||
              captionTracks.find(
                (t) => t.languageCode === "en" && t.kind === "asr",
              ) ||
              captionTracks[0];
            if (track?.baseUrl) transcriptUrl = track.baseUrl;
          }

          let textOut = "";
          if (transcriptUrl) {
            try {
              const json3Url =
                transcriptUrl +
                (transcriptUrl.includes("?") ? "&" : "?") +
                "fmt=json3";
              const r = await fetch(json3Url);
              if (r.ok) {
                const data = await r.json();
                textOut = (data.events || [])
                  .map((ev) =>
                    (ev.segs || []).map((s) => s.utf8 || "").join(""),
                  )
                  .filter((s) => s.trim())
                  .join(" ")
                  .replace(/\s+/g, " ")
                  .trim();
              }
            } catch (e) {
              console.warn("[YFP] JSON3 fetch failed:", e);
            }

            if (!textOut || textOut.length < 50) {
              try {
                const r = await fetch(transcriptUrl);
                if (r.ok) {
                  const xml = await r.text();
                  if (xml?.includes("<text")) {
                    textOut = Array.from(
                      xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g),
                    )
                      .map((m) => decodeXmlEntities(m[1]).replace(/\n/g, " "))
                      .join(" ")
                      .replace(/\s+/g, " ")
                      .trim();
                  }
                }
              } catch (e) {
                console.warn("[YFP] XML fetch failed:", e);
              }
            }
          }

          if (!textOut || textOut.length < 20) {
            sendResponse({ success: false, error: "Transcript not available" });
            return;
          }

          const limited = textOut.slice(0, 15000);
          await chrome.storage.local.set({
            [cacheKey]: { text: limited, ts: Date.now() },
          });
          sendResponse({ success: true, text: limited });
          break;
        }

        case "aiSummarize": {
          const stored = await chrome.storage.sync.get(null);
          const provider = message.provider || stored.aiProvider || "gemini";
          const defaults =
            stored.aiProviderDefaultModels ||
            DEFAULT_SETTINGS.aiModelByProvider;
          const byProvider = stored.aiModelByProvider || {};
          const model =
            message.model ||
            byProvider[provider] ||
            stored.aiModel ||
            defaults[provider] ||
            defaults.gemini;
          const prompt = message.prompt || "";

          const keyMap = {
            gemini: stored.geminiApiKey,
            openai: stored.openaiApiKey,
            mistral: stored.mistralApiKey,
            deepseek: stored.deepseekApiKey,
            grok: stored.grokApiKey,
          };
          if (!keyMap[provider]) {
            sendResponse({
              success: false,
              error: `Missing API key for ${provider}`,
            });
            return;
          }

          let apiUrl, headers, body;
          if (provider === "gemini") {
            const apiVersion = model.includes("-exp") ? "v1beta" : "v1";
            apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${keyMap.gemini}`;
            headers = { "Content-Type": "application/json" };
            body = { contents: [{ parts: [{ text: prompt }] }] };
          } else {
            const apiEndpoints = {
              openai: "https://api.openai.com/v1/chat/completions",
              mistral: "https://api.mistral.ai/v1/chat/completions",
              deepseek: "https://api.deepseek.com/v1/chat/completions",
              grok: "https://api.x.ai/v1/chat/completions",
            };
            apiUrl = apiEndpoints[provider];
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${keyMap[provider]}`,
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

          const doFetch = async (url, opts) =>
            fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
              ...opts,
            });
          let res = await doFetch(apiUrl);

          if (provider === "gemini" && !res.ok && res.status === 404) {
            const fallbacks = [
              model,
              byProvider.gemini,
              defaults.gemini,
              "gemini-1.5-flash",
              "gemini-1.5-pro",
            ].filter(Boolean);
            for (const fm of fallbacks) {
              if (fm === model) continue;
              apiUrl = `https://generativelanguage.googleapis.com/${fm.includes("-exp") ? "v1beta" : "v1"}/models/${fm}:generateContent?key=${keyMap.gemini}`;
              res = await doFetch(apiUrl);
              if (res.ok) break;
            }
          }

          if (!res.ok) {
            const errorText = await res.text();
            sendResponse({
              success: false,
              error: `API Error (${res.status}): ${errorText}`,
            });
            return;
          }

          const data = await res.json();
          const text =
            provider === "gemini"
              ? data.candidates?.[0]?.content?.parts?.[0]?.text
              : data.choices?.[0]?.message?.content;
          sendResponse({ success: true, text: text || "" });
          break;
        }

        case "getSettings":
          sendResponse({
            success: true,
            settings: {
              ...DEFAULT_SETTINGS,
              ...(await chrome.storage.sync.get(null)),
            },
          });
          break;

        case "saveSettings":
          await chrome.storage.sync.set(message.settings);
          sendResponse({ success: true });
          notifyAllTabs();
          break;

        case "resetSettings":
          await chrome.storage.sync.clear();
          await chrome.storage.sync.set(DEFAULT_SETTINGS);
          sendResponse({ success: true });
          notifyAllTabs();
          break;

        case "exportSettings":
          sendResponse({
            success: true,
            data: JSON.stringify(
              { ...DEFAULT_SETTINGS, ...(await chrome.storage.sync.get(null)) },
              null,
              2,
            ),
          });
          break;

        case "importSettings":
          try {
            const settings = JSON.parse(message.data);
            await chrome.storage.sync.clear();
            await chrome.storage.sync.set(settings);
            sendResponse({ success: true });
            notifyAllTabs();
          } catch (e) {
            sendResponse({ success: false, error: "Invalid JSON" });
          }
          break;

        default:
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (e) {
      console.error("[FocusTube] Background Error:", e);
      sendResponse({ success: false, error: e.message });
    }
  })();
  return true;
});

/**
 * Notifies all open YouTube tabs about a settings update
 */
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
    console.log(`[FocusTube] Notified ${tabs.length} tabs`);
  } catch (e) {
    console.warn("[FocusTube] Error notifying tabs:", e);
  }
}

/**
 * Setup storage change listener
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync") {
    notifyAllTabs();
    syncSettingsToCookie();
  }
});

/**
 * Sync all settings to a persistent cookie on YouTube domain.
 */
async function syncSettingsToCookie() {
  try {
    const settings = await chrome.storage.sync.get(null);
    if (!settings || Object.keys(settings).length === 0) return;

    // Convert to string and base64 for safe cookie storage
    // Use a compact representation to stay under cookie size limits (4KB)
    const dataString = JSON.stringify(settings);
    const encoded = btoa(unescape(encodeURIComponent(dataString)));

    if (encoded.length > 4000) {
      console.warn("[FocusTube] Settings too large for cookie sync, skipping");
      return;
    }

    await chrome.cookies.set({
      url: "https://www.youtube.com/",
      name: "focustube_settings",
      value: encoded,
      domain: ".youtube.com",
      path: "/",
      secure: true,
      sameSite: "no_restriction",
      expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 5, // 5 years
    });
    console.log("[FocusTube] Settings synced to YouTube cookie");
  } catch (e) {
    console.error("[FocusTube] Cookie sync failed:", e);
  }
}

/**
 * Load settings from YouTube cookie if local storage is empty.
 */
async function loadSettingsFromCookie() {
  try {
    const cookie = await chrome.cookies.get({
      url: "https://www.youtube.com/",
      name: "focustube_settings",
    });

    if (cookie && cookie.value) {
      const decodedData = decodeURIComponent(escape(atob(cookie.value)));
      const settings = JSON.parse(decodedData);

      if (settings && typeof settings === "object") {
        console.log("[FocusTube] Restoring settings from YouTube cookie");
        await chrome.storage.sync.set(settings);
        return true;
      }
    }
  } catch (e) {
    console.warn("[FocusTube] Could not restore from cookie:", e);
  }
  return false;
}

/**
 * Extension Startup/Installation logic
 */
chrome.runtime.onStartup.addListener(() => {
  console.log("[FocusTube] Startup heartbeat started");
});

console.log("[FocusTube] Service worker loaded");

// Sync recording status to reloaded tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && isRecording) {
    chrome.tabs
      .sendMessage(tabId, { action: "startRecording" })
      .catch(() => {});
  }
});
