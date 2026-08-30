# FocusTube - Quick Start Guide for Developers

## Welcome! 👋

This guide helps you get up and running with FocusTube quickly.

---

## First Time Setup (5 minutes)

### 1. **Understand the Structure** (2 min)
Read [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for folder organization.

```
src/content/
├─ core/        ← Core utilities (shared by everything)
├─ youtube/     ← YouTube-specific features
├─ blocking/    ← Site/ad blocking features
├─ controllers/ ← Page controllers
├─ utils/       ← UI utilities
└─ ui/          ← Main orchestrator
```

### 2. **Load Extension** (3 min)
```
1. Open: chrome://extensions/
2. Turn ON: Developer Mode (top right)
3. Click: "Load unpacked"
4. Select: FocusTube folder
5. Done! Extension is loaded
```

### 3. **Test It** (1 min)
- Go to YouTube
- Check if Shorts are hidden
- Try blocking Instagram in popup

---

## Common Tasks

### Adding a YouTube Feature
```
1. Create file: src/content/youtube/my-feature.js
2. Add logic
3. Update manifest.json (add to youtube match pattern)
4. Reload extension (Chrome://extensions)
5. Test on YouTube
```

### Adding a Site Blocker
```
1. Logic is in: src/content/blocking/site-blocker.js
2. It runs on ALL websites (match: <all_urls>)
3. Uses storage to get blockedSites list
4. Already works! Just test it
```

### Fixing a Bug
```
1. Find the file (use docs/API.md or folder structure)
2. Check browser console for errors:
   - Right-click on page
   - Select "Inspect" or "Inspect element"
   - Go to "Console" tab
3. Fix the error
4. Reload extension
5. Test
```

### Debugging
```
1. Open extension popup
2. Right-click → "Inspect"
3. Check Console for errors
4. Look at Storage tab to see saved data
```

---

## File Organization Cheat Sheet

| Need to fix... | Look in... | File |
|---|---|---|
| Ad blocking | blocking | `src/content/blocking/ad-blocker.js` |
| Site blocking | blocking | `src/content/blocking/site-blocker.js` |
| Core logic | core | `src/content/core/` |
| Popup UI | popup | `src/popup/popup.js` |
| Storage | core | `src/content/core/storage.js` |
| YouTube features | youtube | `src/content/youtube/` |

---

## Testing the Site Blocker

The site blocker is already built-in! Here's how to test it:

### Test 1: Block Instagram for 5 minutes
```
1. Go to Instagram.com (or any site)
2. Click FocusTube extension icon
3. Click "🌐 Block Any Website"
4. Type: "instagram.com"
5. Select "5 min"
6. Go back to Instagram
7. You should see a beautiful block page!
```

### Test 2: Check Active Blocks
```
1. Open FocusTube popup
2. See "Active Blocks" section
3. Should show countdown timer
4. Click ❌ to unblock immediately
```

### Test 3: Block by Subdomain
```
1. Block: "reddit.com"
2. Try: "old.reddit.com" ← Also blocked!
3. Try: "m.reddit.com" ← Also blocked!
Smart matching works!
```

---

## Useful Files to Know

### Always Start Here
- `docs/PROJECT_STRUCTURE.md` - What files do what
- `docs/ARCHITECTURE.md` - How it all connects
- `docs/API.md` - All available functions

### Main Logic
- `src/content/blocking/site-blocker.js` - Universal site blocking
- `src/content/ui/content.js` - Initializes everything
- `src/popup/popup.js` - Popup interface

### Data Storage
- `src/content/core/storage.js` - Where data lives

### Manifest
- `manifest.json` - Extension configuration

---

## Common Errors & Fixes

| Error | Solution |
|-------|----------|
| Extension not loading | Clear cache: `Ctrl+Shift+Delete` |
| Feature not working | Check console for errors |
| Storage not updating | Reload tab after change |
| Domain not blocking | Check domain spelling |
| Block page not showing | Check browser console |

---

## Console Debugging

### View Debug Logs
```javascript
// Enable in logger.js:
const DEBUG_LOGS = true;

// Then you'll see:
[FocusTube] [Module] Debug message
```

### Check Storage
```javascript
// In DevTools console:
chrome.storage.local.get(null, (data) => {
  console.log('All storage:', data);
});
```

### Manual Tests
```javascript
// Test domain matching:
const match = normalizeDomain('https://www.instagram.com');
console.log(match); // Should output: 'instagram.com'
```

---

## Important Concepts

### Content Scripts
- Run on web pages (not in extension context)
- Can access: DOM, localStorage, sessionStorage
- Cannot directly access: chrome.storage
- Must use messages to communicate

### Background Script
- Runs always (when extension is loaded)
- Can access: chrome.storage, chrome.tabs
- Handles: timers, messages, cross-script communication

### Storage API
- Persists data across browser sessions
- Changed data triggers `onChanged` listeners
- Used for settings, blockedSites, stats

### Manifest V3
- No content scripts in manifest can have `eval()`
- Scripts load in order (care about dependencies!)
- Security-focused (can't load inline scripts)

---

## Next Steps

### Want to Contribute?
1. Read [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)
2. Find a feature to work on
3. Create new file in appropriate folder
4. Update manifest.json
5. Test thoroughly
6. Keep docs updated

### Want to Add a Feature?
1. Pick the right folder for your code
2. Create the file
3. Add to manifest
4. Update docs
5. Test

### Want to Fix a Bug?
1. Find the bug in browser console
2. Locate relevant file (use docs/API.md)
3. Fix it
4. Reload extension
5. Verify it works

---

## File Templates

### Adding a YouTube Feature
```javascript
// src/content/youtube/my-feature.js

(function() {
  console.log('[FocusTube] My Feature loaded');
  
  // Check if feature should run
  if (document.location.hostname !== 'www.youtube.com') {
    return;
  }
  
  // Get settings
  chrome.storage.local.get(null, (settings) => {
    if (settings.myFeature) {
      // Feature logic
      console.log('[FocusTube] My Feature is active');
    }
  });
})();
```

### Adding a Utility Function
```javascript
// src/content/utils/my-utility.js

// Export as global (for other scripts to use)
window.myUtilityFunction = function() {
  console.log('[FocusTube] My utility running');
  // Logic here
};
```

---

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

---

## Questions?

1. Check `docs/` folder (probably answered there!)
2. Look at similar existing code
3. Check browser console for errors
4. Review the relevant API docs

---

## Pro Tips ⚡

1. **Always reload** extension after code changes
2. **Use the console** to debug
3. **Check manifest** for script loading order
4. **Update docs** when adding features
5. **Test subdomains** for blocking rules
6. **Keep modules small** - do one thing well
7. **Comment your code** - explain why, not what
8. **Follow the structure** - don't create random folders

---

Happy coding! 🚀

Last updated: 2026-04-16
