# 🔒 FocusTube - Enhanced Site Blocker

## Overview
FocusTube has been enhanced with a powerful universal site-blocking feature that works on **all websites**, not just YouTube. This allows you to maintain focus during study sessions, exams, or work periods by temporarily blocking access to distracting sites.

---

## ✨ Key Features

### 1. **Universal Site Blocking**
- Block **ANY website** for a specified duration
- Works across all sites (Instagram, Reddit, TikTok, YouTube, etc.)
- Customizable time periods (30 minutes to weeks)
- Add reasons/context to your blocks (e.g., "Exam Time", "Study Session")

### 2. **Smart Domain Matching**
- Handles subdomains automatically
- Normalizes domains (removes `www.`, `https://`, etc.)
- Case-insensitive matching
- Prevents domain spoofing

### 3. **Active Blocks Management**
- Real-time countdown timers
- View all currently active blocks
- Remove blocks early if needed
- One-click access to block controls

### 4. **Performance Optimizations**
- Efficient timer updates (1 per second, not every frame)
- Minimal DOM reflows
- Batch updates to prevent jank
- Early exit checks for non-blocked sites
- Cleanup of event listeners

### 5. **Beautiful Block Page**
- Smooth animations (0.3s slide-in)
- Gradient background (purple theme)
- Live countdown display
- Motivational message
- No way to bypass (page replaces entire content)

---

## 📱 How to Use

### Quick Blocking (30 min, 1 hour, 3 hours)
1. Open FocusTube popup
2. Enter website domain (e.g., `instagram.com`, `reddit.com`)
3. Optionally add reason (e.g., "Exam time")
4. Click quick block button

### Custom Duration
1. Enter domain and reason
2. Click **Custom** button
3. Enter minutes (max 9,999,999)
4. Click **Block** to activate

### Remove a Block
1. See active blocks list below the block controls
2. Click **✕** next to the blocked site
3. Site is immediately unblocked

---

## 🏗️ Architecture

### Components

#### 1. **site-blocker.js** (Content Script)
- Runs on all websites (injected at `document_start`)
- Checks if site is blocked
- Displays beautiful block page if blocked
- Real-time timer updates
- Efficient storage checks

**Key Functions:**
- `checkIfSiteBlocked()` - Validates if current site is blocked
- `displayBlockPage()` - Shows stunning block UI
- `domainsMatch()` - Smart domain comparison
- `formatRemainingTime()` - Timer formatting
- `startTimerUpdate()` - Efficient timer management

#### 2. **popup.js** (Popup UI)
- Site blocking UI controls
- Active blocks list management
- Block creation and deletion
- Real-time block updates

**Key Functions:**
- `blockSiteForDuration()` - Create new block
- `renderActiveBlocks()` - Display active blocks
- `addSiteBlockingListeners()` - Setup UI interactions

#### 3. **Storage** (Chrome Local Storage)
```javascript
{
  blockedSites: [
    {
      domain: "instagram.com",
      blockUntil: 1713261600000,  // Timestamp
      reason: "Exam time"
    }
  ]
}
```

---

## 🔧 Technical Improvements

### Performance
- ✅ Uses `setInterval` only (1/second), not `requestAnimationFrame` loop
- ✅ Prevents forced reflows with batch DOM updates
- ✅ Early exit checks for non-blocked sites
- ✅ No continuous setTimeout loops

### Error Handling
- ✅ Try-catch blocks for storage operations
- ✅ Chrome runtime error checks
- ✅ Validation of all input data
- ✅ Graceful fallbacks

### Reliability
- ✅ Prevents multiple overlay instances
- ✅ Validates block entries before processing
- ✅ Handles corrupted storage gracefully
- ✅ Safe domain normalization
- ✅ Runs only in top-level frame (not iframes)

### UX Enhancements
- ✅ Visual feedback on all actions
- ✅ Helpful error messages
- ✅ Keyboard shortcuts (Enter key support)
- ✅ Hover effects on interactive elements
- ✅ Real-time countdown updates

---

## 📊 Storage Structure

### Blocked Sites Array
```javascript
blockedSites: [
  {
    domain: string,           // "instagram.com" (normalized)
    blockUntil: number,       // Unix timestamp in milliseconds
    reason: string            // "Exam time" (user-provided)
  }
]
```

**Validation:**
- `domain` must be non-empty string
- `blockUntil` must be valid timestamp > current time
- `reason` defaults to domain if not provided

---

## 🎯 Use Cases

### Study Sessions
```
Block sites: instagram.com, reddit.com, tiktok.com
Duration: 3 hours
Reason: "Study time"
```

### Exam Period
```
Block sites: facebook.com, youtube.com, twitter.com
Duration: Custom (e.g., 5 hours)
Reason: "Exam time"
```

### Deep Work Focus
```
Block sites: news.ycombinator.com, producthunt.com
Duration: 2 hours
Reason: "Deep work"
```

---

## 🐛 Known Issues & Solutions

### Issue: "Failed to load resource: 403"
**Cause:** YouTube video servers, not extension
**Solution:** Not related to site blocker feature

### Issue: "LegacyDataMixin will be applied"
**Cause:** Browser's internal warning, not extension
**Solution:** Can be safely ignored

### Issue: CORS errors with ads
**Cause:** Google's CORS policy, not extension
**Solution:** Happens with/without extension

---

## 🚀 Future Enhancements

- [ ] Schedule blocks for specific days/times
- [ ] Whitelist specific URLs within blocked domain
- [ ] Block categories (social media, news, etc.)
- [ ] Password-protected unblock
- [ ] Statistics on blocked time
- [ ] Browser sync across devices
- [ ] Import/export block lists

---

## 📝 Debug Tips

Enable debug logging in `site-blocker.js`:
```javascript
const DEBUG = true; // Set to true in site-blocker.js
```

View console logs with:
- `chrome://extensions/` → Open DevTools for extension
- Check tab console for content script logs

---

## 📄 File Changes Summary

### New Files
- `src/content/site-blocker.js` - Universal blocking engine

### Modified Files
- `manifest.json` - Added site-blocker content script
- `src/content/storage.js` - Added `blockedSites` to defaults
- `src/popup/popup.js` - Added site blocking UI handlers
- `src/popup/popup.html` - Added "Block Any Website" panel
- `src/background/background.js` - Added `blockedSites` to defaults

---

## 💡 Tips & Tricks

1. **Quick unblock:** Remove early if you really need to (no bypass needed)
2. **Multiple blocks:** You can block different sites at different times
3. **Empty reason:** Defaults to domain name if not provided
4. **Subdomain matching:** `reddit.com` also blocks `old.reddit.com`, `m.reddit.com`
5. **Case insensitive:** `Instagram.com`, `REDDIT.COM` all work

---

## 🤝 Contributing

Found a bug or have a suggestion? Feel free to report it!

---

## 📜 License

FocusTube - Productivity & Distraction Control

Made with ❤️ to help you stay focused.
