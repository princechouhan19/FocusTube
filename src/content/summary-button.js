/**
 * Summary Button Module
 * Adds AI Summary button to video pages and displays summaries
 */

(function() {
  'use strict';

  // Module state
  let settings = {};
  let summaryButton = null;

  const PROVIDER_DEFAULT_MODELS = {
    gemini: 'gemini-pro',
    openai: 'gpt-4o-mini',
    mistral: 'mistral-small',
    deepseek: 'deepseek-chat',
    grok: 'grok-2-mini'
  };

  function resolveModel(provider, selectedModel, geminiModel) {
    const providerDefault = provider === 'gemini'
      ? (geminiModel || PROVIDER_DEFAULT_MODELS.gemini)
      : PROVIDER_DEFAULT_MODELS[provider] || PROVIDER_DEFAULT_MODELS.gemini;
    const candidate = (selectedModel || '').trim();
    if (!candidate) return providerDefault;

    const knownDefaults = new Set(Object.values(PROVIDER_DEFAULT_MODELS));
    if (geminiModel) knownDefaults.add(geminiModel);
    if (knownDefaults.has(candidate) && candidate !== providerDefault) {
      return providerDefault;
    }
    return candidate;
  }

  function resolveVideoId() {
    try {
      const url = new URL(window.location.href);
      const queryId = url.searchParams.get('v');
      if (queryId) return queryId;
      const shortsMatch = (url.pathname || '').match(/\/shorts\/([a-zA-Z0-9_-]{6,})/);
      if (shortsMatch && shortsMatch[1]) return shortsMatch[1];
      const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
      if (canonical) {
        const canonicalUrl = new URL(canonical, window.location.origin);
        const canonicalId = canonicalUrl.searchParams.get('v');
        if (canonicalId) return canonicalId;
        const canonicalShorts = (canonicalUrl.pathname || '').match(/\/shorts\/([a-zA-Z0-9_-]{6,})/);
        if (canonicalShorts && canonicalShorts[1]) return canonicalShorts[1];
      }
      const metaId = document.querySelector('meta[itemprop="videoId"]')?.content;
      return metaId || '';
    } catch {
      return '';
    }
  }
  /**
   * Initialize the summary button
   */
  async function init() {
    if (typeof loadSettings === 'function') {
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
  async function injectSummaryButton() {
    // Avoid duplicates
    if (document.querySelector('.yfp-summary-button')) return;

    // Try multiple locations common on YouTube watch pages
    const selectors = [
      '#title h1 yt-formatted-string',
      '#above-the-fold #title',
      '#title',
      '#title-wrapper',
      '#actions', // action bar below title
      'ytd-video-primary-info-renderer #title'
    ];

    let anchor = null;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        anchor = el;
        break;
      }
    }

    // Wait briefly if not ready
    if (!anchor) {
      anchor = await waitForElement(selectors.join(', '), 6000);
      if (!anchor) {
        console.log('[YFP] Title/actions container not found');
        return;
      }
    }

    // Prefer insertion after title; if actions bar exists, append into it
    const actionsBar = document.querySelector('#actions');

    summaryButton = createElement('button', {
      className: 'yfp-summary-button',
      innerHTML: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>AI Summary</span>
      `
    });

    if (actionsBar) {
      actionsBar.appendChild(summaryButton);
    } else {
      // Insert just after the anchor container
      insertAfter(summaryButton, anchor);
    }

    summaryButton.addEventListener('click', handleSummaryButtonClick);
    console.log('[YFP] Summary button injected');
  }

  /**
   * Handle summary button click
   */
  async function handleSummaryButtonClick() {
    if (!summaryButton) return;

    // Show loading state
    const originalText = summaryButton.querySelector('span').textContent;
    addClass(summaryButton, 'loading');
    summaryButton.querySelector('span').textContent = 'Generating...';

    try {
      if (typeof loadSettings === 'function') {
        settings = await loadSettings();
      }
      const provider = settings.aiProvider || 'gemini';
      const keyMap = {
        gemini: settings.geminiApiKey,
        openai: settings.openaiApiKey,
        mistral: settings.mistralApiKey,
        deepseek: settings.deepseekApiKey,
        grok: settings.grokApiKey
      };
      const activeKey = keyMap[provider];
      if (!activeKey) {
        throw new Error(`Missing ${provider} API Key. Please add it in extension settings.`);
      }

      // Extract video data
      const videoData = await extractVideoData();
      
      // Generate summary
      const summary = await generateSummary(videoData);
      
      // Display summary in modal
      showSummaryModal(videoData, summary);
      
    } catch (error) {
      console.error('[YFP] Error generating summary:', error);
      showSummaryModal(
        { title: 'Error', description: '' },
        { error: error.message || 'Failed to generate summary. Please try again later.' }
      );
    } finally {
      // Reset button state
      removeClass(summaryButton, 'loading');
      summaryButton.querySelector('span').textContent = originalText;
    }
  }

  /**
   * Extract video data (title, description)
   */
  async function extractVideoData() {
    const title = document.querySelector('#title h1 yt-formatted-string')?.textContent ||
                  document.querySelector('h1.title')?.textContent ||
                  document.title?.replace(' - YouTube', '') || '';

    // Try to get description (often hidden behind "Show more")
    // We can't easily click "Show more" without disrupting user, so we take what's visible
    // or try to find the full description script data if available (advanced)
    const description = document.querySelector('#description-inner yt-formatted-string')?.textContent ||
                        document.querySelector('#description')?.textContent ||
                        document.querySelector('ytd-text-inline-expander')?.textContent || '';

    const vid = resolveVideoId();
    let transcript = '';
    if (settings.useTranscript) {
      const trResp = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: 'getTranscript',
            videoId: vid,
            preferredLang: settings.transcriptLang || 'en',
            useAutoCaptions: true
          },
          (r) => resolve(r || { success: false })
        );
      });
      if (trResp && trResp.success && trResp.text) {
        transcript = trResp.text;
      }
    }

    return {
      title,
      description: description.slice(0, 5000), // Limit length for API
      videoId: vid,
      url: window.location.href,
      transcript
    };
  }

  /**
   * Generate summary using Gemini API
   */
  async function generateSummary(videoData) {
    console.log('[YFP] Generating summary for:', videoData.title);

    let prompt = `You are an assistant that summarizes YouTube content concisely.\n\nVideo Title:\n${videoData.title}\n\nDescription:\n${videoData.description}\n`;
    if (!videoData.transcript) {
      prompt += '\nTranscript: Not available for this video. Base your summary on title and description only.\n';
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
        const provider = settings.aiProvider || 'gemini';
        const model = resolveModel(provider, settings.aiModel, settings.geminiModel);
        const chunkBullets = [];
        for (const ch of chunks) {
          const cp = `Summarize this transcript chunk into 5 concise bullet points:\n\n${ch}`;
          const r = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { action: 'aiSummarize', provider, model, prompt: cp },
              (res) => resolve(res || { success: false })
            );
          });
          if (r && r.success && r.text) {
            const cleaned = r.text.replace(/```json\n|\n```/g, '').trim();
            chunkBullets.push(cleaned);
          }
        }
        prompt += `\nChunk Summaries:\n${chunkBullets.join('\n')}\n`;
      } else {
        prompt += `\nTranscript (truncated):\n${t.slice(0, 8000)}\n`;
      }
    }
    prompt += `\nOutput Format (JSON):\n{\n  "title": "A catchy title for the summary",\n  "mainPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],\n  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],\n  "topics": ["Topic 1", "Topic 2", "Topic 3"],\n  "duration": "Brief comment on length/pacing"\n}\n`;
    const provider = settings.aiProvider || 'gemini';
    const model = resolveModel(provider, settings.aiModel, settings.geminiModel);
    const resp = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: 'aiSummarize',
          provider,
          model,
          prompt
        },
        (r) => resolve(r || { success: false, error: 'No response' })
      );
    });
    if (!resp.success) throw new Error(resp.error || `AI request failed (${provider})`);
    const text = resp.text || '';
    
    const primary = text.replace(/```json\n|\n```/g, '').trim();
    let jsonStr = primary;
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e1) {
      const firstBrace = primary.indexOf('{');
      const lastBrace = primary.lastIndexOf('}');
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
            { action: 'aiSummarize', provider, model, prompt: retryPrompt },
            (r) => resolve(r || { success: false, error: 'No response' })
          );
        });
        if (retryResp && retryResp.success && retryResp.text) {
          const retryClean = retryResp.text.replace(/```json\n|\n```/g, '').trim();
          try {
            parsed = JSON.parse(retryClean);
          } catch (e3) {}
        }
      }
    }
    if (!parsed) {
      return {
        title: 'Summary',
        mainPoints: [text],
        keyTakeaways: [],
        topics: [],
        duration: ''
      };
    }
    return {
      title: parsed.title || 'Summary',
      mainPoints: Array.isArray(parsed.mainPoints) ? parsed.mainPoints : [jsonStr],
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      duration: parsed.duration || ''
    }
  }

  /**
   * Show Summary Modal
   */
  function showSummaryModal(videoData, summary) {
    // Remove existing modal
    const existing = document.getElementById('yfp-summary-modal');
    if (existing) existing.remove();

    const modal = createElement('div', {
      id: 'yfp-summary-modal',
      className: 'yfp-modal-overlay',
      innerHTML: `
        <div class="yfp-modal-content glass-panel">
          <div class="yfp-modal-header">
            <h3>${summary.error ? 'Error' : '✨ AI Summary'}</h3>
            <button class="yfp-modal-close">×</button>
          </div>
          <div class="yfp-modal-body">
            ${summary.error ? 
              `<p class="yfp-error-msg">${summary.error}</p>` : 
              renderSummaryContent(summary)
            }
          </div>
        </div>
      `
    });

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.yfp-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  function renderSummaryContent(summary) {
    return `
      <h4 class="yfp-summary-title">${summary.title}</h4>
      
      <div class="yfp-summary-section">
        <h5>🎯 Main Points</h5>
        <ul>
          ${summary.mainPoints.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>

      <div class="yfp-summary-section">
        <h5>💡 Key Takeaways</h5>
        <ul>
          ${summary.keyTakeaways.map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>

      <div class="yfp-tags">
        ${summary.topics.map(t => `<span class="yfp-tag">${t}</span>`).join('')}
      </div>
    `;
  }

  /**
   * Setup observer for dynamic page changes
   */
  function setupSummaryButtonObserver() {
    // Re-inject on navigation
    window.addEventListener('yt-navigate-finish', () => {
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

      observer.observe(document.body, {
        childList: true,
        subtree: true
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
  if (typeof onSettingsChanged === 'function') {
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
        settings.aiProviderDefaultModels = changes.aiProviderDefaultModels.newValue;
      }
      if (changes.openaiApiKey) settings.openaiApiKey = changes.openaiApiKey.newValue;
      if (changes.mistralApiKey) settings.mistralApiKey = changes.mistralApiKey.newValue;
      if (changes.deepseekApiKey) settings.deepseekApiKey = changes.deepseekApiKey.newValue;
      if (changes.grokApiKey) settings.grokApiKey = changes.grokApiKey.newValue;
      if (changes.useTranscript) settings.useTranscript = changes.useTranscript.newValue;
      if (changes.transcriptLang) settings.transcriptLang = changes.transcriptLang.newValue;
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Export
  window.YFPSummaryButton = { init };

})();
