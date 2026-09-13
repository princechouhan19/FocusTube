/**
 * FocusTube Focus Score v2 — src/shared/focus-score.js
 * =====================================================
 * Pure, dependency-free scoring module (loaded by the dashboard, unit-tested
 * in node). Replaces the v1 linear formula which was trivially gameable:
 * pressing "Block 30 min" N times credited 30×N minutes and pinned the score
 * at 100 (Goodhart's law: "When a measure becomes a target, it ceases to be
 * a good measure" — see design notes in IMPROVEMENTS.md v1.13.0).
 *
 * Research grounding
 * ------------------
 * 1. Habit formation takes ~66 days of daily repetition, and missing a single
 *    day does not derail automaticity (Lally et al., 2010, Eur J Soc Psychol).
 *    → Consistency rewards showing up across DISTINCT days (full credit at a
 *    7-day streak), never within a single session.
 * 2. Streaks drive retention via loss aversion + commitment (Duolingo's
 *    published streak design; "streak creep" cautionary literature).
 *    → Streak counting forgives an in-progress today (same rule as the
 *    dashboard's streak widget).
 * 3. Extrinsic points for trivially easy actions are inflated AND undermine
 *    intrinsic motivation (Deci & Ryan — Self-Determination Theory;
 *    overjustification effect). → Effortful wins (quiz passes, pomodoros,
 *    summaries) are worth more than one-tap buttons, and every input is
 *    capped per day so spam cannot dominate.
 * 4. Rewards show diminishing returns; psychophysics and reputation systems
 *    use concave (log/exp) curves to model this (Weber-Fechner tradition).
 *    → Every component saturates: the first 30 shielded minutes count far
 *    more than the 300th.
 * 5. Health-app metric gaming (step-cheating literature) is prevented by
 *    measuring behavior, not button presses, and by merging overlapping
 *    claims. → "Time saved" is union-deduped in the background
 *    (background.js setTempBlock), so blocking 100× in a row credits the
 *    same 30 minutes once.
 *
 * Composite design (max = exactly 100)
 * ------------------------------------
 *   base         8   any recorded activity in the range ("showed up")
 *   shield      34   distraction avoided: honest timeSaved minutes/day +
 *                    shortsSkipped×0.5 + adsBlocked×0.25, exp-saturated
 *                    (63% credit at ~45 units/day, full at ~120)
 *   focus       26   effortful wins/day: willpower(≤6)×2 + pomodoro(≤4)×3
 *                    + summaries(≤3) — individually capped, linear inside
 *                    the cap band (each unit is real work)
 *   streak      24   consecutive active days ending at the range end,
 *                    full credit at 7 (Lally: consistency > intensity)
 *   discipline   8   8 − 2 × quitsEarly/day, floored at 0
 *
 * A single session cannot exceed ~50; a maxed score requires ~a week of
 * balanced, genuinely effortful behavior.
 */
(function (global) {
  "use strict";

  /** Concave saturation with hard ceiling: 63% at k, ~93% at 2.5k, 1.0 by 3k. */
  function sat(x, k) {
    const v = Math.max(0, Number(x) || 0);
    if (v === Infinity) return 1;
    return Math.min(1, (1 - Math.exp(-v / Math.max(1, k))) / 0.93);
  }

  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  function safeAvg(total, points) {
    const n = Array.isArray(points) && points.length > 0 ? points.length : 1;
    return (Number(total) || 0) / n;
  }

  /** A day counts toward the streak when ANY focus activity was recorded. */
  function dayHasActivity(p) {
    if (!p) return false;
    return (
      (Number(p.shortsSkipped) || 0) +
      (Number(p.adsBlocked) || 0) +
      (Number(p.summariesGenerated) || 0) +
      (Number(p.willpowerPoints) || 0) +
      (Number(p.pomodoroCompleted) || 0) +
      (Number(p.timeSavedMinutes) || 0) >
      0
    );
  }

  /**
   * Consecutive active days ending at the newest point.
   * An in-progress today with no activity yet is skipped once (day not over).
   */
  function streakFromPoints(points) {
    if (!Array.isArray(points) || points.length === 0) return 0;
    let streak = 0;
    let i = points.length - 1;
    if (i >= 0 && !dayHasActivity(points[i])) i -= 1;
    for (; i >= 0; i--) {
      if (dayHasActivity(points[i])) streak += 1;
      else break;
    }
    return streak;
  }

  /**
   * Compute the composite score.
   *
   * @param {object} lifetime   lifetime metric totals (unused today; kept for
   *                            API stability / future components)
   * @param {object} totals     range totals: { timeSavedMinutes, shortsSkipped,
   *                            adsBlocked, willpowerPoints, pomodoroCompleted,
   *                            summariesGenerated, quitsEarly, ... }
   * @param {Array}  points     per-day metric records, oldest → newest
   * @returns {{score:number, components:Object, streak:number}}
   */
  function compute(lifetime, totals, points) {
    totals = totals || {};
    points = Array.isArray(points) ? points : [];

    // --- shield: distraction avoided (honest, union-deduped upstream) ------
    const shieldX =
      safeAvg(totals.timeSavedMinutes, points) +
      safeAvg(totals.shortsSkipped, points) * 0.5 +
      safeAvg(totals.adsBlocked, points) * 0.25;
    const shield = 34 * sat(shieldX, 45);

    // --- focus: effortful wins, each capped per day ------------------------
    const will = Math.min(6, safeAvg(totals.willpowerPoints, points));
    const pomo = Math.min(4, safeAvg(totals.pomodoroCompleted, points));
    const sums = Math.min(3, safeAvg(totals.summariesGenerated, points));
    // willpower unit ≈ one quiz/nudge win (needs 2); pomodoro ≈ one full
    // session (needs 3); summary ≈ one intentional watch (needs 1).
    // Max 27 units/day → full 26 pts at ≥ 24 units.
    const focusX = will * 2 + pomo * 3 + sums;
    const focus = 26 * Math.min(1, focusX / 24);

    // --- consistency: streak across distinct days --------------------------
    const streak = streakFromPoints(points);
    const consistency = 24 * Math.min(1, streak / 7);

    // --- discipline: finished sessions, not abandoned ones -----------------
    // Only meaningful on a day with activity — an empty day has nothing to
    // be disciplined about (and must score 0, not inherit the 8-pt floor).
    const quits = safeAvg(totals.quitsEarly, points);
    const engaged = points.some(dayHasActivity);
    const discipline = engaged ? clamp(8 - quits * 2, 0, 8) : 0;

    // --- base: showed up ----------------------------------------------------
    const base = engaged ? 8 : 0;

    const raw =
      base + shield + focus + consistency + discipline;
    const score = Math.round(clamp(raw, 0, 100));

    return {
      score,
      streak,
      components: {
        base,
        shield: Math.round(shield * 10) / 10,
        focus: Math.round(focus * 10) / 10,
        streak: Math.round(consistency * 10) / 10,
        discipline: Math.round(discipline * 10) / 10,
      },
    };
  }

  const FocusScore = { compute, sat, streakFromPoints, dayHasActivity };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FocusScore; // node unit tests
  }
  global.FocusScore = FocusScore; // dashboard (browser)
})(typeof window !== "undefined" ? window : globalThis);
