![FocusTube Banner](src/icons/banner.png)

# FocusTube - Ultimate Productivity & Distraction Control

FocusTube is a comprehensive, privacy-first Chrome extension engineered to let you take back control of your YouTube experience. By deeply modifying YouTube's web interface, it eliminates algorithms, hides addictive content like Shorts, and protects your attention using dynamic intervention screens.

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

### 👤 Profile Synchronization

Now FocusTube is more powerful than ever. It automatically fetches your **YouTube Profile Name, Avatar, and Email** to personalize your dashboard.

> **Note (v1.0.1):** The previously-advertised "Cookie-Based Settings Sync" feature was never actually implemented in the codebase. The claim has been removed to avoid confusion. Settings sync across browsers can be added in a future release via `chrome.storage.sync`.

### 📊 Full-Screen "Stats & Shame" Dashboard

Track your productivity in real-time with a beautiful, newly designed **True Black** aesthetic dashboard.

- **Positive Metrics:** View live counters for Shorts Skipped, Ads Blocked, and AI Summaries Generated.
- **The Wall of Shame:** Tracks exactly how many times you surrendered and quit a Focus Quiz early.

### ⌨️ Power-User Keyboard Shortcuts

- Press **`S`** while watching any video to attempt an AI Summary.
- Press **`C`** to capture a high-quality, timestamped screenshot.

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
│   ├── offscreen/                       # Offscreen document
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
