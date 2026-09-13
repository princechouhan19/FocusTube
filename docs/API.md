# FocusTube API Reference

## Core Module APIs

### storage.js
```javascript
// Get all settings
const settings = await chrome.storage.local.get(null);

// Save specific settings
await chrome.storage.local.set({ 
  extensionEnabled: true,
  blockedSites: [...]
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.blockedSites) {
    console.log('Blocks updated:', changes.blockedSites.newValue);
  }
});
```

### logger.js
```javascript
// Enable/disable debug logging
const DEBUG_LOGS = true; // Set in logger.js

// Debug output (only if DEBUG enabled)
debugLog('[Module]', 'Message', value);

// Console output (always)
console.log('[FocusTube]', 'Message');
console.warn('[FocusTube]', 'Warning');
console.error('[FocusTube]', 'Error');
```

### dom-helpers.js
```javascript
// Common DOM operations
const element = document.getElementById('id');
const elements = document.querySelectorAll('.class');
const parent = element.parentElement;

// Safe DOM manipulation
try {
  element.style.display = 'none';
  element.remove();
} catch (err) {
  console.warn('[FocusTube]', 'DOM error:', err);
}
```

---

## Blocking Module APIs

### site-blocker.js
```javascript
// Check if current site is blocked
const isBlocked = await checkIfSiteBlocked();

// Domain matching
const match = domainsMatch('instagram.com', 'instagram.com'); // true
const match = domainsMatch('m.instagram.com', 'instagram.com'); // true

// Extract domain
const domain = extractDomain('https://www.youtube.com/watch?v=123'); 
// Returns: 'www.youtube.com'

// Normalize domain
const normalized = normalizeDomain('https://www.example.com');
// Returns: 'example.com'

// Format remaining time
const time = formatRemainingTime(blockEndTime);
// Returns: '1h 30m' or '45m 30s' or '10s'
```

### ad-blocker.js (YouTube)
```javascript
// Ad blocking is automatic
// Listens to DOM changes and hides ads

// Ad-related settings
{
  hideBannerAds: true,      // Hide banner ads
  skipVideoAds: true        // Auto-skip ads
}
```

### shorts-blocker.js (YouTube)
```javascript
// Blocks YouTube Shorts

// Related settings
{
  hideShorts: true,         // Hide Shorts section
  hideNavShorts: true       // Hide Shorts tab
}
```

### keyword-blocker.js (YouTube)
```javascript
// Block content by keywords

// Data structure
{
  blockedKeywords: [
    'gaming',
    'sports',
    'entertainment'
  ]
}
```

### channel-blocker.js (YouTube)
```javascript
// Block specific channels

// Data structure
{
  blockedChannels: [
    'channel_id_1',
    'channel_id_2'
  ]
}
```

### url-blocker.js (YouTube)
```javascript
// Block URLs matching patterns

// Data structure
{
  blockedPatterns: [
    '/shorts/*',
    '/live/*'
  ]
}
```

### css-filter.js (YouTube)
```javascript
// Apply custom CSS filtering

// Data structure
{
  customCSSRules: [
    'selector { rule }',
    '#shorts { display: none !important; }'
  ]
}
```

---

## YouTube Module APIs

### time-blocker.js
```javascript
// Block YouTube temporarily

// Data structure in storage
{
  tempBlockUntil: 1713261600000,    // Unix timestamp
  scheduleBlockEnabled: true,
  scheduleBlockStart: '09:00',
  scheduleBlockEnd: '17:00'
}

// Functions
checkTimeBlock()      // Check if YouTube is blocked
displayTimeBlockUI()  // Show block modal
```

### autoplay-controller.js
```javascript
// Control video autoplay

// Settings
{
  disableAutoplay: true  // Disable autoplay
}

// Disable autoplay on next video
```

### quality-controller.js
```javascript
// Force video quality

// Settings
{
  forceHighestQuality: true  // Always use HD/4K
}
```

### summary-button.js (AI)
```javascript
// Add AI summary button

// Settings
{
  showSummaryButton: true,
  useTranscript: true,
  transcriptLang: 'en'
}

// AI providers
{
  aiProvider: 'gemini',     // 'gemini', 'openai', 'mistral', etc
  aiModel: 'gemini-1.5-flash',
  geminiApiKey: 'AIza...'
}
```

### video-player-controller.js
```javascript
// Control video player features

// Settings
{
  useNativePlayer: false,   // Use native player
  autoTheaterMode: false    // Auto theater mode
}
```

---

## Controller Module APIs

### home-controller.js (YouTube)
```javascript
// Customize YouTube home page

// Settings
{
  hideSuggestions: false,           // Hide video grid
  hideTrending: false,              // Hide trending
  hidePeopleAlsoWatched: false,     // Hide recommendations
  homePageRedirect: 'subscriptions' // Redirect to: 'none', 'subscriptions', 'search', 'blank'
}
```

### navigation-controller.js (YouTube)
```javascript
// Control YouTube sidebar

// Settings
{
  hideSidebar: false,       // Hide entire sidebar
  hideNavShorts: false,     // Hide Shorts
  hideNavExplore: false,    // Hide Explore
  hideNavGaming: false,     // Hide Gaming
  hideNavTrending: false    // Hide Trending
}
```

### header-controller.js (YouTube)
```javascript
// Control YouTube header

// Settings
{
  hideNotifications: false,   // Hide bell icon
  hideCreateButton: false,    // Hide upload button
  hideVoiceSearch: false,     // Hide voice search
  hideShareButtons: false     // Hide share buttons
}
```

---

## Utils Module APIs

### auto-pause.js
```javascript
// Auto-pause on inactivity

// Settings
{
  autoPauseInactive: false  // Auto-pause when inactive
}

// Tracks user activity (keyboard, mouse)
// Pauses video after N seconds without activity
```

### theater-mode.js
```javascript
// Toggle theater mode

// Settings
{
  autoTheaterMode: false  // Auto-enable theater mode
}
```

### metrics-hider.js
```javascript
// Hide video metrics (views, likes)

// Settings
{
  hideVideoMetrics: false,   // Hide views/likes/comments count
  hideVideoDuration: false   // Hide video duration
}
```

### focus-rings.js
```javascript
// Apple-Fitness-style daily activity rings (v1.15.0 USP)
// Exposes window.FGRings: compute(), readGoals(), streakFromPoints(),
// render(el, data, { size, showLegend }). Rings: Deflected (ads+Shorts+urges,
// goal 12), Focused (pomodoro minutes, goal 2h), Saved (time-saved minutes,
// goal 1h). Rendered on dashboard, popup home and the Daily Briefing.
```

### (removed) glass-theme.js / glass-theme.css
The Modern Glass Theme (YouTube glassmorphism skin) was removed in v1.15.0.
The `modernGlassTheme` setting key is no longer read or written.

### comment-hider.js
```javascript
// Hide comments section

// Settings
{
  hideComments: false  // Hide comments
}
```

### cards-hider.js
```javascript
// Hide info cards

// Settings
{
  hideInfoCards: false,   // Hide popup cards
  hideEndScreens: false,  // Hide end screen cards
  hideLiveChat: false     // Hide live chat
}
```

### universal-screenshot.js
```javascript
// Capture screenshots

// Keyboard shortcut: Ctrl+S (or Cmd+S on Mac)
// Function
captureScreenshot()  // Capture current page

// Message
chrome.runtime.sendMessage({ 
  action: 'captureScreenshot' 
})
```

---

## Popup Module APIs

### popup.js
```javascript
// Load settings
const settings = await loadSettings();

// Save settings
await saveSettings(settings);

// Block site
await blockSiteForDuration(
  'instagram.com',
  30,              // minutes
  'Study time'     // reason
);

// Render active blocks
await renderActiveBlocks();

// UI Feedback
showFeedback('buttonId', 'Success message!');
```

### popup.html
```html
<!-- Main sections -->
<div id="home-view">...</div>
<div id="settings-view">...</div>
<div id="profile-view">...</div>

<!-- Key elements -->
<input id="site-to-block" /> <!-- Domain input -->
<input id="block-reason" />  <!-- Reason input -->
<div id="active-blocks-list" /> <!-- Active blocks -->
```

---

## Background Module APIs

### background.js
```javascript
// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setTempBlock') {
    // Handle temp block
    sendResponse({ success: true });
  }
});

// Alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'blockTimer') {
    // Block timer expired
  }
});

// Tab listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Tab loaded - check if blocked
  }
});

// Storage listener
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.blockedSites) {
    // Notify all tabs
  }
});
```

---

## Data Structures

### Settings Object
```javascript
{
  // Master control
  extensionEnabled: true,
  
  // Blocking
  tempBlockUntil: 0,
  scheduleBlockEnabled: false,
  scheduleBlockStart: '09:00',
  scheduleBlockEnd: '17:00',
  blockedSites: [
    {
      domain: 'instagram.com',
      blockUntil: 1713261600000,
      reason: 'Study time'
    }
  ],
  
  // UI
  showSummaryButton: true,
  hideShorts: true,
  hideBannerAds: true,
  skipVideoAds: true,
  
  // Profile
  profileName: 'John Doe',
  profileGoal: 'Stay focused',
  
  // AI
  aiProvider: 'gemini',
  aiModel: 'gemini-1.5-flash',
  geminiApiKey: 'AIza...',
  
  // Stats
  statsTimeSaved: 120,
  statsAdsBlocked: 45
}
```

### Block Entry
```javascript
{
  domain: 'instagram.com',        // Domain name
  blockUntil: 1713261600000,      // Unix timestamp (ms)
  reason: 'Exam time'             // Optional reason
}
```

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `STORAGE_ACCESS_ERROR` | Can't access storage | Check permissions |
| `INVALID_DOMAIN` | Domain format invalid | Check domain format |
| `BLOCK_EXPIRED` | Block time expired | Auto-handled |
| `DOM_NOT_READY` | DOM not loaded yet | Retry on next tick |
| `INVALID_TIMESTAMP` | Bad timestamp | Use Date.now() |

---

## Common Patterns

### Adding a new setting
```javascript
// 1. Add to DEFAULT_SETTINGS in storage.js
DEFAULT_SETTINGS = {
  myNewSetting: false,
  ...
}

// 2. Use in content script
const settings = await chrome.storage.local.get(null);
if (settings.myNewSetting) {
  // Feature logic
}

// 3. Add UI in popup.js
const toggle = document.getElementById('myNewSetting');
toggle.addEventListener('change', async (e) => {
  await saveSettings({ myNewSetting: e.target.checked });
});
```

### Listening for changes
```javascript
// Listen for storage changes (works in any script)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.myNewSetting) {
      console.log('Setting changed to:', changes.myNewSetting.newValue);
    }
  }
});
```

### Cross-script communication
```javascript
// Send message from popup
chrome.runtime.sendMessage({ 
  action: 'myAction', 
  data: { /* ... */ } 
});

// Receive in content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'myAction') {
    console.log('Received:', message.data);
    setResponse({ success: true });
  }
});
```

---

## Performance Tips

1. **Check early** - Exit immediately if not applicable
2. **Batch updates** - Update DOM once, not in loop
3. **Use IDs** - `getElementById` faster than `querySelectorAll`
4. **Debounce** - Delay rapid function calls
5. **Lazy load** - Only run when needed
6. **Cache** - Store frequently accessed data

---

## See Also
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - File organization
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [CHANGELOG.md](CHANGELOG.md) - Version history
