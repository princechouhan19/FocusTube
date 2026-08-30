/**
 * Summary Button Module
 * Adds AI Summary button to video pages and displays summaries
 */

(function () {
  "use strict";

  // Module state
  let settings = {};
  let summaryButton = null;

  const PROVIDER_DEFAULT_MODELS = {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    mistral: "mistral-small-latest",
    deepseek: "deepseek-chat",
    grok: "grok-2-mini",
  };

  function resolveModel(provider, selectedModel) {
    if (selectedModel) return selectedModel;
    const byProvider = settings.aiModelByProvider || {};
    if (byProvider[provider]) return byProvider[provider];
    const defaults = settings.aiProviderDefaultModels || {};
    if (defaults[provider]) return defaults[provider];
    return PROVIDER_DEFAULT_MODELS[provider] || PROVIDER_DEFAULT_MODELS.gemini;
  }

  function resolveVideoId() {
    try {
      const url = new URL(window.location.href);
      const queryId = url.searchParams.get("v");
      if (queryId) return queryId;
      const shortsMatch = (url.pathname || "").match(
        /\/shorts\/([a-zA-Z0-9_-]{6,})/,
      );
      if (shortsMatch && shortsMatch[1]) return shortsMatch[1];
      const canonical =
        document.querySelector('link[rel="canonical"]')?.href || "";
      if (canonical) {
        const canonicalUrl = new URL(canonical, window.location.origin);
        const canonicalId = canonicalUrl.searchParams.get("v");
        if (canonicalId) return canonicalId;
        const canonicalShorts = (canonicalUrl.pathname || "").match(
          /\/shorts\/([a-zA-Z0-9_-]{6,})/,
        );
        if (canonicalShorts && canonicalShorts[1]) return canonicalShorts[1];
      }
      const metaId = document.querySelector(
        'meta[itemprop="videoId"]',
      )?.content;
      return metaId || "";
    } catch {
      return "";
    }
  }
  /**
   * Initialize the summary button
   */
  async function init() {
    if (typeof loadSettings === "function") {
      settings = await loadSettings();
    }

    if (settings.showSummaryButton) {
      injectSummaryButton();
      setupSummaryButtonObserver();
    }

    // Listen for video changes
    setupVideoChangeListener();
  }

  /**
   * Inject the summary button below video title
   */
  function injectSummaryButton() {
    if (document.querySelector(".yfp-summary-button")) return;
    let anchor =
      document.querySelector("ytd-watch-metadata #title") ||
      document.querySelector("#title h1 yt-formatted-string") ||
      document.querySelector("#title h1") ||
      document.querySelector("#title");
    if (!anchor) return;
    summaryButton = createElement("button", {
      className: "yfp-summary-button",
      innerHTML: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>AI Summary</span>
      `,
    });
    insertAfter(summaryButton, anchor);
    summaryButton.addEventListener("click", handleSummaryButtonClick);
    console.log("[YFP] Summary button injected");
  }

  /**
   * Handle summary button click
   */
  async function handleSummaryButtonClick() {
    if (!summaryButton) return;

    // Show loading state
    const originalText = summaryButton.querySelector("span").textContent;
    addClass(summaryButton, "loading");
    summaryButton.querySelector("span").textContent = "Generating...";

    try {
      if (typeof loadSettings === "function") {
        settings = await loadSettings();
      }
      const provider = settings.aiProvider || "gemini";
      const keyMap = {
        gemini: settings.geminiApiKey,
        openai: settings.openaiApiKey,
        mistral: settings.mistralApiKey,
        deepseek: settings.deepseekApiKey,
        grok: settings.grokApiKey,
      };
      const activeKey = keyMap[provider];
      
      // If missing key, provide guidance instead of just throwing error
      if (!activeKey) {
        const errorMsg = provider === 'gemini' 
          ? 'Gemini API Key missing. You can get one for FREE at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--lg-primary-hi);text-decoration:underline;">Google AI Studio</a>.'
          : `Missing ${provider} API Key. Please add it in extension settings.`;
        
        showSummaryModal(
          { title: "Setup Required" },
          { error: errorMsg, isSetup: true }
        );
        return;
      }

      // Extract video data
      const videoData = await extractVideoData();

      // Generate summary
      const summary = await generateSummary(videoData);

      // Display summary in modal
      showSummaryModal(videoData, summary);

      // Increment stats
      try {
        chrome.runtime.sendMessage({
          action: "recordMetric",
          metric: "summariesGenerated",
          amount: 1,
        });
      } catch (e) {}
    } catch (error) {
      console.error("[YFP] Error generating summary:", error);
      showSummaryModal(
        { title: "Error" },
        {
          error:
            error.message ||
            "Failed to generate summary. Please try again later.",
        },
      );
    } finally {
      // Reset button state
      removeClass(summaryButton, "loading");
      summaryButton.querySelector("span").textContent = originalText;
    }
  }

  /**
   * Extract video data (title, description)
   */
  async function extractVideoData() {
    const title =
      document.querySelector("#title h1 yt-formatted-string")?.textContent ||
      document.querySelector("h1.title")?.textContent ||
      document.querySelector("h1.ytd-watch-metadata")?.textContent ||
      document.title?.replace(" - YouTube", "") ||
      "";

    const description =
      document.querySelector("#description-inner yt-formatted-string")?.textContent ||
      document.querySelector("#description")?.textContent ||
      document.querySelector("ytd-text-inline-expander")?.textContent ||
      "";

    const vid = resolveVideoId();
    if (!vid) {
      throw new Error("Could not detect current YouTube video ID.");
    }

    let transcript = "";
    if (settings.useTranscript !== false) { // Default to true if not explicitly false
      try {
        const trResp = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: "getTranscript",
              videoId: vid,
              preferredLang: settings.transcriptLang || "en",
              useAutoCaptions: true,
            },
            (r) => resolve(r || { success: false }),
          );
        });
        if (trResp && trResp.success && trResp.text) {
          transcript = trResp.text;
        }
      } catch (e) {
        console.warn("[YFP] Transcript extraction failed:", e);
      }
    }

    return {
      title,
      description: description.slice(0, 5000),
      videoId: vid,
      url: window.location.href,
      transcript,
    };
  }

  /**
   * Generate summary using Gemini API
   */
  async function generateSummary(videoData) {
    console.log("[YFP] Generating summary for:", videoData.title);

    let prompt = `You are an assistant that summarizes YouTube content concisely.\n\nVideo Title:\n${videoData.title}\n\nDescription:\n${videoData.description}\n`;
    if (!videoData.transcript) {
      prompt +=
        "\nTranscript: Not available for this video. Base your summary on title and description only.\n";
    }
    if (videoData.transcript) {
      const t = videoData.transcript;
      if (t.length > 8000) {
        const chunks = [];
        let i = 0;
        while (i < t.length) {
          chunks.push(t.slice(i, i + 3500));
          i += 3500;
          if (chunks.length >= 5) break;
        }
        const provider = settings.aiProvider || "gemini";
        const model = resolveModel(provider, settings.aiModel);
        const chunkBullets = [];
        for (const ch of chunks) {
          const cp = `Summarize this transcript chunk into 5 concise bullet points:\n\n${ch}`;
          const r = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { action: "aiSummarize", provider, model, prompt: cp },
              (res) => resolve(res || { success: false }),
            );
          });
          if (r && r.success && r.text) {
            const cleaned = r.text.replace(/```json\n|\n```/g, "").trim();
            chunkBullets.push(cleaned);
          }
        }
        prompt += `\nChunk Summaries:\n${chunkBullets.join("\n")}\n`;
      } else {
        prompt += `\nTranscript (truncated):\n${t.slice(0, 8000)}\n`;
      }
    }
    prompt += `\nOutput Format (JSON):\n{\n  "title": "A catchy title for the summary",\n  "mainPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],\n  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],\n  "topics": ["Topic 1", "Topic 2", "Topic 3"],\n  "duration": "Brief comment on length/pacing"\n}\n`;
    const provider = settings.aiProvider || "gemini";
    const model = resolveModel(provider, settings.aiModel);
    const resp = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "aiSummarize",
          provider,
          model,
          prompt,
        },
        (r) => resolve(r || { success: false, error: "No response" }),
      );
    });
    if (!resp.success)
      throw new Error(resp.error || `AI request failed (${provider})`);
    const text = resp.text || "";

    const primary = text.replace(/```json\n|\n```/g, "").trim();
    let jsonStr = primary;
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e1) {
      const firstBrace = primary.indexOf("{");
      const lastBrace = primary.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = primary.slice(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(jsonStr);
        } catch (e2) {}
      }
      if (!parsed) {
        const retryPrompt = `${prompt}\nReturn only a valid JSON object matching the schema. No markdown fences or explanations.`;
        const retryResp = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: "aiSummarize", provider, model, prompt: retryPrompt },
            (r) => resolve(r || { success: false, error: "No response" }),
          );
        });
        if (retryResp && retryResp.success && retryResp.text) {
          const retryClean = retryResp.text
            .replace(/```json\n|\n```/g, "")
            .trim();
          try {
            parsed = JSON.parse(retryClean);
          } catch (e3) {}
        }
      }
    }
    if (!parsed) {
      return {
        title: "Summary",
        mainPoints: [text],
        keyTakeaways: [],
        topics: [],
        duration: "",
      };
    }
    return {
      title: parsed.title || "Summary",
      mainPoints: Array.isArray(parsed.mainPoints)
        ? parsed.mainPoints
        : [jsonStr],
      keyTakeaways: Array.isArray(parsed.keyTakeaways)
        ? parsed.keyTakeaways
        : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      duration: parsed.duration || "",
    };
  }

  /**
   * Show Summary Modal
   */
  function showSummaryModal(videoData, summary) {
    // Remove existing modal
    const existing = document.getElementById("yfp-summary-modal");
    if (existing) existing.remove();

    // Animated SVG for Header
    const aiIcon = `<svg class="yfp-pulse-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`;

    const modal = createElement("div", {
      id: "yfp-summary-modal",
      className: "yfp-modal-overlay",
      innerHTML: `
        <div class="yfp-modal-content">
          <div class="yfp-modal-header">
            <h3 style="display: flex; align-items: center; justify-content: flex-start;">
              ${summary.error ? (summary.isSetup ? "✨ Getting Started" : "Error") : aiIcon + " AI Summary"}
            </h3>
            <button class="yfp-modal-close">×</button>
          </div>
          <div class="yfp-modal-body">
            ${
              summary.error
                ? `
                <div class="yfp-error-container">
                  <p class="yfp-error-msg">${escapeErrorHtml(summary.error)}</p>
                  ${summary.isSetup ? `
                    <div class="lg-card" style="margin-top: var(--lg-space-5); text-align: left;">
                      <h4 style="margin: 0 0 var(--lg-space-2) 0; color: var(--lg-primary-hi); font-size: var(--lg-text-md); font-weight: var(--lg-weight-bold);">Why do I need a key?</h4>
                      <p style="margin: 0; color: var(--lg-text-muted); font-size: var(--lg-text-sm); line-height: 1.5;">FocusTube uses direct AI connections to provide summaries. Using your own key keeps the extension free and ensures your data stays private between you and the AI provider.</p>
                      <p style="margin: var(--lg-space-3) 0 0 0; color: var(--lg-text-muted); font-size: var(--lg-text-sm); line-height: 1.6;">1. Click the link above to get your free key.<br>2. Open FocusTube settings (click the extension icon).<br>3. Paste your key and click Save.</p>
                    </div>
                  ` : ""}
                </div>`
                : renderSummaryContent(summary)
            }
          </div>
        </div>
      `,
    });

    document.body.appendChild(modal);

    // Close handlers
    modal
      .querySelector(".yfp-modal-close")
      .addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  /**
   * Escape an error message for safe HTML insertion, while preserving
   * a known-safe <a href> link that we constructed ourselves.
   * If the message contains anything resembling an untrusted tag, we strip
   * all HTML and return plain text.
   */
  function escapeErrorHtml(message) {
    const esc =
      (window.FocusTubeSanitize && window.FocusTubeSanitize.escapeHtml) ||
      ((v) => String(v == null ? "" : v));
    const raw = String(message == null ? "" : message);
    // Only allow our own <a href="https://...">...</a> pattern; escape the rest.
    const safeLink =
      /^<a href="https:\/\/[^"]+" target="_blank"[^>]*>[^<]+<\/a>$/i.test(raw);
    if (safeLink) return raw;
    return esc(raw);
  }

  function renderSummaryContent(summary) {
    const esc =
      (window.FocusTubeSanitize && window.FocusTubeSanitize.escapeHtml) ||
      ((v) => String(v == null ? "" : v));
    const renderList =
      (window.FocusTubeSanitize && window.FocusTubeSanitize.renderList) ||
      ((items) =>
        (Array.isArray(items) ? items : [])
          .map((p) => `<li style="margin-bottom:8px;">${esc(p)}</li>`)
          .join(""));
    const renderTags =
      (window.FocusTubeSanitize && window.FocusTubeSanitize.renderTags) ||
      ((items) =>
        (Array.isArray(items) ? items : [])
          .map((t) => `<span class="yfp-tag">${esc(t)}</span>`)
          .join(""));

    const listIcon = `<svg style="width:20px;height:20px;margin-right:8px;vertical-align:middle;color:var(--lg-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>`;
    const bulbIcon = `<svg style="width:20px;height:20px;margin-right:8px;vertical-align:middle;color:var(--lg-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;

    // SECURITY: all AI-supplied fields (title, points, takeaways, topics) are
    // HTML-escaped before insertion to prevent prompt-injection-driven XSS.
    return `
      <h4 class="yfp-summary-title" style="color: #fff;">${esc(summary.title)}</h4>
      
      <div class="yfp-summary-section">
        <h5 style="display:flex;align-items:center;color:var(--lg-text-muted);">${listIcon} Main Points</h5>
        <ul style="color: var(--lg-text);">
          ${renderList(summary.mainPoints)}
        </ul>
      </div>

      <div class="yfp-summary-section">
        <h5 style="display:flex;align-items:center;color:var(--lg-text-muted);margin-top:24px;">${bulbIcon} Key Takeaways</h5>
        <ul style="color: var(--lg-text);">
          ${renderList(summary.keyTakeaways)}
        </ul>
      </div>

      <div class="yfp-tags">
        ${renderTags(summary.topics)}
      </div>
    `;
  }

  /**
   * Setup observer for dynamic page changes
   */
  function setupSummaryButtonObserver() {
    let debounceTimeout = null;
    const observer = new MutationObserver(() => {
      if (!settings.showSummaryButton) return;
      if (!window.location.pathname.startsWith("/watch")) return;
      if (document.querySelector(".yfp-summary-button")) return;
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        injectSummaryButton();
      }, 500);
    });
    const root = document.body || document.documentElement;
    if (root) observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("yt-navigate-finish", () => {
      setTimeout(() => {
        if (settings.showSummaryButton) injectSummaryButton();
      }, 1000);
    });
  }
  function setupVideoChangeListener() {
    // Logic to detect video change handled by yt-navigate-finish above
  }

  // Helper: Wait for element
  function waitForElement(selector, timeout = 3000) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          resolve(document.querySelector(selector));
          observer.disconnect();
        }
      });

      const root = document.body || document.documentElement;
      if (!root) {
        resolve(null);
        return;
      }
      observer.observe(root, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // Helper: Create element
  function createElement(tag, props = {}) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    if (props.style) Object.assign(el.style, props.style);
    return el;
  }

  // Helper: Insert after
  function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }

  // Update settings
  if (typeof onSettingsChanged === "function") {
    onSettingsChanged((changes) => {
      if (changes.showSummaryButton) {
        settings.showSummaryButton = changes.showSummaryButton.newValue;
        if (settings.showSummaryButton) injectSummaryButton();
        else if (summaryButton) summaryButton.remove();
      }
      if (changes.geminiApiKey) {
        settings.geminiApiKey = changes.geminiApiKey.newValue;
      }
      if (changes.geminiModel) {
        settings.geminiModel = changes.geminiModel.newValue;
      }
      if (changes.aiProvider) {
        settings.aiProvider = changes.aiProvider.newValue;
      }
      if (changes.aiModel) {
        settings.aiModel = changes.aiModel.newValue;
      }
      if (changes.aiModelByProvider) {
        settings.aiModelByProvider = changes.aiModelByProvider.newValue;
      }
      if (changes.aiProviderDefaultModels) {
        settings.aiProviderDefaultModels =
          changes.aiProviderDefaultModels.newValue;
      }
      if (changes.openaiApiKey)
        settings.openaiApiKey = changes.openaiApiKey.newValue;
      if (changes.mistralApiKey)
        settings.mistralApiKey = changes.mistralApiKey.newValue;
      if (changes.deepseekApiKey)
        settings.deepseekApiKey = changes.deepseekApiKey.newValue;
      if (changes.grokApiKey) settings.grokApiKey = changes.grokApiKey.newValue;
      if (changes.useTranscript)
        settings.useTranscript = changes.useTranscript.newValue;
      if (changes.transcriptLang)
        settings.transcriptLang = changes.transcriptLang.newValue;
    });
  }

  // Initialize
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export
  window.YFPSummaryButton = { init };
})();
