/**
 * Keyword/Topic Blocker Module
 * Hides videos whose title/text matches any blocked keyword (topic list)
 */
(function () {
  "use strict";

  let settings = {};
  let keywordConfigs = [];
  let observer = null;
  let bodyClickBound = false;
  const blockedVideoMap = new Map(); // videoId -> matched keyword
  const watchMatchCache = new Map(); // videoId -> matched keyword (or '')
  let watchCheckToken = 0;

  const VIDEO_ITEM_SELECTORS = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-radio-renderer",
    "ytd-rich-section-renderer",
    "ytd-playlist-panel-video-renderer",
    "ytd-reel-video-renderer",
    "ytd-reel-shelf-renderer",
    "ytd-backstage-post-thread-renderer",
    "ytd-post-renderer",
  ].join(", ");

  function normalizeText(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function compileKeywordConfigs(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr
      .map((k) => (k || "").trim())
      .filter((k) => k.length > 0)
      .map((k) => {
        const normalized = normalizeText(k);
        const parts = normalized.split(" ").filter(Boolean);
        // Flexible phrase matching: "free fire" should match with variable spacing/punctuation.
        const pattern = parts.map(escapeRegex).join("\\s+");
        return {
          raw: k,
          normalized,
          regex: new RegExp(pattern, "i"),
        };
      });
  }

  function findMatchedKeyword(text, configs) {
    const normalized = normalizeText(text);
    if (!normalized) return "";
    for (const cfg of configs) {
      if (cfg.regex.test(normalized)) {
        return cfg.raw;
      }
    }
    return "";
  }

  function getVideoIdFromHref(href) {
    if (!href) return "";
    try {
      const url = new URL(href, window.location.origin);
      const v = url.searchParams.get("v");
      if (v) return v;
      const m = (url.pathname || "").match(/\/shorts\/([a-zA-Z0-9_-]{6,})/);
      if (m && m[1]) return m[1];
      return "";
    } catch {
      return "";
    }
  }

  function getItemVideoId(item) {
    const a = item.querySelector('a[href*="watch?v="], a[href*="/shorts/"]');
    return getVideoIdFromHref(a?.href || "");
  }

  function getItemSearchableText(item) {
    const title =
      item.querySelector("#video-title")?.textContent ||
      item.querySelector("a#video-title")?.textContent ||
      item.querySelector("h3 a")?.textContent ||
      "";
    const channel =
      item.querySelector("#channel-name")?.textContent ||
      item.querySelector("ytd-channel-name")?.textContent ||
      "";
    const aria = Array.from(item.querySelectorAll("a[aria-label]"))
      .map((a) => a.getAttribute("aria-label") || "")
      .join(" ");
    const tags = extractHashtags(item);
    const allText = item.textContent || "";
    return `${title} ${channel} ${aria} ${tags} ${allText}`;
  }

  function decodeHtmlEntities(input) {
    if (!input) return "";
    return String(input)
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&#x27;|&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, " ");
  }

  function getCurrentVideoId() {
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get("v");
      if (v) return v;
      const shorts = (url.pathname || "").match(
        /\/shorts\/([a-zA-Z0-9_-]{6,})/,
      );
      if (shorts && shorts[1]) return shorts[1];
      return "";
    } catch {
      return "";
    }
  }

  function ensureOverlayCSS() {
    injectStyles(
      "yfp-keyword-overlay-css",
      `
      .yfp-blocked-item{position:relative !important;}
      .yfp-focus-overlay{
        position:absolute; inset:0; z-index:2147483646; border-radius:var(--ios-r-md, 12px);
        display:flex; align-items:center; justify-content:center;
        background:var(--ios-bg-2, #1c1c1e);
        backdrop-filter:blur(20px) saturate(140%);
        -webkit-backdrop-filter:blur(20px) saturate(140%);
        animation:lg-enter var(--ios-speed-slow, 0.35s) var(--ios-ease, cubic-bezier(0.25,0.1,0.25,1)) both;
      }
      .yfp-focus-overlay .label{
        width:min(92%,360px); text-align:center; padding:12px;
        border:1px solid var(--ios-sep, rgba(84,84,88,0.65));
        border-radius:var(--ios-r-md, 12px);
        background:var(--ios-bg-2, #1c1c1e);
        box-shadow:var(--ios-shadow-card, 0 8px 24px rgba(0,0,0,0.35));
      }
      .yfp-focus-overlay .kicker{font-size:var(--ios-text-xs, 11px); letter-spacing:0.08em; text-transform:uppercase; color:var(--ios-label-3, rgba(235,235,245,0.3)); margin-bottom:6px; font-weight:700}
      .yfp-focus-overlay .topic{display:inline-block; margin-bottom:8px; padding:4px 10px; border-radius:var(--ios-r-full, 999px); background:var(--ios-blue-soft, rgba(10,132,255,0.16)); border:1px solid var(--ios-blue-border, rgba(10,132,255,0.32)); font-size:var(--ios-text-sm, 13px); font-weight:700; color:var(--ios-blue, #0a84ff);}
      .yfp-focus-overlay .title{font-size:var(--ios-text-lg, 17px); font-weight:700; line-height:1.25; margin-bottom:4px; color:var(--ios-label, #fff);}
      .yfp-focus-overlay .sub{font-size:var(--ios-text-sm, 13px); line-height:1.35; color:var(--ios-label-2, rgba(235,235,245,0.6));}

      .yfp-keyword-watch-overlay{
        position:fixed; inset:0; z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:20px;
        background: var(--ios-bg, #000);
        font-family:var(--ios-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      }
      .yfp-keyword-watch-overlay::before{
        content:""; position:absolute; inset:0; pointer-events:none;
        background:
          radial-gradient(ellipse 60% 50% at 15% 10%, rgba(10,132,255,0.05), transparent 60%),
          radial-gradient(ellipse 50% 60% at 85% 90%, rgba(94,92,230,0.04), transparent 60%);
      }
      .yfp-keyword-watch-overlay .box{
        position:relative; z-index:1;
        max-width:760px; width:min(94vw,760px); border-radius:var(--ios-r-xl, 20px); padding:32px 24px;
        border:1px solid var(--ios-sep, rgba(84,84,88,0.65));
        background:var(--ios-bg-2, #1c1c1e);
        backdrop-filter:blur(20px) saturate(140%);
        -webkit-backdrop-filter:blur(20px) saturate(140%);
        color:var(--ios-label, #fff); text-align:center;
        box-shadow:var(--ios-shadow-modal, 0 24px 80px rgba(0,0,0,0.6)), inset 0 0 0 0.5px rgba(255,255,255,0.08);
        animation:lg-enter var(--ios-speed-slow, 0.35s) var(--ios-ease, cubic-bezier(0.25,0.1,0.25,1)) both;
      }
      .yfp-keyword-watch-overlay .kicker{
        font-size:var(--ios-text-xs, 11px); text-transform:uppercase; letter-spacing:0.1em; color:var(--ios-blue, #0a84ff); margin-bottom:12px; font-weight:700
      }
      .yfp-keyword-watch-overlay h2{margin:0 0 10px 0; font-size:var(--ios-text-2xl, 28px); line-height:1.1; letter-spacing:-0.02em; color:var(--ios-label, #fff); font-weight:700;}
      .yfp-keyword-watch-overlay p{margin:0 0 12px 0; font-size:var(--ios-text-lg, 17px); line-height:1.5; color:var(--ios-label-2, rgba(235,235,245,0.6))}
      .yfp-keyword-watch-overlay .topic{
        display:inline-block; margin:2px 0 16px 0; padding:8px 14px; border-radius:var(--ios-r-full, 999px);
        background:var(--ios-blue-soft, rgba(10,132,255,0.16)); border:1px solid var(--ios-blue-border, rgba(10,132,255,0.32));
        font-size:var(--ios-text-md, 15px); font-weight:700; color:var(--ios-blue, #0a84ff)
      }
      .yfp-keyword-watch-overlay .quote{
        margin:6px auto 16px auto; max-width:620px; padding:10px 14px; border-radius:var(--ios-r-md, 12px);
        font-size:var(--ios-text-sm, 13px); line-height:1.45; color:var(--ios-label-2, rgba(235,235,245,0.6)); background:var(--ios-bg-2, #1c1c1e);
        border:1px solid var(--ios-sep, rgba(84,84,88,0.65))
      }
      .yfp-keyword-watch-overlay button{
        margin-top:10px; border:0; border-radius:var(--ios-r-md, 12px); padding:13px 20px; min-width:170px;
        font-size:var(--ios-text-md, 15px); font-weight:700; letter-spacing:0.2px; cursor:pointer;
        background:var(--ios-blue, #0a84ff); color:#fff;
        box-shadow:var(--ios-shadow-glow, 0 0 20px rgba(10,132,255,0.35));
        transition:all var(--ios-speed, 0.22s) var(--ios-ease, cubic-bezier(0.25,0.1,0.25,1));
      }
      .yfp-keyword-watch-overlay button:hover{filter:brightness(1.1); transform:translateY(-2px)}
      .yfp-keyword-watch-overlay button:active{transform:translateY(0) scale(0.97)}
      @media (max-width: 768px){
        .yfp-keyword-watch-overlay .box{padding:24px 16px; border-radius:var(--ios-r-xl, 20px)}
        .yfp-keyword-watch-overlay h2{font-size:var(--ios-text-xl, 20px)}
        .yfp-keyword-watch-overlay p{font-size:var(--ios-text-md, 15px)}
      }
    `,
    );
  }

  const FOCUS_BACKGROUNDS = [
    "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?q=80&w=2072&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1592496431160-00dee11029cf?q=80&w=1212&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1632010752286-94f8b0f7be68?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1671028545797-cc0b7b6e765c?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1504805572947-34fad45aed93?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  ];

  function overlayItem(item, matchedKeyword) {
    ensureOverlayCSS();
    const target = item.querySelector("#thumbnail") || item;
    if (target.querySelector(".yfp-focus-overlay")) return;
    const style = getComputedStyle(target);
    if (style.position === "static") {
      target.style.position = "relative";
    }

    // Create wrapper for background image
    const overlay = createElement("div", { className: "yfp-focus-overlay" });
    const bgUrl =
      FOCUS_BACKGROUNDS[Math.floor(Math.random() * FOCUS_BACKGROUNDS.length)];

    overlay.style.backgroundImage = `url("${bgUrl}")`;
    overlay.style.backgroundSize = "cover";
    overlay.style.backgroundPosition = "center";

    // Inject tinted background overlay
    overlay.innerHTML =
      '<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 0; border-radius: inherit;"></div>';

    const label = createElement("div", { className: "label" });
    label.style.position = "relative";
    label.style.zIndex = "1";
    // SECURITY: matchedKeyword comes from user settings; escape it.
    const esc =
      (window.FocusTubeSanitize && window.FocusTubeSanitize.escapeHtml) ||
      String;
    label.innerHTML = `
      <div class="kicker">Focus Filter</div>
      <div class="topic">${esc(matchedKeyword)}</div>
      <div class="title">Topic Blocked</div>
      <div class="sub">Keep momentum and protect your focus.</div>
    `;
    overlay.appendChild(label);
    target.appendChild(overlay);
    item.classList.add("yfp-blocked-item");
    if (!item.dataset.yfpClickGuard) {
      item.dataset.yfpClickGuard = "1";
      item.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        true,
      );
    }
  }

  function removeOverlay(item) {
    const overlay = item.querySelector(".yfp-focus-overlay");
    if (overlay) overlay.remove();
    item.classList.remove("yfp-blocked-item");
  }

  function extractHashtags(item) {
    const tags = [];
    const links = item.querySelectorAll('a[href*="/hashtag/"]');
    links.forEach((a) => {
      const t = (a.textContent || "").trim();
      if (t) tags.push(t);
    });
    return tags.join(" ");
  }

  function ensureBodyClickGuard() {
    if (bodyClickBound) return;
    bodyClickBound = true;
    document.addEventListener(
      "click",
      (e) => {
        if (!keywordConfigs.length) return;
        const link = e.target.closest("a[href]");
        if (!link) return;
        const videoId = getVideoIdFromHref(link.href);
        const text = `${link.textContent || ""} ${link.getAttribute("aria-label") || ""}`;
        const matched =
          blockedVideoMap.get(videoId) ||
          findMatchedKeyword(text, keywordConfigs);
        if (matched) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true,
    );
  }

  function getCurrentWatchText() {
    const title =
      document.querySelector("#title h1 yt-formatted-string")?.textContent ||
      document.title.replace(" - YouTube", "") ||
      "";
    const channel =
      document.querySelector("ytd-video-owner-renderer #channel-name")
        ?.textContent || "";
    const description =
      document.querySelector("#description")?.textContent || "";
    const metaKeywords =
      document.querySelector('meta[name="keywords"]')?.content || "";
    const ogTitle =
      document.querySelector('meta[property="og:title"]')?.content || "";
    const ogDescription =
      document.querySelector('meta[property="og:description"]')?.content || "";
    return `${title} ${channel} ${description} ${metaKeywords} ${ogTitle} ${ogDescription}`;
  }

  async function fetchWatchTextFromPage(videoId) {
    if (!videoId) return "";
    try {
      const resp = await fetch(
        `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        },
      );
      if (!resp.ok) return "";
      const html = await resp.text();
      if (!html) return "";

      const metaTitle =
        (html.match(
          /<meta[^>]+(?:name|property)=["'](?:title|og:title)["'][^>]+content=["']([^"']+)["']/i,
        ) || [])[1] || "";
      const metaDesc =
        (html.match(
          /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i,
        ) || [])[1] || "";
      const metaKeywords =
        (html.match(
          /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i,
        ) || [])[1] || "";
      const shortDescription =
        (html.match(/"shortDescription":"([^"]{1,10000})"/i) || [])[1] || "";
      const playerTitle =
        (html.match(/"title":\{"runs":\[\{"text":"([^"]{1,500})"/i) || [])[1] ||
        "";
      const keywordsArray =
        (html.match(/"keywords":\[(.{1,3000}?)\]/i) || [])[1] || "";

      return decodeHtmlEntities(
        `${metaTitle} ${metaDesc} ${metaKeywords} ${shortDescription} ${playerTitle} ${keywordsArray}`,
      );
    } catch {
      return "";
    }
  }

  async function resolveWatchMatchedKeyword() {
    const localText = getCurrentWatchText();
    const localMatch = findMatchedKeyword(localText, keywordConfigs);
    if (localMatch) return localMatch;

    const videoId = getCurrentVideoId();
    if (!videoId) return "";

    if (watchMatchCache.has(videoId)) {
      return watchMatchCache.get(videoId) || "";
    }

    const fetchedText = await fetchWatchTextFromPage(videoId);
    const fetchedMatch = findMatchedKeyword(fetchedText, keywordConfigs);
    watchMatchCache.set(videoId, fetchedMatch || "");
    if (watchMatchCache.size > 250) {
      const firstKey = watchMatchCache.keys().next().value;
      if (firstKey) watchMatchCache.delete(firstKey);
    }
    return fetchedMatch || "";
  }

  function removeWatchOverlay() {
    const existing = document.getElementById("yfp-keyword-watch-overlay");
    if (existing) existing.remove();
  }

  function showWatchOverlay(matchedKeyword) {
    ensureOverlayCSS();
    removeWatchOverlay();

    const bgUrl =
      FOCUS_BACKGROUNDS[Math.floor(Math.random() * FOCUS_BACKGROUNDS.length)];

    const overlay = createElement("div", {
      id: "yfp-keyword-watch-overlay",
      className: "yfp-keyword-watch-overlay",
    });

    overlay.style.backgroundImage = `url("${bgUrl}")`;
    overlay.style.backgroundSize = "cover";
    overlay.style.backgroundPosition = "center";

    // SECURITY: escape matchedKeyword before inserting into HTML.
    const esc =
      (window.FocusTubeSanitize && window.FocusTubeSanitize.escapeHtml) ||
      String;
    overlay.innerHTML = `
      <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: -1;"></div>
      <div class="box">
        <div class="kicker">FocusTube Protection</div>
        <h2>Stay Focused</h2>
        <div class="topic">Blocked Topic: ${esc(matchedKeyword)}</div>
        <p>This video matches your blocked topic list.</p>
        <div class="quote">Every focused minute compounds into real progress. You are building discipline right now.</div>
        <button id="yfp-keyword-go-home">Go To Home</button>
      </div>
    `;
    document.documentElement.appendChild(overlay);
    const btn = overlay.querySelector("#yfp-keyword-go-home");
    if (btn) {
      btn.addEventListener("click", () => {
        window.location.href = "https://www.youtube.com";
      });
    }
  }

  async function enforceWatchOverlayIfNeeded() {
    if (!keywordConfigs.length) {
      removeWatchOverlay();
      return;
    }
    const path = window.location.pathname || "";
    if (!path.startsWith("/watch") && !path.startsWith("/shorts")) {
      removeWatchOverlay();
      return;
    }

    const token = ++watchCheckToken;
    const matched = await resolveWatchMatchedKeyword();
    if (token !== watchCheckToken) return;

    if (matched) showWatchOverlay(matched);
    else removeWatchOverlay();
  }

  async function init() {
    if (typeof loadSettings === "function") {
      settings = await loadSettings();
    }
    keywordConfigs = compileKeywordConfigs(settings.blockedKeywords || []);
    watchMatchCache.clear();
    ensureBodyClickGuard();
    applyBlocking();
    setupObserver();
    window.addEventListener("yt-navigate-finish", () => {
      setTimeout(() => {
        applyBlocking();
      }, 250);
    });
  }

  function setupObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(debounce(() => applyBlocking(), 300));
    const root = document.body || document.documentElement;
    if (!root) return;
    observer.observe(root, { childList: true, subtree: true });
  }

  function applyBlocking() {
    const items = document.querySelectorAll(VIDEO_ITEM_SELECTORS);

    if (!keywordConfigs.length) {
      blockedVideoMap.clear();
      items.forEach(removeOverlay);
      removeWatchOverlay();
      return;
    }

    blockedVideoMap.clear();

    // Block search results page if query matches
    try {
      const url = new URL(window.location.href);
      if (url.pathname === "/results") {
        const qRaw =
          url.searchParams.get("search_query") ||
          url.searchParams.get("q") ||
          "";
        const q = decodeURIComponent(qRaw.replace(/\+/g, " ")).toLowerCase();
        const matchedQ = findMatchedKeyword(q, keywordConfigs);
        if (matchedQ) {
          showWatchOverlay(matchedQ);
          return;
        }
      }
    } catch {}

    items.forEach((item) => {
      const text = getItemSearchableText(item);
      const matched = findMatchedKeyword(text, keywordConfigs);
      if (matched) {
        const vid = getItemVideoId(item);
        if (vid) blockedVideoMap.set(vid, matched);
        overlayItem(item, matched);
      } else {
        removeOverlay(item);
      }
    });

    enforceWatchOverlayIfNeeded();
  }

  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    keywordConfigs = compileKeywordConfigs(settings.blockedKeywords || []);
    watchMatchCache.clear();
    applyBlocking();
  }

  if (typeof onSettingsChanged === "function") {
    onSettingsChanged((changes) => {
      if (changes.blockedKeywords) {
        updateSettings({
          blockedKeywords: changes.blockedKeywords.newValue || [],
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.YFPKeywordBlocker = { init, updateSettings, applyBlocking };
})();
