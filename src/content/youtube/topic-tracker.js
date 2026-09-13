/**
 * Topic Tracker v2 — records WHAT is being watched, not just how long.
 *
 * v1.14.0 redesign. v1 only counted explicit hashtags (rare — most videos
 * have none) once per page load, so the Top Topics panel stayed nearly
 * empty and a 20-second Short counted the same as a 40-minute lecture.
 *
 * What v2 does differently:
 *
 *   1. Six extraction sources instead of two:
 *        - hashtag chips above the title          (weight 1.0)
 *        - hashtags inside the title              (weight 1.0)
 *        - hashtags inside the description        (weight 0.9)
 *        - the video's own category               (weight 0.9)
 *        - YouTube's own `keywords` tags          (weight 0.7)
 *        - mined title keywords (fallback when a
 *          video carries no explicit topic)       (weight 0.4)
 *
 *   2. Watch-time weighting. The tracker polls <video>.duration and sends
 *      `durationSeconds`; the background splits those seconds across the
 *      video's topics proportionally to weight, so the dashboard can show
 *      "1h 20m" per topic, not just "12×". A Short now counts as a Short.
 *
 *   3. Robust on YouTube's SPA navigation: extraction retries on a short
 *      poll until the title metadata appears (a single 1.5s timeout missed
 *      slow navigations), and every video is still counted at most once.
 *
 * Payload: { action: "recordTopic", videoId, durationSeconds,
 *            topics: [{ topic: "#slug", weight }] } — the v1 string-array
 *            shape is still accepted by the background for compatibility.
 */

(() => {
  if (window.__focustubeTopicTrackerLoaded) return;
  window.__focustubeTopicTrackerLoaded = true;

  // videoId -> true. Bounded so an all-day binge session can't grow the
  // set without limit; 600 entries ≈ several days of typical browsing.
  const seen = new Set();
  const MAX_SEEN = 600;

  // Structural / noise tokens that never describe a topic. Kept tight on
  // purpose: "reaction" or "review" are legitimate topics; "official" is not.
  const STOP = new Set([
    "shorts", "short", "youtube", "video", "videos", "subscribe",
    "official", "hd", "4k", "8k", "full", "new", "live", "watch",
    "episode", "ep", "part", "channel", "the", "and", "for", "with",
    "from", "this", "that", "how", "why", "what", "when", "your", "you",
    "are", "was", "best", "top", "vs", "feat", "ft",
  ]);

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

  /**
   * Normalize any raw token into a display-stable "#slug":
   * lowercased, punctuation stripped, plural-collapsed for mined/keyword
   * words (explicit hashtags stay verbatim — they are user intent).
   */
  function normalize(raw, { collapsePlural = false } = {}) {
    let s = String(raw || "").toLowerCase().trim();
    if (!s) return "";
    s = s.replace(/[\u2018\u2019`]/g, "");
    s = s.replace(/[^#a-z0-9\s-]/g, " ").trim();
    if (!s) return "";
    const hadHash = s.startsWith("#");
    s = (hadHash ? s.slice(1) : s).replace(/\s+/g, "-");
    if (collapsePlural && s.length > 4 && /[^s]s$/.test(s)) {
      s = s.slice(0, -1);
    }
    if (!s || s.length > 40) return "";
    if (STOP.has(s.replace(/-/g, ""))) return "";
    return "#" + s;
  }

  function isPlausibleHashtag(t) {
    return /^#[a-z0-9][a-z0-9-]{1,39}$/.test(t);
  }

  function getVideoDurationSeconds() {
    try {
      const v = document.querySelector("video.html5-main-video, video");
      const d = v && Number(v.duration);
      return Number.isFinite(d) && d > 0 ? Math.round(d) : 0;
    } catch (_) {
      return 0;
    }
  }

  function readCategory() {
    try {
      const meta = document.querySelector('meta[itemprop="genre"]');
      if (meta && meta.content) return String(meta.content);
    } catch (_) {}
    try {
      // Only available when the script runs in the page world; harmless
      // (undefined) from the isolated world.
      return (
        window.ytInitialPlayerResponse?.microformat?.playerMicroformatRenderer
          ?.category || ""
      );
    } catch (_) {
      return "";
    }
  }

  function readKeywords() {
    try {
      const kw = window.ytInitialPlayerResponse?.videoDetails?.keywords;
      return Array.isArray(kw) ? kw : [];
    } catch (_) {
      return [];
    }
  }

  function readDescriptionText() {
    // The collapsed description still renders its first lines; grab
    // whatever text is available without expanding anything.
    const el =
      document.querySelector(
        "ytd-watch-metadata #description-inline-expander",
      ) ||
      document.querySelector(
        "ytd-reel-player-overlay-renderer #description-text",
      );
    return el ? String(el.textContent || "").slice(0, 600) : "";
  }

  /**
   * Mine fallback topics from the title when the video carries fewer than
   * two explicit topics: keep the longest non-stopword words. Cheap, but it
   * is what makes the panel useful on the ~95% of videos without hashtags.
   */
  function mineTitleWords(title) {
    const words = String(title || "")
      .split(/[\s|·・—–:;,.!?"'()\[\]{}]+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w));
    const unique = [...new Set(words)];
    unique.sort((a, b) => b.length - a.length);
    return unique.slice(0, 2);
  }

  function extractTopics() {
    const topics = new Map(); // topic -> weight (keep the max)

    const add = (raw, weight, { collapsePlural = false } = {}) => {
      const t = normalize(raw, { collapsePlural });
      if (!isPlausibleHashtag(t)) return;
      const prev = topics.get(t);
      if (prev === undefined || weight > prev) topics.set(t, weight);
    };

    // 1. Hashtag chips rendered above the title.
    document
      .querySelectorAll(
        "ytd-watch-metadata .super-title-chip a, h1 .super-title-chip a, ytd-reel-player-overlay-renderer .super-title-chip a",
      )
      .forEach((a) => add(a.textContent, 1.0));

    // 2. Hashtags inside the title element.
    const titleEl = document.querySelector(
      "h1.ytd-watch-metadata, #title h1, h1.title",
    );
    const title = titleEl ? String(titleEl.textContent || "") : "";
    (title.match(/#[\w-]{1,40}/g) || []).forEach((t) => add(t, 1.0));

    // 3. Hashtags inside the description.
    (readDescriptionText().match(/#[\w-]{1,40}/g) || []).forEach((t) =>
      add(t, 0.9),
    );

    // 4. Video category → "#category".
    add(readCategory(), 0.9, { collapsePlural: true });

    // 5. YouTube's own keyword tags.
    readKeywords()
      .slice(0, 8)
      .forEach((k) => add(k, 0.7, { collapsePlural: true }));

    // 6. Mined title keywords — only when explicit topics are scarce.
    if (topics.size < 2) {
      mineTitleWords(title).forEach((w) => add(w, 0.4));
    }

    return [...topics.entries()]
      .map(([topic, weight]) => ({ topic, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);
  }

  function remember(videoId) {
    seen.add(videoId);
    if (seen.size > MAX_SEEN) {
      // Set preserves insertion order: drop the oldest entries.
      const it = seen.values();
      for (let i = 0; i < 200; i += 1) {
        const oldest = it.next();
        if (oldest.done) break;
        seen.delete(oldest.value);
      }
    }
  }

  function send(videoId, entries, durationSeconds) {
    if (entries.length === 0) return;
    try {
      chrome.runtime
        .sendMessage({
          action: "recordTopic",
          videoId,
          durationSeconds,
          topics: entries,
        })
        .catch(() => {});
    } catch (_) {}
  }

  /**
   * Extraction loop for one video. Metadata and duration both arrive late
   * on SPA navigations, so poll briefly instead of trusting a single
   * fixed timeout. Stops at the first successful send; a video is only
   * ever recorded once.
   */
  function track(videoId) {
    let attempts = 0;
    const tick = () => {
      if (seen.has(videoId)) return; // raced by a re-navigation — done
      const entries = extractTopics();
      const duration = getVideoDurationSeconds();
      // Send once we have topics, a usable duration, or after ~6s of
      // waiting for the player metadata.
      if (entries.length > 0 || duration > 0 || attempts >= 8) {
        if (entries.length > 0 || duration > 0) {
          remember(videoId);
          send(videoId, entries, duration);
          return;
        }
      }
      attempts += 1;
      if (attempts <= 8) setTimeout(tick, 700);
    };
    tick();
  }

  function onNavigate() {
    const videoId = getVideoId();
    if (!videoId || seen.has(videoId)) return;
    track(videoId);
  }

  // YouTube is a SPA — hook its navigation event, then poll for metadata.
  window.addEventListener("yt-navigate-finish", onNavigate);
  // Initial full page load.
  setTimeout(onNavigate, 1500);
})();
