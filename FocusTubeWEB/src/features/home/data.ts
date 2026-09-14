/* ── Hero facts strip (all verifiable in the repo) ── */
export const heroFacts = [
  { value: "100%", label: "Local — nothing leaves your device" },
  { value: "0", label: "Accounts, telemetry or tracking" },
  { value: "3", label: "Focus Rings closed every day" },
  { value: "MV3", label: "Hardened Manifest V3 build" },
];

/* ── Problem → solution ── */
export const noiseItems = [
  { label: "Shorts", detail: "An infinite slot machine one swipe away" },
  { label: "Autoplay", detail: "The next video starts before you decide" },
  { label: "Recommendations", detail: "Optimized for watch time, not for you" },
  { label: "Ads", detail: "Pre-rolls, mid-rolls, banners, bumpers" },
  { label: "Endless feed", detail: "A homepage designed to never end" },
  { label: "Rabbit holes", detail: "One click from research into re-runs" },
];

/* ── Focus Rings ── */
export const rings = [
  {
    key: "deflected",
    label: "Deflected",
    color: "var(--ring-deflected)",
    detail: "Ads, Shorts & urges skipped",
    goal: 12,
    value: 12,
  },
  {
    key: "focused",
    label: "Focused",
    color: "var(--ring-focused)",
    detail: "Pomodoro focus minutes",
    goal: 120,
    value: 110,
    format: (v: number) => `${v}m`,
  },
  {
    key: "saved",
    label: "Saved",
    color: "var(--ring-saved)",
    detail: "Minutes returned by blockers",
    goal: 60,
    value: 51,
    format: (v: number) => `${v}m`,
  },
] as const;

/* ── Cinematic feature sections on the homepage ── */
export interface FeatureSection {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  shot: string;
  kind: "wide" | "phone" | "special";
  accent?: string;
}

export const featureSections: FeatureSection[] = [
  {
    id: "distraction-control",
    eyebrow: "Layered blocking",
    title: "Shorts, ads, recommendations — gone.",
    body: "FocusTube removes the machinery of distraction at the source. Shorts are eradicated from the interface, ads are skipped before they play, and recommendations can disappear entirely — leaving only the video you came for.",
    points: [
      "Shorts eradication across YouTube",
      "Auto-skip ads and hide banners",
      "Hide comments, cards, end screens and metrics",
      "Keyword and channel blocking",
    ],
    shot: "/product/overlay-site-block.webp",
    kind: "wide",
  },
  {
    id: "focus-timer",
    eyebrow: "Deliberate viewing",
    title: "A timer that ends the session for you.",
    body: "Start a quick 5, 15, 30 or 60-minute lock, or schedule recurring focus blocks. A live, real-time countdown keeps the session honest — when the ring closes, YouTube steps aside. Pomodoro presets (25/5/15) and a Deep Work mode that auto-blocks everything else are built in.",
    points: [
      "Quick locks: 5 / 15 / 30 / 60 minutes",
      "Scheduled daily blocks with live countdown",
      "Pomodoro 25/5/15 with Deep Work auto-block",
      "Quiz-gated unblocks when willpower wobbles",
    ],
    shot: "/product/overlay-focus-timer.webp",
    kind: "wide",
  },
  {
    id: "daily-briefing",
    eyebrow: "Daily briefing",
    title: "Mornings show yesterday — before today drifts.",
    body: "The first browser open of the day opens your briefing: yesterday's Focus Score, rings, 7-day trend and where your time actually went. It's the fresh-start effect, applied to attention — review yesterday in the morning, so today is chosen, not drifted.",
    points: [
      "Focus Score, rings and 7-day trend at a glance",
      "Where your time went — by site and minutes",
      "Evening opens become a wind-down recap of today",
      "Sleep Guard winds YouTube down at night (22:30–07:00)",
    ],
    shot: "/product/digest-morning.webp",
    kind: "wide",
  },
  {
    id: "watch-intent",
    eyebrow: "Watch intent",
    title: "What are you here for?",
    body: "Before a video starts, FocusTube asks once: state your purpose and planned minutes. Watching on purpose beats watching on autopilot — the dashboard gains an Intent Match rate, the share of sessions that ended on-purpose. “Just browsing” starts an honest mindful countdown that re-asks when it expires.",
    points: [
      "One-tap intents: learn, music, tutorial, planned entertainment",
      "Planned minutes — the session ends when they do",
      "Intent Match rate on the dashboard",
      "Based on implementation-intention research (Gollwitzer, 1999)",
    ],
    shot: "/product/watch-intent.webp",
    kind: "wide",
  },
  {
    id: "ai-summaries",
    eyebrow: "AI summaries",
    title: "Long videos, distilled to what matters.",
    body: "Bring your own key from Gemini, OpenAI, Mistral, DeepSeek or xAI and the Summary button appears under any video. Get the gist, key points and chapters without watching all 47 minutes — your key talks to your provider directly, and FocusTube stores nothing in between.",
    points: [
      "BYO key — Gemini, OpenAI, Mistral, DeepSeek, xAI",
      "One click from the player, transcript-aware",
      "Output is HTML-escaped and sanitized",
      "Keys never sync, never log, never leave the device unencrypted",
    ],
    shot: "/product/popup-youtube.webp",
    kind: "phone",
  },
  {
    id: "companion",
    eyebrow: "Mika & Haru",
    title: "A companion that reacts to how you browse.",
    body: "Pick your focus buddy during onboarding — Mika, warm and cheery, or Haru, calm and steady. They guide setup Genshin-style, float on every site with a live site clock, and wear one of 8 emotion faces driven by the site's score: happy on deep work, worried on feeds, joyful when your rings close.",
    points: [
      "8 emotion faces × 4 poses × 2 characters",
      "Hand-authored parametric SVG — about 16 KB, no models",
      "Tap-to-expand panel: rings, saved time, quick blocks",
      "Drag anywhere, hide per site, honors reduced motion",
    ],
    shot: "/product/companion-duo.webp",
    kind: "wide",
  },
  {
    id: "analytics",
    eyebrow: "Insights",
    title: "Analytics that reward honesty, not grinding.",
    body: "The dashboard turns your attention into something you can read at a glance: a 30-day heatmap, activity timeline, watch-time topics, and a Focus Score designed to resist gaming — diminishing returns, daily caps and diversity weighting mean pressing “Block 30 min” a hundred times cannot buy a perfect score.",
    points: [
      "Focus Score with anti-gaming design",
      "30-day heatmap and activity timeline",
      "Watch-time topics and hashtag tracking",
      "Day / week / month navigation with lifetime totals",
    ],
    shot: "/product/dashboard-overview.webp",
    kind: "wide",
  },
];

/* ── Interactive showcase slides ── */
export const showcaseSlides = [
  {
    id: "popup",
    label: "Control center",
    caption:
      "The popup — one click from any page. Focus sessions, blocks, rings and today's numbers.",
    src: "/product/popup-home.webp",
    frame: "phone" as const,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    caption:
      "Focus Score, Focus Rings, heatmap and monthly review — the full picture of your attention.",
    src: "/product/dashboard-overview.webp",
    frame: "browser" as const,
  },
  {
    id: "focus",
    label: "Focus controls",
    caption:
      "Start a focus session, block YouTube for 30 minutes, or set a daily time limit.",
    src: "/product/popup-focus.webp",
    frame: "phone" as const,
  },
  {
    id: "goals",
    label: "Ring goals",
    caption:
      "Editable goals for every ring — challenge, but reachable. Changes apply instantly everywhere.",
    src: "/product/popup-goals.webp",
    frame: "phone" as const,
  },
  {
    id: "block",
    label: "Block page",
    caption:
      "When a limit hits, a calm interstitial appears — with a nudge from your companion.",
    src: "/product/block-page.webp",
    frame: "browser" as const,
  },
  {
    id: "month",
    label: "Monthly review",
    caption:
      "Week badges, day-by-day rings and a best-day line — your month, legible.",
    src: "/product/dashboard-month.webp",
    frame: "browser" as const,
  },
  {
    id: "onboarding",
    label: "Onboarding",
    caption:
      "An iOS-style setup assistant, guided by the buddy you pick — Mika or Haru.",
    src: "/product/onboarding-buddy.webp",
    frame: "browser" as const,
  },
  {
    id: "settings",
    label: "Settings",
    caption:
      "Everything is a switch you own. No dark patterns in the settings, either.",
    src: "/product/popup-settings.webp",
    frame: "phone" as const,
  },
];
