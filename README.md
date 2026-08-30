![FocusTube Banner](src/icons/banner.png)

# FocusTube - Ultimate Productivity & Distraction Control

FocusTube is a comprehensive, privacy-first Chrome extension engineered to let you take back control of your YouTube experience. By deeply modifying YouTube's web interface, it eliminates algorithms, hides addictive content like Shorts, and protects your attention using dynamic intervention screens.

## 🎨 v1.2.0 — Unified Liquid Glass Design System

Every screen now shares a single visual language. Previously the popup (purple/teal dark glass), dashboard (cream/sky editorial), content overlays (purple gradient, flat black, Unsplash photos — four different styles), and AI nudge card (Tailwind alpha colors) all used different palettes, radius scales, font stacks, and component patterns.

**Now all 8 surfaces** — popup, dashboard, AI Summary modal, site blocker, time blocker, URL blocker, keyword blocker, AI nudge card — **use one design system**: `src/shared/liquid-glass.css`.

- **Deep liquid background** with slowly drifting aurora blooms (blue, violet, cyan).
- **Translucent glass panels** with `backdrop-filter: blur(16px) saturate(160%)`, inner-top highlight, and soft shadows.
- **Spring-easing transitions** everywhere (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Shimmer sweep** on buttons, **breathing glow** on active elements, **liquid entrance** animation on panels.
- **One palette**: blue `#3b82f6` → violet `#8b5cf6` primary gradient, emerald success, rose danger, amber warning, cyan accent.
- **One type scale**, **one radius scale** (8/12/16/20/24/999px), **one shadow scale**, **one z-index scale**.
- **Dashboard switched from cream/light to dark liquid glass** to match everything else.
- Also fixed the url-blocker hide-style selector bug (overlay was hiding itself).

## 🚀 v1.1.0 — New Features

Six new productivity features added on top of the v1.0.1 hardening release:

- **🍅 Pomodoro Timer** — built-in 25/5/15 cycles, Deep Work mode (auto-blocks Social during focus), desktop notifications, pause/skip/stop, persists across service-worker restarts.
- **📋 Smart Lists** — one-click category blocking: Social, Shopping, Gaming, News, Messaging, Streaming, Adult. No expiry — toggle on/off anytime.
- **📊 Dashboard v2** — Focus Score (0-100) with conic-gradient ring, 30-day GitHub-style heatmap, streak counter, willpower & pomodoro lifetime metrics.
- **🤖 AI Nudge System** — when a site is blocked, shows a motivational message (60-message local library by default, or AI-generated if enabled) plus a 3-breath animation and +1 willpower button.
- **🗂️ Tab Manager** — save/load workspaces, group tabs by domain (with colored Chrome tab groups), and "close all non-YouTube tabs" for instant focus restart.
- **🧠 Quiz Overhaul** — three difficulty levels (Easy riddles / Medium math / Hard logic), plus a streak multiplier that escalates difficulty after 8+ completed pomodoros.

See [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) for the complete changelog.

## 🔒 v1.0.1 — Security & Stability Hardening

This release fixes 23 issues across the codebase, including 4 critical bugs, 7 security fixes, and several performance improvements. Highlights:

- **Fixed duplicate `chrome.runtime.onMessage` listener** in `background.js` that was double-handling every message.
- **Added the missing `getTranscript` and `aiSummarize` handlers** — the AI Summary button now actually works.
- **HTML-escaped all AI-generated content** before innerHTML insertion to prevent prompt-injection-driven XSS.
- **Stopped destroying `document.body.innerHTML`** in the site/url blockers — uses CSS visibility:hidden instead, so other content scripts keep working.
- **Tightened `web_accessible_resources`** so only icons are exposed to web pages, not the source of every content script.
- **Stopped monkey-patching the global `console`** — the logger now lives in `window.FocusTubeLogger`.
- **Replaced a whole-document `MutationObserver`** with YouTube's native `yt-navigate-finish` event for SPA navigation.
- **Validated all incoming message payloads** in the background service worker.

See [`SECURITY.md`](./SECURITY.md) for the full threat model and [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) for the complete changelog.

## ✨ New Premium v2.1 Update

### 🔄 Local-First Cross-Browser Sync

FocusTube always saves activity and settings in Chrome extension storage first. A
shared `focustube-data.json` file is optional: when it is disconnected, the
Dashboard shows **Saved locally** and safely queues changes. Choosing or
reconnecting the file triggers an immediate merge and push, so offline time is
not lost.

The shared file includes usage history, metrics, site logos, profile name/avatar/
goal, blocked topics/keywords, Smart Lists, time limits, Pomodoro preferences,
and other productivity settings. API keys, passwords, browser session data,
and file handles never leave the current browser.

### 👤 Profile Personalization

Now FocusTube is more powerful than ever. It automatically fetches your **YouTube Profile Name, Avatar, and Email** to personalize your dashboard.

> **Note:** Profile information is collected locally. Only the display name,
> avatar, and goal are included in the optional user-chosen sync file; email
> and credentials remain local.

### 📊 Full-Screen "Stats & Shame" Dashboard

Track your productivity in real-time with a beautiful, newly designed **True Black** aesthetic dashboard.

- **Positive Metrics:** View live counters for Shorts Skipped, Ads Blocked, and AI Summaries Generated.
- **The Wall of Shame:** Tracks exactly how many times you surrendered and quit a Focus Quiz early.

### ⌨️ Power-User Keyboard Shortcuts

- Press **`S`** while watching any video to attempt an AI Summary.

### 🤖 AI Summaries (Beta Status) ⚠️

> [!IMPORTANT]
> **Beta Notice:** The AI Summary feature is currently in **Beta** and may not work as expected due to recent changes in YouTube's DOM structure. We are actively working on a more robust scraping engine.

---

## 🚀 Upcoming Features (Roadmap)

- **Vim-Style Navigation:** Browse YouTube entirely using `j`, `k`, `h`, `l` keys.
- **Advanced Analytics:** Detailed graphs of your focus trends over weeks and months.
- **More AI Providers:** Support for Claude 3.5, Gemini 2.0, and local LLMs via Ollama.
- **Custom Themes:** Beyond True Black, including Nord, Solarized, and custom CSS injection.

---

## 🎯 Core Features

### 🎥 Video Page Enhancements

- **True Black AI Summary Modal** - Get beautifully formatted, readable bullet points of any video (Powered by Gemini).
- **Hide All Shorts** - Eradicates the Shorts shelf, sidebar tabs, and forces redirects if you try to visit a `/shorts` URL.
- **Aggressive Ad Blocking** - Automatically skips video ads and completely wipes out UI banner ads using DOM manipulation.
- **Autoplay Terminator** - Stops YouTube from auto-playing the next video, guaranteeing you only watch what you click.
- **Force Highest Quality** - Never manually change the gear icon again; FocusTube requests the highest available bitrate instantly.

### 🧭 Distraction Removers

- **Homepage Cleaner** - Delete the recommended feed, "People also watched", and Trending tags.
- **Custom Launchpad** - Force YouTube to open to your Subscriptions, the Search bar, or a completely blank Minimal page.
- **Focus Timer & Quizzes** - Lock down YouTube for set intervals (e.g. 15 mins). If you try to disable it, you are forced to complete a strict 5-question typing quiz in under 30 seconds.

---

## 📁 Project Architecture

```
FocusTube/
├── manifest.json                        # Manifest V3 Configuration
├── README.md                            # Main documentation
├── docs/                                # 📚 Comprehensive Documentation (NEW!)
│   ├── PROJECT_STRUCTURE.md             # Folder organization & navigation
│   ├── ARCHITECTURE.md                  # System design & data flows
│   ├── API.md                           # Complete API reference
│   ├── MIGRATION_GUIDE.md               # Structure changes & migration
│   └── CHANGELOG.md                     # Version history & roadmap
│
├── public/                              # Static assets
│   ├── icons/                           # Extension icons
│   └── images/                          # App images
│
├── src/
│   ├── background/                      # Background SW (Stats, timers)
│   ├── popup/                           # Popup UI
│   ├── dashboard/                       # Dashboard UI
│   └── content/                         # Content Scripts (Organized)
│       ├── core/                        # Core utilities
│       ├── youtube/                     # YouTube-specific features
│       ├── blocking/                    # Content blocking
│       ├── controllers/                 # Page controllers
│       ├── utils/                       # UI utilities
│       └── ui/                          # UI orchestration
```

## 📚 Documentation

**🎉 Comprehensive documentation is available in the `docs/` folder:**

### 🚀 Start Here
- **[QUICK_START.md](docs/QUICK_START.md)** - Get up and running in 5 minutes
- **[DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md)** - Find what you need

### 📖 Core Documentation
| Document | Purpose | Audience |
|----------|---------|----------|
| [QUICK_START.md](docs/QUICK_START.md) | Setup & common tasks | Everyone |
| [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Folder organization | Developers |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design | Developers |
| [API.md](docs/API.md) | Function reference | Developers |
| [CHANGELOG.md](docs/CHANGELOG.md) | Version history | Everyone |

### 🔒 v1.0.1 Hardening
| Document | Purpose |
|----------|---------|
| [SECURITY.md](SECURITY.md) | Threat model, fixed issues, reporting policy |
| [IMPROVEMENTS.md](IMPROVEMENTS.md) | Complete v1.0.1 changelog |

**Choose your path:**
- **Want a quick setup?** → Read [QUICK_START.md](docs/QUICK_START.md)
- **Want to contribute?** → Read [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) then [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Need a function?** → Check [API.md](docs/API.md)
- **Reviewing security?** → Read [SECURITY.md](SECURITY.md)
- **Not sure where to start?** → Read [DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md)

## 🚀 Installation

### Development Mode (Load Unpacked)

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (toggle in the top right corner).
4. Click **"Load unpacked"**.
5. Select the `youtube-focus-pro` root folder containing the `manifest.json`.
6. Pin FocusTube to your toolbar!

## 🔐 Privacy & Security Built-In

- **100% Local Processing:** Operations like ad-blocking, keyword checking, and Shorts redirection happen entirely in your browser using local DOM parsing.
- **No Tracking Pipeline:** Your viewing habits are not sent to any telemetry server.
- **Clean Auth:** Because it scrapes public DOM elements instead of using the YouTube Data API `v3`, you never grant the extension read access to your private Google Account data.

## 🤝 Contributing

Contributions are always welcome. Currently looking for active help with:

- Expanding the `keyboard-shortcuts.js` module with Vim-style navigation.
- Porting the popup UI to a lightweight framework like Preact.
- Integrating Claude 3.5 Sonnet support for the AI Summarizer.

---

**Note**: This extension heavily modifies YouTube's UI. Changes to YouTube's web architecture may require occasional updates to the query selectors in the `src/content/` modules.
