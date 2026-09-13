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

---

# v1.10.0 — Dashboard Day Navigation

## Feature: `< >` day browser

The dashboard can now browse historical data one day at a time.

**Files changed:** `src/background/background.js`,
`src/dashboard/dashboard.js`, `src/dashboard/dashboard.html`,
`src/dashboard/dashboard.css`, `src/shared/icons.js`

### How it works

- A segmented `< date >` control sits in the metrics section header.
  `<` steps one day back, `>` steps forward, and `>` disables on today
  (the future has no data). The middle label shows the viewed day and
  doubles as a click shortcut back to today; an explicit gold
  "Today" pill appears while browsing history.
- Navigation is bounded by the oldest day that actually holds data
  (`dataEarliestKey`, computed across `focusAnalyticsDaily`,
  `timeUsage`, and `topicStats`), so `<` never walks into 120 days of
  guaranteed-empty storage.
- The whole report re-anchors on the selected day: Day metrics show
  that day, the Week window ends on it, and the Month heatmap renders
  the viewed month (expanding to the full month for past months).
  Top Sites, Watch Time & Topics labels, the activity-chart highlight,
  the header subtitle, and the insight copy all follow the anchor.

### Implementation notes

- `getDashboardStats(options)` in the background accepts
  `options.anchorKey` ("YYYY-MM-DD", local time). Malformed or future
  keys clamp to today. Range windows are computed with `setDate`
  arithmetic (DST-safe) instead of millisecond math.
- The dashboard keeps `viewDateKey === null` for the live "today"
  view; storage-change auto-refresh preserves the current anchor so
  sync merges that retroactively edit past days still re-render
  correctly without yanking the user back to today.
- When the service worker is unavailable, the dashboard's storage
  fallback now aggregates the anchored report directly from raw
  storage (`buildLocalReport`), keeping day navigation functional.
- Top Sites no longer clobbers the anchored view: `loadTopSites()`
  re-renders from the anchored report when browsing history instead
  of fetching the live "today" snapshot.
- New stroke icons `chevron-left` / `chevron-right` added to the
  shared icon system (no emojis).

---

# v1.11.0 — Apple Design System Dashboard

## Redesign: dashboard rebuilt on Apple HIG components

The dashboard's visual language now comes from Apple's Human Interface
Guidelines (iOS dark mode) instead of the shared "Graphite & Honey"
glass theme. Popup, block page, and content scripts are unchanged.

**Files changed:** `src/shared/apple-ui.css` (new),
`src/dashboard/dashboard.css` (rewritten), `src/dashboard/dashboard.html`,
`src/dashboard/dashboard.js`, `manifest.json`

### Components cloned from the Apple design system

- `src/shared/apple-ui.css` — a small HIG kit: iOS system colors
  (systemBlue #0A84FF, systemGreen #30D158, systemOrange, systemPurple,
  systemRed), the UIKit fill/label/separator opacities, the SF Pro font
  stack (`-apple-system, BlinkMacSystemFont, "SF Pro Display"…`), the
  9/12/16px radius scale, the Apple keyboard-focus halo, and a global
  `prefers-reduced-motion` guard.
- Focus Score hero is now an **Apple Fitness activity ring**: 13px
  gradient stroke with rounded caps over a same-hue faint track; the
  gradient is tiered (green >= 75, orange >= 50, red below) via three
  SVG `linearGradient` defs, and the track tint follows the tier.
- Range switcher is a faithful **UISegmentedControl**: rgba(118,118,128,0.24)
  container, 9px radius, `#636366` selected thumb with the UIKit drop
  shadow.
- All panels/metric cards are **inset-grouped surfaces**
  (#1C1C1E, 16px radius, 0.5px hairline inset, no borders) on a clean
  black `systemBackground` page — the aurora wash is removed.
- Lists (Lifetime Totals, Top Sites) use **insetGrouped rows** with
  0.5px separators; metric icons use the iOS Settings tinted-chip style
  with system colors; chart bars use the iOS palette with rounded caps
  over faint tracks; the heatmap switched to a systemGreen intensity
  ramp; sync buttons use filled / tinted / destructive UIButton styles.
- Day navigation (`< >`) and the Today pill were restyled as iOS
  date-browser stepper controls (tinted circles + tinted capsule);
  behavior is unchanged and re-verified.

### Fixes folded in

- Focus Score docstring said `40 + raw * 2` while the code ships
  `40 + raw * 1.5` (audit finding) — the formula comment now matches
  the shipped behavior, including the pomodoro/time-saved terms.
- Accessibility: every interactive element has a visible
  `:focus-visible` ring, and all motion is disabled under
  `prefers-reduced-motion`.

### Verification

- `node scripts/test_daynav_background.js` — 30/30 assertions PASS
  against the real `background.js` (anchor math unchanged).
- Real-browser harness (`scripts/daynav-harness`) re-verified: today
  view, `<` to Sep 10 (anchored metrics/chart/top-sites/labels), Week
  tab rollup, Today-pill return; screenshots in `ui-review/apple/`.

---

# v1.12.0 — Apple Design System Everywhere

## Redesign: popup, overlays, and injected UI moved to the Apple HIG kit

v1.11.0 rebuilt the dashboard on the Apple Human Interface Guidelines
vocabulary. v1.12.0 finishes the job: every remaining FocusTube surface
now speaks the same iOS dark-mode design language, so the extension
reads like it was designed by Apple.

**Files changed:** `src/popup/popup.css` (rewritten), `src/popup/popup.html`,
`src/popup/popup.js`, `src/content/ui/content.css` (rewritten),
`src/block-page/blocked.html`, `src/content/blocking/site-blocker.js`,
`src/content/blocking/keyword-blocker.js`,
`src/content/youtube/time-blocker.js`, `src/content/youtube/summary-button.js`,
`src/content/utils/ai-nudge.js`, `src/shared/apple-ui.css` (extended),
`manifest.json`

### What changed, surface by surface

- **Popup (all five tabs)** — rewritten on the iOS token set: iOS
  navigation bar with segmented tab selection, UISwitch clones
  (systemGreen, white knob), inset-grouped cards and 0.5px hairline
  setting rows, iOS text fields (gray fill, blue focus halo), filled
  systemBlue primary buttons, tinted capsules for tags and secondary
  actions, iOS alert-style quiz modal, systemGreen/red/orange status
  colors. All ~30 inline `--lg-*` references in popup.js were mapped to
  their iOS equivalents; quiz right/wrong flashes now use systemGreen /
  systemRed tints.
- **Block overlays** — `apple-ui.css` now ships a complete, self-sufficient
  Apple skin for the shared `.lg-block-*` classes: full-screen black lock
  sheet, #1C1C1E card with modal elevation, red-tinted rounded lock chip,
  SF Mono timer chip (with the indefinite-sentence variant), iOS filled /
  tinted buttons. Consumers: blocked.html, the site-blocker injected
  overlay (now also loads apple-ui.css via web_accessible_resources),
  and the YouTube time-blocker overlay (apple-ui.css added to the
  manifest content_scripts CSS for YouTube).
- **AI Summary UI on YouTube** — `content.css` rewritten on iOS tokens:
  filled blue summary button, iOS sheet modal with hairline header,
  tinted capsules, amber ad warnings, destructive-tint block-channel
  button, floating HUD banner/pause chips in systemMaterial dark.
- **Keyword focus overlay** (shorts interstitial) — its 44 embedded
  `var(--lg-*, fallback)` declarations were rewritten to `--ios-*` tokens
  with iOS fallback values (self-contained as before), amber → systemBlue.
- **AI nudge card** — iOS tokens, emoji-free button labels, systemBlue
  breathing circle with a softer glow.
- **glass-theme.css (YouTube page skin) is deliberately unchanged** —
  it themes the YouTube page itself rather than extension UI, and
  changing it would alter the user's browsing canvas, not the extension.

### Accessibility / consistency notes

- `:focus-visible` blue halo on every interactive element; global
  `prefers-reduced-motion` guard ships in apple-ui.css and now covers
  every surface that loads it.
- Zero `--lg-*` color references remain in any popup / content-script
  JavaScript (verified by sweep); `glass-theme.css` keeps its own
  `--ftg-*` material tokens by design.

### Verification

- `node --check` clean on all 8 touched JS files; manifest JSON valid.
- Popup verified end-to-end in the real-browser harness (real popup.js +
  real background.js behind a chrome-stub message bus): all five tabs
  screenshot-verified in `ui-review/apple/popup_*.png`.
  Harness note: background.js is IIFE-wrapped in the harness only, because
  it and popup.js both declare top-level `DEFAULT_SETTINGS` (the audit's
  "two hand-synced copies" finding) — separate contexts in production,
  single page in the harness.
- Overlay skin verified with a 3-case replica harness
  (`scripts/overlay-harness`) using the real stylesheets:
  site-block card + AI nudge, YouTube time-blocker, indefinite variant —
  screenshots in `ui-review/apple/overlay_case*.png`, plus the live
  `blocked.html` render.
- Dashboard day-nav regression suite still passes (30/30 node asserts,
  real-background browser run).

## Fix: blocker surfaces — logo visibility, stacked layout, live countdown (v1.12.1)

User report against v1.12.0: block-overlay logo looked tiny, and the
countdown "is not real time". Both reproduced, root-caused, and fixed.

- **Invisible-shrink logo (asset bug)**: `banner.png` was 1536x1024 but the
  visible logo ink occupied only a 1012x283 strip (x232-1244, y328-611) —
  78% of the canvas was transparent padding, so at 60px element height the
  rendered logo was ~17px of ink, floating misaligned. The asset is now
  cropped to the ink bbox (+12px pad): 1037x308, aspect 3.37:1 — at 56px
  element height the logo renders a true 56px (189px wide), 3.3x larger.
- **Side-by-side logo/lock chip (layout bug)**: `.lg-block-card` relies on
  `text-align:center`, and `.lg-block-icon` was `display:inline-flex`, so
  the inline banner `<img>` and the chip shared one centered line box.
  apple-ui.css now makes the chip block-level (`display:flex; margin:0
  auto 16px`), and both overlay builders render the banner
  `display:block; margin:0 auto 20px` — logo, chip, title, timer always
  stack as a column (time-blocker, url-blocker, blocked.html).
- **Frozen countdown — root cause found (mutation storm)**: the time-blocker
  overlay sits under a document-wide `MutationObserver` (childList+subtree).
  Its callback called `showBlockOverlay`, which assigned `textContent` on
  every fire — and a `textContent` write is itself a childList mutation,
  re-triggering the observer: an unbounded microtask feedback loop. The tab
  starved (rendering/CDP never ran — reproduced in the harness as
  `Page.captureScreenshot` timeouts) and the countdown painted once, then
  froze forever. Fixes: (a) the observer is now CREATE-only — it re-creates
  the overlay if YouTube's SPA tears it down, but never touches text;
  (b) all periodic writes go through `setTextIfChanged`, so no write ever
  fires unless the value actually changed.
- **Countdown is now the hero element**: big SF Mono tabular-numeral pill
  (`#yfp-block-timer`, `.lg-block-timer`, 186x40px) driven by a dedicated
  500ms ticker; caption below reads "Focus Timer Active · Unblocks at
  08:04 PM". A `visibilitychange` listener instantly resyncs the clock
  after background-tab interval throttling, and the anti-tamper interval
  routes through the same `updateCountdownUI` source of truth. Indefinite
  blocks render the caption-chip variant instead of a clock.
- **url-blocker parity**: same banner/chip layout fix; 🚫 / 🏠 emojis
  replaced with the family's stroke lock + house SVGs; injects
  apple-ui.css alongside liquid-glass.css like site-blocker does.
- **blocked.html**: banner logo added above the lock/clock chip for family
  consistency (page timer was already correct and keeps ticking).
- Harness: `scripts/blocker-harness/` serves the REAL stylesheets (manifest
  order) + REAL time-blocker/url-blocker/storage JS with a dual-API chrome
  stub (callback + promise). Verified in-browser: overlay tick
  18:04 -> 17:55 -> 17:53 -> 17:50 (strictly decreasing), logo 189x56
  block-level below-the-chip geometry asserted, url-block overlay and
  blocked.html render + tick verified; dashboard regression suite still
  30/30. Screenshots: `ui-review/blocker-fix/`.

## Feature: Apple motion, ungameable Focus Score v2, onboarding flow (v1.13.0)

Three user requests: (1) "Add apple like animations", (2) research and fix
the Focus Score — "its not perfect as i can multiple time press block 30 min
youtube button 100 times at a time and score gets 100", (3) an Apple-style
first-run question flow that customizes the experience.

### Focus Score v2 — research-grounded and anti-gaming

The exploit chain (both fixed):
- Popup "Block 30 min" credited `timeSavedMinutes += 30` on EVERY press;
  the v1 linear formula `40 + 1.5 × (wins + 0.5 × timeSaved)` hit 100 after
  ~3 presses (80 credited minutes). 100 presses → +3000 min → 100/100.
- The `recordMetric` message action accepted ANY metric with UNCLAMPED
  amounts from any content script — a forged
  `{metric:"timeSavedMinutes", amount: 1e6}` maxed the score instantly.

Fixes (background.js):
- setTempBlock now credits by UNION growth only: overlapping block windows
  describe one blocked interval, so re-pressing inside an active block
  credits ~0 and extending credits only the extension. New
  `tempBlockUntilPrev` dedupe key keeps the live blocker reading
  `tempBlockUntil` untouched. Verified: 100 presses → exactly 30 credited.
- recordMetric external whitelist = {shortsSkipped, adsBlocked,
  summariesGenerated, willpowerPoints}; background-only metrics
  (timeSavedMinutes, pomodoroCompleted, quitsEarly) are rejected; amounts
  clamped to [1,100] and validated finite/positive.

The score itself moved to a pure module `src/shared/focus-score.js`
(unit-tested in node, loaded by the dashboard). Design grounded in the
behavioral-science literature:

- Lally et al. 2010 (Eur J Soc Psychol 40:998–1009) — habit automaticity
  needs ~66 days of repetition and tolerates missed days → consistency is a
  DISTINCT-DAY streak (full credit at 7), never farmable in one session.
- Duolingo's published streak design (+ "streak creep" cautionary writeups)
  → an in-progress today never zeroes yesterday's streak.
- Deci & Ryan — Self-Determination Theory / overjustification effect:
  points for trivial one-tap actions inflate fast and corrode intrinsic
  motivation → effortful wins (quiz passes ×2, pomodoros ×3, summaries)
  outweigh button presses, each capped per day (6/4/3).
- Weber-Fechner / diminishing-returns tradition (also standard in
  reputation systems) → every component saturates on a concave curve
  (63% credit at k, hard ceiling by ~3k).
- Goodhart's law + health-app step-cheating literature → measure behavior,
  not button presses; no single lever can dominate (weights 34/26/24/8/8).

Composite (max exactly 100): base 8 (any activity) + shield 34 (honest
union time-saved + shorts×0.5 + ads×0.25, saturated) + focus 26 (capped
effortful wins) + streak 24 (7-day consistency) + discipline 8 (quits
penalty). A maxed SINGLE day lands < 80; 100 requires ~a week of balanced,
genuinely effortful behavior. Same seed data that scored 100 under v1 now
scores 58.

New test suite `scripts/test_score_v2.js` — 28 assertions incl. the exact
user exploit (100 presses credit 30 once), forged-million-minute cap
(53 < 60), diminishing returns, caps, streak math, 100-attainability,
clamps, determinism. Dashboard regression still 30/30.

### Apple motion system (HIG "Motion")

- apple-ui.css: motion tokens (ease-out / iOS sheet cubic-bezier(0.32,0.72,0,1)
  / spring), one-shot entrance keyframes (fade-up, scale-in, backdrop), UIButton
  press feedback on .lg-btn, and the UIAlertController-style presentation for
  every blocker surface — scrim fades while the lock card scales in
  (.lg-block-overlay/.lg-block-card), with its own reduced-motion guard
  (block overlays live on YouTube pages without .ios-theme).
- Dashboard: sections cascade in with staggered fade-ups, the Focus ring
  draws on the sheet curve (JS seeds the offset empty then transitions),
  the score number counts up, heatmap cells spring-cascade left→right.
- Popup: view switches present on the sheet curve, quiz card scales in like
  an iOS alert, UISwitch knob slides with a gentle spring overshoot.

### Onboarding — Apple Setup Assistant-style first run

- New surface src/onboarding/ (7 steps): welcome → goals (multi-chip) →
  what to tame (UISwitch rows) → daily budget (iOS stepper, 30m–8h) →
  quiet hours (none/nights/work presets) → focus style (gentle/firm/hard →
  quiz difficulty) → summary + handoff. Sheet-curve step slides, progress
  bar, back chevron, Skip = accept defaults, keyboard arrows/Enter.
- Draft persists per interaction (onboardingDraft) so reopening resumes;
  the final step writes settings in ONE atomic storage.set
  (hideShorts/hideSuggestions/hideComments/disableAutoplay,
  timeLimits["youtube.com"], scheduleBlock{,Start,End}, quizDifficulty,
  focusStyle, focusGoals) and sets onboardingComplete; then opens
  YouTube (or the dashboard).
- background.js onInstalled: first run now opens onboarding instead of
  dropping the user onto YouTube (update/reinstall with the flag set keeps
  the old behavior). Popup shows a "Finish setup" banner until the flag is
  set; clicking opens the flow.
- Verified end-to-end in a real browser: every step screenshotted, summary
  matches selections, committed storage keys exact (timeLimits 180 after
  one + press, schedule 22:00–07:00, quizDifficulty hard, draft removed),
  tabs.create fires. Screenshots: ui-review/blocker-fix/ob_*.png,
  dash_v113.png, popup_banner.png, overlay_anim.png.

## v1.14.0 — Human Hours, Smarter Topics, Daily Briefing, Per-Site Focus Timers, "YouTube × Apple" Glass

Five user-driven upgrades. No behavior regressions: the 30-assert daynav
suite and the 28-assert Focus Score v2 suite both pass after the changes.

### 1. Hours everywhere, not "490m"

- Dashboard Top Sites rows printed raw minutes ("490m / 500m"). They now go
  through formatMinutes → "8h 10m / 8h 20m" (title tooltips too), and
  formatMinutes itself rounds once up-front so fractional per-site minutes
  ("8h 10.4m") can never leak from the seconds→minutes conversion.
- Popup Time Limits capsules and the Home "Today's time" mirror use a new
  formatUsageMinutes ("8h 10m of 8h 20m used", "2.0m of 20m used" — one
  decimal kept only below 10 minutes where precision still matters).
- The Daily Briefing's stat tiles format through the same family, with the
  count-up animation formatting every frame (no "490m" flash mid-animation).

### 2. Topic tracking, rewritten (v2)

The v1 tracker only counted explicit hashtags (rare — most videos have
none) once per page load, so Top Topics stayed near-empty and a 20-second
Short counted the same as a 40-minute lecture.

- Six extraction sources, each weighted: hashtag chips (1.0), title
  hashtags (1.0), description hashtags (0.9), the video's category (0.9),
  YouTube's own `keywords` tags (0.7), and — when a video carries fewer
  than two explicit topics — mined title keywords (0.4, stopword-filtered,
  plural-collapsed). Normalization produces stable "#slug" topics.
- Watch-time weighting: the tracker polls <video>.duration and ships
  durationSeconds; background recordTopic splits those seconds across the
  video's topics proportionally to weight and stores topicSeconds per day
  (counts still stored in the legacy topicStats shape). A Short now counts
  as a Short.
- SPA robustness: extraction retries on a 700 ms poll (~6 s) instead of one
  fixed 1.5 s timeout, every video is still recorded at most once, and the
  seen-set is bounded (600 entries) so an all-day session can't grow it.
- Dashboard: getDashboardStats (and the storage-fallback buildLocalReport)
  aggregate topicSeconds into per-topic minutes and compare each topic
  against the PREVIOUS same-length window, rendering "6× · 1h 30m" plus a
  trend chip — ▲/▼ % (green/red) or "NEW" (`.topic-trend`).
- background recordTopic accepts both the v2 object payload and the v1
  string array (weight 1), clamps weights to [0.1, 2] and duration to
  [0, 12 h], dedupes by topic keeping the max weight, and trims both
  topic maps to the retention window.

### 3. Daily Briefing (morning recap / evening wind-down)

New surface src/digest/ (digest.html/css/js on the shared apple-ui token
system), opened ONCE per calendar day on the first browser start
(chrome.runtime.onStartup → openDailyDigestIfDue) and on demand from a new
✦ header button in the dashboard (?manual=1 bypasses the daily gate).

- UX decision (user asked "morning or evening — do what's better per UX"):
  the evidence favors a MORNING recap of yesterday as the primary slot —
  the fresh-start effect (Dai, Milkman & Riis 2014) makes morning the
  strongest moment to act on data, and implementation-intention research
  (Gollwitzer) favors planning before exposure over willpower during it.
  The evening slot remains as the automatic fallback (13:00–22:59) but is
  reframed as a gentle WIND-DOWN: today-so-far, reflective tone, and a
  sleep-protective checklist instead of shaming. 23:00–04:59 is suppressed
  entirely — nothing about a focus app should interrupt sleep. First-run
  users get onboarding instead (gated on onboardingComplete), never both.
- Content, all from the existing getDashboardStats report anchored on
  yesterday (morning) or today (evening): animated Focus Score ring +
  count-up + streak line; four stat tiles; a 7-day "time saved" bar chart
  with staggered grow-in and the anchor day highlighted; top distraction
  sites with favicons, gradient bars and hours; top topics as chips with
  minutes and up-trend highlighting; a rotating "Field note" card citing
  real behavioral research (Gloria Mark's 23-minute refocus cost, Ward et
  al.'s brain-drain, Lally's 66-day habit windows, Skinner's variable
  rewards, decision fatigue, fresh-start effect, Deep Work); a serif quote
  card; and a plan card (morning: three intentions / evening: wind-down
  checklist). Study + quote are picked deterministically per calendar day.
- Motion follows the v1.13.0 system: staggered card entrances on the sheet
  curve, count-ups, ring draw, bar grow — all entrance-only and collapsed
  under prefers-reduced-motion.
- Buttons: "Open Dashboard" (tabs.create) and "Got it" (window.close).

### 4. Per-site Focus Timers in Time Limits

Each website capsule in Focus & Blocking → Time Limits now carries a
right-side control:

- No timer → a compact clock button. Clicking opens an INLINE duration
  picker (15m / 30m / 1h / 2h presets + custom minutes + Start).
- Timer running → the button becomes a live green countdown chip that
  ticks every second (siteTimerTicker; the 5 s list refresh alone would
  read as frozen — the v1.12.1 lesson). Clicking it ends the timer early.
- Permanent / daily-limit block already active → a static red "Blocked"
  tag; a timer can never downgrade a non-timer block.

- Background: new setSiteTimer handler reuses the site-blocker's existing
  blockedSites mechanism ({domain, blockUntil, reason:"Focus Timer"}),
  so the overlay + ticking countdown on the blocked site come free.
  minutes clamp to [1, 1440]; domain is sanitized; a "Blocked" site
  responds success:false. Sync metadata is touched and file sync
  scheduled like every other blockedSites write.
- Anti-gaming: time-saved credit is UNION growth per domain
  (siteTimerPrev map), exactly the v1.13.0 discipline — pressing
  "30 m" 100× credits 30 minutes, not 3000.
- getTimeUsage now returns siteTimers (active Focus Timers) and
  blockedSites so the capsule can pick the right right-side state.
- Harness-found UX bug fixed: the 5 s periodic list rebuild used to yank
  the open picker (and its focus) away; refreshTimeUsage now skips
  re-rendering while a picker is open, and start() closes the picker
  BEFORE triggering the refresh so the chip is drawn immediately.
- Verified end-to-end in the popup harness against the REAL background:
  click → picker → 30 m → blockedSites entry written → chip appears
  ticking 29:58 → 29:57 → click chip → timer ends, storage cleared,
  button restored. Screenshots: ui-review/v1.14.0/.

### 5. Modern Glass — "if YouTube were designed by Apple"

glass-theme.css rewritten around one thesis: keep YouTube's identity (the
red, the video-first canvas) and rebuild it in Apple's language.

- ONE system accent: YouTube Red (#FF0033 dark / #FF0000 light) plays the
  role Apple gives systemBlue — selection, active states, the primary CTA.
  v1's honey/gold accent fought YouTube's red; v2 makes the red itself the
  system color (--ftg-accent-* family, fully self-contained — zero --lg-*
  dependencies). --yt-spec-call-to-action / brand-button-background remap
  keeps native CTAs coherent.
- Typography: YouTube's Roboto remapped to the SF stack (-apple-system →
  SF Pro Text/Display) with SF-Display-style tracking on watch/feed titles.
- Search is Safari-style: one continuous capsule input with a red focus
  halo; the old split Search button becomes a quiet circular glass key.
- Subscribe: flat red pill with a soft red glow and a press-scale — no
  gradient (Apple stopped gradienting buttons years ago); "Subscribed"
  tonal state stays quiet glass. Destructive menu items get iOS red.
- Materials unchanged in architecture (floating chrome blurred+saturated
  with specular hairline + 1px luminous rim; content flat on canvas;
  concentric radii 22 → 14 → 999), now lit by a red/indigo dusk aurora.
- Verified on a structural YouTube mock (masthead, guide, chips, cards,
  subscribe, menu, dialog) in dark and light: accent #ff0033, masthead
  blur(26px) saturate(1.75), red chip ring, red guide selection, SF stack,
  flat red subscribe pill. Screenshots: ui-review/v1.14.0/glass_{dark,light}.png.

### Verification

- node --check on every touched JS file (background, dashboard, popup,
  topic-tracker, digest, focus-score, site-blocker).
- Regression: scripts/test_daynav_background.js 30/30 PASS and
  scripts/test_score_v2.js all PASS after the changes.
- Browser: daynav harness (real background.js end-to-end) shows
  "8h 10m / 8h 20m" capsules, topic rows with minutes + ▲100%/NEW/— trend
  chips, and the ✦ Briefing button; digest harness renders both modes with
  live animations (ring offset exact for score 85, staggered bars, count-ups);
  popup harness exercises the full per-site timer path.
- New artifacts: src/digest/, scripts/build_digest_harness.js,
  ui-review/v1.14.0/ (digest morning/evening, dashboard hours + topics,
  popup capsules, glass dark/light, glass-mock.html).


## v1.15.0 — Modern Glass Theme removed · Focus Rings (new USP)

Two user-driven calls: the custom YouTube glassmorphism skin ("Modern Glass
Theme — blur, transparency, rounded panels") felt like unwanted cruft and is
gone entirely; in its place ships a real USP, designed to the "if Apple made
this" bar: **Focus Rings**, an Apple-Fitness-style triple activity ring that
turns FocusTube's daily data into a "close your rings" ritual.

### 1. Modern Glass Theme — removed

Every trace of the feature is gone, not just the toggle:

- manifest: `src/content/utils/glass-theme.js` dropped from the YouTube
  content-script `js` list, `src/content/youtube/glass-theme.css` from `css`.
  Both files deleted (576-line theme sheet + applier).
- popup Appearance settings: the "Modern Glass Theme — Glassmorphism UI:
  blur, transparency, rounded panels" toggle row removed.
- Defaults / sync-key lists scrubbed in popup.js, content storage.js and
  background.js (the `modernGlassTheme` key is no longer read or written;
  a stale `true` left in someone's storage is simply ignored — no consumer).
- css-filter.js: `GLASS_ROOT_CLASS`, the root-class toggle, the injected
  `generateModernGlassCSS()` block (gradient page background, glass panels,
  rounded thumbnails) and the glass log line all removed — the module is
  back to being a pure element-hiding filter.
- Docs: PROJECT_STRUCTURE.md / ARCHITECTURE.md drop the file entries,
  API.md documents the removal; ERROR_ANALYSIS.md kept as a dated snapshot.
- `liquid-glass.css` is untouched — that is the shared blocker-overlay
  design system (block page, overlays), not the YouTube skin.

### 2. Focus Rings — the new USP

`src/shared/focus-rings.js` (self-contained, ~450 lines): the Fitness
metaphor mapped onto attention, with one ring per honest daily metric that
FocusTube already records:

- **Deflected** (Move red `#FA114F`): ads blocked + Shorts skipped + quit
  attempts. Goal 12/day.
- **Focused** (Exercise green `#92E82A`): pomodoro minutes banked
  (completed × the user's configured focus length via `readGoals()`).
  Goal 2h/day.
- **Saved** (Stand cyan `#00FDDC`): time-saved minutes (the same
  union-growth metric Focus Score v2 anti-gaming is built on). Goal 1h/day.

Design notes: units differ per ring exactly like Move/Exercise/Stand; rings
are a display, not a score, so they inherit the anti-gaming discipline of
the underlying metrics; goal-gradient research (Kivetz, Urminsky & Zheng
2006) is why an 80%-closed ring is the strongest "one more session" nudge
the product can draw.

Module API: `compute(dayTotals, goals)` (pure), `readGoals()` (storage-aware,
pomodoro-length aware), `streakFromPoints(points)` (consecutive all-three
days; an unfinished today is reported `atRisk`, never breaks the chain),
`render(el, data, opts)` (zero-length dash hidden so empty rings show a
clean track — no SVG round-cap dot; staggered 0.9 s Apple-curve animation;
`prefers-reduced-motion` honored; legend rows with unit-aware goals;
aria-label computed from data).

Surfaces:

- **Dashboard**: new Focus Rings panel under the hero score — 168 px rings,
  Fitness-style legend ("9 / 12", "50m / 2h", "35m / 1h"), status subtitle
  ("0 of 3 closed · 3 to go" → "All rings closed — brilliant.") and an
  all-rings streak line. Rings always show the ANCHOR day's totals, so
  browsing to yesterday rewinds them together with the rest of the report;
  the storage-fallback path renders them identically.
- **Popup Home**: compact 76 px rings card between the stat chips and
  "Protected right now" — status line + "Details" that opens the dashboard.
  Reads today's analytics straight from storage, so it renders even when
  the service worker is asleep.
- **Daily Briefing**: rings card between the stat tiles and the weekly
  chart — "Yesterday's rings" in the morning recap, "Today's rings" in the
  evening wind-down, rendered from the briefing's anchor day.

### Verification

- Node unit pass on the pure logic: compute values/clamps/closed flags,
  per-session focus minutes, streak (at-risk-today, closed-today, gap,
  empty) and minute formatting — 14/14.
- Browser (agent-browser against real popup/dashboard/digest + real
  background.js in harnesses): today view shows arcs at exactly
  75% / 41.7% / 58.3% (dashoffsets asserted), "0/3", streak
  "2-day all-rings streak — today's rings are still open"; yesterday view
  shows full circles (offsets 0), "3/3", "All rings closed — brilliant.",
  legend "18 / 12", "2h 5m / 2h", "1h 12m / 1h"; popup card and digest card
  render with live data. Screenshots: ui-review/v1.15.0/.
- Harness chrome stub gained callback-style `sendMessage` support (digest
  uses the callback form) — a harness bug, not a product bug.
- Regression: scripts/test_daynav_background.js ALL PASS (30/30).
- `node --check` on every touched file; manifest + data JSON parse clean;
  zero `modernGlassTheme` / glass-theme references remain in src/ or
  manifest.json.

## v1.16.0 — Focus Rings goals, ring-closing celebration, weekly badges, monthly archive sync

### 1. Editable ring goals (popup Settings → Focus Rings Goals)

The three daily rings are no longer fixed at 12 / 2h / 1h. A new inset panel in
popup Settings exposes one Apple-style stepper row per ring — colored dot,
label, hint, −/+ stepper:

- **Deflected** — ads, Shorts & urges skipped per day (1–200, step 2)
- **Focused** — pomodoro focus minutes per day (15–480, step 15, shown as "2h 30m")
- **Saved** — time-saved minutes per day (10–480, step 10)

Values persist to the `focusRingsGoals` storage key (350 ms debounce) and
`FGRings.readGoals()` merges it over the defaults, so dashboard, popup home and
daily briefing rings all honor the same goals instantly — the dashboard
re-renders live via the storage watcher (`focusRingsGoals` added to the watched
key list), and the popup home card repaints right after the save. Invalid or
out-of-range stored values fall back per-field through the existing
`normalizeGoals()` clamps.

### 2. Ring-closing celebration (Fitness-style)

`FGRings.maybeCelebrate()` turns a closing ring into a moment:

- **8-particle radial burst** anchored to the ring that just closed (its own
  radius, its own color), timed to land exactly as that ring's 0.9 s fill
  transition seals (950 ms + 150 ms per-ring stagger).
- **Glow flash** on the closing stroke (`drop-shadow` + brightness pulse) and a
  spring **pop** on the center counter.
- **Golden award chip** — "All rings closed — perfect day!" — when all three
  close in one pass.

Dedup is storage-backed (`focusRingsCelebrated`: day → celebrated ring keys,
pruned to 60 days) so a (day, ring) pair fires exactly once across surfaces:
re-renders never replay it, popup and dashboard share one budget, and rings
that closed while the browser was shut celebrate on next open — Fitness
replays your award on launch. Past-day navigation never celebrates (only
`dayKey === todayKey` fires). Everything honors `prefers-reduced-motion`
(sparks, flash, pop and chip animation are skipped).

### 3. Weekly rings-badges view (Monthly Review)

New **Monthly Review** panel on the dashboard (below the heatmap) — the month
as one animated story, always rendered for the anchor month so `< >` day
navigation rewinds it with everything else:

- **Count-up tiles**: time saved, deflections, focus sessions, rings closed
  (ease-out count-up, reduced-motion → instant).
- **Rings day by day**: one 24 px mini ring-trio per day of the month
  (`FGRings.render({ mini: true })` — bare trio, no center counter), staggered
  scale-in, gold-tinted cell for all-3 days, hover zoom + tooltip
  ("Sep 10 — 3/3 rings closed").
- **Weekly badges**: fixed weeks (1–7, 8–14, …) with Fitness award tiers —
  gold ≥5, silver ≥3, bronze ≥1 all-rings days (`FGRings.badgeTier`, partial
  current weeks scale by 7/days so a Wednesday 3/3 still glitters). Badges
  carry tier-tinted gradients and pop in with stagger.
- **Best day** highlight: most rings closed, time-saved as tie-breaker.

### 4. Monthly archive sync — focustube-<Month>-<Year>.json

The single ever-growing `focustube-data.json` is replaced by **one small file
per calendar month** inside a user-chosen folder:

- Dashboard primary action is now **"Choose data folder…"**
  (`showDirectoryPicker`); the stored directory handle lives in the same
  IndexedDB handle store under a new `dataDir` key. The legacy single-file
  flow remains as fallback (and keeps working for existing setups).
- In monthly mode the file name is computed **every sync cycle**
  (`currentMonthFileName()` → `focustube-September-2026.json`) — that IS the
  rotation mechanism: when the calendar month flips, the next cycle simply
  creates and fills the new month's file. Old months stay on disk untouched.
- A monthly file holds **only that month's day-keyed sections**
  (`filterPayloadDaysToMonth` scopes `analyticsDaily`/`timeUsage`/
  `topicStats`; config sections ride along so a month file can still configure
  a fresh browser). `chrome.storage` keeps the FULL merge, so older months
  stay browsable in the dashboard.
- **History import**: picking a folder walks every `focustube-*.json` already
  in it (≤60 files, ≤8 MB each) and merges them into local storage — a fresh
  browser restores prior months on setup. Merge is max-based and idempotent.
- **Exports** use the same naming: the export button produces
  `focustube-<Month>-<Year>.json` scoped to the current month; imports accept
  any month file. `syncApplyImportedPayload` in monthly mode writes only the
  month-scoped merge back to the current file (never a full payload).
- Status surface reports the mode: "Monthly archive: focustube-September-2026
  in 'FocusTube Sync' … A fresh file starts automatically each month."
  Disconnect clears both handle keys.

### Verification

- Node (scripts/test_v116_monthly_rings.js, against production files in a VM
  sandbox): 19 focus-rings assertions (goal defaults/merge/fallbacks, compute
  with custom goals, badge tiers incl. partial-week scaling) + monthly sync
  suite (naming + rotation dates, month scoping, monthly syncNow writing only
  current-month days while storage keeps the full merge, status fields, legacy
  file mode untouched, disconnect clearing both keys) — ALL PASS.
- Regression: scripts/test_daynav_background.js ALL PASS (30/30) against the
  modified background.js.
- Browser (agent-browser, real code end-to-end in rebuilt harnesses —
  scripts/build_v116_harness.js → v116-dashboard-harness + v116-popup-harness):
  - Monthly Review: tiles "10h 13m / 157 / 16 / 17", 12 mini-ring day cells
    with gold-tinted all-3 days, badges "Week 1 0/7" + "Week 2 2/5 · Bronze",
    best-day line; navigating 30× `<` rewinds to "August 2026" with a full
    31-day strip and 5 badges (0/7 ×4, 0/3) and the correct Aug 20 best day.
  - Celebration: lowering goals live fires 3 bursts + 24 sparks + 3 glow
    flashes; `focusRingsCelebrated` records the day; re-renders and a second
    surface do not re-fire (storage + in-memory dedupe); the award chip spawns
    after the fill animations and reads "All rings closed — perfect day!".
  - Goals editor: 3× + → 18 persisted, − → 16, 9× − clamps at min 1, focused
    steps to "2h 30m"; popup home card re-renders with the new goals ("1 of 3
    closed") immediately.
  - Sync panel: folder-mode button, monthly status copy, export naming
    (unit-covered), dashboard help text rewritten for monthly archives.
- Screenshots: ui-review/v1.16.0/ (dashboard_full, dashboard_monthly_review,
  dashboard_award, popup_goals_panel, popup_home_rings).

---

## v1.16.1 — Documentation & Screenshot Release

### What changed

- **README fully rewritten** for the current product (the old one still
  described v1.2.0 "liquid glass"): hero + badges, screenshot galleries,
  Focus Rings USP section, monthly archive sync, Apple-HIG design-system
  note, researched roadmap linking docs/FEATURE_RESEARCH.md.
- **assets/screenshots/** (13 PNGs, ~1.3 MB) — real production UI, captured
  end-to-end from the shipped code via harnesses: dashboard (overview /
  analytics / month full-page with Monthly Review + weekly badges), popup
  (home / focus / settings / rings-goals editor / youtube), block interstitial
  with live countdown, morning Daily Briefing, onboarding question step,
  YouTube Focus-Timer overlay (live 14:38 countdown) and site-block overlay
  with AI nudge.
- **docs/FEATURE_RESEARCH.md (new)** — the researched roadmap: 8 features
  prioritized with mechanism → evidence → integration points → effort
  (Watch Intent, Streak Insurance, Adaptive Ring Goals, Graduated Unblock
  Friction, Weekly Recap Card, Sleep-Guard, Accountability Pairing, Vim
  navigation), plus a table mapping every already-shipped behavior design to
  its research anchor and an explicit "not on the roadmap" list (cloud,
  nanny defaults, points shops) with reasons.

### How the screenshots were made (reproducible)

- Harnesses run the REAL production css/js against the canonical chrome stub
  (scripts/chrome_stub.js) with 10 days of seeded analytics; overlay harnesses
  additionally shim callback-style storage.get and expose the time-blocker via
  its production entry point window.YFPTimeBlocker.init().
- Builders: scripts/build_v116_harness.js, scripts/build_digest_rings_harness.js,
  scripts/build_readme_harnesses.js (ss-blockpage / ss-onboarding /
  ss-timeblock / ss-siteblock). Captures via agent-browser; masters in
  ui-review/readme/, shipped copies in assets/screenshots/.

### Verification

- Every embedded PNG visually reviewed (score, rings, countdowns and badges
  render with filled data; no broken assets, no harness chrome leaking).
- All README-relative links resolve (docs/*, SECURITY.md, IMPROVEMENTS.md,
  assets/screenshots/*).
- No source-code behavior changes; manifest bumped 1.16.0 → 1.16.1.

---

## v1.17.0 — The Research Wave + Foco the Companion

All eight features from docs/FEATURE_RESEARCH.md ship in this release, plus
the interactive Companion the roadmap research pointed at.

### New modules

- `src/shared/companion.js` — **Foco**, a floating 2D SVG companion (closed
  ShadowRoot, ~40 KB, zero page interference) on every site via a new
  all_urls/document_idle content-script entry: seconds-accurate live site
  clock (seeded from `timeUsage`, 1 s ticker), mood engine (idle / good /
  warn / danger / cheer with distinct faces, brows, antenna colors and
  research-phrased bubbles), tap-to-expand panel (site time, mood, rings,
  saved time; actions: Block site 1h / Snooze 1h / Hide here), pointer-drag
  with persisted position, storage-live settings (`companionEnabled`,
  `companionHiddenSites`, `companionPos`, `companionSnoozedUntil`),
  prefers-reduced-motion guards, and an inert 3D decision note (battery +
  size; a WebGL variant can layer on later). Documented harness-only hook:
  `window.__ftCompanionCategoryOverride`.
- `src/content/youtube/watch-intent.js` — "What are you here for?" bottom
  sheet on watch pages: 5 chips + free text + planned minutes, honest
  "Just browsing" (mindful countdown re-asks), session resolution watcher
  (matched = watched ≤ planned ×1.25 + 2 min grace), day-keyed
  `watchIntents` log pruned to 60 days.
- `src/shared/unblock-gate.js` — graduated friction ladder
  (reason ≥ 12 chars → 10 s wait +10 s per prior attempt today, cap 30 s →
  quiz at Strict tier or ≥ 3 attempts/day; typed-confirmation fallback when
  no quiz factory injected). Tiers off/standard/strict via
  `unblockGateTier`; day-keyed `unblockAttempts`.
- `src/shared/recap-card.js` — 1200×1500 canvas recap PNG (7 mini triple
  rings with gold closed-dots, stats band, best-day ribbon, badge tier),
  `toBlob` download, zero network.
- `src/shared/pair-digest.js` — accountability pairing over user-owned
  transport: `FOCUSTUBE-PAIR:v1:<checksum>:<json>` share text carrying ONLY
  name/week/7-day ring counts (0–3)/badge/streak; djb2 checksum tamper
  evidence; save/clear partner; side-by-side week board renderer.

### Integrations

- focus-rings.js: **Streak Insurance** — `weekKeyOf` (Monday-start),
  `insuranceFromPoints` (fully DERIVED ledger: prior week ≥ 4 all-rings days
  earns 1 freeze; broken day absorbs a freeze as 🛡 frozen; else next day
  with ≥ 2× Focused goal marks 🔧 repaired; else chain breaks; open today
  never auto-spends; repair CTA sized in today's focus minutes) +
  `streakWithInsurance`. Unit bug caught in review: pomodoro counts are
  SESSIONS — repair math converts via focusMinutesPerSession (25 m default).
- url-blocker.js: "Temporarily Unblock" now runs the gate before the
  5-minute session unblock (falls back to instant pass if the module is
  ever unavailable — never trap the user).
- time-blocker.js: **Sleep Guard** — 4th blocking rule
  (`sleepGuardEnabled/Start/End`) rendering a named "Sleep Guard" overlay.
- background.js: `openSleepGuardWindDownIfDue` (evening digest 30 min before
  guard start, once/day via `sleepGuardWindDownShown`; fired from onStartup
  and piggybacked on the 1-min sync alarm), plus two guarded message
  handlers: `vimCloseTab` (sender-tab-only tabs.remove) and `openDashboard`.
- dashboard: Intent Match metric tile (anchor day, trailing-7-day fallback),
  insurance line under the rings streak, Monthly Review day-strip
  frozen/repaired markers, "Export recap card" + "Pair week" actions with a
  copy/paste pair board (import validated, partner persisted in
  `ftPartnerCard`).
- digest: Monday-only "Calibrate this week" card (28-day trend vs goal per
  ring, one stepper-step suggestion, Apply/Keep, `focusRingsGoalHistory`
  log, balanced weeks auto-marked so it never nags).
- popup: Companion panel, Unblock Friction select, Vim keys toggle,
  Sleep Guard row (toggle + time pair, defaults 22:30–07:00), home-rings
  insurance hint line; companion toggle defaults true to match the content
  script (first-run consistency fix).

### Verification

- `scripts/test_v117_features.js` (production files in VM sandbox): 33
  assertions across 4 suites — insurance ledger (freeze earning, in-progress
  day never spends, frozen absorption, next-day repair, repair CTA math,
  hard break), gate (tier default/persist/reject, wait scaling + cap,
  escalation), pair (round-trip, checksum tamper rejection, garbage
  rejection, payload-privacy scan), adaptive thresholds — ALL PASS.
- Regressions: `test_daynav_background.js` ALL PASS (30/30);
  `test_v116_monthly_rings.js` ALL PASS.
- Browser (agent-browser, real code in harnesses): companion danger mood
  (bubble + red antenna/brows + ticking 22:0x chip) and panel (site time,
  mood "Alarmed", rings row, saved time, Block site 1h / Snooze / Hide);
  watch-intent sheet over a watch page with chip selection; dashboard
  insurance line + Intent tile + Monthly Review actions; pair board
  round-trip (share text → import → "Partner saved: … 2/7 rings closed" →
  two-row side-by-side board); popup Companion/Friction/Vim panels and
  Sleep Guard row. Screenshots: ui-review/v117/, shipped copies in
  assets/screenshots/ (companion-panel, watch-intent).
- manifest 1.16.1 → 1.17.0; README highlights + roadmap updated.

---

## v1.17.0 · Companion Revamp — Mika & Haru, the anime duo

User review of the Foco mascot asked for an **anime character instead**:
a girl + boy duo, picked in onboarding, with many emotion faces driven by
the live site score, present in every full-screen UI (never the popup), and
guiding each onboarding step Genshin-style. The open-source 3D route was
evaluated first and documented:

- **Search verdict (web search, VRM/VRoid/Sketchfab/BlendSwap/Free3D):** no
  redistributable open-source 3D anime duo (male + female) with emotion
  blendshapes exists for bundling in a distributed extension — VRoid models
  are per-model licensed (permissive but not CC0, no redistribution).
  Per the agreed fallback ("if not found, make them"), the duo is authored
  in-house as parametric vector art.

### New modules

- `src/shared/companion-art.js` — **Mika** (girl: rose twin-tails, ahoge,
  teal clip, cream hoodie) & **Haru** (boy: indigo spikes, headphones,
  slate hoodie): 8 emotion faces (joyful / happy / neutral / worried / sad /
  surprised / sleepy / proud) × 4 poses (idle / wave / guide / cheer),
  ~16 KB pure SVG with per-instance gradient namespacing, CSS blink/bob/
  wave/cheer/fx animations, `prefers-reduced-motion` media query inside the
  SVG, and an `emotionForMood()` bridge for the mood engine. Brows render
  over the bangs (anime convention) so worried/sad tilts stay readable.
- `src/shared/companion-widget.js` — page-side buddy host (closed
  ShadowRoot + speech bubble) for full-screen pages: `mount()` (guided API:
  set emotion/pose/character, sticky bubbles, bottom offset to clear page
  footers) and auto-mount via `<body data-ft-companion="dashboard|blocked|
  digest">` — greets by stored `userName`, derives mood from the day's
  rings, honors `companionEnabled`/`companionCharacter`, z-index matches
  the block overlay so it paints on the block page.

### Changes

- `src/shared/companion.js` — the floating companion now renders the chosen
  anime buddy (was: robot mascot): mood→emotion mapping (idle→neutral,
  good→happy, warn→worried, danger→sad, cheer→joyful, sleep→sleepy), cheer
  mood uses the cheer pose, live `companionCharacter` storage listener with
  a "reporting for duty" bubble, and a **Buddy: Mika | Haru switcher row**
  in the tap panel. Drag/clock/snooze/quick-actions unchanged.
- `src/onboarding/*` — new **Step 1 "Choose your focus buddy"**: name input
  (persisted as `userName`) + animated Mika/Haru selection cards (checks,
  blue ring, wave pose; the guide widget swaps live on selection). A fixed
  guide widget then narrates every step (8-step GUIDE table: emotion +
  pose + `{name}`-personalized line — guide-point on goals/budget, surprised
  on tames, sleepy on quiet hours, worried on firmness, cheer on summary).
  Step indices shift +1 (LAST_STEP 6→7); draft/commit logic unchanged, now
  also writing `companionCharacter` + `userName` in the single atomic set.
- `src/dashboard/dashboard.html`, `src/block-page/blocked.html`,
  `src/digest/digest.html` — body attribute + two script tags each; zero
  page-JS changes (the widget self-mounts from storage data).
- `src/popup/popup.html` — Companion settings description updated for the
  anime duo (toggle only; the character never appears in the popup).
- `manifest.json` — `src/shared/companion-art.js` added before
  `companion.js` in the all_urls content-script entry (art must exist
  before the floating companion renders). Version stays 1.17.0
  (pre-release revamp).

### Verification

- Harnesses (`scripts/build_companion_harness.js` →
  `scripts/companion-harness/`, production code served as-is): emotion/pose
  sheet (2 chars × 8 emotions + 4 poses), onboarding with callback-style
  storage shim, dashboard (daynav harness + buddy), block page, digest,
  and a floating-companion page.
- Browser pass (agent-browser): art sheet reviewed and fixed (brows moved
  over the fringe; twin-tails widened); onboarding walkthrough — step 0
  Mika intro, step 1 name "Alex" + Haru selection (guide swaps live,
  bubble personalizes), guide poses/emotions verified on steps 2–5 and the
  cheer summary; dashboard neutral-wave greeting from seeded rings; block
  page surprised buddy above the overlay (z-index fix); digest "27m saved
  yesterday" data-driven greeting; floating buddy chip + panel + live
  Mika→Haru switch ("Haru here — reporting for duty!").
- `node --check` on all touched JS; `test_daynav_background.js` 30/30 PASS;
  manifest JSON valid. Fresh screenshots shipped:
  `onboarding.png` (now with the guide), `onboarding-buddy.png`,
  `companion-panel.png` (Haru + Buddy row), `companion-duo.png`
  (emotion sheet).

---

## v1.17.0 · README Gallery — Mika & Haru in action (5 new screenshots)

### What changed

- **5 new production screenshots** captured from the shipped UI via the
  companion harnesses:
  - `companion-guide.png` — Mika (surprised) guiding the feed-taming
    onboarding step, speech bubble "The feeds are engineered to keep you.
    We'll tame them together."
  - `companion-cheer.png` — Mika (joyful, cheer pose, sparkles) on the
    final "You're all set." step — "We're all set, Alex! Rings await —
    let's go!" (name personalization visible).
  - `companion-dashboard.png` — Mika waving from the dashboard corner
    ("I'm Mika — I'll keep score while you browse.") over the full
    analytics view.
  - `companion-blocked.png` — **Haru** (surprised) on the block page —
    "Whoa — this one's a rabbit hole, Alex. Future you says thanks." —
    captured via a new `?char=haru&name=Alex` seed hook so the duo is
    both represented.
  - `companion-digest.png` — Mika waving over the morning Daily Briefing
    with real seeded data (80 score, 7-day streak, rings, 7-day bars,
    top sites).
- **README gallery restructured**: new "Genshin-style onboarding
  guidance" row (guide + cheer) and "…then greets every full screen"
  rows (dashboard + blocked, digest centered); closing note now points
  at `companion-duo.png` for the full emotion/pose sheet.

### Harness fixes that enabled the shots

- `scripts/daynav-harness/chrome_stub.js` — the message bus
  `sendMessage(msg)` now accepts the MV3 trailing callback
  (`sendMessage(msg, cb)`), firing it exactly once alongside the
  promise (guard fixed so the 100 ms fallback can never double-invoke
  after real data arrived). Digest/onboarding/block pages use the
  callback style and previously rendered zeros.
- `scripts/build_companion_harness.js` — digest harness now loads the
  **real `background.js`** in-page (stub → background → callback-shim
  order), so `getDashboardStats` routes through production code;
  blocked harness gained the `?char=` / `?name=` seed script (set
  before the widget mounts).

### Verification

- Digest page renders "Yesterday, reviewed — so today can be chosen,
  not drifted." with 80 score / 27m saved / rings / bars / top sites.
- `node --check` on the stub + builder; `test_daynav_background.js`
  30/30 PASS after the stub change (promise-style callers unaffected).
- All 20 README image references verified on disk.
