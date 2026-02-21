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
        position:absolute; inset:0; z-index:2147483646; border-radius:14px;
        display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,0.7);
        backdrop-filter:blur(12px) saturate(125%);
        -webkit-backdrop-filter:blur(12px) saturate(125%);
      }
      .yfp-focus-overlay .label{
        width:min(92%,360px); text-align:center; padding:14px 14px;
        border:1px solid rgba(255,255,255,0.1); border-radius:14px;
        background:rgba(10,10,10,0.5);
        box-shadow:0 10px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
      }
      .yfp-focus-overlay .kicker{font-size:11px; letter-spacing:0.7px; text-transform:uppercase; color:#aaa; margin-bottom:6px}
      .yfp-focus-overlay .topic{display:inline-block; margin-bottom:8px; padding:4px 10px; border-radius:999px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); font-size:12px; font-weight:700; color:#fff;}
      .yfp-focus-overlay .title{font-size:16px; font-weight:800; line-height:1.25; margin-bottom:4px; color:#fff;}
      .yfp-focus-overlay .sub{font-size:12px; line-height:1.35; color:#bbb;}

      .yfp-keyword-watch-overlay{
        position:fixed; inset:0; z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:22px;
        background: rgba(0,0,0,0.85);
        backdrop-filter:blur(15px);
        -webkit-backdrop-filter:blur(15px);
      }
      .yfp-keyword-watch-overlay .box{
        max-width:760px; width:min(94vw,760px); border-radius:22px; padding:30px 26px;
        border:1px solid rgba(255,255,255,0.15);
        background:rgba(15,15,15,0.8);
        color:#fff; text-align:center;
        box-shadow:0 24px 54px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);
      }
      .yfp-keyword-watch-overlay .kicker{
        font-size:12px; text-transform:uppercase; letter-spacing:1.3px; color:#999; margin-bottom:12px
      }
      .yfp-keyword-watch-overlay h2{margin:0 0 10px 0; font-size:38px; line-height:1.08; letter-spacing:-0.6px; color:#fff;}
      .yfp-keyword-watch-overlay p{margin:0 0 12px 0; font-size:19px; line-height:1.5; color:#ccc}
      .yfp-keyword-watch-overlay .topic{
        display:inline-block; margin:2px 0 16px 0; padding:8px 14px; border-radius:999px;
        background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2);
        font-size:14px; font-weight:800; color:#fff
      }
      .yfp-keyword-watch-overlay .quote{
        margin:6px auto 16px auto; max-width:620px; padding:10px 14px; border-radius:12px;
        font-size:14px; line-height:1.45; color:#aaa; background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.1)
      }
      .yfp-keyword-watch-overlay button{
        margin-top:10px; border:0; border-radius:12px; padding:13px 20px; min-width:170px;
        font-size:15px; font-weight:800; letter-spacing:0.2px; cursor:pointer;
        background:rgba(255,255,255,0.9); color:#000;
        box-shadow:0 10px 22px rgba(0,0,0,0.3);
      }
      .yfp-keyword-watch-overlay button:hover{background:#fff; transform:translateY(-1px)}
      .yfp-keyword-watch-overlay button:active{transform:translateY(0)}
      @media (max-width: 768px){
        .yfp-keyword-watch-overlay .box{padding:24px 18px; border-radius:18px}
        .yfp-keyword-watch-overlay h2{font-size:30px}
        .yfp-keyword-watch-overlay p{font-size:17px}
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
    label.innerHTML = `
      <div class="kicker">Focus Filter</div>
      <div class="topic">${matchedKeyword}</div>
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

    overlay.innerHTML = `
      <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: -1;"></div>
      <div class="box">
        <div class="kicker">FocusTube Protection</div>
        <h2>Stay Focused</h2>
        <div class="topic">Blocked Topic: ${matchedKeyword}</div>
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
