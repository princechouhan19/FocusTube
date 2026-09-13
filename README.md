<p align="center">
  <img src="src/icons/banner.png" alt="FocusTube" width="420" />
</p>

<h1 align="center">FocusTube — Productivity &amp; Distraction Control for YouTube</h1>

<p align="center">
  <strong>A privacy-first Chrome extension (Manifest V3) that turns YouTube from a slot machine back into a tool.</strong><br/>
  Block distractions, close your daily Focus Rings, and get a morning briefing that shows yesterday — before today drifts.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.17.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white" alt="MV3" />
  <img src="https://img.shields.io/badge/cloud-100%25%20local-success" alt="local-only" />
  <img src="https://img.shields.io/badge/telemetry-none-success" alt="no telemetry" />
  <img src="https://img.shields.io/badge/design-Apple%20HIG--inspired-black" alt="design" />
</p>

---

## 📸 See it

**Dashboard — the full picture** (Focus Score, Focus Rings, day navigation, heatmap, monthly review with weekly badges):

<p>
  <img src="assets/screenshots/dashboard-overview.png" alt="Dashboard overview" width="49%" />
  <img src="assets/screenshots/dashboard-analytics.png" alt="Dashboard analytics" width="49%" />
</p>

<p align="center">
  <img src="assets/screenshots/dashboard-month.png" alt="Dashboard month view with Monthly Review, rings day-by-day and weekly badges" width="86%" />
</p>

**Popup — the control center** (one click from any page):

<p>
  <img src="assets/screenshots/popup-home.png" alt="Popup home" width="32%" />
  <img src="assets/screenshots/popup-focus.png" alt="Popup focus controls" width="32%" />
  <img src="assets/screenshots/popup-goals.png" alt="Focus Rings goals editor" width="32%" />
</p>

**Interventions — where the protection happens:**

<p>
  <img src="assets/screenshots/overlay-focus-timer.png" alt="Focus Timer overlay with live countdown" width="49%" />
  <img src="assets/screenshots/overlay-site-block.png" alt="Site blocked overlay with focus nudge" width="49%" />
</p>

<p>
  <img src="assets/screenshots/block-page.png" alt="Time limit reached block page" width="49%" />
  <img src="assets/screenshots/digest-morning.png" alt="Morning Daily Briefing" width="49%" />
</p>

**The Companion, Watch Intent — v1.17.0 flagship features:**

<p>
  <img src="assets/screenshots/onboarding-buddy.png" alt="Choose your anime focus buddy — Mika or Haru — during onboarding" width="49%" />
  <img src="assets/screenshots/companion-panel.png" alt="Haru, the floating anime buddy: live site clock, mood engine, buddy switcher and quick actions" width="49%" />
</p>

**Genshin-style onboarding guidance — your buddy reacts, poses and personalizes every bubble:**

<p>
  <img src="assets/screenshots/companion-guide.png" alt="Mika reacts with a surprised face while guiding the feed-taming step of onboarding" width="49%" />
  <img src="assets/screenshots/companion-cheer.png" alt="Mika cheers with sparkles on the final step — We're all set, Alex! Rings await" width="49%" />
</p>

**…then greets every full screen — dashboard, block page and the morning briefing:**

<p>
  <img src="assets/screenshots/companion-dashboard.png" alt="Mika waves from the dashboard corner — I'm Mika, I'll keep score while you browse" width="49%" />
  <img src="assets/screenshots/companion-blocked.png" alt="Haru's surprised face on the block page — Whoa, this one's a rabbit hole, Alex. Future you says thanks" width="49%" />
</p>

<p align="center">
  <img src="assets/screenshots/companion-digest.png" alt="Mika opens the morning briefing — Morning! 27m saved yesterday, let's beat it" width="49%" />
</p>

**The anime duo — 8 emotion faces each, driven by the live site score:**

<p align="center">
  <img src="assets/screenshots/companion-duo.png" alt="Mika & Haru emotion sheet: joyful, happy, neutral, worried, sad, surprised, sleepy, proud" width="86%" />
</p>

**First run — an iOS-style setup assistant guided by your buddy:**

<p>
  <img src="assets/screenshots/onboarding.png" alt="Onboarding setup assistant" width="49%" />
  <img src="assets/screenshots/watch-intent.png" alt="Watch Intent — what are you here for?" width="49%" />
</p>

> All screenshots are real production UI captured from the shipped extension — no mockups. See [`assets/screenshots/`](assets/screenshots/) for the full set, including the YouTube controls tab (`popup-youtube.png`), general settings (`popup-settings.png`) and the full Mika & Haru emotion/pose sheet (`companion-duo.png`).

---

## ✨ Highlights

### 🎌 Mika & Haru — your anime focus buddies (NEW in v1.17)
Pick your guide during onboarding — **Mika** (warm & cheery) or **Haru** (calm & steady) — then they show up everywhere that matters:
- **In onboarding, Genshin-style** — the buddy stands beside every setup step, pointing at the controls, reacting with its own emotion and pose (wave / guide / cheer), and personalizes every speech bubble with your name.
- **On every site (floating)** — a chibi-anime buddy with a live site clock, an emotion face driven by the site's score (happy on deep work, worried on feeds, sad in rabbit holes, joyful when your rings close), research-phrased nudges, and a tap-to-expand panel: rings, saved time, *Block site 1h · Snooze 1h · Hide here* — plus a live **Mika ⇄ Haru switcher**.
- **On every full screen** — the buddy greets you on the dashboard (mood from today's rings), the block page (surprised — "future you says thanks") and the morning digest (proud of your saved minutes). Deliberately absent from the popup/sidebar.
- **8 emotion faces × 4 poses × 2 characters**, hand-authored parametric SVG (~16 KB, no model downloads, crisp at every DPI) — the duo was built in-house after a search found no redistributable open-source 3D anime pair with a full emotion set. Closed ShadowRoot, drag-anywhere, per-site hide, honors `prefers-reduced-motion`.

### 🎯 Watch Intent — "What are you here for?" (NEW in v1.17)
An implementation-intention prompt on YouTube watch pages (Gollwitzer 1999): state your purpose + planned minutes once, and the dashboard gains an **Intent Match rate** — the share of sessions that ended on-purpose. "Just browsing" starts an honest mindful countdown that re-asks when it expires.

### 🛡️ Streak Insurance (NEW in v1.17)
Freezes are **earned, never bought**: close all rings on 4+ days in a week and the next week banks one freeze that absorbs a missed day (🛡). Miss without one and you can still **repair** the chain — 2× your Focused goal the next day (🔧). The whole ledger is *derived* from your history, so it can't drift or be forged.

### 📈 Adaptive Ring Goals (NEW in v1.17)
Monday's briefing compares your 4-week trend against each goal and suggests one calibration step up or down — **you** apply or keep (self-set goals outperform assigned ones).

### 🚦 Graduated Unblock Friction (NEW in v1.17)
The one-click "Temporarily Unblock" becomes a ladder that scales with your day: state a reason (≥12 chars) → a 10–30s pause that grows with each unblock today → quiz on Strict or after 3+ unblocks. Off/Standard/Strict in Settings.

### 🖼️ Weekly Recap Card & 🤝 Accountability Pairing (NEW in v1.17)
Export your ring week as a branded PNG (100% canvas, local). Then trade pair cards with a partner by copy/paste — only ring counts leave your device, checksum-tamper-evident, no server ever.

### 🌙 Sleep Guard (NEW in v1.17)
An evening YouTube block (default 22:30–07:00) plus a wind-down briefing opened 30 minutes before it starts — once per day.

### ⌨️ Vim-style keys (NEW in v1.17, opt-in)
j/k scroll, gg/G, f, t — and the exit keys are first-class: **Esc goes back, x closes the tab**, ? shows help.

### 🎯 Focus Rings — the habit system (USP)
An Apple-Fitness-style triple activity ring, purpose-built for attention:
- **Deflected** (red) — ads, Shorts & urges skipped · **Focused** (green) — Pomodoro focus minutes · **Saved** (cyan) — minutes returned by blockers.
- **Editable goals** in Settings — challenge, but reachable; changes apply instantly everywhere.
- **Ring-closing celebration** — sparks, glow and an all-rings award when your day closes 3/3 (fully disabled under `prefers-reduced-motion`).
- **Weekly badges & Monthly Review** — gold/silver/bronze week tiers, a day-by-day mini-ring strip, best-day line.
- **Anti-gaming by design** — rings display behavior; the Focus Score underneath uses diminishing returns, daily caps and diversity weighting so pressing "Block 30 min" 100× cannot buy a 100 score.

### 🌅 Daily Briefing
The first browser open of the day shows **yesterday**: Focus Score, rings, 7-day trend chart, where your time went — plus the research-backed reason mornings beat nights (fresh-start effect). Evening opens become a Wind-Down recap of *today* instead.

### 🛡️ Layered distraction control
- **Per-site & per-category blocking** (Smart Lists: Social, Gaming, News, Shopping…), keyword & channel blocking, Shorts removal.
- **Focus Timers** — quick 5/15/30/60-min locks and scheduled blocks with live, real-time countdowns (ticking every second, mm:ss → h:mm:ss aware).
- **Interventions that teach** — AI-nudge cards with a 3-breath animation and a willpower counter, quiz-gated unblocks, live block interstitials.

### 📦 Monthly data archives
Sync to a folder you own — **one small file per month** (`focustube-<Month>-<Year>.json`), rotated automatically at month end. No file ever grows unbounded; every month is a portable archive. Picking a folder imports the months already in it. Browsers without the File System Access API keep Export / Import.

### 🎨 One design system, everywhere
Every surface — popup, dashboard, overlays, block page, digest, onboarding — shares the Apple-HIG-inspired token system in `src/shared/apple-ui.css`: SF Pro/SF Mono type ramps, inset-grouped cards, semantic iOS colors, spring easing, and full `prefers-reduced-motion` support.

---

## 🧭 Feature Map

| Area | What you get |
|------|--------------|
| **Video page** | AI Summary modal (Gemini/OpenAI/etc., BYO key), Shorts eradication, ad skipping, autoplay terminator, force-highest-quality |
| **Blocking** | URL / keyword / channel / Smart Lists / per-site time limits with live timers |
| **Focus** | Pomodoro (25/5/15, Deep Work auto-block), scheduled blocks, quiz gate |
| **Insights** | Focus Score (anti-gaming), Focus Rings, 30-day heatmap, activity timeline, watch-time topics, hashtag/topic tracking, day navigation (day/week/month), lifetime totals |
| **Data** | Monthly archive sync, JSON export/import, 120-day local history |
| **Extras** | Tab Manager (workspaces, grouping), willpower points, Daily Briefing, onboarding assistant |

---

## 🔐 Privacy & Security

- **100% local.** Blocking, scoring, analytics and the rings compute on-device. No account, no cloud, no telemetry pipeline.
- **You own the data.** Sync goes to a folder *you* choose; payloads are plain JSON you can read.
- **Clean auth.** No Google account scopes — the extension scrapes public DOM, never your private account data.
- **Hardened MV3.** Validated message payloads, escaped AI output, minimal `web_accessible_resources`. See [`SECURITY.md`](SECURITY.md).

---

## 🚀 Installation

1. Download or clone this repository.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the `FocusTube` folder (the one containing `manifest.json`).
4. Pin FocusTube — the first open walks you through the setup assistant.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [`docs/QUICK_START.md`](docs/QUICK_START.md) | Get running in 5 minutes |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design & data flows |
| [`docs/API.md`](docs/API.md) | Module & message API reference |
| [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) | Folder guide |
| [`docs/FEATURE_RESEARCH.md`](docs/FEATURE_RESEARCH.md) | **Researched roadmap — what's next and the science behind it** |
| [`IMPROVEMENTS.md`](IMPROVEMENTS.md) | Complete version-by-version changelog |
| [`SECURITY.md`](SECURITY.md) | Threat model & hardening history |

---

## 🗺️ Roadmap (researched)

v1.17.0 shipped the researched wave — see
[`docs/FEATURE_RESEARCH.md`](docs/FEATURE_RESEARCH.md) for the full
mechanism → evidence → integration map. What's next:

1. **Watch Intent → Focus Score quality signal** — intents already logged; wire the match rate into score v3 (P0)
2. **Companion 3D variant** — optional WebGL model behind the same mood engine (P2)
3. **Goal-difficulty-over-time chart** — `focusRingsGoalHistory` is already recorded (P2)
4. **Encrypted pair relay** — optional tiny relay for hands-free partner sync (P3)

---

## 🤝 Contributing

PRs welcome — especially: expanding the Focus Score's quality signals, new
Smart List presets, accessibility passes, and translations. Because FocusTube
heavily touches YouTube's DOM, selector drift is the main maintenance cost;
see [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) before editing
content scripts.
