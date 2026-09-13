/**
 * FocusTube — Daily Briefing page (v1.14.0)
 *
 * Opened once per calendar day on first browser start
 * (chrome.runtime.onStartup in background.js), or on demand from the
 * dashboard header. Content adapts to the time of day:
 *
 *   Morning (05:00–12:59)  → "Yesterday, reviewed" + today's plan.
 *     UX rationale: behavior-change research favors a MORNING recap of
 *     yesterday — the "fresh start effect" (Dai, Milkman & Riis, 2014)
 *     makes temporal landmarks the strongest moment to act, and planning
 *     research (Gollwitzer's implementation intentions) shows intentions
 *     set before exposure work better than willpower during exposure.
 *
 *   Evening (13:00–22:59)  → "Today so far" + a wind-down checklist.
 *     Deliberately gentle: reflective, no shaming, and ends with
 *     sleep-protective advice (screens + arousal before bed are the
 *     enemy of the next morning's focus).
 *
 *   Night (23:00–04:59)    → the automatic popup is suppressed entirely;
 *     nothing about a focus app should be interrupting sleep.
 *
 * Data comes from the same getDashboardStats report the dashboard uses,
 * anchored on yesterday (morning) or today (evening).
 */

(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const pad = (n) => String(n).padStart(2, "0");

  function dayKeyOf(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  const nowDate = new Date();
  const hour = nowDate.getHours();
  const autoMode =
    hour >= 5 && hour < 13 ? "morning" : "evening"; // night never auto-opens
  const mode =
    params.get("mode") === "morning" || params.get("mode") === "evening"
      ? params.get("mode")
      : autoMode;

  const REDUCED = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  function $(id) {
    return document.getElementById(id);
  }

  function set(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function formatMinutes(minutes) {
    const safe = Math.round(Number(minutes) || 0);
    if (safe >= 60) {
      const h = Math.floor(safe / 60);
      const m = safe % 60;
      return m ? `${h}h ${m}m` : `${h}h`;
    }
    return `${safe}m`;
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /* ------------------------------------------------------------------ *
   * Curated content pools
   * ------------------------------------------------------------------ */

  const STUDIES = [
    {
      text: "After an interruption it takes about 23 minutes to fully return to the original task — the cost of a “quick check” is never just the check.",
      cite: "Gloria Mark et al., UC Irvine — “The Cost of Interrupted Work” (2008)",
    },
    {
      text: "Your smartphone doesn't need to be used to cost you focus: its mere presence measurably drains available working memory.",
      cite: "Ward, Duke, Gneezy & Bos — “Brain Drain” (JACR, 2017)",
    },
    {
      text: "Interruptions don't just lose time — people compensate by rushing, which raises stress and frustration without improving output.",
      cite: "Mark, Gudith & Klocke — CHI (2008)",
    },
    {
      text: "Infinite feeds borrow the slot machine's trick: variable rewards. Unpredictability is exactly what makes scrolling so hard to stop.",
      cite: "Operant conditioning — Skinner's variable-ratio schedules",
    },
    {
      text: "Self-control is a finite daily resource. Rules you set in advance (blocks, limits) outperform willpower you need at the moment of temptation.",
      cite: "Baumeister & Tierney — “Willpower” (decision fatigue)",
    },
    {
      text: "Habits take ~66 days on average to become automatic — and missing a single day does not break the chain. Consistency beats intensity.",
      cite: "Lally et al. — European Journal of Social Psychology (2010)",
    },
    {
      text: "“Fresh starts” — new days, new weeks — are the strongest moments to begin a behavior change. That's why this briefing arrives in the morning.",
      cite: "Dai, Milkman & Riis — “The Fresh Start Effect” (2014)",
    },
    {
      text: "Attention works like a muscle: scheduled deep-work sessions measurably increase your capacity to concentrate over time.",
      cite: "Cal Newport — “Deep Work” (2016)",
    },
  ];

  const QUOTES = [
    ["It is not that we have a short time to live, but that we waste much of it.", "Seneca — On the Shortness of Life"],
    ["How we spend our days is, of course, how we spend our lives.", "Annie Dillard"],
    ["You do not rise to the level of your goals. You fall to the level of your systems.", "James Clear — Atomic Habits"],
    ["The opposite of distraction is not focus — it is traction.", "Nir Eyal — Indistractable"],
    ["My experience is what I agree to attend to.", "William James — The Principles of Psychology"],
    ["Clarity about what matters provides clarity about what does not.", "Cal Newport — Deep Work"],
    ["All of humanity's problems stem from man's inability to sit quietly in a room alone.", "Blaise Pascal — Pensées"],
    ["Ask yourself: is this within my control?", "Marcus Aurelius — Meditations"],
    ["What you don't do determines what you can do.", "Tim Ferriss"],
    ["Where your attention goes, your time goes.", "Idowu Koyenikan"],
  ];

  /* ------------------------------------------------------------------ *
   * Render helpers (Apple-motion aware)
   * ------------------------------------------------------------------ */

  function countUp(el, target, { suffix = "", duration = 900, format = null } = {}) {
    if (!el) return;
    const render_ = (v) =>
      format ? format(v) : `${Math.round(v)}${suffix}`;
    if (REDUCED) {
      el.textContent = render_(target);
      return;
    }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = render_(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function render() {
    // Header -----------------------------------------------------------
    const day = mode === "morning" ? "yesterday" : "today";
    set("dg-eyebrow", mode === "morning" ? "Daily Briefing" : "Wind-Down");
    set(
      "dg-title",
      (mode === "morning" ? "Good morning" : greeting(hour)) +
        (mode === "morning" ? " — here's yesterday" : " — today at a glance"),
    );
    set(
      "dg-date",
      nowDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
    set("dg-bars-hint",
      mode === "morning"
        ? "Yesterday is the newest bar. Bars grow with your consistency."
        : "Today is the newest bar. End the week strong.");
    set("dg-sites-title",
      mode === "morning" ? "Where yesterday's time went" : "Where today's time went");
    set("dg-plan-title", mode === "morning" ? "Today's plan" : "Tonight");

    // Data --------------------------------------------------------------
    const anchor =
      mode === "morning"
        ? dayKeyOf(new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 1))
        : dayKeyOf(nowDate);

    chrome.runtime.sendMessage(
      { action: "getDashboardStats", options: { anchorKey: anchor } },
      (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.success) {
          set("dg-hero-line", "No data yet — your numbers will appear once you start browsing.");
          return;
        }
        const data = resp.data;
        const dayReport = data.report.day || { totals: {}, points: [] };
        const weekReport = data.report.week || { totals: {}, points: [] };
        const totals = dayReport.totals || {};

        // Score ring (compute over the 7-day window ending on the anchor).
        const scoreResult =
          window.FocusScore
            ? window.FocusScore.compute({}, weekReport.totals, weekReport.points || [])
            : null;
        const score = scoreResult ? scoreResult.score : 0;
        const streak = scoreResult ? scoreResult.streak : 0;

        const ring = $("dg-ring");
        if (ring) {
          const C = 2 * Math.PI * 52;
          ring.style.strokeDasharray = String(C);
          const offset = C * (1 - Math.min(100, score) / 100);
          if (REDUCED) {
            ring.style.strokeDashoffset = String(offset);
          } else {
            requestAnimationFrame(() => {
              ring.style.strokeDashoffset = String(offset);
            });
          }
        }
        countUp($("dg-score"), score);

        const streakEl = $("dg-streak");
        if (streakEl) {
          if (streak >= 2) {
            streakEl.textContent = `🔥 ${streak}-day streak — don't break the chain`;
          } else if (streak === 1) {
            streakEl.textContent = "🔥 1-day streak — every chain starts somewhere";
          } else {
            streakEl.textContent = "A streak of one begins today.";
          }
        }
        set(
          "dg-hero-line",
          day === "yesterday"
            ? "Yesterday, reviewed — so today can be chosen, not drifted."
            : "Here is what today has cost and saved you so far.",
        );

        // Stats -----------------------------------------------------------
        countUp($("dg-stat-saved"), Math.round(totals.timeSavedMinutes || 0), {
          format: formatMinutes,
        });
        countUp(
          $("dg-stat-watch"),
          Math.round((dayReport.points || []).reduce(
            (sum, p) => sum + (p.timeSpentSeconds || 0), 0) / 60) || 0,
          { format: formatMinutes },
        );
        countUp($("dg-stat-pomo"), totals.pomodoroCompleted || 0);
        countUp($("dg-stat-shorts"), totals.shortsSkipped || 0);

        // Focus Rings (v1.15.0 USP) — the daily ritual, rendered from the
        // anchor day's totals so morning recaps show yesterday and evening
        // recaps show today.
        if (window.FGRings) {
          FGRings.readGoals()
            .then((goals) => {
              const ringData = FGRings.compute(totals, goals);
              FGRings.render($("dg-rings"), ringData, {
                size: 104,
                showLegend: true,
                animate: !REDUCED,
              });
              set(
                "dg-rings-title",
                day === "yesterday" ? "Yesterday's rings" : "Today's rings",
              );
            })
            .catch((err) => console.warn("[FocusTube] Digest rings failed:", err));
        }

        // 7-day bars ------------------------------------------------------
        renderBars(weekReport.points || []);
        renderSites(data.siteUsage ? data.siteUsage.day || {} : {});
        renderTopics(data.topics ? data.topics.day || [] : []);

        // Field note + quote (deterministic per calendar day) --------------
        const seed = hashStr(dayKeyOf(nowDate));
        const study = STUDIES[seed % STUDIES.length];
        set("dg-study", study.text);
        set("dg-study-cite", study.cite);
        const quote = QUOTES[Math.floor(seed / 7) % QUOTES.length];
        set("dg-quote", quote[0]);
        set("dg-quote-author", quote[1]);

        renderPlan(seed);
      },
    );
  }

  function greeting(h) {
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function renderBars(points) {
    const wrap = $("dg-bars");
    if (!wrap) return;
    wrap.textContent = "";
    const values = points.map((p) => Math.max(0, Number(p.timeSavedMinutes) || 0));
    const max = Math.max(1, ...values);
    points.forEach((p, i) => {
      const col = document.createElement("div");
      col.className = "dg-bar-col";
      const bar = document.createElement("div");
      bar.className = "dg-bar";
      const isAnchorDay = i === points.length - 1;
      if (isAnchorDay) bar.classList.add("today");
      const hPct = Math.round((values[i] / max) * 100);
      bar.style.height = REDUCED ? `${Math.max(4, hPct)}%` : "4%";
      bar.dataset.target = String(Math.max(4, hPct));
      bar.title = `${p.key}: ${formatMinutes(values[i])} saved`;
      if (values[i] === 0) bar.classList.add("empty");
      col.appendChild(bar);

      const label = document.createElement("span");
      label.className = "dg-bar-label";
      const d = new Date(`${p.key}T00:00:00`);
      label.textContent = d.toLocaleDateString(undefined, { weekday: "narrow" });
      if (isAnchorDay) label.classList.add("today");
      col.appendChild(label);
      wrap.appendChild(col);

      if (!REDUCED) {
        // Grow each bar with a staggered spring-ish delay.
        setTimeout(() => {
          bar.style.height = `${Math.max(4, hPct)}%`;
        }, 350 + i * 70);
      }
    });
  }

  function renderSites(siteUsage) {
    const list = $("dg-sites");
    if (!list) return;
    list.textContent = "";
    const entries = Object.entries(siteUsage)
      .filter(([, sec]) => (Number(sec) || 0) > 30)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "dg-empty";
      empty.textContent = "No tracked watch time — a clean day.";
      list.appendChild(empty);
      return;
    }
    const max = Math.max(...entries.map(([, sec]) => sec));
    entries.forEach(([domain, sec], i) => {
      const row = document.createElement("div");
      row.className = "dg-site-row";

      const logo = document.createElement("img");
      logo.src = `https://${domain}/favicon.ico`;
      logo.alt = "";
      logo.setAttribute("aria-hidden", "true");
      logo.onerror = () => {
        logo.style.visibility = "hidden";
      };

      const name = document.createElement("span");
      name.className = "dg-site-name";
      name.textContent = domain;

      const barBg = document.createElement("div");
      barBg.className = "dg-site-bar";
      const fill = document.createElement("div");
      fill.className = "dg-site-bar-fill";
      const pct = Math.round((sec / max) * 100);
      fill.style.width = REDUCED ? `${pct}%` : "0%";
      if (!REDUCED) {
        setTimeout(() => {
          fill.style.width = `${pct}%`;
        }, 450 + i * 80);
      }
      barBg.appendChild(fill);

      const mins = document.createElement("span");
      mins.className = "dg-site-mins";
      mins.textContent = formatMinutes(sec / 60);

      row.append(logo, name, barBg, mins);
      list.appendChild(row);
    });
  }

  function renderTopics(topics) {
    const wrap = $("dg-topics");
    if (!wrap) return;
    wrap.textContent = "";
    const list = (topics || [])
      .filter((t) => t && t.topic && t.count > 0)
      .slice(0, 6);
    if (list.length === 0) {
      const empty = document.createElement("p");
      empty.className = "dg-empty";
      empty.textContent = "No topics recorded yet — open a few videos and they'll show up here.";
      wrap.appendChild(empty);
      return;
    }
    list.forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "dg-topic-chip";
      const mins = Number(t.minutes) || 0;
      chip.textContent =
        mins >= 1
          ? `${t.topic} · ${formatMinutes(mins)}`
          : `${t.topic} × ${t.count}`;
      const trend = Number(t.prevCount) || 0;
      if (trend && t.count > trend) chip.classList.add("up");
      wrap.appendChild(chip);
    });
  }

  function renderPlan(seed) {
    const wrap = $("dg-plan");
    if (!wrap) return;
    wrap.textContent = "";
    const items =
      mode === "morning"
        ? [
            "One deep-work block before opening any feed — 3 × 25 min.",
            "Keep YouTube under the limit you chose; check the capsule if unsure.",
            "When a nudge appears, answer it honestly — that's a willpower point.",
          ]
        : [
            "Set tomorrow's blocks now, while today's numbers are still fresh.",
            "Close distraction tabs before bed — tabs are tomorrow's traps.",
            "Phone out of arm's reach while you sleep (see today's field note).",
          ];
    items.forEach((text, i) => {
      const label = document.createElement("label");
      label.className = "dg-plan-item";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.style.accentColor = "var(--ios-blue)";
      const span = document.createElement("span");
      span.textContent = text;
      label.append(box, span);
      wrap.appendChild(label);
      void seed; void i;
    });
  }

  /* ------------------------------------------------------------------ *
   * Buttons
   * ------------------------------------------------------------------ */

  $("dg-open-dash").addEventListener("click", () => {
    try {
      chrome.tabs.create({
        url: chrome.runtime.getURL("src/dashboard/dashboard.html"),
      });
      window.close();
    } catch (_) {}
  });

  $("dg-close").addEventListener("click", () => {
    window.close();
  });

  /* ------------------------------------------------------------------ *
   * v1.17.0 — Adaptive Ring Goals: Monday "Calibrate this week" card.
   * Compares the trailing 28 days against each goal and suggests one
   * stepper step up/down — never auto-applied (self-set goals outperform
   * assigned ones: Locke & Latham 2002/2007). Applied + dismissed weeks
   * are recorded in `focusRingsGoalHistory` so difficulty-over-time can be
   * charted later.
   * ------------------------------------------------------------------ */
  const CAL_STEPS = { deflected: 2, focusMinutes: 15, savedMinutes: 10 };
  const CAL_BOUNDS = {
    deflected: [1, 200],
    focusMinutes: [15, 480],
    savedMinutes: [10, 480],
  };

  function calWeekKey(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    const day = (d.getDay() + 6) % 7; // Mon=0
    d.setDate(d.getDate() - day);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  async function renderCalibration() {
    const card = $("dg-calibration");
    if (!card || typeof FGRings === "undefined") return;
    // Show the card on Mondays (the natural weekly review point); in the
    // evening wind-down only if it is still uncalibrated for this week.
    const monday = nowDate.getDay() === 1;
    if (!monday) return;

    try {
      const stored = await chrome.storage.local.get([
        "focusAnalyticsDaily",
        "focusRingsGoals",
        "focusRingsGoalHistory",
      ]);
      const history = Array.isArray(stored.focusRingsGoalHistory)
        ? stored.focusRingsGoalHistory
        : [];
      const thisWeek = calWeekKey(nowDate);
      if (history.some((h) => h && h.weekKey === thisWeek)) return; // done this week

      const analytics = stored.focusAnalyticsDaily || {};
      const goals = await FGRings.readGoals();
      const days = Object.keys(analytics)
        .sort()
        .slice(-28)
        .map((key) => analytics[key])
        .filter(Boolean);

      const avg = (pick) =>
        days.length
          ? days.reduce((s, d) => s + (Number(d[pick]) || 0), 0) / days.length
          : 0;

      // Ring value normalization identical to the rings module:
      //   deflected = shorts + ads + quits; focused = pomodoro×25 min;
      //   saved = timeSavedMinutes.
      const vals = {
        deflected:
          avg("shortsSkipped") + avg("adsBlocked") + avg("quitsEarly"),
        focusMinutes: avg("pomodoroCompleted") * 25,
        savedMinutes: avg("timeSavedMinutes"),
      };

      const suggestions = [];
      for (const key of Object.keys(CAL_STEPS)) {
        const [min, max] = CAL_BOUNDS[key];
        const current = Number(goals[key]) || min;
        let next = current;
        let dir = "keep";
        if (vals[key] >= current * 1.6 && current < max) {
          next = Math.min(max, current + CAL_STEPS[key]);
          dir = "up";
        } else if (vals[key] < current * 0.55 && current > min) {
          next = Math.max(min, current - CAL_STEPS[key]);
          dir = "down";
        }
        if (dir !== "keep") {
          suggestions.push({ key, current, next, dir });
        }
      }

      if (suggestions.length === 0) {
        // Goals are well-calibrated — mark the week so we don't re-show.
        history.push({
          weekKey: thisWeek,
          at: Date.now(),
          applied: false,
          reason: "balanced",
        });
        await chrome.storage.local.set({ focusRingsGoalHistory: history.slice(-30) });
        return;
      }

      const meta = {
        deflected: "Deflected",
        focusMinutes: "Focused",
        savedMinutes: "Saved",
      };
      const rowsEl = $("dg-cal-rows");
      rowsEl.innerHTML = suggestions
        .map((s) => {
          const fmt =
            s.key === "deflected"
              ? (n) => `${n}`
              : (n) => FGRings.formatMinutes(n);
          const arrow = s.dir === "up" ? "▲" : "▼";
          const cls = s.dir === "up" ? "up" : "down";
          return `<div class="dg-cal-row">
            <span class="dg-cal-ring ${cls}">${meta[s.key]}</span>
            <span class="dg-cal-from">${fmt(s.current)}</span>
            <span class="dg-cal-arrow">${arrow}</span>
            <span class="dg-cal-to">${fmt(s.next)}</span>
          </div>`;
        })
        .join("");

      card.hidden = false;

      $("dg-cal-apply").addEventListener("click", async () => {
        const raw = stored.focusRingsGoals || {};
        const nextGoals = { ...goals };
        suggestions.forEach((s) => (nextGoals[s.key] = s.next));
        try {
          await chrome.storage.local.set({
            focusRingsGoals: { ...raw, ...nextGoals },
          });
          history.push({
            weekKey: thisWeek,
            at: Date.now(),
            applied: true,
            suggestions,
          });
          await chrome.storage.local.set({
            focusRingsGoalHistory: history.slice(-30),
          });
          card.hidden = true;
        } catch (_) {}
      });

      $("dg-cal-dismiss").addEventListener("click", async () => {
        try {
          history.push({
            weekKey: thisWeek,
            at: Date.now(),
            applied: false,
            reason: "dismissed",
          });
          await chrome.storage.local.set({
            focusRingsGoalHistory: history.slice(-30),
          });
        } catch (_) {}
        card.hidden = true;
      });
    } catch (_) { /* calibration is optional dressing — never break the digest */ }
  }

  renderCalibration();

  render();
})();
