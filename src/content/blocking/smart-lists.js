/**
 * Smart Lists — Pre-built category-based blocking lists.
 *
 * Provides one-click enable/disable for entire categories of websites
 * (Social, Shopping, Gaming, News, Messaging, Streaming, Adult, etc.).
 *
 * The lists are intentionally short and curated (15-25 entries each) to
 * avoid the maintenance burden of huge blocklists while still covering
 * the most common distractions.
 *
 * Usage:
 *   SmartLists.getCategories()             // → array of category metadata
 *   SmartLists.isDomainBlocked(url)        // → boolean (sync, fast)
 *   SmartLists.isCategoryEnabled(id)       // → boolean (sync)
 *   SmartLists.setCategoryEnabled(id, on)  // → Promise<boolean>
 *   SmartLists.getEnabledCategories()      // → string[]
 *
 * The blocked-status check is fast (O(1) Set lookup) so the
 * site-blocker.js can call it on every page load without measurable
 * overhead.
 */
(function () {
  "use strict";

  if (window.FocusTubeSmartLists) return;

  // --- Category definitions -------------------------------------------
  //
  // Each category has:
  //   id         — stable identifier stored in settings
  //   label      — human-readable name shown in the popup
  //   emoji      — single-glyph icon for the popup chip
  //   color      — accent color (hex) for the chip border
  //   domains    — array of domains to block (without scheme)
  //
  // Domains are stored as the bare registrable name (e.g. "reddit.com").
  // Matching is suffix-based: "old.reddit.com" matches "reddit.com".
  const CATEGORIES = [
    {
      id: "social",
      label: "Social Media",
      emoji: "📱",
      color: "#8a97c6",
      domains: [
        "instagram.com",
        "tiktok.com",
        "reddit.com",
        "twitter.com",
        "x.com",
        "facebook.com",
        "threads.net",
        "pinterest.com",
        "tumblr.com",
        "snapchat.com",
        "linkedin.com",
        "vk.com",
        "weibo.com",
        "mastodon.social",
        "bsky.app",
      ],
    },
    {
      id: "shopping",
      label: "Shopping",
      emoji: "🛍️",
      color: "#8fb77a",
      domains: [
        "amazon.com",
        "amazon.in",
        "amazon.co.uk",
        "amazon.de",
        "ebay.com",
        "etsy.com",
        "aliexpress.com",
        "alibaba.com",
        "walmart.com",
        "target.com",
        "flipkart.com",
        "myntra.com",
        "bestbuy.com",
        "wayfair.com",
        "asos.com",
      ],
    },
    {
      id: "gaming",
      label: "Gaming",
      emoji: "🎮",
      color: "#b18bc9",
      domains: [
        "store.steampowered.com",
        "steamcommunity.com",
        "epicgames.com",
        "gog.com",
        "itch.io",
        "twitch.tv",
        "kick.com",
        "discord.com",
        "discordapp.com",
        "ign.com",
        "kotaku.com",
        "polygon.com",
        "rockpapershotgun.com",
        "gamefaqs.com",
        "nexusmods.com",
      ],
    },
    {
      id: "news",
      label: "News",
      emoji: "📰",
      color: "#cf9448",
      domains: [
        "cnn.com",
        "bbc.com",
        "bbc.co.uk",
        "nytimes.com",
        "washingtonpost.com",
        "theguardian.com",
        "reuters.com",
        "apnews.com",
        "bloomberg.com",
        "wsj.com",
        "ft.com",
        "economist.com",
        "news.ycombinator.com",
        "techmeme.com",
        "engadget.com",
      ],
    },
    {
      id: "messaging",
      label: "Messaging",
      emoji: "💬",
      color: "#c9809b",
      domains: [
        "web.whatsapp.com",
        "web.telegram.org",
        "slack.com",
        "discord.com",
        "messenger.com",
        "messages.google.com",
        "mail.google.com",
        "outlook.live.com",
        "outlook.office.com",
        "proton.me",
        "icloud.com",
      ],
    },
    {
      id: "streaming",
      label: "Streaming",
      emoji: "🎬",
      color: "#c96a62",
      domains: [
        "netflix.com",
        "primevideo.com",
        "disneyplus.com",
        "hbomax.com",
        "max.com",
        "hulu.com",
        "paramountplus.com",
        "appletv.com",
        "tv.apple.com",
        "peacocktv.com",
        "crunchyroll.com",
        "spotify.com",
        "soundcloud.com",
      ],
    },
    {
      id: "adult",
      label: "Adult Content",
      emoji: "🔞",
      color: "#a05050",
      domains: [
        "pornhub.com",
        "xvideos.com",
        "xnxx.com",
        "redtube.com",
        "youporn.com",
        "onlyfans.com",
        "xhamster.com",
        "spankbang.com",
        "brazzers.com",
        "chaturbate.com",
      ],
    },
  ];

  // --- In-memory cache of the currently enabled categories' domains --
  // Rebuilt from storage on init and on every storage change.
  const blockedDomainSet = new Set();
  let enabledCategories = new Set();

  function rebuildCache(settings) {
    blockedDomainSet.clear();
    enabledCategories = new Set(
      Array.isArray(settings.smartListsEnabled)
        ? settings.smartListsEnabled
        : [],
    );
    for (const cat of CATEGORIES) {
      if (enabledCategories.has(cat.id)) {
        for (const d of cat.domains) blockedDomainSet.add(d);
      }
    }
  }

  // --- Public API -----------------------------------------------------
  const SmartLists = {
    CATEGORIES,

    /** Returns a plain array of category metadata for UI rendering. */
    getCategories() {
      return CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        emoji: c.emoji,
        color: c.color,
        domainCount: c.domains.length,
        enabled: enabledCategories.has(c.id),
      }));
    },

    /** Returns the list of currently-enabled category ids. */
    getEnabledCategories() {
      return Array.from(enabledCategories);
    },

    /** Sync check: is this URL blocked by any enabled category? */
    isDomainBlocked(url) {
      if (blockedDomainSet.size === 0) return false;
      let host = "";
      try {
        host = new URL(url).hostname.toLowerCase();
      } catch {
        return false;
      }
      // Strip leading "www."
      if (host.startsWith("www.")) host = host.slice(4);
      // Walk up the domain tree: "old.reddit.com" → "reddit.com" → "com"
      // and check each suffix against the set.
      const parts = host.split(".");
      for (let i = 0; i < parts.length - 1; i++) {
        const candidate = parts.slice(i).join(".");
        if (blockedDomainSet.has(candidate)) return true;
      }
      return false;
    },

    /** Sync check: is this category id currently enabled? */
    isCategoryEnabled(id) {
      return enabledCategories.has(id);
    },

    /** Toggle a category on/off and persist to storage. */
    async setCategoryEnabled(id, on) {
      if (!CATEGORIES.find((c) => c.id === id)) return false;
      const current = await chrome.storage.local.get("smartListsEnabled");
      const list = Array.isArray(current.smartListsEnabled)
        ? current.smartListsEnabled
        : [];
      const next = on
        ? Array.from(new Set([...list, id]))
        : list.filter((c) => c !== id);
      await chrome.storage.local.set({ smartListsEnabled: next });
      enabledCategories = new Set(next);
      // Rebuild the cache locally so we don't wait for the storage event.
      const settings = await chrome.storage.local.get(null);
      rebuildCache(settings);
      return true;
    },
  };

  // Expose globally
  window.FocusTubeSmartLists = SmartLists;

  // --- Init: load settings and rebuild cache --------------------------
  (async function init() {
    try {
      const settings = await chrome.storage.local.get("smartListsEnabled");
      rebuildCache(settings);
    } catch (err) {
      console.warn("[FocusTube SmartLists] init error:", err);
    }

    // Listen for storage changes (popup toggles, other tabs)
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.smartListsEnabled) {
          chrome.storage.local.get(null).then(rebuildCache).catch(() => {});
        }
      });
    }
  })();
})();
