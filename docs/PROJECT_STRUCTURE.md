# FocusTube Project Structure

## Overview
Professional, modular folder structure for FocusTube extension with clear separation of concerns.

```
FocusTube/
├── docs/                          # 📚 Documentation
│   ├── PROJECT_STRUCTURE.md       # This file
│   ├── ARCHITECTURE.md
│   ├── SITE_BLOCKER_README.md
│   ├── API.md
│   └── CHANGELOG.md
│
├── public/                        # 🖼️ Static Assets
│   ├── icons/                     # Extension icons
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   ├── icon128.png
│   │   └── banner.png
│   └── images/                    # App images
│       └── (placeholder images)
│
├── src/                          # 💻 Source Code
│   ├── manifest.json             # Extension manifest (DO NOT MOVE)
│   │
│   ├── background/               # 🔧 Service Worker
│   │   └── background.js         # Background service worker
│   │
│   ├── content/                  # 📄 Content Scripts (runs on pages)
│   │   ├── core/                 # ⚙️ Core utilities
│   │   │   ├── logger.js         # Logging utility
│   │   │   ├── storage.js        # Chrome storage wrapper
│   │   │   └── dom-helpers.js    # DOM manipulation helpers
│   │   │
│   │   ├── youtube/              # 🎬 YouTube-specific features
│   │   │   ├── time-blocker.js           # Time-based YouTube blocking
│   │   │   ├── autoplay-controller.js    # Autoplay control
│   │   │   ├── quality-controller.js     # Video quality control
│   │   │   ├── summary-button.js         # AI summary button
│   │   │   └── video-player-controller.js # Player controls
│   │   │
│   │   ├── blocking/             # 🚫 Content Blocking
│   │   │   ├── site-blocker.js        # Universal site blocker (all websites)
│   │   │   ├── ad-blocker.js          # YouTube ad blocking
│   │   │   ├── shorts-blocker.js      # YouTube Shorts hiding
│   │   │   ├── keyword-blocker.js     # Keyword-based blocking
│   │   │   ├── channel-blocker.js     # Channel blocking
│   │   │   ├── url-blocker.js         # URL pattern blocking
│   │   │   └── css-filter.js          # CSS-based filtering
│   │   │
│   │   ├── controllers/          # 🎮 Page Controllers
│   │   │   ├── home-controller.js      # Home page customization
│   │   │   ├── navigation-controller.js # Sidebar navigation
│   │   │   └── header-controller.js    # Header controls
│   │   │
│   │   ├── utils/                # 🛠️ Utility Functions
│   │   │   ├── auto-pause.js           # Auto-pause functionality
│   │   │   ├── theater-mode.js         # Theater mode toggle
│   │   │   ├── metrics-hider.js        # Hide video metrics
│   │   │   ├── glass-theme.js          # Glass theme effects
│   │   │   ├── comment-hider.js        # Hide comments section
│   │   │   ├── cards-hider.js          # Hide info cards
│   │   │   └── universal-screenshot.js # Screenshot capture
│   │   │
│   │   └── ui/                   # 🎨 UI & Styling
│   │       ├── content.js        # Main content script orchestrator
│   │       └── content.css       # Content styles
│   │
│   ├── popup/                    # 🎯 Extension Popup
│   │   ├── popup.html            # Popup interface
│   │   ├── popup.js              # Popup logic & settings
│   │   ├── popup.css             # Popup styling
│   │   └── questions.js          # Quiz questions
│   │
│   ├── dashboard/                # 📊 Dashboard Page
│   │   ├── dashboard.html        # Dashboard interface
│   │   ├── dashboard.js          # Dashboard logic
│   │   └── dashboard.css         # Dashboard styling
│   │
│   └── offscreen/                # 🔊 Offscreen Document
│       ├── offscreen.html        # Offscreen page
│       └── offscreen.js          # Recording/offscreen logic
│
├── README.md                     # Main project README
├── SITE_BLOCKER_README.md        # Site blocker documentation
├── manifest.json                 # Extension manifest (symlink to src/)
├── package.json                  # npm configuration (optional)
└── .gitignore                    # Git ignore rules
```

---

## Folder Organization Rationale

### `docs/` - Documentation
- Centralized documentation
- Architecture details
- API reference
- Changelog
- Setup guides

### `public/` - Static Assets
- All icon files moved here
- Images and fonts
- Static resources
- Reduces src/ clutter

### `src/` - Source Code

#### `background/`
- Service worker (not page-specific)
- Runs continuously
- Handles timers, messages

#### `content/` - Organized by Function

**`core/`** - Foundational utilities
- Shared by all content scripts
- Storage, logging, DOM helpers
- No external dependencies

**`youtube/`** - YouTube-specific features
- Only runs on youtube.com
- Player controls, recommendations
- Grouped with `blocking/` for blocking features

**`blocking/`** - Content blocking logic
- Site blockers (all websites)
- Ad/shorts/keyword/channel/URL blocking
- CSS filtering

**`controllers/`** - Page-level control
- Home page customization
- Navigation sidebar
- Header controls

**`utils/`** - Helper utilities
- Auto-pause, theater mode
- UI utilities (metrics-hider, comment-hider)
- Features that enhance existing UI

**`ui/`** - UI & Styling
- Main content orchestrator
- Shared CSS styles
- UI components

#### `popup/` & `dashboard/` & `offscreen/`
- Self-contained UI sections
- Each has HTML, JS, CSS
- No cross-dependencies

---

## File Loading Order

### Manifest Loading (Critical)
```javascript
// 1. Core utilities (FIRST)
src/content/core/logger.js
src/content/core/storage.js
src/content/core/dom-helpers.js

// 2. Feature modules
src/content/blocking/site-blocker.js
src/content/youtube/*.js
src/content/blocking/*.js
src/content/controllers/*.js
src/content/utils/*.js

// 3. Orchestrator (LAST)
src/content/ui/content.js
```

**Why order matters:**
- Core utilities must load first (dependencies)
- Feature modules can load in any order
- Orchestrator loads last (coordinates everything)

---

## Adding New Features

### Adding a new YouTube feature:
```
1. Create: src/content/youtube/my-feature.js
2. Add to manifest (before content.js)
3. Add initialization in src/content/ui/content.js
```

### Adding a new blocking feature:
```
1. Create: src/content/blocking/my-blocker.js
2. Add to manifest (in blocking section)
3. Add initialization in src/content/ui/content.js
```

### Adding a new utility:
```
1. Create: src/content/utils/my-utility.js
2. Add to manifest (in utils section)
3. Add initialization in src/content/ui/content.js
```

---

## Import/Reference Examples

### Old Structure → New Structure
```javascript
// OLD: src/content/storage.js
// NEW: src/content/core/storage.js

// OLD: src/content/ad-blocker.js
// NEW: src/content/blocking/ad-blocker.js

// OLD: src/content/icons/icon16.png
// NEW: public/icons/icon16.png
```

### Cross-module communication
```javascript
// Accessing core utilities from anywhere
// (They load first in manifest)
const settings = await chrome.storage.local.get(null);

// Features communicate via shared storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedSites) {
    // React to changes
  }
});
```

---

## File Count by Folder

| Folder | File Count | Purpose |
|--------|-----------|---------|
| `core/` | 3 | Shared utilities |
| `youtube/` | 5 | YouTube features |
| `blocking/` | 7 | Blocking features |
| `controllers/` | 3 | Page controllers |
| `utils/` | 7 | UI utilities |
| `ui/` | 2 | UI orchestration |
| `popup/` | 4 | Extension popup |
| `dashboard/` | 3 | Analytics dashboard |
| `offscreen/` | 2 | Recording/offscreen |
| `background/` | 1 | Service worker |
| **TOTAL** | **37** | All content scripts |

---

## Migration Notes

### From Old to New Structure:
1. ✅ Icons moved to `public/icons/`
2. ✅ Core utilities in `core/` folder
3. ✅ YouTube features in `youtube/` folder
4. ✅ Blocking features in `blocking/` folder
5. ✅ Controllers in `controllers/` folder
6. ✅ Utilities in `utils/` folder
7. ✅ UI stuff in `ui/` folder

### Manifest Updated:
- ✅ Icon paths updated to `public/icons/`
- ✅ Content script paths reorganized
- ✅ Web accessible resources updated

---

## Folder Size Guidelines

- **Core**: < 100 files (foundational)
- **Feature folders**: 3-10 files each (focused)
- **Total content**: < 50 files (modular)

---

## Best Practices

1. **Keep folders focused** - Each folder has single purpose
2. **Dependencies load first** - Core before features
3. **Clear naming** - File name = functionality
4. **Document new modules** - Update this file
5. **No cross-imports between non-core** - Loose coupling
6. **Use storage API** - For inter-module communication

---

## Quick Reference

| Need | Location |
|------|----------|
| Add icon | `public/icons/` |
| Fix storage bug | `src/content/core/storage.js` |
| Add YouTube feature | `src/content/youtube/` |
| Add blocker | `src/content/blocking/` |
| Fix UI bug | `src/content/ui/` |
| Add popup feature | `src/popup/` |
| Update docs | `docs/` |

---

## See Also
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [SITE_BLOCKER_README.md](SITE_BLOCKER_README.md) - Blocker feature docs
- [API.md](API.md) - API reference
- [CHANGELOG.md](CHANGELOG.md) - Version history
