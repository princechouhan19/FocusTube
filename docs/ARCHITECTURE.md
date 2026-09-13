# Architecture & File Organization Guide

## System Architecture

```
┌─────────────────────────────────────────┐
│   Background Service Worker             │
│   (src/background/background.js)        │
│   - Manages timers                      │
│   - Handles messages from popup/content │
│   - Stores settings                     │
└─────────────────────────────────────────┘
                    ↕ messaging
    ┌───────────────────────────────────────────┐
    │         Chrome Storage API                │
    │  Shared settings & blockedSites data      │
    └───────────────────────────────────────────┘
                    ↕ read/write
    ┌──────────────────────────────────────────────────────┐
    │  Content Scripts (Run on all pages)                  │
    │  ├─ Core Layer (core/)                              │
    │  │  ├─ storage.js (storage wrapper)                │
    │  │  ├─ logger.js (debugging)                       │
    │  │  └─ dom-helpers.js (utilities)                  │
    │  │                                                   │
    │  ├─ Blocking Layer (blocking/)                     │
    │  │  ├─ site-blocker.js (all websites) ← RUNS EVERYWHERE
    │  │  ├─ ad-blocker.js (YouTube)                    │
    │  │  ├─ shorts-blocker.js (YouTube)                │
    │  │  ├─ keyword-blocker.js (YouTube)               │
    │  │  ├─ channel-blocker.js (YouTube)               │
    │  │  ├─ url-blocker.js (YouTube)                   │
    │  │  └─ css-filter.js (YouTube)                    │
    │  │                                                   │
    │  ├─ YouTube Features (youtube/)                   │
    │  │  ├─ time-blocker.js (blocking timer)           │
    │  │  ├─ autoplay-controller.js (disable autoplay)  │
    │  │  ├─ quality-controller.js (force HD)           │
    │  │  ├─ summary-button.js (AI summaries)           │
    │  │  └─ video-player-controller.js (player)        │
    │  │                                                   │
    │  ├─ Controllers (controllers/)                     │
    │  │  ├─ home-controller.js (home page)             │
    │  │  ├─ navigation-controller.js (sidebar)         │
    │  │  └─ header-controller.js (header)              │
    │  │                                                   │
    │  ├─ Utilities (utils/)                            │
    │  │  ├─ auto-pause.js (pause on inactive)          │
    │  │  ├─ theater-mode.js (theater toggle)           │
    │  │  ├─ metrics-hider.js (hide metrics)            │
    │  │  ├─ comment-hider.js (hide comments)           │
    │  │  ├─ cards-hider.js (hide cards)                │
    │  │  └─ universal-screenshot.js (screenshots)      │
    │  │                                                   │
    │  └─ UI (ui/)                                      │
    │     ├─ content.js (orchestrator)                  │
    │     └─ content.css (styles)                       │
    └──────────────────────────────────────────────────────┘
             ↑                                    ↑
             │ inject                            │ inject
             │                                   │
    ┌────────────────┐          ┌────────────────────────┐
    │  Popup UI      │          │  Dashboard Page        │
    │  (popup/)      │          │  (dashboard/)          │
    │  - Settings    │          │  - Analytics           │
    │  - Site blocks │          │  - Statistics          │
    └────────────────┘          └────────────────────────┘
```

---

## Data Flow

### 1. **User Blocks a Site**
```
User clicks "Block" in popup
         ↓
popup.js: blockSiteForDuration()
         ↓
saveSettings() → Chrome Storage (blockedSites)
         ↓
notifyContentScript() → sends message to all tabs
         ↓
site-blocker.js: receives update → renderActiveBlocks()
         ↓
If blocked: displayBlockPage()
```

### 2. **Page Load with Block Active**
```
site-blocker.js loads (document_start)
         ↓
checkIfSiteBlocked() → reads from storage
         ↓
Match found && time valid?
         ↓
YES → displayBlockPage() (replaces all content)
NO  → Page loads normally
```

### 3. **Timer Updates**
```
Blocked page displayed
         ↓
startTimerUpdate() → setInterval (1/second)
         ↓
formatRemainingTime() → updates DOM
         ↓
Time expired? → window.location.reload()
```

---

## Dependency Graph

### Core (Loaded First - no dependencies)
```
logger.js ──┐
            ├→ Everything depends on these
storage.js  ├─→ (but they don't depend on anything)
dom-helpers.js─┘
```

### Feature Modules (Depend on Core)
```
core/ ←─ youtube/
      ├─ blocking/
      ├─ controllers/
      ├─ utils/
      └─ ui/ (loads LAST - depends on features)
```

### Communication Pattern
```
popup.js ───► chrome.storage.local.set()
              ↓
         All tabs receive
         chrome.storage.onChanged event
              ↓
       site-blocker.js (reacts to change)
       ad-blocker.js (reacts to change)
       ... other modules
```

---

## Content Script Loading Sequence

### Order in Manifest = Load Order
```javascript
// 1st: Core (dependencies)
src/content/core/logger.js          // ← Needed by everything
src/content/core/storage.js         // ← Needed by everything

// 2nd: Blocking (on all sites)
src/content/blocking/site-blocker.js // ← Runs on <all_urls>
src/content/utils/universal-screenshot.js

// 3rd: YouTube features (on youtube.com only)
src/content/core/dom-helpers.js     // ← Helper for YouTube features
src/content/youtube/time-blocker.js
src/content/blocking/ad-blocker.js
... more features ...

// LAST: Orchestrator
src/content/ui/content.js           // ← Initializes everything
```

---

## Isolation & Scope

### What runs where?

| Module | <all_urls> | youtube.com | popup | dashboard |
|--------|-----------|-------------|-------|-----------|
| core/ | ✓ | ✓ | ✗ | ✗ |
| blocking/ | ✓* | ✓ | ✗ | ✗ |
| youtube/ | ✗ | ✓ | ✗ | ✗ |
| controllers/ | ✗ | ✓ | ✗ | ✗ |
| utils/ | ~ | ✓ | ✗ | ✗ |
| popup/ | ✗ | ✗ | ✓ | ✗ |
| dashboard/ | ✗ | ✗ | ✗ | ✓ |
| background/ | ✓ (always) | ✓ (always) | ✓ (always) | ✓ (always) |

**Legend:**
- ✓ = Always runs
- ✗ = Never runs
- ~ = Conditionally
- \* = Only site-blocker runs on <all_urls>

---

## Performance Considerations

### Fast Load (Critical)
- ✅ site-blocker.js is TINY (checks blockedSites early)
- ✅ Early exit if not blocked (no DOM operations)
- ✅ Batch updates (single DOM change)

### Efficient Timers
- ✅ setInterval(1000) not requestAnimationFrame loop
- ✅ Conditional DOM updates (only if changed)
- ✅ Cleanup on block expiration

### Memory Usage
- ✅ Lazy loading (features only on YouTube)
- ✅ Cleanup of event listeners
- ✅ No global memory leaks

---

## Error Handling

### Content Scripts (try-catch everywhere)
```javascript
try {
  checkIfSiteBlocked() // May fail if storage unavailable
} catch (error) {
  console.warn("Blocker init error:", error)
  // Fail gracefully - page loads normally
}
```

### Storage Operations (error checking)
```javascript
chrome.storage.local.get(['blockedSites'], (data) => {
  if (chrome.runtime.lastError) {
    console.warn("Storage error:", chrome.runtime.lastError)
    return
  }
  // Safe to use data
})
```

### Manifest (fail-safe)
```javascript
// If a feature module fails to load:
// - Other modules still load
// - Site blocker still works
// - User experience continues
```

---

## Extension Lifecycle

```
1. INSTALL
   └─ Load manifest.json
   └─ Inject icon paths
   └─ Initialize background service worker

2. FIRST PAGE LOAD
   └─ site-blocker.js runs at document_start
   └─ Check storage for blockedSites
   └─ Display block page if needed

3. USER OPENS POPUP
   └─ popup.js loads
   └─ Display settings & active blocks
   └─ Listen for user actions

4. USER BLOCKS A SITE
   └─ Save to storage
   └─ Notify all tabs
   └─ Future page loads will check storage

5. ON BLOCKED SITE
   └─ site-blocker.js runs
   └─ Checks storage (fast!)
   └─ Displays block page
   └─ Shows countdown timer

6. TIMER EXPIRES
   └─ Auto-reload page
   └─ Check storage again
   └─ Site unblocked - page loads normally
```

---

## Scalability Plan

### Adding 10 more features?
```
src/content/youtube/feature-1.js
src/content/youtube/feature-2.js
... feature-3 to feature-10 ...
└─ Add to manifest in order
└─ Each loads in ~1ms
└─ Total overhead: ~10ms
```

### Adding 20 more blockers?
```
src/content/blocking/blocker-1.js
src/content/blocking/blocker-2.js
... blockers-3 to blocker-20 ...
└─ Add to manifest
└─ Uses same storage model
└─ No performance impact
```

### Adding new page sections (popup, dashboard)?
```
src/new-page/new-page.html
src/new-page/new-page.js
src/new-page/new-page.css
└─ Completely isolated
└─ No impact on content scripts
```

---

## Module Dependencies

### Core Module (No dependencies)
```
logger.js ──┐
storage.js  ├─→ (self-contained)
dom-helpers.js─┘
```

### Blocking Module (Depends on Core)
```
site-blocker.js ─┐
ad-blocker.js    ├─→ require(storage.js, dom-helpers.js)
shorts-blocker.js├─→ (via core)
...other blockers┘
```

### YouTube Module (Depends on Core)
```
time-blocker.js ─────────────┐
autoplay-controller.js        ├─→ require(core/)
quality-controller.js         │   (storage, dom-helpers)
summary-button.js             │
video-player-controller.js ─┘
```

### Orchestrator (Depends on All)
```
content.js ───────────────────────────────────┐
                                              │
Initializes & coordinates:                   │
├─ core/         ← loads first               │
├─ blocking/                                  ├─→ require(everything)
├─ youtube/                                   │   (all modules)
├─ controllers/                               │
├─ utils/                                     │
└─ ui/                                        │
```

---

## Testing Hierarchy

### Unit Tests (per module)
```
tests/
├─ core/
│  ├─ storage.test.js
│  ├─ logger.test.js
│  └─ dom-helpers.test.js
├─ blocking/
│  ├─ site-blocker.test.js
│  └─ ad-blocker.test.js
└─ youtube/
   ├─ time-blocker.test.js
   └─ autoplay-controller.test.js
```

### Integration Tests
```
tests/
├─ integration/
│  ├─ popup-to-blocker.test.js
│  ├─ storage-sync.test.js
│  └─ timer-expiry.test.js
```

### E2E Tests
```
tests/
└─ e2e/
   ├─ block-site.test.js
   ├─ unblock-site.test.js
   └─ timer-countdown.test.js
```

---

## Troubleshooting

### New module not loading?
1. Check manifest.json (correct path?)
2. Check load order (core loaded first?)
3. Check for syntax errors
4. Check browser console for errors

### Module not running?
1. Verify conditions are met (right domain?)
2. Check `matches` in manifest
3. Look for early returns in code
4. Check DOM ready state

### Storage not updating?
1. Check storage.onChanged listener
2. Verify storage permissions
3. Check for race conditions
4. Validate data structure

---

## See Also
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - File organization
- [API.md](API.md) - Module APIs
- [CHANGELOG.md](CHANGELOG.md) - Version history
