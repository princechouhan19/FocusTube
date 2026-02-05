/**
 * Keyword/Topic Blocker Module
 * Hides videos whose title/text matches any blocked keyword (topic list)
 */
(function() {
  'use strict';

  let settings = {};
  let keywords = [];
  let observer = null;

  const VIDEO_ITEM_SELECTORS = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-playlist-panel-video-renderer',
    'ytd-reel-video-renderer',
    'ytd-reel-shelf-renderer',
    'ytd-backstage-post-thread-renderer',
    'ytd-post-renderer'
  ].join(', ');

  function normalize(str) {
    return (str || '').toLowerCase();
  }

  function compileMatchers(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr
      .map(k => (k || '').trim())
      .filter(k => k.length > 0)
      .map(k => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }

  function shouldBlockText(text, matchers) {
    const t = text || '';
    for (const rx of matchers) {
      if (rx.test(t)) return true;
    }
    return false;
  }
  
  function ensureOverlayCSS() {
    injectStyles('yfp-keyword-overlay-css', `
      .yfp-blocked-item{position:relative !important;}
      .yfp-focus-overlay{position:absolute; inset:0; background:rgba(15,15,15,0.92); display:flex; align-items:center; justify-content:center; color:#fff; z-index:2147483646; border-radius:12px; backdrop-filter:blur(2px)}
      .yfp-focus-overlay .label{padding:12px 16px; border:1px solid rgba(255,255,255,0.12); border-radius:12px; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); font-weight:700; letter-spacing:0.3px}
    `);
  }
  
  function overlayItem(item) {
    ensureOverlayCSS();
    const target = item.querySelector('#thumbnail') || item;
    if (target.querySelector('.yfp-focus-overlay')) return;
    const style = getComputedStyle(target);
    if (style.position === 'static') {
      target.style.position = 'relative';
    }
    const overlay = createElement('div', { className: 'yfp-focus-overlay' });
    const label = createElement('div', { className: 'label' }, 'Stay Focused');
    overlay.appendChild(label);
    target.appendChild(overlay);
    item.classList.add('yfp-blocked-item');
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }
  
  function removeOverlay(item) {
    const overlay = item.querySelector('.yfp-focus-overlay');
    if (overlay) overlay.remove();
    item.classList.remove('yfp-blocked-item');
  }
  
  function extractHashtags(item) {
    const tags = [];
    const links = item.querySelectorAll('a[href*="/hashtag/"]');
    links.forEach(a => {
      const t = (a.textContent || '').trim();
      if (t) tags.push(t);
    });
    return tags.join(' ');
  }

  async function init() {
    if (typeof loadSettings === 'function') {
      settings = await loadSettings();
    }
    keywords = settings.blockedKeywords || [];
    applyBlocking();
    setupObserver();
  }

  function setupObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(debounce(() => applyBlocking(), 300));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function applyBlocking() {
    if (!keywords || keywords.length === 0) return;
    const matchers = compileMatchers(keywords);
    // Block search results page if query matches
    try {
      const url = new URL(window.location.href);
      if (url.pathname === '/results') {
        const qRaw = url.searchParams.get('search_query') || url.searchParams.get('q') || '';
        const q = decodeURIComponent(qRaw.replace(/\+/g, ' ')).toLowerCase();
        if (shouldBlockText(q, matchers)) {
          window.location.href = 'https://www.youtube.com';
          return;
        }
      }
    } catch {}
    const items = document.querySelectorAll(VIDEO_ITEM_SELECTORS);
    items.forEach(item => {
      const titleEl = item.querySelector('#video-title') ||
                      item.querySelector('yt-formatted-string.title') ||
                      item.querySelector('h3 a') ||
                      item.querySelector('a#video-title');
      const title = titleEl?.textContent || '';
      const metaText = item.textContent || '';
      const tagsText = extractHashtags(item);
      const match = shouldBlockText(title, matchers) || shouldBlockText(metaText, matchers) || shouldBlockText(tagsText, matchers);
      if (match) {
        overlayItem(item);
      } else {
        removeOverlay(item);
      }
    });
  }

  function updateSettings(newSettings) {
    const prev = keywords;
    settings = { ...settings, ...newSettings };
    keywords = settings.blockedKeywords || [];
    if (JSON.stringify(prev) !== JSON.stringify(keywords)) {
      applyBlocking();
    }
  }

  if (typeof onSettingsChanged === 'function') {
    onSettingsChanged((changes) => {
      if (changes.blockedKeywords) {
        updateSettings({ blockedKeywords: changes.blockedKeywords.newValue || [] });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.YFPKeywordBlocker = { init, updateSettings, applyBlocking };
})();
