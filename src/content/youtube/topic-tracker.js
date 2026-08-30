/**
 * Topic Tracker — records WHAT is being watched, not just how long.
 *
 * On every YouTube watch page (regular videos and Shorts), this extracts:
 *   1. Hashtags rendered above the video title (super-title chips)
 *   2. Hashtags appearing in the title itself
 *   3. The video's category (meta itemprop="genre", falling back to
 *      ytInitialPlayerResponse) — normalized to "#category"
 *
 * Each video is counted once per page load (deduped by videoId in-memory)
 * and sent to the background as { action: "recordTopic", topics: [...] },
 * which stores per-day topic counts and pushes them to the shared sync
 * file. The dashboard aggregates them into the Top Topics panel.
 */

(() => {
  if (window.__focustubeTopicTrackerLoaded) return;
  window.__focustubeTopicTrackerLoaded = true;

  const seenVideoIds = new Set();

  function getVideoId() {
    try {
      const url = new URL(location.href);
      if (url.pathname.startsWith("/watch")) {
        return url.searchParams.get("v");
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] || null;
      }
    } catch (_) {}
    return null;
  }

  function extractTopics() {
    try {
      const videoId = getVideoId();
      if (!videoId || seenVideoIds.has(videoId)) return;

      const topics = new Set();

      // 1. Hashtag chips rendered above the title.
      document
        .querySelectorAll(
          "ytd-watch-metadata .super-title-chip a, h1 .super-title-chip a, ytd-reel-player-overlay-renderer .super-title-chip a",
        )
        .forEach((a) => {
          const t = (a.textContent || "").trim();
          if (/^#[\w-]{1,40}$/.test(t)) topics.add(t.toLowerCase());
        });

      // 2. Hashtags inside the title element.
      const titleEl = document.querySelector(
        "h1.ytd-watch-metadata, #title h1, h1.title",
      );
      if (titleEl) {
        (titleEl.textContent || "")
          .match(/#[\w-]{1,40}/g)?.forEach((t) => topics.add(t.toLowerCase()));
      }

      // 3. Video category → "#category".
      try {
        const genre = document.querySelector('meta[itemprop="genre"]');
        const fromMeta = genre && genre.content ? String(genre.content) : "";
        const fromPlayer =
          window.ytInitialPlayerResponse?.microformat?.playerMicroformatRenderer
            ?.category || "";
        const category = (fromMeta || fromPlayer || "").trim();
        if (category) topics.add("#" + category.toLowerCase());
      } catch (_) {}

      if (topics.size === 0) return;

      seenVideoIds.add(videoId);
      chrome.runtime
        .sendMessage({ action: "recordTopic", topics: [...topics].slice(0, 8) })
        .catch(() => {});
    } catch (_) {}
  }

  // YouTube is a SPA — hook its navigation event, then wait for metadata.
  window.addEventListener("yt-navigate-finish", () => {
    setTimeout(extractTopics, 1500);
  });
  // Initial full page load.
  setTimeout(extractTopics, 2500);
})();
