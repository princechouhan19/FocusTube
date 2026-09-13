/**
 * FocusTube Onboarding (v1.17.0) — src/onboarding/onboarding.js
 * =============================================================
 * Apple Setup Assistant-style first-run flow: one question per screen,
 * progress bar, sheet-curve step transitions, springy selections.
 *
 * v1.17.0 — the anime buddy joins the flow (Genshin-style guide):
 *  · Step 1 asks your name and lets you pick MIKA or HARU; the buddy then
 *    stands beside every remaining step with a speech bubble, reacting to
 *    each question with its own emotion + pose (wave / guide / cheer).
 *  · The choice lands in storage as companionCharacter + userName and is
 *    honored by the floating companion and every full-screen page.
 *
 * Behavior:
 *  · Draft state persists to chrome.storage.local.onboardingDraft after
 *    every interaction, so re-opening the page resumes where you left off.
 *  · "Finish"/"Skip" writes the chosen settings and sets
 *    onboardingComplete = true (first-run open logic in background.js
 *    checks that flag).
 *  · Zero behavior change until the user commits: settings are written in
 *    ONE storage.set at the end, not per step.
 */
(function () {
  "use strict";

  // Daily budget ladder (minutes) — 30m … 8h
  const BUDGETS = [30, 60, 90, 120, 180, 240, 360, 480];
  const DEFAULT_STATE = {
    step: 0,
    buddy: "mika", // mika | haru
    userName: "",
    goals: [],
    tames: { shorts: true, suggestions: false, comments: false, autoplay: true },
    budgetIdx: 3, // 120 min
    quiet: "none", // none | nights | work
    style: "firm", // gentle | firm | hard
  };

  const QUIET_PRESETS = {
    nights: { start: "22:00", end: "07:00" },
    work: { start: "09:00", end: "17:00" },
  };

  const LAST_STEP = 7;
  const STEP_COUNT = LAST_STEP + 1;

  let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

  // --- the buddy guide (Genshin-style step narration) ----------------------
  // One entry per step: emotion + pose + a line of dialogue. {name} is
  // replaced with the user's first name once they type it.
  const GUIDE = [
    { emotion: "joyful", pose: "wave",
      text: "Hi! I'm Mika — Haru's waiting just inside. Come pick your guide!" },
    { emotion: "happy", pose: "wave",
      text: "Pick me… or Haru — and tell me your name, {name}!" },
    { emotion: "neutral", pose: "guide",
      text: "So, {name} — what brings you here? I'll tune your insights." },
    { emotion: "surprised", pose: "idle",
      text: "The feeds are engineered to keep you. We'll tame them together." },
    { emotion: "happy", pose: "guide",
      text: "Pick a number you can actually keep, {name}. Small is fine!" },
    { emotion: "sleepy", pose: "idle",
      text: "Quiet hours protect your sleep… I'll be snoozing too. Zzz" },
    { emotion: "worried", pose: "guide",
      text: "I can be gentle… or firm when it matters. Your call, {name}." },
    { emotion: "joyful", pose: "cheer",
      text: "We're all set, {name}! Rings await — let's go!" },
  ];

  // --- element handles -----------------------------------------------------
  const steps = Array.from(document.querySelectorAll(".ob-step"));
  const backBtn = document.getElementById("ob-back");
  const nextBtn = document.getElementById("ob-next");
  const skipBtn = document.getElementById("ob-skip");
  const progressFill = document.getElementById("ob-progress-fill");
  const progress = document.querySelector(".ob-progress");
  const budgetValue = document.getElementById("ob-budget-value");
  const minusBtn = document.getElementById("ob-budget-minus");
  const plusBtn = document.getElementById("ob-budget-plus");
  const marksWrap = document.getElementById("ob-budget-marks");
  const summaryEl = document.getElementById("ob-summary");
  const nameInput = document.getElementById("ob-name");
  const buddiesWrap = document.getElementById("ob-buddies");

  // --- storage helpers -------------------------------------------------------
  function loadDraft() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(["onboardingDraft", "onboardingComplete"], (data) => {
          resolve(data || {});
        });
      } catch {
        resolve({});
      }
    });
  }

  function saveDraft() {
    try {
      chrome.storage.local.set({ onboardingDraft: state });
    } catch {
      /* storage unavailable — stay in-memory */
    }
  }

  function formatBudget(mins) {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  // --- step plumbing ----------------------------------------------------------
  function currentStep() {
    return state.step;
  }

  function render() {
    steps.forEach((s) => {
      s.classList.toggle(
        "active",
        Number(s.dataset.step) === currentStep(),
      );
    });

    backBtn.hidden = currentStep() === 0;
    // Steps with their own primary CTA (welcome, summary) hide the footer CTA.
    nextBtn.hidden = currentStep() === 0 || currentStep() === LAST_STEP;
    skipBtn.hidden = currentStep() === LAST_STEP;

    const pct = Math.round((currentStep() / LAST_STEP) * 100);
    progressFill.style.width = `${pct}%`;
    progress.setAttribute("aria-valuenow", String(pct));

    if (currentStep() === 4) renderBudget();
    if (currentStep() === LAST_STEP) renderSummary();
    updateGuide();
  }

  function goTo(step, direction) {
    const clamped = Math.max(0, Math.min(LAST_STEP, step));
    if (clamped === currentStep()) return;
    state.step = clamped;
    saveDraft();
    const el = steps[clamped];
    el.classList.remove("slide-in-right", "slide-in-left");
    // force reflow so the animation restarts on re-entry
    void el.offsetWidth;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add(direction === "back" ? "slide-in-left" : "slide-in-right");
    }
    render();
    // Move focus to the step heading for keyboard/screen-reader flow.
    const heading = el.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: false });
    }
  }

  // --- step 1: name + buddy select -----------------------------------------
  function firstName() {
    const n = (state.userName || "").trim().split(/\s+/)[0];
    return n || "";
  }

  function guideLine(entry) {
    const name = firstName();
    const t = entry.text.replace(/\{name\}/g, name);
    if (name) return t;
    // no name yet — clean up dangling separators left by the empty token
    return t.replace(/, !/g, "!").replace(/, \./g, ".").replace(/, —/g, " —").replace(/, \?/g, "?");
  }

  function paintBuddyArts() {
    if (!window.FTCompanionArt) return;
    document.querySelectorAll(".ob-buddy-art").forEach((el) => {
      const key = el.dataset.art === "haru" ? "haru" : "mika";
      el.innerHTML = window.FTCompanionArt.render({
        character: key,
        emotion: "happy",
        pose: "wave",
        size: 104,
        idPrefix: `ob-${key}`,
      });
    });
  }

  function syncBuddyUI() {
    if (!buddiesWrap) return;
    buddiesWrap.querySelectorAll(".ob-buddy").forEach((btn) => {
      const on = btn.dataset.value === state.buddy;
      btn.classList.toggle("selected", on);
      btn.setAttribute("aria-checked", String(on));
    });
    if (nameInput && nameInput.value !== state.userName) nameInput.value = state.userName;
  }

  function bindBuddies() {
    if (!buddiesWrap) return;
    buddiesWrap.querySelectorAll(".ob-buddy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const changed = state.buddy !== btn.dataset.value;
        state.buddy = btn.dataset.value === "haru" ? "haru" : "mika";
        syncBuddyUI();
        if (changed) {
          saveDraft();
          updateGuide();
        }
      });
    });
    if (nameInput) {
      nameInput.addEventListener("input", () => {
        state.userName = nameInput.value.slice(0, 24);
        saveDraft();
        updateGuide();
      });
    }
  }

  // --- the persistent guide widget (bottom-right, Genshin-style) ------------
  let guideWidget = null;

  function updateGuide() {
    const entry = GUIDE[Math.min(state.step, GUIDE.length - 1)];
    if (!entry) return;
    if (!window.FTCompanionWidget) return;
    if (!guideWidget) {
      guideWidget = window.FTCompanionWidget.mount({ fixed: true, size: 148, bottom: 92 });
    }
    // Step 0 introduces the duo before the user has picked: always show Mika
    // (the default) with the intro line; afterwards show the chosen buddy.
    const character = state.step === 0 ? "mika" : state.buddy;
    guideWidget.set({ character, emotion: entry.emotion, pose: entry.pose });
    guideWidget.say(guideLine(entry), { sticky: true });
  }

  // --- step 2: goals ------------------------------------------------------------
  function bindChips() {
    document.querySelectorAll("#ob-goals .ob-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const value = chip.dataset.value;
        const idx = state.goals.indexOf(value);
        if (idx >= 0) state.goals.splice(idx, 1);
        else state.goals.push(value);
        chip.classList.toggle("selected", idx < 0);
        saveDraft();
      });
    });
  }

  // --- step 3: tames ------------------------------------------------------------
  function bindTames() {
    const map = {
      "ob-shorts": "shorts",
      "ob-suggestions": "suggestions",
      "ob-comments": "comments",
      "ob-autoplay": "autoplay",
    };
    Object.entries(map).forEach(([id, key]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.checked = !!state.tames[key];
      input.addEventListener("change", () => {
        state.tames[key] = input.checked;
        saveDraft();
      });
    });
  }

  // --- step 4: budget stepper -----------------------------------------------------
  function renderBudget() {
    const mins = BUDGETS[state.budgetIdx];
    budgetValue.textContent = formatBudget(mins);
    minusBtn.disabled = state.budgetIdx === 0;
    plusBtn.disabled = state.budgetIdx === BUDGETS.length - 1;
    if (marksWrap.childElementCount !== BUDGETS.length) {
      marksWrap.innerHTML = "";
      BUDGETS.forEach(() => {
        const dot = document.createElement("span");
        dot.className = "ob-mark";
        marksWrap.appendChild(dot);
      });
    }
    Array.from(marksWrap.children).forEach((dot, i) => {
      dot.classList.toggle("on", i === state.budgetIdx);
    });
  }

  function bumpBudget(delta) {
    const next = Math.max(0, Math.min(BUDGETS.length - 1, state.budgetIdx + delta));
    if (next === state.budgetIdx) return;
    state.budgetIdx = next;
    saveDraft();
    budgetValue.classList.remove("bump");
    void budgetValue.offsetWidth;
    budgetValue.classList.add("bump");
    renderBudget();
  }

  // --- steps 5/6: option groups ------------------------------------------------------
  function bindOptions(wrapId, key) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    wrap.querySelectorAll(".ob-option").forEach((opt) => {
      opt.classList.toggle("selected", opt.dataset.value === state[key]);
      opt.setAttribute("aria-checked", String(opt.dataset.value === state[key]));
      opt.addEventListener("click", () => {
        state[key] = opt.dataset.value;
        wrap.querySelectorAll(".ob-option").forEach((o) => {
          const on = o === opt;
          o.classList.toggle("selected", on);
          o.setAttribute("aria-checked", String(on));
        });
        saveDraft();
      });
    });
  }

  // --- step 7: summary ------------------------------------------------------------------
  function describeQuiet(q) {
    if (q === "nights") return "Nights · 22:00 – 07:00";
    if (q === "work") return "Work hours · 09:00 – 17:00";
    return "None";
  }

  function describeStyle(s) {
    if (s === "gentle") return "Gentle — nudges only";
    if (s === "hard") return "Hard — quiz to unblock";
    return "Firm — recommended";
  }

  function renderSummary() {
    const rows = [
      ["Goals", state.goals.length ? state.goals.join(", ") : "General focus"],
      ["Hidden while focusing", summarizeTames()],
      ["Daily budget", formatBudget(BUDGETS[state.budgetIdx])],
      ["Quiet hours", describeQuiet(state.quiet)],
      ["Focus style", describeStyle(state.style)],
    ];
    summaryEl.innerHTML = "";
    rows.forEach(([k, v]) => {
      const row = document.createElement("div");
      row.className = "ob-sum-row";
      const keyEl = document.createElement("span");
      keyEl.className = "ob-sum-key";
      keyEl.textContent = k;
      const valEl = document.createElement("span");
      valEl.className = "ob-sum-val";
      valEl.textContent = v;
      row.appendChild(keyEl);
      row.appendChild(valEl);
      summaryEl.appendChild(row);
    });
  }

  function summarizeTames() {
    const names = [];
    if (state.tames.shorts) names.push("Shorts");
    if (state.tames.suggestions) names.push("Suggestions");
    if (state.tames.comments) names.push("Comments");
    if (state.tames.autoplay) names.push("Autoplay off");
    return names.length ? names.join(", ") : "Nothing hidden";
  }

  // --- commit ------------------------------------------------------------------------------
  function commitSettings() {
    const budgetMinutes = BUDGETS[state.budgetIdx];
    const quiet = QUIET_PRESETS[state.quiet] || null;

    // One atomic write — nothing changes until the user finishes.
    const patch = {
      onboardingComplete: true,
      focusGoals: state.goals,
      focusStyle: state.style,
      hideShorts: !!state.tames.shorts,
      hideSuggestions: !!state.tames.suggestions,
      hideComments: !!state.tames.comments,
      disableAutoplay: !!state.tames.autoplay,
      timeLimits: { "youtube.com": budgetMinutes },
      scheduleBlockEnabled: !!quiet,
      companionCharacter: state.buddy === "haru" ? "haru" : "mika",
      userName: (state.userName || "").trim().slice(0, 24),
    };
    if (quiet) {
      patch.scheduleBlockStart = quiet.start;
      patch.scheduleBlockEnd = quiet.end;
    }
    if (state.style === "hard") patch.quizDifficulty = "hard";
    if (state.style === "gentle") patch.focusMode = true;

    try {
      chrome.storage.local.set(patch);
    } catch {
      /* storage unavailable — nothing else we can do on an extension page */
    }
    try {
      chrome.storage.local.remove("onboardingDraft");
    } catch {}
  }

  function finish(openUrl) {
    commitSettings();
    if (openUrl) {
      try {
        chrome.tabs.create({ url: openUrl });
      } catch {}
    }
    window.close();
  }

  // --- wiring -------------------------------------------------------------------------------
  document.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => goTo(currentStep() + 1, "fwd"));
  });
  backBtn.addEventListener("click", () => goTo(currentStep() - 1, "back"));
  skipBtn.addEventListener("click", () => {
    // Skip = accept everything as shown (defaults), mark complete.
    finish();
  });
  document.getElementById("ob-finish").addEventListener("click", () => {
    finish("https://www.youtube.com");
  });
  document.getElementById("ob-open-dashboard").addEventListener("click", () => {
    finish(chrome.runtime.getURL("src/dashboard/dashboard.html"));
  });
  minusBtn.addEventListener("click", () => bumpBudget(-1));
  plusBtn.addEventListener("click", () => bumpBudget(1));

  // Keyboard: Enter/ArrowRight advances, ArrowLeft goes back (unless typing).
  document.addEventListener("keydown", (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === "Enter" && !nextBtn.hidden) {
      e.preventDefault();
      goTo(currentStep() + 1, "fwd");
    } else if (e.key === "ArrowRight" && !nextBtn.hidden) {
      goTo(currentStep() + 1, "fwd");
    } else if (e.key === "ArrowLeft" && !backBtn.hidden) {
      goTo(currentStep() - 1, "back");
    }
  });

  bindChips();
  bindOptions("ob-quiet", "quiet");
  bindOptions("ob-style", "style");
  bindBuddies();
  paintBuddyArts();

  // Boot: hydrate from the saved draft, if any.
  loadDraft().then((data) => {
    const draft = data.onboardingDraft;
    if (draft && typeof draft === "object") {
      state = { ...state, ...draft, tames: { ...state.tames, ...(draft.tames || {}) } };
    }
    bindTames();
    syncBuddyUI();
    render();
  });
})();
