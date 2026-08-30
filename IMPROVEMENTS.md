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

---

# v1.1.0 — New Features

---

# v1.8.4 — Local-First Data Sync

FocusTube now treats the JSON file as an optional sync destination, never as
the source required for collecting data. Activity, limits, profile metadata,
and productivity settings are first written to `chrome.storage.local`. When a
data file is unavailable, changes are marked pending; reconnecting a file
performs a read → merge → write immediately.

The portable payload now includes profile display metadata, blocked topics
(`blockedKeywords`), blocked channels/patterns, Smart Lists, Pomodoro and
productivity settings, usage/metric history, and site-logo URLs. API keys,
passwords, email, browser/session state, file handles, and runtime timer state
remain local. Per-section timestamps choose the newest settings while block
rules use last-write-wins so deletions sync correctly.

The time tracker also restores the active tab whenever Chrome wakes the MV3
service worker, avoiding missed usage until the next navigation.

---

Released on top of v1.0.1. Six new productivity features, all opt-in by
default. No changes to existing storage keys, so v1.0.1 users can upgrade
in place without data migration.

## 1. Pomodoro Timer

**Files:** `src/background/background.js` (engine), `src/popup/popup.html`
(UI), `src/popup/popup.js` (UI wiring), `src/content/core/storage.js`
(defaults).

- 25/5/15 cycle structure, configurable via `pomodoroFocusMinutes`,
  `pomodoroShortBreakMinutes`, `pomodoroLongBreakMinutes`,
  `pomodoroCyclesBeforeLongBreak`.
- **Deep Work mode** (`pomodoroDeepWork`): when entering a focus phase,
  temporarily adds the `social` category to `smartListsEnabled`. On
  break or stop, restores the previous Smart Lists state. This means
  social sites are blocked only during focus, not during breaks.
- **Notifications** via `chrome.notifications.create` (new
  `notifications` permission added to the manifest).
- **State persistence**: the full cycle state (`phase`, `cycle`,
  `endsAt`, `pausedRemaining`) is saved to `chrome.storage.local` on
  every transition, so a service-worker restart (Chrome kills SWs
  after 30s of inactivity) doesn't lose the active session. On SW
  wake, `loadPomodoroState()` restores the timer.
- **Auto-start** options for breaks and focus phases.
- Records a `pomodoroCompleted` metric on every natural focus-phase
  completion (not on skip).

**New message actions:** `pomodoroStart`, `pomodoroPause`,
`pomodoroSkip`, `pomodoroStop`, `pomodoroStatus`.

## 2. Smart Lists

**Files:** `src/content/blocking/smart-lists.js` (new),
`src/content/blocking/site-blocker.js` (integration),
`src/popup/popup.html` (UI), `src/popup/popup.js` (UI wiring).

- Seven prebuilt categories: Social, Shopping, Gaming, News,
  Messaging, Streaming, Adult. Each has 10-15 curated domains.
- **O(1) blocked check**: builds an in-memory `Set<string>` of
  currently-enabled domains on init and on every storage change. The
  site-blocker calls `FocusTubeSmartLists.isDomainBlocked(url)` before
  the per-site storage lookup, so category blocks add zero latency.
- **Suffix-based matching**: `old.reddit.com` matches `reddit.com`,
  walking up the domain tree. Strips `www.` first.
- **Permanent blocks**: Smart List blocks use
  `Number.MAX_SAFE_INTEGER` as the end time. The site-blocker's
  `formatRemainingTime()` renders this as "until disabled" instead of
  a huge number, and the timer's reload-on-expiry path is skipped for
  permanent blocks.
- **Live toggle**: when a category is toggled off, currently-blocked
  pages auto-reload via the `storage.onChanged` listener in
  `site-blocker.js`. No manual refresh needed.
- Stored as `smartListsEnabled: string[]` in `chrome.storage.local`.

## 3. Dashboard v2

**Files:** `src/dashboard/dashboard.html`, `src/dashboard/dashboard.js`,
`src/dashboard/dashboard.css`.

Three new widgets on top of the existing day/week/month metrics:

### 3.1 Focus Score (0-100)

A conic-gradient ring that fills based on a composite score:

```
positive = shortsSkipped + adsBlocked + summariesGenerated +
           willpowerPoints + pomodoroCompleted * 3 +
           timeSavedMinutes * 0.5
negative = quitsEarly * 2
raw      = positive - negative
score    = clamp(0, 100, 40 + raw * 1.5)
```

The baseline of 40 means a brand-new user with no activity is at
40/100, not 0 — the bar for "improving" starts from "did anything at
all". Color shifts green/amber/red at 75/50/0.

### 3.2 GitHub-style Heatmap

A 30-cell grid (one per day for the last month). Each cell's intensity
(0-4) is based on the day's total positive activity, normalized
against the busiest day in the range. Hover shows the date and action
count.

### 3.3 Streak Counter

Walks the month's daily points backwards from today, counting
consecutive days with at least one positive action (shorts skipped,
ad blocked, summary generated, willpower point, or pomodoro
completed).

### 3.4 New lifetime metrics

Willpower points and Pomodoro completions are now shown both in the
Focus Score panel and in the Lifetime totals list.

## 4. AI Nudge System

**Files:** `src/content/utils/ai-nudge.js` (new),
`src/content/blocking/site-blocker.js` (integration),
`src/popup/popup.html` (toggle), `src/popup/popup.js` (toggle wiring).

When a site is blocked, the block overlay now renders a nudge card
below the timer with:

- A motivational message (one of 60 from a curated local library,
  evenly split across `gentle`, `firm`, and `playful` tones).
- A **3-Breaths button** that overlays a 10-second breathing
  animation (3 cycles of inhale 4s / hold 2s / exhale 4s) on the
  card.
- A **+1 Willpower button** that records a `willpowerPoints` metric.

If `aiNudgeEnabled` is on AND the user has an AI provider API key
configured, the message is generated by the user's AI provider
instead of the local library. Falls back to a local message on any
error or timeout. The AI prompt is constrained to "ONE short
motivational sentence, max 18 words, no emojis, no quotes".

The nudge card is built entirely with DOM APIs (`createElement` +
`textContent`) — no `innerHTML` for untrusted content.

## 5. Tab Manager

**Files:** `src/background/background.js` (handlers),
`src/popup/popup.html` (UI), `src/popup/popup.js` (UI wiring).

Four operations:

- **Save Workspace** — saves all current window's tabs (URL, title,
  pinned state) under a user-named workspace. Stored as
  `workspaces: { name: { savedAt, tabs: [...] } }`.
- **Load Workspace** — re-opens all tabs from a saved workspace.
- **Group by Domain** — uses the new `tabGroups` permission to group
  all open tabs by registrable domain, assigning each group a color
  from an 8-color palette. Only groups with 2+ tabs are created.
- **Close All** — closes every non-YouTube, non-`chrome://` tab in
  the current window and opens a single `about:blank` focus tab.

The workspace list shows name + tab count with a delete button per
row.

**New manifest permissions:** `tabGroups` (for
`chrome.tabs.group` + `chrome.tabGroups.update`).

**New message actions:** `saveWorkspace`, `loadWorkspace`,
`listWorkspaces`, `closeAllTabs`, `groupByDomain`.

## 6. Quiz Overhaul

**Files:** `src/popup/questions.js` (new `logic` topic + difficulty
map), `src/popup/popup.js` (`startQuiz` rewrite), `src/popup/popup.html`
(difficulty selector + streak multiplier toggle).

- **Three difficulty levels** mapped to existing question topics:
  - Easy → `aptitude` (riddles, current behavior)
  - Medium → `math` (arithmetic)
  - Hard → `logic` (25 new multi-step reasoning puzzles)
- **Streak Multiplier** (`quizStreakMultiplier`): when enabled,
  escalates the difficulty one level after 8+ completed pomodoros,
  and two levels after 16+. So a user on Easy with 16 pomodoros
  gets Hard quizzes.
- The difficulty is stored as `quizDifficulty: "easy" | "medium" |
  "hard"` and exposed via `window.__focusTubeSettings` so `startQuiz`
  can read it without re-loading from storage on every disable
  attempt.

## New settings added to DEFAULT_SETTINGS

Across `background.js`, `storage.js`, and `popup.js`:

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `smartListsEnabled` | `string[]` | `[]` | Enabled Smart List category ids |
| `pomodoroFocusMinutes` | `number` | `25` | Focus phase length |
| `pomodoroShortBreakMinutes` | `number` | `5` | Short break length |
| `pomodoroLongBreakMinutes` | `number` | `15` | Long break length |
| `pomodoroCyclesBeforeLongBreak` | `number` | `4` | Focus cycles before a long break |
| `pomodoroDeepWork` | `boolean` | `false` | Auto-block Social during focus |
| `pomodoroAutoStartBreaks` | `boolean` | `true` | Auto-start break after focus |
| `pomodoroAutoStartFocus` | `boolean` | `false` | Auto-start focus after break |
| `pomodoroNotify` | `boolean` | `true` | Show desktop notifications |
| `pomodoroState` | `object\|null` | `null` | Runtime cycle state |
| `aiNudgeEnabled` | `boolean` | `false` | Use AI for nudge messages |
| `quizDifficulty` | `string` | `"easy"` | Quiz difficulty level |
| `quizStreakMultiplier` | `boolean` | `false` | Escalate quiz difficulty on streak |
| `workspaces` | `object` | `{}` | Saved tab workspaces |
| `productivityScore` | `number` | `0` | Last-computed focus score |
| `statsWillpowerPoints` | `number` | `0` | Lifetime willpower points |
| `statsPomodoroCompleted` | `number` | `0` | Lifetime pomodoros completed |

## New manifest permissions

- `tabGroups` — for `chrome.tabs.group` and `chrome.tabGroups.update`
  (Tab Manager feature).
- `notifications` — for `chrome.notifications.create` (Pomodoro
  phase-change notifications).

## New files added

- `src/content/blocking/smart-lists.js` — Smart Lists category engine.
- `src/content/utils/ai-nudge.js` — AI Nudge message library and
  rendering.

## Migration notes for v1.0.1 users

- **No data migration needed.** All existing storage keys are
  unchanged; only new keys are added.
- **All new features are opt-in** — they default to off, so upgrading
  doesn't change behavior until you explicitly enable them in the
  popup.
- **The popup UI is taller** — three new panels (Pomodoro, Smart
  Lists, Tab Manager) were added to the home view, and a new "Focus
  & Nudge" panel was added to the settings view. The popup scroll
  behavior is unchanged.
- **The dashboard has new widgets** — Focus Score, Heatmap, and
  Streak appear between the existing metrics panel and the chart.
  Existing metric cards are unchanged.

---

# v1.2.0 — Unified Liquid Glass Design System

## Problem

A UI audit found **8 surfaces with 8 different visual languages**:

| Surface | Old style |
|---------|-----------|
| Popup | Dark glass, purple/teal Flat-UI palette (`#6c5ce7`/`#00cec9`) |
| Dashboard | Light cream editorial, sky/coral/mint palette (`#1790ff`/`#db5b47`) |
| AI Summary modal | White glass + solid black body (`#000`/`#0a0a0a`) |
| Site blocker overlay | Purple gradient (`#667eea→#764ba2`) + white card |
| Time blocker overlay | Flat black (`#0f0f0f`) + red h1 |
| URL blocker overlay | Flat black + slate-gradient button |
| Keyword blocker overlay | Unsplash photo + blurred dark glass |
| AI Nudge card | Tailwind alpha colors (`#3b82f6`/`#10b981`) |

Plus: 15+ different hex values scattered across inline styles, two
conflicting `.glass-panel` definitions, an orphaned `--panel-bg`
variable, 4 different font stacks, 5 different radius scales, and a
selector bug in url-blocker that caused the overlay to hide itself.

## Solution

Created `src/shared/liquid-glass.css` — a single source of truth for
all visual tokens, loaded by popup, dashboard, and content scripts.

### Design tokens

- **Base**: `--lg-bg-deep: #0a0e1a` (deep navy-black)
- **Glass**: `rgba(255,255,255,0.045)` with `blur(16px) saturate(160%)`
- **Aurora**: 3 drifting radial-gradient blooms (blue, violet, cyan)
- **Primary**: `#3b82f6` → `#8b5cf6` gradient (blue → violet)
- **Success/Danger/Warning**: `#10b981` / `#f43f5e` / `#f59e0b`
- **Radius**: 8/12/16/20/24/999px scale
- **Shadow**: sm/md/lg/glow/inset scale
- **Type**: 11–48px scale, single font stack
- **Transitions**: spring `cubic-bezier(0.34,1.56,0.64,1)`, smooth, out
- **Z-index**: base/overlay/modal/blocker scale

### Component classes

`.lg-panel`, `.lg-card`, `.lg-btn` (+ primary/success/danger/ghost/soft variants), `.lg-input`, `.lg-select`, `.lg-toggle`, `.lg-chip` (+ color variants), `.lg-stat`, `.lg-block-overlay`, `.lg-block-card`, `.lg-modal-overlay`, `.lg-modal`.

### Animations

- `lg-aurora-drift` — 20s slow background bloom movement
- `lg-enter` — spring-bounce entrance (translateY + scale)
- `lg-pulse` — breathing glow for active elements
- `lg-shimmer` — loading state sweep
- `lg-spin` — spinner
- Button shimmer sweep on hover (CSS `::after` pseudo)

### Changes per surface

1. **Popup** (`popup.css`): Full rewrite to use tokens. Removed old
   `--primary-color: #6c5ce7` / `--secondary-color: #a29bfe` /
   `--accent-color: #00cec9` variables. All inline Tailwind hex values
   in `popup.html` replaced with `var(--lg-*)` references.

2. **Dashboard** (`dashboard.css`): Full rewrite. Switched from
   cream/light to dark liquid glass. Removed orphaned `--panel-bg`
   reference. Score ring, heatmap, and streak counter now use the
   unified palette instead of dark-mode-island tokens.

3. **Content CSS** (`content.css`): Full rewrite. AI Summary button
   now uses primary gradient instead of white glass. Modal uses
   `.yfp-modal-*` classes backed by liquid-glass tokens. Removed
   duplicate `.glass-panel` definition (collision with popup).
   Modern-glass YouTube theme override now references `--lg-*` tokens.

4. **Site blocker** (`site-blocker.js`): `displayBlockPage()` rebuilt
   with `.lg-block-overlay` / `.lg-block-card` classes. Added
   `ensureLiquidGlassCSS()` that injects the shared CSS via a
   `<link>` tag on non-YouTube pages (where the manifest CSS doesn't
   load). Removed the old `#667eea→#764ba2` purple gradient and
   `focustube-slideIn` keyframes.

5. **Time blocker** (`time-blocker.js`): `showBlockOverlay()` rebuilt
   with DOM APIs (no `innerHTML`) and `.lg-block-*` classes. Title
   color now `var(--lg-danger)` instead of hardcoded `#ff7675`.

6. **URL blocker** (`url-blocker.js`): `showBlockedPage()` rebuilt
   with `.lg-block-*` classes and `.lg-btn` button variants. **Fixed
   selector bug**: overlay now has `id="yfp-blocked-overlay"` so the
   `body > *:not(#yfp-blocked-overlay)` hide-style correctly exempts
   it (previously the overlay had only a className, so it was hiding
   itself).

7. **Keyword blocker** (`keyword-blocker.js`): `ensureOverlayCSS()`
   rewritten to use `var(--lg-*)` tokens with fallback values for
   every property. Aurora background added to the watch overlay.
   Button changed from white-on-black to primary gradient.

8. **AI Nudge** (`ai-nudge.js`): `renderInto()` card now uses
   `.lg-card` + `.lg-eyebrow` + `.lg-btn-soft-*` classes. Breathing
   circle uses `var(--lg-gradient-primary)`.

### CSS loading architecture

- **Popup**: `<link href="../shared/liquid-glass.css">` in `popup.html`
- **Dashboard**: `<link href="../shared/liquid-glass.css">` in `dashboard.html`
- **YouTube content scripts**: `liquid-glass.css` added to manifest
  `content_scripts[1].css` array (loads at `document_start`)
- **All-URLs content scripts** (site-blocker): `ensureLiquidGlassCSS()`
  injects via `<link>` from `web_accessible_resources` at runtime
- `liquid-glass.css` added to `web_accessible_resources` with
  `matches: ["https://*.youtube.com/*", "<all_urls>"]`

### New files

- `src/shared/liquid-glass.css` — 14 sections, ~600 lines of design
  tokens + component classes + animations.

### Bug fixes in this release

- **url-blocker self-hiding overlay**: the hide-style selector
  `body > *:not(#yfp-blocked-overlay)` targeted an id that was never
  set on the overlay element (it only had a className). The overlay
  was therefore hidden along with the rest of the body. Fixed by
  setting `id="yfp-blocked-overlay"` on the overlay div.
- **Dashboard orphaned variable**: `.score-ring::before` referenced
  `var(--panel-bg, #0f0f0f)` which was never defined in
  `dashboard.css`. Now uses `var(--lg-bg-surface)`.
- **`.glass-panel` collision**: popup.css and content.css both
  defined `.glass-panel` with different values. Content.css no longer
  defines it (uses `.yfp-modal-content` instead).
