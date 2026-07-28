# FocusTube — Security Policy & Hardening Notes

This document describes the security posture of the FocusTube extension,
the fixes that were applied in v1.0.1, and the disclosure process for any
future vulnerabilities.

---

## 1. Threat Model

FocusTube runs as a Manifest V3 Chrome extension with the following
capabilities:

| Permission        | Why it's needed                                            |
| ----------------- | ---------------------------------------------------------- |
| `storage`         | Persisting user settings, blocked-site list, analytics     |
| `tabs`            | Notifying YouTube tabs of setting changes                  |
| `scripting`       | (Reserved) programmatic script injection                   |
| `downloads`       | Saving screenshots and screen recordings                   |
| `activeTab`       | Capturing the visible tab for screenshots                  |
| `tabCapture`      | Recording tab audio+video via offscreen document           |
| `offscreen`       | Hosting the MediaRecorder in an offscreen document         |
| `<all_urls>` host | Site blocker must run on every site the user visits        |

The extension **does not** request: `cookies`, `webRequest`,
`webRequestBlocking`, `history`, `bookmarks`, `management`, `idle`,
`identity`, `nativeMessaging`. There is no native messaging host.

### Trust boundaries

1. **User input** → settings UI → `chrome.storage.local`. All values are
   validated before being merged into `DEFAULT_SETTINGS` (see
   `updateSettings()` in `background.js`).
2. **Content scripts** → `chrome.runtime.sendMessage` → background
   service worker. Messages are validated; unknown actions return
   `{success:false, error:"Unknown action"}`.
3. **AI providers** (Gemini / OpenAI / Mistral / DeepSeek / Grok) are
   called **directly** from the background service worker using the
   user's own API key. No proxy, no telemetry, no third party.
4. **YouTube DOM** is treated as untrusted. Any text scraped from the
   page (channel name, video title, description) is HTML-escaped before
   being inserted into our UI.
5. **AI responses** are treated as untrusted. A malicious or
   hallucinating model could return `<script>` tags; we escape all AI
   content via `window.FocusTubeSanitize.escapeHtml` before rendering.

---

## 2. Issues fixed in v1.0.1

### 2.1 XSS via AI summary content — **HIGH**

**Where:** `src/content/youtube/summary-button.js`
(`renderSummaryContent`, `showSummaryModal`)

**Before:** AI-returned strings (`title`, `mainPoints[]`,
`keyTakeaways[]`, `topics[]`, `error`) were interpolated directly into
`innerHTML`. A crafted AI response (e.g. a prompt-injected video
description) could execute arbitrary script in the YouTube page context.

**After:** All AI content is HTML-escaped via
`window.FocusTubeSanitize.escapeHtml` before insertion. The error
message field is additionally restricted — only our own pre-built
`<a href="https://...">` link is allowed through; everything else is
escaped.

### 2.2 XSS via stored `blockedSites` domain — **MEDIUM**

**Where:** `src/popup/popup.js` (`renderActiveBlocks`)

**Before:** `info.innerHTML = \`<strong>${domainName}</strong>...\``
used a stored domain value directly.

**After:** Uses `document.createElement` + `textContent`.

### 2.3 XSS via stored `profileImage` — **MEDIUM**

**Where:** `src/popup/popup.js` (`populateProfile`)

**Before:** `avatarContainer.innerHTML = \`<img src="${settings.profileImage}">\``
could inject arbitrary HTML if `profileImage` was tampered with in
storage (e.g. `" onerror="alert(1)"`).

**After:** Builds the `<img>` via DOM APIs and only accepts `http(s)`
URLs.

### 2.4 XSS via `matchedKeyword` overlay — **MEDIUM**

**Where:** `src/content/blocking/keyword-blocker.js`
(`overlayItem`, `showWatchOverlay`)

**Before:** `label.innerHTML = \`...${matchedKeyword}...\`` — keyword
comes from user-controlled `blockedKeywords[]`.

**After:** Escaped via `FocusTubeSanitize.escapeHtml`.

### 2.5 DOM destruction in site blocker — **STABILITY / HIGH**

**Where:** `src/content/blocking/site-blocker.js`,
`src/content/blocking/url-blocker.js`

**Before:** `document.body.innerHTML = ''` wiped the entire page,
destroying all other content scripts' state and sometimes breaking the
block overlay itself when a mutation observer recreated body.

**After:** Uses a `<style>` rule (`body > *:not(#focus-site-block-overlay)
{ visibility: hidden }`) to hide underlying content without destroying
the DOM tree.

### 2.6 Duplicate `chrome.runtime.onMessage` listener — **BUG / HIGH**

**Where:** `src/background/background.js`

**Before:** The listener was registered **twice** (lines ~696 and ~875
in the original file). Every message was handled twice → race
conditions, "sendResponse called twice" errors, and double work for
every action.

**After:** Single listener with a clean `switch`/`case` covering all
actions, including the previously missing `getTranscript` and
`aiSummarize` handlers that the AI Summary feature depends on.

### 2.7 Duplicate `removeBlockedSite` function — **BUG / LOW**

**Where:** `src/background/background.js`

**Before:** Two identical function declarations; the second silently
overwrote the first.

**After:** Single definition. Also accepts both a string domain and a
`{domain}` object for backward compatibility with older callers, and
properly sanitizes the input.

### 2.8 Missing `getTranscript` and `aiSummarize` handlers — **BUG / HIGH**

**Where:** `src/background/background.js`

**Before:** `summary-button.js` sent
`chrome.runtime.sendMessage({action:"getTranscript", ...})` and
`{action:"aiSummarize", ...}` to the background, but no case in the
`switch` handled them. The AI Summary button silently failed.

**After:** Both handlers are implemented:

* `getTranscript`: fetches the YouTube watch page server-side (avoiding
  CORS), parses `ytInitialPlayerResponse` for caption tracks, picks the
  best track for the requested language, fetches and parses the XML
  transcript.
* `aiSummarize`: routes the prompt to the correct provider endpoint
  (Gemini `generateContent`, OpenAI/Mistral/DeepSeek/Grok
  `chat/completions`) using the user's stored API key. Keys are
  redacted in any log output.

### 2.9 Global `console.log` monkey-patching — **STABILITY / MEDIUM**

**Where:** `src/content/core/logger.js`

**Before:** Patched `console.log`, `console.info`, `console.debug`
globally to suppress `[YFP]` and `[FocusTube]` logs. This affected
**all** scripts on the page, including YouTube's own code and other
extensions, which is unsafe and hard to debug.

**After:** Exposes a `window.FocusTubeLogger` namespace. The global
`console` object is no longer modified. Existing `console.log` calls
in content scripts still work; they just aren't suppressed by default
(set `localStorage.focustube_debug = "1"` to enable verbose mode).

### 2.10 Overly broad `web_accessible_resources` — **INFOSEC / MEDIUM**

**Where:** `manifest.json`

**Before:** All content script source files under `src/content/**`
were exposed to any youtube.com page. This is unnecessary — pages only
need the icon and banner assets — and it makes fingerprinting and
source disclosure easier for attackers.

**After:** Only `public/icons/*` and `src/icons/banner.png` are web-
accessible. Content scripts themselves don't need to be in
`web_accessible_resources` because they're injected by the browser,
not loaded by the page.

### 2.11 Missing input validation on `addBlockedSite` — **MEDIUM**

**Where:** `src/background/background.js`

**Before:** Any object sent as `message.site` was pushed into the
`blockedSites` array as-is.

**After:** `sanitizeBlockedSiteEntry()` validates and coerces:

* `domain`: trimmed, lowercased, stripped of scheme/www, max 253 chars
* `blockUntil`: must be a finite positive number
* `reason`: max 500 chars, falls back to domain if empty

### 2.12 `chrome.runtime.lastError` unchecked — **STABILITY / LOW**

**Where:** `src/popup/popup.js`, `src/content/utils/universal-screenshot.js`

**Before:** Many `chrome.runtime.sendMessage` callbacks didn't check
`lastError`, producing "Unchecked runtime.lastError" warnings when the
background was asleep or the receiver didn't return a response.

**After:** All callbacks check `chrome.runtime.lastError` first.

### 2.13 Re-entrant overlay recreation in time-blocker — **BUG / MEDIUM**

**Where:** `src/content/youtube/time-blocker.js`

**Before:** The anti-tamper interval called `showBlockOverlay` again
if the overlay was missing — but if the user was actively disabling
the block, this created a tight re-entrancy loop.

**After:** The interval only updates an existing overlay; it does not
recreate it. `checkBlockingRules()` (called every 1s) is the single
source of truth for whether the overlay should exist.

### 2.14 Aggressive `MutationObserver` on whole document — **PERF / MEDIUM**

**Where:** `src/content/ui/content.js`

**Before:** A `MutationObserver` watched the entire `document` with
`subtree:true` to detect SPA URL changes. This fires on every DOM
change anywhere on YouTube, which is many times per second.

**After:** Uses YouTube's own `yt-navigate-finish` event as the
primary signal, with a 2-second `setInterval` polling fallback for
non-standard navigation. The `MutationObserver` is removed.

### 2.15 Ad-skip interval at 100ms — **PERF / LOW**

**Where:** `src/content/blocking/ad-blocker.js`

**Before:** Polled every 100ms (10 Hz) for ad-skip button visibility,
even on pages that never show ads.

**After:** Polls every 250ms (4 Hz) — still smooth enough to catch a
skippable ad the moment it appears, with ~60% less CPU.

### 2.16 Floating-toolbar safety poll at 3s, always running — **PERF / LOW**

**Where:** `src/content/utils/universal-screenshot.js`

**Before:** `setInterval(updateFloatingToolbar, 3000)` ran forever on
every page, even when the toolbar was disabled.

**After:** The interval bails out immediately when
`floatingToolbarEnabled === false`. The period was also relaxed to 5s.

### 2.17 Recording blob revocation race — **STABILITY / LOW**

**Where:** `src/offscreen/offscreen.js`

**Before:** `URL.revokeObjectURL(url)` was called 5 seconds after
`chrome.downloads.download` started — but Chrome's download manager
may not have finished reading the blob by then for large recordings,
causing `NET_FAILED` download errors.

**After:** Revocation delayed to 30 seconds. The blob's `type` is also
sourced from the actual `recorder.mimeType` rather than hardcoded,
preventing codec mismatches.

### 2.18 Recorder without timeslice — **STABILITY / LOW**

**Where:** `src/offscreen/offscreen.js`

**Before:** `recorder.start()` was called with no timeslice, so
`dataavailable` only fired once on stop. If the recorder crashed or
the tab was closed mid-recording, all data was lost.

**After:** `recorder.start(1000)` — fires `dataavailable` every
second, so partial recordings are recoverable.

### 2.19 Duplicate `blockedKeywords` key in DEFAULT_SETTINGS — **BUG / LOW**

**Where:** `src/content/core/storage.js`

**Before:** `blockedKeywords: []` was declared twice in the same
object literal. JavaScript silently kept the last one.

**After:** Single declaration. Also added missing
`shortcutsEnabled` and `floatingToolbarEnabled` defaults so they don't
fall back to `undefined` on first install.

### 2.20 Inconsistent default model strings — **BUG / LOW**

**Where:** `popup.js`, `storage.js`, `summary-button.js`,
`background.js`

**Before:** `mistral: "mistral-small"` in some files,
`"mistral-small-latest"` in others. Switching providers could pick a
non-existent model.

**After:** All four files now agree on `"mistral-small-latest"`.

---

## 3. Remaining known limitations

These are by design or out of scope for this hardening pass:

1. **`<all_urls>` host permission** is required because the site
   blocker must run on every site. Future versions could move the
   site blocker into a `declarativeNetRequest` ruleset, which doesn't
   require host permissions.
2. **API keys are stored in `chrome.storage.local`**. This is the
   standard pattern for MV3 extensions and is isolated per-user-per-
   profile, but it is **not** encrypted at rest. Users on shared
   machines should be aware.
3. **YouTube DOM scraping is brittle.** The transcript extractor
   parses `ytInitialPlayerResponse` out of the watch-page HTML. If
   YouTube changes their page structure, the AI Summary feature will
   fail gracefully (returns `{success:false, error:"No captions
   available"}`) but will not crash.
4. **No Content-Security-Policy override** in `manifest.json`. MV3's
   default CSP (`script-src 'self'; object-src 'self'`) is already
   strict; we don't relax it. Inline scripts are not used in any of
   the extension's HTML files.

---

## 4. Reporting a vulnerability

If you find a security issue, please **do not** open a public GitHub
issue. Email the maintainer with:

* A clear description of the issue
* The affected file(s) and line numbers
* A minimal proof of concept
* Suggested fix (optional)

We will acknowledge within 48 hours and aim to ship a fix within 14
days for high-severity issues.
