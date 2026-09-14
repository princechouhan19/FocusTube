/* ── Docs sections (from repo documentation) ── */
export interface DocSection {
  slug: string;
  title: string;
  group: string;
  description: string;
  updated: string;
  body: {
    heading?: string;
    paragraphs?: string[];
    list?: string[];
    code?: { lang: string; content: string };
  }[];
}

export const docSections: DocSection[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    group: "Start here",
    description: "From source to protected in five minutes.",
    updated: "v1.17.0",
    body: [
      {
        paragraphs: [
          "FocusTube ships as source code — you load it directly into Chrome as an unpacked extension. That means no store review delays, no hidden updates, and full ability to read every line that runs in your browser.",
        ],
      },
      {
        heading: "Load the extension",
        list: [
          "Download or clone the FocusTube repository.",
          "Open chrome://extensions/ in Chrome.",
          "Enable Developer mode (top right).",
          "Click “Load unpacked” and select the FocusTube folder — the one containing manifest.json.",
          "Pin FocusTube to the toolbar. The first open walks you through setup.",
        ],
      },
      {
        heading: "First five minutes",
        paragraphs: [
          "The setup assistant asks for your name, offers Mika or Haru as a companion (or neither), and arms the first protections. Head to YouTube afterwards: Shorts should be gone from the interface, ads should skip themselves, and the popup shows your first Focus Ring progress.",
        ],
      },
      {
        heading: "Verify it works",
        code: {
          lang: "text",
          content:
            "1. Open youtube.com        → Shorts hidden, ads skipped\n2. Open the popup          → rings + today's numbers visible\n3. Popup → Block YouTube   → 30m block starts counting down\n4. Open a blocked site     → calm block page appears",
        },
      },
    ],
  },
  {
    slug: "installation",
    title: "Installation",
    group: "Start here",
    description: "Requirements, loading, updating and removal.",
    updated: "v1.17.0",
    body: [
      {
        heading: "Requirements",
        list: [
          "Chrome (Manifest V3). Chromium browsers generally work; Brave needs the File System Access API flag for direct file sync.",
          "No build step, no npm install — the repo is the extension.",
        ],
      },
      {
        heading: "Update",
        paragraphs: [
          "Pull the latest changes with git, then click the reload icon on FocusTube's card in chrome://extensions/. Your data lives in chrome.storage.local and survives updates untouched.",
        ],
      },
      {
        heading: "Uninstall",
        paragraphs: [
          "Remove FocusTube from chrome://extensions/ like any extension. Chrome deletes its storage with it — export or sync a monthly archive first if you want to keep your history. Archive files are plain JSON and fully portable.",
        ],
      },
    ],
  },
  {
    slug: "architecture",
    title: "Architecture",
    group: "Under the hood",
    description: "How the service worker, content scripts and storage fit together.",
    updated: "docs/ARCHITECTURE.md",
    body: [
      {
        paragraphs: [
          "FocusTube follows the standard Manifest V3 separation: one background service worker owns timers and messaging, content scripts do page-level work, and chrome.storage.local is the single source of truth shared between them.",
        ],
      },
      {
        code: {
          lang: "text",
          content:
            "┌──────────────────────────────┐\n│  Background service worker   │\n│  timers · messages · sync    │\n└──────────────┬───────────────┘\n               ↕ chrome.storage.local\n┌──────────────┴───────────────┐\n│  Content scripts             │\n│  core/     storage wrapper,  │\n│            logger, DOM utils │\n│  blocking/ site · ads ·      │\n│            shorts · keyword  │\n│  youtube/  autoplay · quality│\n│            watch-intent      │\n│  ui/       orchestrator      │\n└──────────────────────────────┘",
        },
      },
      {
        heading: "Data flow — blocking a site",
        paragraphs: [
          "The popup writes to blockedSites in storage; the background updates declarativeNetRequest rules; the site blocker in each tab listens for the change and shows the interstitial if you're already there. One source of truth, three consumers.",
        ],
      },
      {
        heading: "Design system",
        paragraphs: [
          "Every surface — popup, dashboard, overlays, block page, digest, onboarding — consumes the same tokens from src/shared/apple-ui.css and liquid-glass.css: SF Pro / SF Mono type ramps, inset-grouped cards, semantic iOS colors and spring easing, with full prefers-reduced-motion support.",
        ],
      },
    ],
  },
  {
    slug: "api",
    title: "API reference",
    group: "Under the hood",
    description: "Modules, storage keys and message handlers.",
    updated: "docs/API.md",
    body: [
      {
        heading: "Core modules",
        paragraphs: [
          "storage.js wraps chrome.storage.local with defaults and migration; logger.js gates debug output behind DEBUG_LOGS; dom-helpers.js guards every DOM write in try/catch; sanitize-html.js escapes anything that ever renders as HTML.",
        ],
      },
      {
        code: {
          lang: "javascript",
          content:
            "// Read all settings\nconst settings = await chrome.storage.local.get(null);\n\n// Persist a change\nawait chrome.storage.local.set({ extensionEnabled: true });\n\n// React to changes anywhere\nchrome.storage.onChanged.addListener((changes, area) => {\n  if (changes.blockedSites) refreshBlocks();\n});",
        },
      },
      {
        heading: "Blocking layer",
        list: [
          "site-blocker.js — universal blocking on all URLs, subdomain-aware matching",
          "ad-blocker.js / shorts-blocker.js — YouTube surface cleanup",
          "keyword-blocker.js / channel-blocker.js — content rules",
          "smart-lists.js — category presets: Social, Gaming, News, Shopping…",
        ],
      },
      {
        heading: "Message validation",
        paragraphs: [
          "Every runtime message payload is validated before handling, handlers never return true asynchronously, and chrome.runtime.lastError is checked everywhere — the patterns SECURITY.md formalized in v1.0.1.",
        ],
      },
    ],
  },
  {
    slug: "configuration",
    title: "Configuration",
    group: "Use",
    description: "Every switch, from ring goals to Sleep Guard.",
    updated: "v1.17.0",
    body: [
      {
        heading: "Focus",
        list: [
          "Ring goals — editable per ring in Settings; changes apply instantly everywhere",
          "Pomodoro — 25/5/15 presets, Deep Work auto-block",
          "Sleep Guard — evening block (default 22:30–07:00) with a wind-down briefing 30 minutes before",
          "Unblock friction — Off / Standard / Strict ladder",
        ],
      },
      {
        heading: "Blocking",
        list: [
          "Smart Lists — Social, Gaming, News, Shopping and more",
          "Keyword and channel rules for YouTube",
          "Per-site daily time limits with live countdowns",
          "Shorts eradication, ad skipping, autoplay terminator",
        ],
      },
      {
        heading: "Interface",
        list: [
          "Hide comments, info cards, end screens and view metrics",
          "Theater mode toggle and force-highest-quality",
          "Vim-style keys (opt-in): j/k scroll, gg/G, f, t — Esc back, x close, ? help",
          "Companion — pick, switch, hide per site, or disable entirely",
        ],
      },
      {
        heading: "Data",
        list: [
          "Monthly archive sync to any folder you own",
          "JSON export / import fallback",
          "120-day local history",
        ],
      },
    ],
  },
  {
    slug: "security",
    title: "Security",
    group: "Trust",
    description: "Threat model and hardening history — the short version.",
    updated: "SECURITY.md",
    body: [
      {
        paragraphs: [
          "The full policy lives in SECURITY.md in the repository; this page summarizes it. FocusTube's trust boundaries are the pages it runs on, the messages passed between contexts, and anything that ever renders as HTML.",
        ],
      },
      {
        heading: "Hardened in v1.0.1 and since",
        list: [
          "AI summary output HTML-escaped — no XSS through provider responses",
          "Stored domains, profile images and keyword overlays built via DOM APIs",
          "All incoming message payloads validated",
          "API keys redacted from any log output",
          "updateSettings filtered to known keys only",
          "web_accessible_resources tightened to the minimum set",
        ],
      },
      {
        heading: "Known limitations",
        paragraphs: [
          "FocusTube reads public page DOM by design and cannot protect content outside the browser. Selector drift on YouTube is the main maintenance cost. The full, honest list is in SECURITY.md — including what the extension deliberately does not do.",
        ],
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    group: "Help",
    description: "The fixes that solve almost everything.",
    updated: "docs/",
    body: [
      {
        heading: "Common symptoms",
        list: [
          "Extension not loading — clear cache, then reload in chrome://extensions/",
          "Feature not working — open the console (right-click → Inspect) and look for [FocusTube] errors",
          "Storage not updating — reload the tab after changing settings",
          "A domain isn't blocking — check spelling; subdomains are covered automatically",
          "Block page not showing — check the browser console for errors",
        ],
      },
      {
        heading: "Enable debug logs",
        code: {
          lang: "javascript",
          content:
            "// In src/content/core/logger.js\nconst DEBUG_LOGS = true;\n\n// Output appears as:\n// [FocusTube] [Module] message",
        },
      },
      {
        heading: "Inspect storage",
        code: {
          lang: "javascript",
          content:
            "// From the extension's DevTools console:\nchrome.storage.local.get(null, (data) =>\n  console.log('All storage:', data)\n);",
        },
      },
    ],
  },
  {
    slug: "project-structure",
    title: "Project structure",
    group: "Develop",
    description: "Where everything lives in the repository.",
    updated: "docs/PROJECT_STRUCTURE.md",
    body: [
      {
        code: {
          lang: "text",
          content:
            "src/content/\n├─ core/        core utilities (shared by everything)\n├─ youtube/     YouTube-specific features\n├─ blocking/    site & ad blocking\n├─ controllers/ page controllers\n├─ utils/       UI utilities\n└─ ui/          main orchestrator",
        },
      },
      {
        heading: "Where to change what",
        list: [
          "Ad blocking — src/content/blocking/ad-blocker.js",
          "Site blocking — src/content/blocking/site-blocker.js",
          "Popup UI — src/popup/popup.js",
          "Storage — src/content/core/storage.js",
          "Design tokens — src/shared/apple-ui.css, liquid-glass.css",
        ],
      },
      {
        heading: "Adding a feature",
        paragraphs: [
          "Create the file in the matching folder, add logic, register it in manifest.json (order matters — dependencies load first), reload the extension, and test on YouTube. Keep modules small: one thing, done well.",
        ],
      },
    ],
  },
  {
    slug: "contributing",
    title: "Contributing",
    group: "Develop",
    description: "PRs welcome — here's where to start.",
    updated: "README",
    body: [
      {
        paragraphs: [
          "Contributions are welcome, especially: expanding the Focus Score's quality signals, new Smart List presets, accessibility passes, and translations. Because FocusTube heavily touches YouTube's DOM, selector drift is the main maintenance cost — read PROJECT_STRUCTURE.md before editing content scripts.",
        ],
      },
      {
        heading: "The workflow",
        list: [
          "Fork and clone the repository",
          "Create the module in the matching src/content/ folder",
          "Register it in manifest.json (respecting load order)",
          "Reload the unpacked extension and test on real pages",
          "Update docs when adding features — docs live with code",
        ],
      },
    ],
  },
];

export const docGroups = [
  "Start here",
  "Use",
  "Under the hood",
  "Trust",
  "Help",
  "Develop",
];
