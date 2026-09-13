/**
 * FocusTube — Focus Rings (v1.15.0 USP)
 * =====================================
 * Apple Fitness-style triple activity ring, rebuilt for attention.
 *
 * Design thesis (the "if Apple shipped it" bar):
 *   Fitness gave the world "close your rings" — three goals, three colors,
 *   one daily ritual. FocusTube already records three honest daily metrics
 *   that map one-to-one onto that ritual:
 *
 *     ● Deflected (Move red   #FA114F)  ads blocked + Shorts skipped + urges quit
 *     ● Focused   (Exercise green #92E82A)  pomodoro focus minutes banked
 *     ● Saved     (Stand cyan   #00FDDC)  minutes saved by blockers/timers
 *
 *   Why this is the right USP, not a gimmick:
 *   · Goal-gradient effect (Hull 1932; Kivetz, Urminsky & Zheng 2006) —
 *     visible progress toward a near goal accelerates effort. A ring that is
 *     80% closed is the strongest "one more session" nudge we can draw.
 *   · Distinct units per ring (count / minutes / minutes) mirror Fitness'
 *     Move/Exercise/Stand mix — variety keeps one weak metric from feeling
 *     like the whole day failed.
 *   · The ring is a display, not a score: it feeds on the same anti-gaming
 *     daily metrics as Focus Score v2 (union-based time saved), so closing
 *     rings stays honest.
 *
 * Usage:
 *   const goals = await FGRings.readGoals();               // storage-aware
 *   const data   = FGRings.compute(dayTotals, goals);      // pure function
 *   FGRings.render(el, data, { size: 168, showLegend: true });
 *
 *   data = {
 *     deflected: { value, goal, pct, closed },
 *     focused:   { value, goal, pct, closed },
 *     saved:     { value, goal, pct, closed },
 *     closedCount, allClosed
 *   }
 *
 * Day points helpers (dashboard month points are ordered oldest → newest):
 *   FGRings.streakFromPoints(points, goals) → { days, atRisk }
 *
 * Goals are editable: the popup Settings “Focus Rings” panel writes the
 * `focusRingsGoals` storage key ({ deflected, focusMinutes, savedMinutes }),
 * which readGoals() merges over the defaults.
 *
 * Celebration (v1.16.0): when a ring closes, maybeCelebrate() fires a
 * Fitness-style particle burst + glow flash on that ring, and a golden
 * award chip when all three close. Already-celebrated (day, ring) pairs are
 * recorded in the `focusRingsCelebrated` storage key so the animation fires
 * exactly once per ring per day, across every surface (popup, dashboard).
 *
 * Rendering is self-contained: styles are injected once (#fg-rings-style),
 * colors expose overridable custom properties (--fg-move/-exercise/-stand),
 * and every animation honors prefers-reduced-motion.
 */

(function () {
  "use strict";

  const RING_META = [
    { key: "deflected", label: "Deflected", unit: "count",
      color: "var(--fg-move, #FA114F)", hint: "Ads, Shorts & urges skipped" },
    { key: "focused", label: "Focused", unit: "minutes",
      color: "var(--fg-exercise, #92E82A)", hint: "Pomodoro focus time" },
    { key: "saved", label: "Saved", unit: "minutes",
      color: "var(--fg-stand, #00FDDC)", hint: "Time saved by blockers" },
  ];

  const DEFAULT_GOALS = {
    deflected: 12,       // distractions per day
    focusMinutes: 120,   // ~5 × 25m pomodoros
    savedMinutes: 60,    // one focused hour returned
  };

  // Storage key written by the popup “Focus Rings” goals editor and read by
  // every surface through readGoals().
  const GOALS_STORAGE_KEY = "focusRingsGoals";
  // Storage key recording which rings have already been celebrated on which
  // day, so the burst animation fires exactly once per ring per day.
  const CELEBRATED_STORAGE_KEY = "focusRingsCelebrated";
  const CELEBRATED_PRUNE_DAYS = 60;

  // Fitness geometry: three thick rings, small even gaps, rotated so the
  // stroke starts at 12 o'clock like a watch complication.
  const GEOMETRY = [
    { r: 52, width: 9 },
    { r: 41, width: 9 },
    { r: 30, width: 9 },
  ];
  const VIEW = 120;

  // ---------------------------------------------------------------------------
  // Pure computation
  // ---------------------------------------------------------------------------

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  function normalizeGoals(goals) {
    const g = goals || {};
    const num = (v, fallback, min, max) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return fallback;
      return Math.min(max, Math.max(min, Math.round(n)));
    };
    return {
      deflected: num(g.deflected, DEFAULT_GOALS.deflected, 1, 500),
      focusMinutes: num(g.focusMinutes, DEFAULT_GOALS.focusMinutes, 10, 960),
      savedMinutes: num(g.savedMinutes, DEFAULT_GOALS.savedMinutes, 5, 960),
      // Minutes of focus banked per completed pomodoro (storage-aware).
      focusMinutesPerSession: num(g.focusMinutesPerSession, 25, 5, 180),
    };
  }

  /**
   * @param {object} day  Daily analytics totals — the METRIC_TO_TOTAL_KEY
   *                      shape produced by background recordMetric:
   *                      { adsBlocked, shortsSkipped, quitsEarly,
   *                        pomodoroCompleted, timeSavedMinutes, ... }
   * @param {object} goals normalizeGoals() output (or a subset)
   */
  function compute(day, goals) {
    const g = normalizeGoals(goals);
    const d = day || {};
    const n = (v) => Math.max(0, Number(v) || 0);

    const deflected = n(d.adsBlocked) + n(d.shortsSkipped) + n(d.quitsEarly);
    const focused = n(d.pomodoroCompleted) * g.focusMinutesPerSession;
    const saved = n(d.timeSavedMinutes);

    const ring = (value, goal) => {
      const safeGoal = Math.max(1, goal);
      return {
        value,
        goal: safeGoal,
        pct: clamp01(value / safeGoal),
        closed: value >= safeGoal,
      };
    };

    const out = {
      deflected: ring(deflected, g.deflected),
      focused: ring(focused, g.focusMinutes),
      saved: ring(saved, g.savedMinutes),
    };
    out.closedCount =
      (out.deflected.closed ? 1 : 0) +
      (out.focused.closed ? 1 : 0) +
      (out.saved.closed ? 1 : 0);
    out.allClosed = out.closedCount === 3;
    return out;
  }

  /**
   * Storage-aware goals: honors the user's configured pomodoro length so the
   * Focused ring reflects real focus time, not an assumed 25 minutes.
   * Safe to call in any context with chrome.storage (or none — falls back).
   */
  async function readGoals() {
    const goals = { ...DEFAULT_GOALS };
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
        const stored = await chrome.storage.local.get([
          "pomodoroFocusMinutes",
          GOALS_STORAGE_KEY,
        ]);
        const mins = Number(stored && stored.pomodoroFocusMinutes);
        if (Number.isFinite(mins) && mins >= 5 && mins <= 180) {
          goals.focusMinutesPerSession = Math.round(mins);
        }
        // User-edited ring goals (popup Settings → Focus Rings) win over
        // the defaults; invalid values fall back through normalizeGoals().
        const edited = stored && stored[GOALS_STORAGE_KEY];
        if (edited && typeof edited === "object") {
          const normalized = normalizeGoals(edited);
          goals.deflected = normalized.deflected;
          goals.focusMinutes = normalized.focusMinutes;
          goals.savedMinutes = normalized.savedMinutes;
        }
      }
    } catch (_) {
      /* storage unavailable — defaults are fine */
    }
    return goals;
  }

  /**
   * Award tier for a week of closed days — mirrors Apple Fitness awards:
   * gold for a near-perfect week, silver for solid, bronze for started.
   * @param {number} closedDays  days in the week where all 3 rings closed
   * @param {number} totalDays   days in the week (7, or partial for edge weeks)
   */
  function badgeTier(closedDays, totalDays) {
    const closed = Math.max(0, Number(closedDays) || 0);
    const total = Math.max(1, Number(totalDays) || 7);
    // Partial current weeks can only earn what was still closeable — scale
    // the bar so a Wednesday with 3/3 closes already glitters.
    const bar = total >= 7 ? closed : closed * (7 / total);
    if (bar >= 5) return "gold";
    if (bar >= 3) return "silver";
    if (bar >= 1) return "bronze";
    return "none";
  }

  /**
   * Consecutive "all three rings closed" days, counting backwards from the
   * newest point. A newest point that hasn't closed yet (today, in progress)
   * does NOT break the streak — it's reported as atRisk instead. This mirrors
   * habit-app convention: missing one unfinished day is not failure, and
   * "don't break the chain" should motivate, not guilt-trip.
   *
   * @param {Array} points  Day points ordered oldest → newest (report.month.points)
   */
  function streakFromPoints(points, goals) {
    const list = Array.isArray(points) ? points : [];
    if (list.length === 0) return { days: 0, atRisk: false };

    const closed = (p) => compute(p, goals).allClosed;
    let end = list.length - 1;
    let atRisk = false;
    if (!closed(list[end])) {
      atRisk = true; // newest day still open — protect the existing streak
      end -= 1;
    }
    let days = 0;
    for (let i = end; i >= 0; i -= 1) {
      if (!closed(list[i])) break;
      days += 1;
    }
    return { days, atRisk };
  }

  // ---------------------------------------------------------------------------
  // v1.17.0 — Streak Insurance (derived, not stored)
  // ---------------------------------------------------------------------------
  // Why derived: any stored freeze counter can drift from the history it
  // claims to describe (import/merge, clock changes, cleared keys). Instead
  // the whole insurance ledger is RE-DERIVED from the same day points the
  // rings render from, so what the user sees is always consistent with the
  // data. Rules (see docs/FEATURE_RESEARCH.md §2):
  //   · Every Monday-start week in which the previous week had ≥4 all-rings
  //     days earns 1 freeze (earned, never bought — protect the identity,
  //     not the laziness).
  //   · A broken day with a freeze available is absorbed as `frozen`
  //     (chain continues, marker shown).
  //   · Without a freeze, the NEXT day repairing it — ≥2× the Focused-ring
  //     goal in pomodoro minutes that day — marks it `repaired` (chain
  //     continues with an honest 🔧, not a pretend nothing happened).
  //   · Otherwise the chain breaks, exactly as before.

  /** Monday-start week key "2026-W37" from a YYYY-MM-DD day key. */
  function weekKeyOf(dayKey) {
    const [y, m, d] = String(dayKey).split("-").map(Number);
    if (!y || !m || !d) return "";
    const date = new Date(y, m - 1, d, 12);
    // ISO-ish Monday-start week index (local time; DST-safe at noon).
    const day = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
    date.setDate(date.getDate() - day);
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    const thursday = new Date(weekStart);
    thursday.setDate(thursday.getDate() + 3);
    return `${thursday.getFullYear()}-W${String(
      Math.ceil(
        ((thursday - new Date(thursday.getFullYear(), 0, 1, 12)) / 86400000 + 1) / 7,
      ),
    ).padStart(2, "0")}`;
  }

  /**
   * Full insurance walk over day points (oldest → newest, the report order).
   * @returns {{
   *   days: Array<{dayKey, closed, marker}>,
   *   freezesEarned, freezesUsed, freezesLeft,
   *   streak: {days, atRisk},
   *   repair: {neededMinutes, haveMinutes, dayKey} | null,
   *   brokenDays: number
   * }}
   */
  function insuranceFromPoints(points, goals, opts = {}) {
    const list = Array.isArray(points) ? points.filter(Boolean) : [];
    const effGoals = normalizeGoals({ ...DEFAULT_GOALS, ...(goals || {}) });
    const focusGoalMin = effGoals.focusMinutes;
    const repairMultiplier = 2;

    const days = [];
    let freezePool = 0;
    let freezesEarned = 0;
    let freezesUsed = 0;
    let lastWeekKey = null;
    let prevWeekClosed = 0;
    let chain = 0;
    let streakBrokenAt = -1;
    let repair = null;

    const closedOf = (p) => compute(p, effGoals).allClosed;

    list.forEach((p, i) => {
      const dayKey = (p && p.dayKey) || keyOfIndex(i, list);
      const wk = weekKeyOf(dayKey);
      const closed = closedOf(p);

      if (wk !== lastWeekKey) {
        // New week begins: bank last week's earned freeze (≥4 all-rings days).
        if (lastWeekKey !== null && prevWeekClosed >= 4) {
          freezePool += 1;
          freezesEarned += 1;
        }
        lastWeekKey = wk;
        prevWeekClosed = 0;
      }
      if (closed) prevWeekClosed += 1;

      const isLast = i === list.length - 1;
      let marker = null;
      let continues = closed;

      if (!closed && !isLast) {
        if (freezePool > 0) {
          freezePool -= 1;
          freezesUsed += 1;
          marker = "frozen";
          continues = true;
        } else {
          const next = list[i + 1];
          // Pomodoro counts are SESSIONS — convert to minutes with the same
          // per-session length compute() uses (25m default), then compare
          // against 2× the Focused goal in minutes.
          const perSession = Number(effGoals.focusMinutesPerSession) || 25;
          const nextFocusedMin =
            Math.max(0, Number((next && next.pomodoroCompleted) || 0)) * perSession;
          if (nextFocusedMin >= focusGoalMin * repairMultiplier) {
            marker = "repaired";
            continues = true;
          } else if (i === list.length - 2) {
            // Yesterday broke with no freeze and today has not repaired it
            // yet — offer a live repair CTA sized in today's currency
            // (focus minutes still to bank).
            repair = {
              neededMinutes: focusGoalMin * repairMultiplier,
              haveMinutes: nextFocusedMin,
              dayKey,
            };
          }
        }
        if (!continues && streakBrokenAt < 0) streakBrokenAt = i;
      }

      if (continues && streakBrokenAt < 0) chain += 1;
      days.push({ dayKey, closed, marker });
    });

    // The newest point still open protects the existing chain (atRisk), and
    // if it is ALSO a broken day with a freeze available, hold the freeze —
    // never auto-spend on an in-progress day.
    const newest = list[list.length - 1];
    const atRisk = newest ? !closedOf(newest) : false;

    return {
      days,
      freezesEarned,
      freezesUsed,
      freezesLeft: freezePool,
      streak: { days: chain, atRisk },
      repair,
      brokenDays: days.filter((d) => !d.closed && !d.marker).length,
    };

    // Points may or may not carry .dayKey depending on the caller; fall back
    // to synthetic keys so week bucketing still works.
    function keyOfIndex(i, arr) {
      return (arr[i] && arr[i].dayKey) || `synthetic-${String(i).padStart(4, "0")}`;
    }
  }

  /**
   * streakWithInsurance(points, goals) → streakFromPoints result enriched
   * with insurance ledger. Used by dashboard/popup in v1.17.0+.
   */
  function streakWithInsurance(points, goals) {
    const ins = insuranceFromPoints(points, goals);
    return {
      days: ins.streak.days,
      atRisk: ins.streak.atRisk,
      insurance: ins,
    };
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  function formatMinutes(minutes) {
    const m = Math.max(0, Math.round(Number(minutes) || 0));
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
  }

  function formatRingValue(ring, unit) {
    if (unit === "minutes") return formatMinutes(ring.value);
    return String(Math.round(ring.value));
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  let stylesInjected = false;

  function injectStyles() {
    if (stylesInjected || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.id = "fg-rings-style";
    style.textContent = `
.fg-rings { position: relative; display: inline-block; line-height: 1; }
.fg-rings svg { display: block; width: 100%; height: auto; }
.fg-rings .fg-track { fill: none; }
.fg-rings .fg-fill {
  fill: none;
  transition: stroke-dashoffset 0.9s cubic-bezier(0.32, 0.72, 0.24, 1);
}
.fg-rings.is-static .fg-fill { transition: none; }
.fg-rings-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: var(--ios-font, -apple-system, "SF Pro Text", "Segoe UI", sans-serif);
  color: var(--ios-label, #FFFFFF);
  pointer-events: none;
}
.fg-rings-center .fg-count {
  font-weight: 700;
  font-size: 1.375em;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.fg-rings-center .fg-cap {
  font-size: 0.625em;
  font-weight: 500;
  color: var(--ios-label-2, rgba(235,235,245,0.6));
  margin-top: 0.2em;
}
.fg-legend { display: flex; flex-direction: column; gap: 0.45em; min-width: 0; }
.fg-legend-row {
  display: flex; align-items: center; gap: 0.5em;
  font-family: var(--ios-font, -apple-system, "SF Pro Text", "Segoe UI", sans-serif);
  color: var(--ios-label, #FFFFFF);
}
.fg-dot { width: 0.55em; height: 0.55em; border-radius: 50%; background: var(--c); flex: none; }
.fg-legend-label { font-size: 0.8em; font-weight: 600; }
.fg-legend-hint { font-size: 0.68em; color: var(--ios-label-2, rgba(235,235,245,0.6)); }
.fg-legend-val {
  margin-left: auto; font-size: 0.8em; font-weight: 600;
  font-variant-numeric: tabular-nums; color: var(--ios-label, #FFFFFF);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .fg-rings .fg-fill { transition: none; }
}
/* ── Celebration (v1.16.0) — Fitness-style ring-closing burst ───────────── */
/* Particles radiate from the ring that just closed. Each .fg-spark is an
   8-spoke arm rotated by --a; the dot travels outward from the ring's own
   radius (--r0) to beyond the widget edge (--r1) while fading out. */
.fg-rings { overflow: visible; }
.fg-burst {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 2;
}
.fg-spark {
  position: absolute; left: 50%; top: 50%;
  width: 0; height: 0;
  transform: rotate(var(--a));
  animation: fg-spark-fly 0.85s cubic-bezier(0.16, 0.84, 0.3, 1) forwards;
}
.fg-spark::before {
  content: "";
  position: absolute;
  width: 0.32em; height: 0.32em;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 0.45em 0.08em var(--c);
  left: calc(var(--r0) - 0.16em);
  top: -0.16em;
}
@keyframes fg-spark-fly {
  0%   { transform: rotate(var(--a)) translateX(0); opacity: 0; }
  12%  { opacity: 1; }
  100% { transform: rotate(var(--a)) translateX(var(--r1)); opacity: 0; }
}
/* Glow flash on the SVG ring that just closed. */
.fg-fill.fg-just-closed {
  animation: fg-ring-glow 1.1s cubic-bezier(0.32, 0.72, 0.24, 1) 1;
}
@keyframes fg-ring-glow {
  0%   { filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
  35%  { filter: drop-shadow(0 0 6px rgba(255,255,255,0.9)) brightness(1.45); }
  100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)) brightness(1); }
}
/* Center 0/3 counter pop when the number changes. */
.fg-rings-center.fg-pop .fg-count { animation: fg-count-pop 0.6s cubic-bezier(0.2, 1.4, 0.4, 1) 1; }
@keyframes fg-count-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.35); }
  100% { transform: scale(1); }
}
/* Golden award chip for all-three-closed. */
.fg-award {
  position: absolute; left: 50%; bottom: -0.4em;
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: var(--ios-font, -apple-system, "SF Pro Text", "Segoe UI", sans-serif);
  font-size: 0.62em; font-weight: 700; letter-spacing: 0.01em;
  color: #3A2B00;
  background: linear-gradient(135deg, #FFE483 0%, #FFD60A 45%, #FFB800 100%);
  border: 1px solid rgba(255, 214, 10, 0.65);
  border-radius: 999px;
  padding: 0.35em 0.9em;
  box-shadow: 0 4px 18px rgba(255, 184, 0, 0.45);
  animation: fg-award-in 0.5s cubic-bezier(0.2, 1.2, 0.3, 1) 1;
  z-index: 3;
}
@keyframes fg-award-in {
  0% { opacity: 0; transform: translateX(-50%) translateY(0.6em) scale(0.85); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
.fg-award.is-fading { transition: opacity 0.6s ease; opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .fg-spark, .fg-award, .fg-rings-center.fg-pop .fg-count, .fg-fill.fg-just-closed { animation: none; }
  .fg-award { animation: none; }
}
`;
    (document.head || document.documentElement).appendChild(style);
    stylesInjected = true;
  }

  /**
   * Build the ring widget inside `el`. Idempotent — clears the element first.
   *
   * @param {HTMLElement} el   Host element
   * @param {object} data      compute() output
   * @param {object} opts      { size=160, showLegend=false, animate=true,
   *                             caption="rings closed", legendHints=false }
   */
  function render(el, data, opts) {
    if (!el || typeof document === "undefined") return null;
    injectStyles();

    const options = opts || {};
    const size = Math.max(48, Number(options.size) || 160);
    const showLegend = !!options.showLegend;
    const animate = options.animate !== false;
    const caption = options.caption != null ? options.caption : "rings closed";
    const legendHints = !!options.legendHints;

    const d = data || compute({}, {});
    el.innerHTML = "";
    el.classList.add("fg-rings-host");

    const wrap = document.createElement("div");
    wrap.className = "fg-rings" + (animate ? "" : " is-static");
    wrap.style.width = `${size}px`;
    wrap.style.fontSize = `${Math.max(8, size * 0.115)}px`;
    wrap.setAttribute("role", "img");
    wrap.setAttribute(
      "aria-label",
      `Focus Rings: ${d.closedCount} of 3 closed — ` +
        RING_META.map(
          (m) => `${m.label} ${formatRingValue(d[m.key], m.unit)} of ${d[m.key].goal}`,
        ).join(", "),
    );

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VIEW} ${VIEW}`);

    const g = document.createElementNS(NS, "g");
    g.setAttribute("transform", `rotate(-90 ${VIEW / 2} ${VIEW / 2})`);

    RING_META.forEach((meta, i) => {
      const geo = GEOMETRY[i];
      const ring = d[meta.key] || { pct: 0, value: 0 };
      const C = 2 * Math.PI * geo.r;

      const track = document.createElementNS(NS, "circle");
      track.setAttribute("class", "fg-track");
      track.setAttribute("cx", String(VIEW / 2));
      track.setAttribute("cy", String(VIEW / 2));
      track.setAttribute("r", String(geo.r));
      track.setAttribute("stroke-width", String(geo.width));
      track.setAttribute("stroke", meta.color);
      track.setAttribute("opacity", "0.22");

      const fill = document.createElementNS(NS, "circle");
      fill.setAttribute("class", "fg-fill");
      fill.setAttribute("cx", String(VIEW / 2));
      fill.setAttribute("cy", String(VIEW / 2));
      fill.setAttribute("r", String(geo.r));
      fill.setAttribute("stroke-width", String(geo.width));
      fill.setAttribute("stroke", meta.color);
      fill.setAttribute("stroke-linecap", "round");
      fill.setAttribute("stroke-dasharray", C.toFixed(2));
      const offset = C * (1 - clamp01(ring.pct));
      // A zero-length dash with round caps renders a dot in SVG — hide the
      // fill entirely so an untouched ring reads as a clean empty track.
      if (ring.pct <= 0) fill.setAttribute("visibility", "hidden");
      fill.setAttribute("stroke-dashoffset", String(offset));
      fill.style.transitionDelay = `${i * 0.15}s`;

      g.appendChild(track);
      g.appendChild(fill);
    });

    svg.appendChild(g);
    wrap.appendChild(svg);

    // Mini mode (monthly-review day strip): the 0/3 counter would be noise
    // at 22 px — render the bare ring trio instead.
    if (!options.mini) {
      const center = document.createElement("div");
      center.className = "fg-rings-center";
      const count = document.createElement("span");
      count.className = "fg-count";
      count.textContent = `${d.closedCount}/3`;
      const cap = document.createElement("span");
      cap.className = "fg-cap";
      cap.textContent = caption;
      center.appendChild(count);
      center.appendChild(cap);
      wrap.appendChild(center);
    }

    el.appendChild(wrap);

    if (!showLegend) return wrap;

    const legend = document.createElement("div");
    legend.className = "fg-legend";
    RING_META.forEach((meta) => {
      const ring = d[meta.key] || { value: 0, goal: 0 };
      const row = document.createElement("div");
      row.className = "fg-legend-row";
      row.style.fontSize = `${Math.max(9, size * 0.115)}px`;

      const dot = document.createElement("span");
      dot.className = "fg-dot";
      dot.style.setProperty("--c", meta.color);
      row.appendChild(dot);

      const labelWrap = document.createElement("span");
      labelWrap.style.display = "flex";
      labelWrap.style.flexDirection = "column";
      labelWrap.style.minWidth = "0";
      const label = document.createElement("span");
      label.className = "fg-legend-label";
      label.textContent = meta.label;
      labelWrap.appendChild(label);
      if (legendHints) {
        const hint = document.createElement("span");
        hint.className = "fg-legend-hint";
        hint.textContent = meta.hint;
        labelWrap.appendChild(hint);
      }
      row.appendChild(labelWrap);

      const val = document.createElement("span");
      val.className = "fg-legend-val";
      const goalText =
        meta.unit === "minutes" ? formatMinutes(ring.goal) : String(ring.goal);
      val.textContent = `${formatRingValue(ring, meta.unit)} / ${goalText}`;
      row.appendChild(val);

      legend.appendChild(row);
    });
    el.appendChild(legend);

    return wrap;
  }

  // ---------------------------------------------------------------------------
  // Celebration — ring-closing burst (v1.16.0)
  // ---------------------------------------------------------------------------

  let celebratedCache = null;

  async function readCelebrated() {
    if (celebratedCache) return celebratedCache;
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
        const stored = await chrome.storage.local.get(CELEBRATED_STORAGE_KEY);
        celebratedCache = (stored && stored[CELEBRATED_STORAGE_KEY]) || {};
        return celebratedCache;
      }
    } catch (_) {
      /* storage unavailable — page-session dedupe still applies */
    }
    celebratedCache = {};
    return celebratedCache;
  }

  async function writeCelebrated(map, dayKey, ringKeys) {
    const next = { ...(map || {}) };
    const merged = new Set([...(next[dayKey] || []), ...ringKeys]);
    next[dayKey] = [...merged];
    // Prune old days so the map never grows without bound.
    const keys = Object.keys(next).sort();
    while (keys.length > CELEBRATED_PRUNE_DAYS) {
      delete next[keys.shift()];
    }
    celebratedCache = next;
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local?.set) {
        await chrome.storage.local.set({ [CELEBRATED_STORAGE_KEY]: next });
      }
    } catch (_) {
      /* cache already updated — worst case the burst replays next visit */
    }
    return next;
  }

  function prefersReducedMotion() {
    try {
      return (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (_) {
      return false;
    }
  }

  /** 8-particle radial burst anchored to the ring that just closed. */
  function spawnBurst(wrap, ringIndex, size) {
    if (!wrap) return;
    const geo = GEOMETRY[Math.max(0, Math.min(GEOMETRY.length - 1, ringIndex))];
    const meta = RING_META[Math.max(0, Math.min(RING_META.length - 1, ringIndex))];
    const r0 = (geo.r / VIEW) * size - 3;
    const r1 = size / 2 + 16;

    const burst = document.createElement("div");
    burst.className = "fg-burst";
    burst.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 8; i += 1) {
      const spark = document.createElement("span");
      spark.className = "fg-spark";
      spark.style.setProperty("--a", `${i * 45}deg`);
      spark.style.setProperty("--r0", `${r0.toFixed(1)}px`);
      spark.style.setProperty("--r1", `${r1.toFixed(1)}px`);
      spark.style.setProperty("--c", meta.color);
      burst.appendChild(spark);
    }
    wrap.appendChild(burst);
    setTimeout(() => burst.remove(), 1000);
  }

  /** One-shot glow on the SVG stroke of the closing ring. */
  function flashRing(wrap, ringIndex) {
    if (!wrap) return;
    const g = wrap.querySelector("svg g");
    const fill = g && g.children[ringIndex * 2 + 1];
    if (!fill) return;
    fill.classList.add("fg-just-closed");
    setTimeout(() => fill.classList.remove("fg-just-closed"), 1300);
  }

  function showAward(wrap, text) {
    if (!wrap || wrap.querySelector(".fg-award")) return;
    const award = document.createElement("div");
    award.className = "fg-award";
    award.setAttribute("role", "status");
    award.textContent = text || "All rings closed — perfect day!";
    wrap.appendChild(award);
    setTimeout(() => {
      award.classList.add("is-fading");
      setTimeout(() => award.remove(), 700);
    }, 3600);
  }

  /**
   * Fire the ring-closing celebration for rings that closed but were not
   * celebrated yet. Deduped by the `focusRingsCelebrated` storage key, so:
   *   · re-renders never re-fire the same (day, ring) pair,
   *   · popup and dashboard share one budget (first surface to render wins),
   *   · rings closed while the browser was shut celebrate on next open —
   *     exactly like Fitness replaying an award on launch.
   * Past-day navigation never celebrates: only `dayKey === todayKey` fires.
   *
   * @param {HTMLElement} el    host element passed to render()
   * @param {object} data       compute() output
   * @param {object} opts       { dayKey, todayKey, animate, awardText }
   * @returns {Promise<{celebrated: string[]}>}
   */
  async function maybeCelebrate(el, data, opts) {
    const options = opts || {};
    const result = { celebrated: [] };
    if (!el || typeof document === "undefined") return result;

    const dayKey = options.dayKey || null;
    const todayKey = options.todayKey || dayKey;
    if (!dayKey || (todayKey && dayKey !== todayKey)) return result;

    const d = data || compute({}, {});
    const closedKeys = RING_META.filter((m) => d[m.key] && d[m.key].closed).map((m) => m.key);
    if (closedKeys.length === 0) return result;

    const map = await readCelebrated();
    const already = new Set(map[dayKey] || []);
    const newly = closedKeys.filter((k) => !already.has(k));
    if (newly.length === 0) return result;

    // Record first so a concurrent surface cannot double-fire.
    await writeCelebrated(map, dayKey, newly);
    result.celebrated = newly;

    const animate = options.animate !== false && !prefersReducedMotion();
    const wrap = el.querySelector(":scope > .fg-rings") || el;
    const size = parseFloat(wrap.style && wrap.style.width) || 160;

    newly.forEach((key) => {
      const metaIndex = RING_META.findIndex((m) => m.key === key);
      // Sync the burst with the end of that ring's 0.9 s fill transition
      // (rings stagger 150 ms apart), so the sparks fly as it visually seals.
      const delay = animate ? 950 + metaIndex * 150 : 0;
      setTimeout(() => {
        if (animate) {
          spawnBurst(wrap, metaIndex, size);
          flashRing(wrap, metaIndex);
        }
      }, delay);
    });

    if (d.allClosed) {
      const delay = animate ? 950 + GEOMETRY.length * 150 + 250 : 0;
      setTimeout(
        () => showAward(wrap, options.awardText || "All rings closed — perfect day!"),
        delay,
      );
    }

    // Pop the counter once when the tally changed.
    if (animate) {
      const center = wrap.querySelector(".fg-rings-center");
      if (center) {
        center.classList.add("fg-pop");
        setTimeout(() => center.classList.remove("fg-pop"), 700);
      }
    }
    return result;
  }

  // Expose ------------------------------------------------------------------

  const FGRings = {
    RING_META,
    DEFAULT_GOALS,
    compute,
    readGoals,
    streakFromPoints,
    streakWithInsurance,
    insuranceFromPoints,
    weekKeyOf,
    badgeTier,
    render,
    maybeCelebrate,
    formatMinutes,
  };

  if (typeof window !== "undefined") {
    window.FGRings = FGRings;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.FGRings = FGRings;
  }
})();
