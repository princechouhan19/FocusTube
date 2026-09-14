/* ── Changelog (from docs/CHANGELOG.md + README v1.17) ── */
export interface ChangelogEntry {
  version: string;
  date: string;
  tag?: string;
  groups: { kind: string; items: { title: string; body: string }[] }[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.17.0",
    date: "Current release",
    tag: "The researched wave",
    groups: [
      {
        kind: "New",
        items: [
          {
            title: "Mika & Haru — anime focus buddies",
            body: "Pick your guide in onboarding; they float on every site with a live site clock and an emotion face driven by the site's score. 8 emotions × 4 poses × 2 characters, hand-authored parametric SVG (~16 KB).",
          },
          {
            title: "Watch Intent",
            body: "An implementation-intention prompt on watch pages — state your purpose and planned minutes. The dashboard gains an Intent Match rate.",
          },
          {
            title: "Streak Insurance",
            body: "Freezes are earned, never bought: close all rings 4+ days in a week to bank a freeze that absorbs a missed day. Repair a broken chain by doubling your Focused goal the next day. The ledger is derived from history, so it can't drift or be forged.",
          },
          {
            title: "Adaptive Ring Goals",
            body: "Monday's briefing compares your 4-week trend against each goal and suggests one calibration step up or down — you apply or keep.",
          },
          {
            title: "Graduated Unblock Friction",
            body: "One-click unblocks become a ladder: state a reason (≥12 chars) → a 10–30s pause that grows with each unblock today → a quiz on Strict or after 3+ unblocks.",
          },
          {
            title: "Weekly Recap Card & Accountability Pairing",
            body: "Export your ring week as a branded PNG (100% canvas, local). Trade pair cards with a partner by copy/paste — only ring counts leave your device, checksum-tamper-evident, no server.",
          },
          {
            title: "Sleep Guard",
            body: "An evening YouTube block (default 22:30–07:00) plus a wind-down briefing opened 30 minutes before it starts — once per day.",
          },
          {
            title: "Vim-style keys (opt-in)",
            body: "j/k scroll, gg/G, f, t — and the exit keys are first-class: Esc goes back, x closes the tab, ? shows help.",
          },
        ],
      },
    ],
  },
  {
    version: "1.8.5",
    date: "September 3, 2026",
    groups: [
      {
        kind: "Fixed",
        items: [
          {
            title: "Real dated dashboard history",
            body: "Daily website usage now appears in every Day/Week/Month point. The 30-day heatmap reflects recorded browsing time, and each cell knows its exact local date.",
          },
          {
            title: "Historical top sites",
            body: "The Top Sites card follows the active range — today, the current week, or the last 30 days.",
          },
          {
            title: "Calendar-month activity",
            body: "Monthly Activity always starts on the 1st and ends today, adapting to 28–31 day months.",
          },
        ],
      },
    ],
  },
  {
    version: "1.8.4",
    date: "August 30, 2026",
    groups: [
      {
        kind: "New",
        items: [
          {
            title: "Local-first file sync",
            body: "Activity and safe preferences are recorded in chrome.storage.local even when no file is connected, shown as “Saved locally”, and merged on reconnect.",
          },
          {
            title: "Portable profile & focus settings",
            body: "The shared file now carries display name, avatar, goal, blocked topics, channels, Smart Lists and Pomodoro preferences — with per-section timestamps.",
          },
        ],
      },
      {
        kind: "Privacy",
        items: [
          {
            title: "Sensitive data excluded from sync",
            body: "API keys, passwords, emails, browser/session state, file handles and runtime timer state are explicitly excluded from the portable JSON file.",
          },
        ],
      },
    ],
  },
  {
    version: "1.8.3",
    date: "August 22, 2026",
    groups: [
      {
        kind: "New",
        items: [
          {
            title: "Watch Time & Topics panel",
            body: "A range-aware dashboard section with total tracked watch time beside a Top Topics breakdown, captured from hashtag chips, title hashtags and video categories — counted once per video, stored per day, rendered with proportional bars.",
          },
        ],
      },
    ],
  },
  {
    version: "1.8.2",
    date: "August 22, 2026",
    groups: [
      {
        kind: "New",
        items: [
          {
            title: "Near-real-time file sync",
            body: "The background watches data changes and pushes to the shared JSON file ~10s after any mutation. The sync badge shows the last write time and file size.",
          },
        ],
      },
    ],
  },
  {
    version: "1.8.0",
    date: "August 21, 2026",
    groups: [
      {
        kind: "Redesigned",
        items: [
          {
            title: "Design System v2 — “Graphite & Iris”",
            body: "A full visual overhaul: warm graphite dark base, one iris-amber brand accent, muted semantic colors, hairline borders, soft realistic shadows, standard-eased motion and reduced-motion support across every surface.",
          },
          {
            title: "Dashboard UX rework",
            body: "Segmented Day/Week/Month control with ARIA tabs, a 7-day context chart for the Day view, daily-limit usage on Top Sites, and a version footer read from the manifest.",
          },
        ],
      },
      {
        kind: "Fixed",
        items: [
          {
            title: "Brave + manual Import/Export flow",
            body: "Detects Brave and explains how to enable the File System Access API; Import now distinguishes empty files, invalid JSON and non-FocusTube JSON.",
          },
          {
            title: "Streaks no longer reset unfairly",
            body: "A day with no activity yet no longer zeroes the streak — it carries over until the day actually ends with no actions.",
          },
        ],
      },
    ],
  },
  {
    version: "1.7.0",
    date: "August 21, 2026",
    groups: [
      {
        kind: "New",
        items: [
          {
            title: "Cross-browser local file sync",
            body: "Share one JSON data file on disk between every browser running FocusTube — including Dropbox/OneDrive folders for cross-machine sharing — via a periodic read → union-merge → write cycle.",
          },
        ],
      },
      {
        kind: "Fixed",
        items: [
          {
            title: "Timezone-accurate day keys",
            body: "Metrics were stored under UTC day keys while the dashboard grouped by local days — all day keys are now local-time based.",
          },
          {
            title: "Time tracking accuracy",
            body: "Fixed a ~30–60× undercount caused by Chrome's 30s alarm minimum; ticks now accumulate real elapsed time.",
          },
        ],
      },
    ],
  },
  {
    version: "1.2.0",
    date: "The systems release",
    groups: [
      {
        kind: "New",
        items: [
          {
            title: "Unified Liquid Glass design system",
            body: "One token system shared by popup, dashboard, content UI and the block page.",
          },
          {
            title: "Focus Score & Dashboard v2",
            body: "A 0–100 score, GitHub-style heatmap, streak counter and lifetime metrics.",
          },
          {
            title: "Pomodoro, Smart Lists, AI Nudge, Tab Manager",
            body: "Pomodoro timer, category Smart Lists, AI nudge cards with a 3-breath animation, and a tab manager with workspaces and grouping.",
          },
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    date: "April 16, 2026",
    groups: [
      {
        kind: "New",
        items: [
          {
            title: "Universal site blocker",
            body: "Block any website for specific time periods, with subdomain-aware matching and a beautiful block page.",
          },
          {
            title: "Comprehensive documentation",
            body: "A docs/ folder with architecture, API and structure guides, plus a professional folder reorganization.",
          },
        ],
      },
    ],
  },
  {
    version: "1.0.1",
    date: "Hardening release",
    groups: [
      {
        kind: "Security",
        items: [
          {
            title: "20 issues triaged and fixed",
            body: "HTML-escaped AI summary output and keyword overlays, DOM-built avatar and blocks lists, validated message payloads, redacted API keys in logs, tightened web_accessible_resources, and more — see SECURITY.md.",
          },
          {
            title: "Performance passes",
            body: "Replaced whole-document MutationObserver with yt-navigate-finish, slowed ad-skip polling to 250ms, and removed the 10-second maintenance interval.",
          },
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    date: "April 15, 2026",
    tag: "Initial release",
    groups: [
      {
        kind: "New",
        items: [
          {
            title: "YouTube optimization suite",
            body: "Hide ads and Shorts, block distracting channels and keywords, auto-skip ads, force highest quality, auto-pause on inactivity, hide comments and info cards.",
          },
          {
            title: "Focus features",
            body: "YouTube time blocking, scheduled blocking, quiz protection on disable, a focus dashboard and AI video summaries.",
          },
        ],
      },
    ],
  },
];

/* ── FAQ ── */
export interface FaqItem {
  q: string;
  a: string;
  group: string;
}

export const faqs: FaqItem[] = [
  {
    group: "Installation",
    q: "How do I install FocusTube?",
    a: "FocusTube is distributed as source — download or clone the repository, open chrome://extensions/, enable Developer mode, click “Load unpacked” and select the FocusTube folder (the one containing manifest.json). Pin the extension; the first open walks you through the setup assistant. There is no store listing to wait for and nothing auto-updates behind your back.",
  },
  {
    group: "Installation",
    q: "Which browsers are supported?",
    a: "FocusTube is built for Chrome on Manifest V3. Chromium-based browsers work where they support the APIs FocusTube uses — for example, Brave users may need to enable the File System Access API in brave://flags for direct file sync (the extension detects this and explains it). Firefox import/export fallbacks exist for sync, but the primary target is Chrome.",
  },
  {
    group: "Privacy",
    q: "What data does FocusTube collect?",
    a: "None. Blocking, scoring, analytics and rings all compute on-device. There is no account, no cloud, no telemetry pipeline. Your history lives in chrome.storage.local, and optional sync writes plain JSON files to a folder you choose. API keys, passwords, emails and browser state are explicitly excluded from the portable file.",
  },
  {
    group: "Privacy",
    q: "Why does the extension request access to all sites?",
    a: "Site blocking runs on every website — that's the point. The host permission is what lets the universal site blocker, the floating companion and time tracking work on any page you choose to protect. On YouTube, FocusTube reads only the public page DOM; it never touches your private account data and requests no Google scopes.",
  },
  {
    group: "Features",
    q: "What are Focus Rings?",
    a: "An Apple-Fitness-style triple ring, purpose-built for attention: Deflected (ads, Shorts and urges skipped), Focused (Pomodoro focus minutes) and Saved (minutes returned by blockers). Goals are editable in Settings, rings celebrate when all three close, and weekly badges plus a Monthly Review keep longer arcs visible.",
  },
  {
    group: "Features",
    q: "How does the Focus Score avoid gaming?",
    a: "The score applies diminishing returns, daily caps and diversity weighting to ring activity. Pressing “Block 30 minutes” a hundred times cannot buy a 100 score — rings display behavior, but the score underneath rewards balanced, varied focus actions.",
  },
  {
    group: "Features",
    q: "Do AI summaries need an account?",
    a: "No. AI summaries are bring-your-own-key: add a key from Gemini, OpenAI, Mistral, DeepSeek or xAI in settings, and requests go from your browser to your provider. FocusTube stores nothing in between, and AI output is HTML-escaped before rendering.",
  },
  {
    group: "Blocking",
    q: "Can I still watch something when a block is active?",
    a: "Unblocking is deliberately graduated. Instead of one click, you state a reason (at least 12 characters), wait a 10–30 second pause that grows with each unblock that day, and — on Strict mode or after 3+ unblocks — answer a quiz. Off / Standard / Strict is your choice in Settings.",
  },
  {
    group: "Data",
    q: "Where does my data live, and how do I back it up?",
    a: "In chrome.storage.local on your machine, with 120 days of local history. For backup or cross-browser sharing, pick a folder you own: FocusTube writes one small file per month (focustube-<Month>-<Year>.json), rotated automatically, and imports the months already in the folder. The files are plain JSON you can read.",
  },
  {
    group: "Data",
    q: "What happens when I uninstall?",
    a: "Chrome removes extension storage with the extension. If you want to keep your history, sync or export your data to a folder first — the monthly archive files are fully portable and readable.",
  },
  {
    group: "Companion",
    q: "What are Mika and Haru?",
    a: "Your anime focus buddies — Mika (warm and cheery) and Haru (calm and steady). They guide onboarding, float on any site with a live site clock, and react with 8 emotion faces driven by the site's score. They're hand-authored parametric SVG (~16 KB, no model downloads), drag-anywhere, hideable per site, and fully respect reduced-motion settings.",
  },
  {
    group: "Companion",
    q: "Can I use FocusTube without the companions?",
    a: "Yes. The companion is optional at every step — choose neither during onboarding, hide it per site, or hide it everywhere from settings. Every other feature works independently of it.",
  },
];

/* ── Permissions (from manifest.json + purpose) ── */
export const permissions = [
  { name: "storage", why: "All settings, history and ring data live in chrome.storage.local on your device." },
  { name: "tabs", why: "Time tracking, tab manager workspaces and applying blocks to the right tab." },
  { name: "scripting", why: "Injecting the blocking and UI logic into pages you visit." },
  { name: "activeTab", why: "Acting on the page you're on when you invoke the popup." },
  { name: "tabGroups", why: "Tab Manager workspaces and grouping." },
  { name: "notifications", why: "Local reminders — wind-down briefing, session ends. No remote pushes." },
  { name: "declarativeNetRequest", why: "Blocking ad/tracking network requests efficiently, without reading page data." },
  { name: "idle", why: "Auto-pause on inactivity — stop counting time when you've stepped away." },
  { name: "alarms", why: "Scheduled blocks, sync ticks and archive rotation." },
];
