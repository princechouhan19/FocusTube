![FocusTube Banner](src/icons/banner.png)

# FocusTube - Ultimate Productivity & Distraction Control

FocusTube is a comprehensive, privacy-first Chrome extension engineered to let you take back control of your YouTube experience. By deeply modifying YouTube's web interface, it eliminates algorithms, hides addictive content like Shorts, and protects your attention using dynamic intervention screens.

## ✨ New Premium Features (v2.0 Update)

### 📊 Full-Screen "Stats & Shame" Dashboard

Track your productivity in real-time with a beautiful, newly designed **True Black** aesthetic dashboard.

- **Positive Metrics:** View live counters for Shorts Skipped, Ads Blocked, and AI Summaries Generated.
- **The Wall of Shame:** Tracks exactly how many times you surrendered and quit a Focus Quiz early, complete with dynamic taunts to keep you accountable.
- _Access it via the premium gradient button in the main extension popup!_

### ⌨️ Power-User Keyboard Shortcuts

Never take your hands off the keyboard while studying or learning:

- Press **`S`** while watching any video to instantly generate and open an AI Summary.
- Press **`C`** to silently capture a high-quality, timestamped screenshot of the current video frame straight to your downloads folder.

### 🖼️ Dynamic Unsplash Topic Blockers

When you try to visit a video inside one of your blocked keyword categories, the screen will be replaced by a stunning, randomly selected motivational Unsplash background featuring a frosted glass overlay.

### 🤖 DOM-Scraped AI Summaries (No API Keys Required)

The AI Summary feature has been completely rewritten. It no longer relies on the strict YouTube Data API limits. The extension now intelligently scrapes the DOM (and auto-generated captions if available) to feed directly into the Gemini AI pipeline—saving you from complex Google Cloud console setups.

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
