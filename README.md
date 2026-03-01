![FocusTube Banner](src/icons/banner.png)

# FocusTube - Ultimate Productivity & Distraction Control

FocusTube is a comprehensive, privacy-first Chrome extension engineered to let you take back control of your YouTube experience. By deeply modifying YouTube's web interface, it eliminates algorithms, hides addictive content like Shorts, and protects your attention using dynamic intervention screens.

## ✨ New Premium v2.1 Update

### 👤 Profile Synchronization & Cross-Browser Sync

Now FocusTube is more powerful than ever. It automatically fetches your **YouTube Profile Name, Avatar, and Email** to personalize your dashboard.

- **Cookie-Based Settings Sync:** Your extension settings are now backed up to a specialized cookie on the `youtube.com` domain. This means if you log into the same YouTube account on another browser, FocusTube will automatically restore your custom settings!

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
youtube-focus-pro/
├── manifest.json                        # Manifest V3 Configuration
├── README.md                            # Documentation
│
├── src/
│   ├── background/                      # Background SW (Stats handling, LLM api calls)
│   ├── popup/                           # React-like modular Vanilla JS popup UI
│   ├── dashboard/                       # Full-screen stats dashboard UI
│   └── content/                         # DOM-manipulation Content Scripts
│       ├── ad-blocker.js                # Ad termination
│       ├── shorts-blocker.js            # URL monitoring & redirects
│       ├── summary-button.js            # Transcript scraping & Gemini integration
│       ├── keyword-blocker.js           # Regex-based title & tag topic blocking
│       ├── keyboard-shortcuts.js        # Global listeners for 'S' and 'C' commands
│       └── content.css                  # True Black & Frosted Glass aesthetic variables
```

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
