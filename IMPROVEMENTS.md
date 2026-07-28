# FocusTube — Improvements Changelog (v1.0.0 → v1.0.1)

This document lists every change applied to the FocusTube codebase in
the v1.0.1 hardening pass. Each entry maps to one or more files.

> For the threat model and security analysis behind these changes, see
> [`SECURITY.md`](./SECURITY.md). For a deeper architectural overview,
> see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## TL;DR

| Category        | Count | Severity mix                  |
| --------------- | ----- | ----------------------------- |
| Critical bugs   | 4     | 3 high, 1 medium              |
| Security fixes  | 7     | 1 high, 5 medium, 1 low       |
| Performance     | 5     | 2 medium, 3 low               |
| Stability       | 4     | 2 medium, 2 low               |
| Code quality    | 3     | 1 medium, 2 low               |
| **Total**       | **23**|                               |

---

## 1. Critical bug fixes

### 1.1 Removed duplicate `chrome.runtime.onMessage` listener
**File:** `src/background/background.js`

The listener was registered twice in the original file (once at line
~696 and again at ~875). Every message was therefore handled twice,
producing race conditions, "sendResponse called twice" warnings, and
double work for every action. The new file has a single listener with
a complete `switch`/`case` covering all 14 message actions.

### 1.2 Removed duplicate `removeBlockedSite` function
**File:** `src/background/background.js`

Two identical function declarations existed; the second silently
overwrote the first. Now there is a single definition that also
accepts either a string domain or a `{domain}` object for backward
compatibility with older callers.

### 1.3 Added missing `getTranscript` and `aiSummarize` handlers
**File:** `src/background/background.js`

The AI Summary feature in `summary-button.js` was sending these two
messages to the background, but no case in the `switch` handled them.
The button silently failed. Both handlers are now implemented:

* `getTranscript` fetches the YouTube watch page server-side, parses
  `ytInitialPlayerResponse` for caption tracks, picks the best track
  for the requested language, fetches and parses the XML transcript.
  Transcript contents are never logged.
* `aiSummarize` routes the prompt to the correct provider endpoint
  using the user's stored API key. Keys are redacted in any log
  output via `redactForLog()`.

### 1.4 Fixed wrong parameter passed to `removeBlockedSite`
**File:** `src/background/background.js`

The `removeBlockedSite` case in the original message handler passed
`message.site` (a full site object) to a function that expected a
domain string, so unblocking never worked. The new handler accepts
either form.

---

## 2. Security fixes

### 2.1 HTML-escape all AI-generated summary content (XSS)
**File:** `src/content/youtube/summary-button.js`

`renderSummaryContent` previously interpolated `summary.title`,
`summary.mainPoints[]`, `summary.keyTakeaways[]`, `summary.topics[]`
directly into `innerHTML`. A crafted AI response could inject script.
All four fields now go through `window.FocusTubeSanitize.escapeHtml`.

### 2.2 Restrict error-message HTML to known-safe patterns
**File:** `src/content/youtube/summary-button.js`

The "missing API key" error message contains a known-safe
`<a href="https://aistudio.google.com/...">` link. The new
`escapeErrorHtml()` helper only allows our own pre-built `<a>` tags
through; everything else is escaped.

### 2.3 HTML-escape `matchedKeyword` overlays (XSS)
**File:** `src/content/blocking/keyword-blocker.js`

Both `overlayItem` and `showWatchOverlay` interpolated the matched
keyword (which comes from user-controlled `blockedKeywords[]`)
directly into `innerHTML`. Now escaped via `FocusTubeSanitize`.

### 2.4 Build `profileImage` avatar via DOM APIs (XSS)
**File:** `src/popup/popup.js`

`avatarContainer.innerHTML = \`<img src="${settings.profileImage}">\``
could inject HTML attributes if `profileImage` was tampered with in
storage. Replaced with `document.createElement('img')` and a strict
`/^https?:\/\//i` URL check.

### 2.5 Build active-blocks list via DOM APIs (XSS)
**File:** `src/popup/popup.js`

`renderActiveBlocks` previously built the block item with an
`innerHTML` template that interpolated the stored `domain`. Now uses
`createElement` + `textContent`. Also switched the remove-button
handler from index-based removal (fragile) to domain-based removal
via the background API.

### 2.6 Stop destroying `document.body.innerHTML` in blockers
**Files:** `src/content/blocking/site-blocker.js`,
`src/content/blocking/url-blocker.js`

`document.body.innerHTML = ''` destroyed every other content script's
state on the page (including our own timer intervals) and could break
the block overlay itself when a mutation observer recreated body.
Replaced with a `<style>` rule that hides other body children via
`visibility:hidden` without destroying them.

### 2.7 Tighten `web_accessible_resources`
**File:** `manifest.json`

The original manifest exposed all content script source under
`src/content/**` to any youtube.com page. Now only `public/icons/*`
and `src/icons/banner.png` are web-accessible. Content scripts are
injected by the browser, not loaded by the page, so they don't need
to be in `web_accessible_resources`.

### 2.8 Validate all incoming message payloads
**File:** `src/background/background.js`

Added `isNonEmptyString`, `isFinitePositiveNumber`, `sanitizeDomain`,
and `sanitizeBlockedSiteEntry` validators. The `addBlockedSite`,
`removeBlockedSite`, `setTempBlock`, `updateScheduleBlock`,
`recordMetric`, and `aiSummarize` handlers all validate before use.

### 2.9 Redact API keys in any log output
**File:** `src/background/background.js`

The `redactForLog()` helper replaces any `*ApiKey` field with
`[REDACTED]` before logging. Used by the `aiSummarize` error path.

### 2.10 Filter `updateSettings` to known keys only
**File:** `src/background/background.js`

`updateSettings()` now intersects the incoming object with the keys
of `DEFAULT_SETTINGS`, preventing a compromised content script from
arbitrarily polluting storage with unrelated keys.

---

## 3. Stability fixes

### 3.1 Stop re-entrant overlay recreation in time-blocker
**File:** `src/content/youtube/time-blocker.js`

The anti-tamper interval called `showBlockOverlay` again if the
overlay was missing — but if the user was actively disabling the
block, this created a tight re-entrancy loop. The interval now only
updates an existing overlay; it does not recreate it.
`checkBlockingRules()` (called every 1s) remains the single source of
truth for overlay existence.

### 3.2 Check `chrome.runtime.lastError` everywhere
**Files:** `src/popup/popup.js`, `src/content/utils/universal-screenshot.js`

Many `chrome.runtime.sendMessage` callbacks didn't check `lastError`,
producing "Unchecked runtime.lastError" warnings when the background
was asleep or the receiver didn't return a response. All callbacks
now check `lastError` first.

### 3.3 Don't return `true` from sync message handlers
**File:** `src/content/ui/content.js`

The content-script message listener returned `true` (keep channel
open) unconditionally, even for synchronous handlers. This caused
"message channel closed" warnings when no async response was coming.
Now each case returns `true` only when it actually calls `sendResponse`
asynchronously.

### 3.4 Delay blob URL revocation in offscreen recorder
**File:** `src/offscreen/offscreen.js`

`URL.revokeObjectURL(url)` was called 5s after `chrome.downloads.download`
started — but Chrome's download manager may not have finished reading
the blob by then for large recordings, causing `NET_FAILED` errors.
Revocation now waits 30s.

### 3.5 Use `recorder.mimeType` for the final blob type
**File:** `src/offscreen/offscreen.js`

The blob was hardcoded to `"video/webm;codecs=vp9,opus"` regardless of
the actual recorder mime type, which could mismatch and confuse
players. Now sourced from `recorder.mimeType`.

### 3.6 Add 1-second timeslice to `recorder.start()`
**File:** `src/offscreen/offscreen.js`

Without a timeslice, `dataavailable` only fired once on stop. If the
recorder crashed or the tab was closed mid-recording, all data was
lost. Now `recorder.start(1000)` — fires every second, so partial
recordings are recoverable.

---

## 4. Performance fixes

### 4.1 Replace whole-document MutationObserver with `yt-navigate-finish`
**File:** `src/content/ui/content.js`

The original URL-change detector used a `MutationObserver` on the
whole `document` with `subtree:true`. This fired on every DOM change
anywhere on YouTube (many times per second), then ran a string
comparison. Replaced with YouTube's native `yt-navigate-finish` event
plus a 2s `setInterval` polling fallback for non-standard navigation.

### 4.2 Removed the 10-second "maintenance" interval
**File:** `src/content/ui/content.js`

A `setInterval` polled `YFPShortsBlocker` and `YFPAdBlocker` every 10s
forever, re-applying settings that were already applied. Removed —
the storage `onChanged` listener already handles reactive updates.

### 4.3 Slow down ad-skip polling from 100ms to 250ms
**File:** `src/content/blocking/ad-blocker.js`

10 Hz polling burned CPU on pages that never show ads. 4 Hz is still
fast enough to catch a skippable ad the moment it appears, with ~60%
less CPU.

### 4.4 Floating-toolbar safety poll bails out when disabled
**File:** `src/content/utils/universal-screenshot.js`

The 3-second (now 5-second) safety interval used to call
`updateFloatingToolbar` unconditionally, which then early-returned.
Now the interval itself bails out immediately when
`floatingToolbarEnabled === false`, so it does literally nothing
instead of scheduling a no-op function call.

### 4.5 Register `event-listener-utils.js` in the manifest
**File:** `manifest.json`

The `event-listener-utils.js` helper (which provides `safeAddListener`
with automatic passive flags) existed in the original codebase but was
**not** registered in `manifest.json`'s `content_scripts`. It is now
loaded first in both the `<all_urls>` and the `youtube.com` content
script groups, so other modules can call `safeAddListener` instead of
raw `addEventListener` and get passive-scroll behavior automatically.

---

## 5. Code quality fixes

### 5.1 Stop monkey-patching the global `console`
**File:** `src/content/core/logger.js`

The original logger replaced `console.log`, `console.info`, and
`console.debug` on the global `console` object to suppress
`[YFP]`/`[FocusTube]` logs. This affected **all** scripts on the page,
including YouTube's own code and other extensions. Replaced with a
`window.FocusTubeLogger` namespace; the global `console` is no longer
modified.

### 5.2 Remove duplicate `blockedKeywords` key
**File:** `src/content/core/storage.js`

`DEFAULT_SETTINGS` declared `blockedKeywords: []` twice in the same
object literal. JavaScript kept the last one silently. Single
declaration now. Also added missing `shortcutsEnabled` and
`floatingToolbarEnabled` defaults.

### 5.3 Align provider default models across all files
**Files:** `src/popup/popup.js`, `src/content/core/storage.js`,
`src/content/youtube/summary-button.js`, `src/background/background.js`

`mistral` default model was `"mistral-small"` in some files and
`"mistral-small-latest"` in others. All four files now agree on
`"mistral-small-latest"`.

---

## 6. New files added

### 6.1 `src/content/core/sanitize-html.js`
Provides `escapeHtml`, `escapeJsString`, `sanitizeUrl`, `renderList`,
and `renderTags` helpers. Loaded at `document_start` before any
feature module that renders untrusted content. Exposed globally as
`window.FocusTubeSanitize`.

### 6.2 `SECURITY.md`
Threat model, list of fixed issues, and vulnerability reporting
policy.

### 6.3 `IMPROVEMENTS.md` (this file)
Human-readable changelog of all v1.0.1 changes.

---

## 7. Migration notes for v1.0.0 users

* **No data migration needed.** All storage keys are unchanged; only
  their handling is stricter.
* **The AI Summary button now actually works.** Click it on any
  YouTube video after adding your provider API key in the popup.
* **If you previously enabled `floatingToolbarEnabled`,** the
  floating toolbar will continue to work; it just polls less often.
* **The site blocker no longer clears the page DOM.** This means
  browser dev-tools extensions and other content scripts on blocked
  pages will keep working in the background; only the visible UI is
  hidden.
* **`localStorage.focustube_debug = "1"`** enables verbose
  `FocusTubeLogger` output for debugging.
