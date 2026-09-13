# FocusTube — Feature Research & Rationale

*What we build next, and the behavioral science for why.*

This document is the research backbone for the roadmap. Every proposed feature
answers three questions: **what user problem does it solve**, **what evidence
says the mechanism works**, and **where it plugs into the existing code**.
Features are prioritized by expected impact-to-effort, not novelty for its own
sake. Shipped features whose design already leans on published research
(Focus Rings, Daily Briefing, anti-gaming Focus Score) are summarized at the
end for context.

---

## TL;DR — Prioritized Backlog

| # | Feature | Core mechanism | Evidence anchor | Priority | Effort |
|---|---------|----------------|-----------------|----------|--------|
| 1 | Watch Intent ("Why are you here?") | Implementation intentions | Gollwitzer 1999; Mendoza 2018 | P0 | M |
| 2 | Streak Insurance (freeze / repair) | Loss aversion, endowed progress | Kahneman–Tversky 1979; Duolingo streak freeze | P0 | S |
| 3 | Adaptive Ring Goals | Goal-setting theory (specific + attainable) | Locke & Latham 2002 | P1 | S |
| 4 | Graduated Unblock Friction | Friction as self-control prosthesis | Duckworth 2016; Milkman 2012 | P1 | M |
| 5 | Weekly Recap Card (shareable) | Self-monitoring + feedback | Michie et al. 2009 BCT taxonomy | P1 | S |
| 6 | Sleep-Guard Evening Schedules | Circadian alignment, fresh-start | Twenge et al. 2017; Dai 2014 | P2 | S |
| 7 | Accountability Pairing | Commitment devices, social accountability | Ariely & Wertenbroch 2002 | P2 | L |
| 8 | Vim-Style Keyboard Navigation | Interaction cost, flow | Raskovsky; vim-era muscle memory | P3 | M |

---

## 1. Watch Intent — "Why are you here?" (P0)

**Problem.** The single largest failure mode of blocklists is *legitimate
use turned aimless*: the user opens YouTube with a purpose, finishes it, and
then drifts into the recommendations shelf for 40 minutes. Blocking everything
punishes the first half; doing nothing punishes the second half.

**Evidence.** Implementation-intention research (Gollwitzer, 1999; meta-analysis
in *Advances in Experimental Social Psychology*) shows that prompting a person
to state an *if–then* plan ("If I open YouTube, then I will watch X for Y
minutes") dramatically increases goal attainment — effect sizes around
*d* ≈ 0.65 across ~94 studies. Mendoza et al. (2018) applied this to media:
students who wrote a pre-committed media plan consumed significantly less
distraction media than a control group that merely intended "to watch less."
The mechanism is *choice architecture applied to oneself*: the drift path
requires actively contradicting a written intention, which is psychologically
costly (cognitive dissonance, self-consistency motive — Cialdini 2007).

**Proposal.** A lightweight "session card" on YouTube's home/watch pages:
one question — *What are you here for?* — with free-text + suggested chips,
an optional duration estimate, and a "Just browsing" honest-answer button that
starts a *mindful browsing* countdown (e.g., 10 minutes, then the nudge card
asks "still what you came for?"). Intentions are logged to analytics and
surfaced on the Dashboard as an **"Intent match rate"** metric — the
percentage of sessions that ended on-target — which becomes a new Focus Score
quality signal (feeding the anti-gaming redesign).

**Where it plugs in.** New `src/content/youtube/watch-intent.js` following the
time-blocker pattern (CREATE-only observers, `setTextIfChanged` for all timed
text). Storage: `watchIntents` (day-keyed, 120-day retention alongside
`focusAnalyticsDaily`). Dashboard: one new panel + `getDashboardStats` field.

**Why now.** It converts the extension from *blocker* to *coach* — the strategic
direction the Rings USP already established — and it is the single highest-
leverage input to a trustworthy Focus Score.

---

## 2. Streak Insurance — freeze & repair (P0)

**Problem.** The all-rings streak (shipped in v1.15) is the extension's most
visible habit signal, but a single missed day zeroes it. Behavioral-app
telemetry consistently shows that **catastrophic reset is the #1 churn
moment** in streak products: once the streak is lost, perceived progress
returns to zero and users abandon.

**Evidence.** Loss aversion (Kahneman & Tversky, 1979) makes a streak feel
like an *owned asset* — losing it hurts roughly twice as much as an equivalent
gain feels good. The endowed-progress effect (Nunes & Drèze, 2006) explains
why visual progress (our rings) motivates so strongly — and why its loss
demotivates. Duolingo's **Streak Freeze** (a purchasable one-day exemption)
and later **streak repair** were introduced precisely to defuse this churn
point; publicly reported retention curves improved after introduction. The
design principle: *protect the identity ("I am someone who closes rings"),
never the laziness* — a freeze must be scarce and earned.

**Proposal.**
- **1 freeze per week**, auto-consumed when a day ends with 0/3 rings.
  Earned by closing all three rings at least 4 days in the prior week
  (earned, not bought — no monetized escape hatch).
- **Streak repair**: within 24 h of a broken day, completing a "repair
  session" (2× the day's Focused-ring goal in one sitting) restores the
  chain with a visible 🔧 marker instead of pretending nothing happened.
- Both events render in the Monthly Review day strip (small badge overlay)
  so history stays honest.

**Where it plugs in.** `src/shared/focus-rings.js` (`streakFromPoints`,
new `applyInsurance`), background daily-rollover hook, Monthly Review render,
popup rings card copy.

**Why now.** Small, contained, and it directly hardens the flagship USP.

---

## 3. Adaptive Ring Goals (P1)

**Problem.** Static goals decay: a goal that was challenging in week one is
either trivially met (boredom) or chronically missed (hopeless) by week six.
Both states kill the goal-gradient pull the rings depend on.

**Evidence.** Locke & Latham's goal-setting theory (2002, *American
Psychologist*) — the most replicated finding in organizational psychology —
holds that **specific + difficult-but-attainable** goals beat both "do your
best" and impossible goals. Bandura's social-cognitive work adds the
*proximal sub-goal* effect: recursively recalibrated sub-goals sustain
self-efficacy. Consumer validation: Fitbit/Apple Fitness annual "adaptive"
goal nudges; Strava's weekly challenge recalibration.

**Proposal.** Every Monday morning briefing includes a one-tap **"Calibrate
this week"** card: compare each ring's 4-week trend against its goal; suggest
±1 step (using the existing stepper granularity from the v1.16 goals editor).
User confirms or dismisses — never auto-applied (self-set goals outperform
assigned goals; Latham & Locke 2007). Analytics stores `focusRingsGoals`
history so the dashboard can chart "goal difficulty over time."

**Where it plugs in.** Digest.js (card UI), `focusRingsGoals` merge logic in
focus-rings.js is already edit-ready; history list in background daily rollover.

---

## 4. Graduated Unblock Friction (P1)

**Problem.** Unblock paths currently have two states: *quiz* (hard,
uniform) or *nothing*. A single fixed cost is either too weak for heavy
moments or too punishing for legitimate needs — there is no middle.

**Evidence.** Duckworth, Milkman & Laibson (2016, *Psychological Science*,
"Situational Cues and Motivated Behavior") catalog **friction / costly
commitment** as one of the few self-control strategies with strong causal
evidence: adding even seconds of delay or effort to an impulse reliably
reduces enactment (Milkman et al. 2012 on delivery friction; Evans et al.
2016 on window-delivery friction for cigarettes). Crucially, the evidence
supports *graduated* friction: proportionality preserves the user's sense of
autonomy (SDT — Deci & Ryan), which the fixed quiz undermines.

**Proposal.** A friction ladder when the user attempts an unblock:
1. **Reflect** (always): the AI-nudge card, 3-breath animation (exists).
2. **State the reason** (always): one typed line, minimum 12 characters.
3. **Wait-out** (escalates with usage): a 10-second progress bar per unblock,
   scaling to 30 s if this is the 3rd+ unblock today.
4. **Quiz** (only at the highest tier): the existing 5-question gate.
The tier resets daily. Each rung displays *why it exists* (one-line
transparency copy) — procedural justice increases acceptance of imposed costs.

**Where it plugs in.** site-blocker.js / url-blocker.js overlay buttons,
shared `unblock-gate.js`, popup Settings tier selector. Quiz code is reused
verbatim at tier 4.

---

## 5. Weekly Recap Card — shareable PNG (P1)

**Problem.** Self-monitoring data exists in abundance (dashboard), but it is
*seen by one person, in one place, at one moment*. A shareable artifact
multiplies the behavior-change touchpoints: the act of sharing is itself a
commitment signal, and received reactions create accountability.

**Evidence.** Michie et al. (2009, the 93-technique BCT taxonomy used across
health-psychology interventions) rank **feedback on behavior** and
**self-monitoring** among the most effective techniques, with **social
comparison / social support** variants adding further effect when the data
leaves the device. Canvas-based image generation keeps this local — no
upload, consistent with the privacy stance.

**Proposal.** A Weekly Badge view button: **"Export recap card"** renders a
branded 1200×1500 PNG (rings grid, weekly badges, best day, streak, time
saved) entirely via `canvas.toBlob` — zero network. Save/share via the
native share sheet or download. The card doubles as the visual identity for
the future accountability feature (#7).

**Where it plugs in.** `src/shared/recap-card.js` (pure canvas, reuses
compute() from focus-rings.js), dashboard Monthly Review header button.

---

## 6. Sleep-Guard Evening Schedules (P2)

**Problem.** Late-night YouTube is the highest-harm window (sleep displacement,
next-day attention loss), yet scheduling today requires the user to think in
clock times and remember to arm anything.

**Evidence.** Twenge, Krizan & Hisler (2017) link evening screen time to
delayed sleep onset and shortened duration at population scale. The
fresh-start effect (Dai, Milkman & Riis, 2014) — already the design basis of
our morning briefing — has a mirror image: *night is the worst time to start
anything*, which is why the Digest deliberately never auto-opens at night.
An evening wind-down that *removes the option* outperforms willpower exactly
when willpower is weakest (ego-depletion literature remains contested, but
the cue-removal mechanism is robust regardless).

**Proposal.** "Sleep Guard" preset on the existing scheduled-block engine:
sunset-to-sunrise relative schedule (auto-computed weekly via local timezone
math, no network), one toggle. Wind-down digest auto-opens 30 min before
block time. Escalation-free: same graduated unblock ladder as #4.

**Where it plugs in.** background.js schedule evaluation (time-blocker already
consumes `scheduleBlockEnabled/Start/End` — presets are pure seed logic),
popup Focus tab preset chip, digest.js `mode=evening` timing hook.

---

## 7. Accountability Pairing (P2, large)

**Problem.** Willpower is social. The extension currently has zero social
surface — a deliberate privacy choice that also forfeits the strongest
external commitment device.

**Evidence.** Ariely & Wertenbroch (2002, *Psychological Science*) showed
self-imposed *deadlines with teeth* improve performance; partners who witness
the deadline are the cheapest "teeth." Meta-analyses of social accountability
(e.g., in goal-striving literature) show moderate-to-large gains when
progress is *observed by a specific other*, not broadcast to an audience.
Caveat: requires careful privacy engineering.

**Proposal.** Opt-in **pair code**: two installs exchange a signed weekly
digest blob (rings grid + badges only — no URLs, no topics, no history)
through the user's own transport (copy/paste link, or optional tiny relay).
Partner sees your ring week next to theirs. Architecture keeps the relay
stateless and content-blind (E2E encrypted payload), preserving the
local-first promise.

**Where it plugs in.** New `src/shared/pair-digest.js`, monthly-archive export
path already produces the exact data shape needed (scoped, mergeable JSON) —
the pairing layer is transport + UI, not a data-model change.

---

## 8. Vim-Style Keyboard Navigation (P3)

**Problem (honest trade-off).** Carried over from the original roadmap.
Keyboard-only browsing reduces interaction cost — but for FocusTube the goal
is *reduced total engagement*, so speed features must be framed carefully:
*j/k* navigation plus **`<Esc>`-to-leave** and a **"close tab"** master key
(`x`) reduce *lingering* (the actual harm) even if per-interaction is faster.

**Evidence.** Interaction-cost literature (Hornbæk & Hertzum, 2017 review):
lowering per-action cost changes *distribution* of actions, not just total;
pairing with a salient exit affordance shifts sessions toward deliberate
consumption. This is a power-user feature and ships last, behind a flag,
with the exit keys as first-class citizens.

---

## Research basis of already-shipped behavior design (context)

| Shipped | Mechanism | Anchor |
|---------|-----------|--------|
| Focus Rings USP (v1.15–1.16) | Goal-gradient effect; multi-unit rings (Move/Exercise/Stand analog); display-not-score inherits anti-gaming | Hull 1932; Kivetz 2006; Apple Fitness pattern |
| Ring-closing celebration | Variable reward on completion; peak-end rule | Skinner (schedules); Kahneman peak-end |
| Editable goals | Self-set > assigned goals | Latham & Locke 2007 |
| Monthly Review + weekly badges | Endowed progress; chunking long horizons | Nunes & Drèze 2006 |
| Monthly archive files (focustube-<Month>-<Year>.json) | Unbounded files decay trust; monthly chunks match mental accounting | Thaler mental accounting |
| Morning Daily Briefing | Fresh-start effect; never opens at night | Dai, Milkman & Riis 2014 |
| Focus Score anti-gaming redesign | Diminishing-returns curves, per-day category caps, diversity weighting — score reflects *quality of attention*, not raw button presses | SDT (Deci & Ryan); Goodhart's law guard |
| Onboarding setup assistant | Pico-questions reduce activation energy; early personalization investment (IKEA effect) | Norton 2012 |

## Deliberately *not* on the roadmap

- **Cloud accounts / telemetry**: contradicts the core privacy promise; every
  feature above is achievable locally or via user-owned transport.
- **Aggressive "nanny" defaults**: hard blocks without graduated paths increase
  uninstall-and-binge risk; autonomy-supportive design retains users.
- **Gamified points shop / rewards marketplace**: extrinsic rewards crowd out
  intrinsic motivation (Deci, Koestner & Ryan 1999 meta-analysis) — rings are
  deliberately display, not currency.

---

*Sources summary: Gollwitzer 1999; Mendoza et al. 2018; Kahneman & Tversky 1979;
Nunes & Drèze 2006; Locke & Latham 2002/2007; Bandura 1997; Duckworth, Milkman
& Laibson 2016; Milkman et al. 2012; Michie et al. 2009; Twenge, Krizan &
Hisler 2017; Dai, Milkman & Riis 2014; Ariely & Wertenbroch 2002; Deci & Ryan
1985/2000; Deci, Koestner & Ryan 1999; Cialdini 2007; Hornbæk & Hertzum 2017;
Norton, Mochon & Ariely 2012.*
