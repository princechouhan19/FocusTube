/**
 * FocusTube — Graduated Unblock Friction (v1.17.0)
 * ================================================
 * A proportionality ladder for the moment of impulse. One fixed cost (the
 * quiz) is either too weak for heavy moments or too punishing for legitimate
 * needs — so the cost now scales with today's unblock history:
 *
 *   Rung 1 (always)  — STATE the reason. One typed line, ≥ 12 characters.
 *                      Writing an intention converts "I want" into "I will",
 *                      and self- Made plans are stickier than impulses
 *                      (implementation intentions — Gollwitzer 1999).
 *   Rung 2 (always)  — WAIT-OUT. A 10-second progress bar, +10 s for every
 *                      prior unblock today, capped at 30 s. Delay alone
 *                      reliably reduces impulse enactment (friction evidence —
 *                      Duckworth, Milkman & Laibson 2016).
 *   Rung 3 (strict)  — QUIZ. The existing 5-question gate, only at the
 *                      highest tier (autonomy-supportive: proportionality
 *                      preserves the sense of choice — SDT, Deci & Ryan).
 *
 * Tiers: "off" | "standard" (reason + wait) | "strict" (+ quiz).
 * Storage keys:  unblockGateTier, unblockAttempts  ({"YYYY-MM-DD": count}).
 *
 * Public API:
 *   FTUnblockGate.getTier()                 → Promise<"off"|"standard"|"strict">
 *   FTUnblockGate.setTier(tier)             → Promise
 *   FTUnblockGate.shouldEscalate()          → true when ≥3 unblocks today
 *   FTUnblockGate.runGate({ mount, onPass })
 *       Renders the ladder into `mount` (an element), calls onPass() when the
 *       user clears every rung of their tier. Pure DOM + storage; the caller
 *       decides what "pass" unlocks.
 *   FTUnblockGate.renderInlineStyles(root)  → style element for shadow hosts
 */
(function () {
  "use strict";

  const TIER_KEY = "unblockGateTier";
  const ATTEMPTS_KEY = "unblockAttempts";
  const MIN_REASON_CHARS = 12;
  const BASE_WAIT_SECONDS = 10;
  const MAX_WAIT_SECONDS = 30;
  const ESCALATE_THRESHOLD = 3;

  async function getTier() {
    try {
      const data = await chrome.storage.local.get(TIER_KEY);
      const tier = data && data[TIER_KEY];
      return tier === "off" || tier === "strict" ? tier : "standard";
    } catch (_) {
      return "standard";
    }
  }

  async function setTier(tier) {
    if (!["off", "standard", "strict"].includes(tier)) return;
    await chrome.storage.local.set({ [TIER_KEY]: tier });
  }

  async function getAttemptsToday() {
    try {
      const data = await chrome.storage.local.get(ATTEMPTS_KEY);
      const map = (data && data[ATTEMPTS_KEY]) || {};
      return Math.max(0, Number(map[todayKey()]) || 0);
    } catch (_) {
      return 0;
    }
  }

  async function recordAttempt() {
    try {
      const data = await chrome.storage.local.get(ATTEMPTS_KEY);
      const map = (data && data[ATTEMPTS_KEY]) || {};
      const tk = todayKey();
      map[tk] = (Number(map[tk]) || 0) + 1;
      // prune to the last 30 days
      const keys = Object.keys(map).sort();
      while (keys.length > 30) delete map[keys.shift()];
      await chrome.storage.local.set({ [ATTEMPTS_KEY]: map });
    } catch (_) {}
  }

  async function shouldEscalate() {
    return (await getAttemptsToday()) >= ESCALATE_THRESHOLD;
  }

  function todayKey() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Wait length for this attempt: base + 10 s per prior attempt, ≤ 30 s. */
  function waitSecondsFor(priorAttempts) {
    return Math.min(MAX_WAIT_SECONDS, BASE_WAIT_SECONDS + priorAttempts * 10);
  }

  // -------------------------------------------------------------------------
  // Ladder UI
  // -------------------------------------------------------------------------

  const I18N = {
    title: "Before this unblock",
    why: "A short pause is the whole trick — impulses peak and pass in well under a minute.",
    stepOf: (a, b) => `Step ${a} of ${b}`,
    reasonLabel: "What do you need this site for?",
    reasonHint: (n) => `Be specific — at least ${n} characters. Vague reasons are how drift starts.`,
    waitLabel: (s) => `Hold on ${s}s — the urge crests and falls before this bar fills.`,
    quizLabel: "Prove you mean it",
    passBtn: "Continue",
    cancelBtn: "Actually, I'll pass",
    transparency: "Why this exists: each rung today costs a little more — friction that matches your day, not a wall.",
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function runGate({ mount, onPass, quizFactory = null }) {
    if (!mount) return;
    const tier = await getTier();
    if (tier === "off") {
      await recordAttempt();
      if (typeof onPass === "function") onPass();
      return;
    }

    const attempts = await getAttemptsToday();
    const escalate = attempts >= ESCALATE_THRESHOLD;
    const wantsQuiz = tier === "strict" || (escalate && tier !== "off");
    const waitSeconds = waitSecondsFor(attempts);
    const totalSteps = 2 + (wantsQuiz ? 1 : 0);

    mount.innerHTML = `
      <div class="ug-card" role="dialog" aria-label="${esc(I18N.title)}">
        <div class="ug-head">
          <span class="ug-title">${esc(I18N.title)}</span>
          <span class="ug-steps">${esc(I18N.stepOf(1, totalSteps))}</span>
        </div>
        <div class="ug-body">
          <label class="ug-label" for="ug-reason">${esc(I18N.reasonLabel)}</label>
          <input id="ug-reason" class="ug-input" type="text"
                 maxlength="140" autocomplete="off" spellcheck="false" />
          <p class="ug-hint" id="ug-hint">${esc(I18N.reasonHint(MIN_REASON_CHARS))}</p>
          <div class="ug-actions">
            <button class="ug-btn ug-btn-ghost" id="ug-cancel">${esc(I18N.cancelBtn)}</button>
            <button class="ug-btn ug-btn-primary" id="ug-next" disabled>${esc(I18N.passBtn)}</button>
          </div>
        </div>
        <p class="ug-foot">${esc(I18N.transparency)}</p>
      </div>
    `;

    const body = mount.querySelector(".ug-body");
    const stepsEl = mount.querySelector(".ug-steps");
    const reasonInput = mount.querySelector("#ug-reason");
    const hintEl = mount.querySelector("#ug-hint");
    const nextBtn = mount.querySelector("#ug-next");
    const cancelBtn = mount.querySelector("#ug-cancel");

    let cancelled = false;

    function setSteps(n) {
      if (stepsEl) stepsEl.textContent = I18N.stepOf(n, totalSteps);
    }

    function swapBody(html) {
      body.innerHTML = html;
    }

    cancelBtn.addEventListener("click", () => {
      cancelled = true;
      mount.innerHTML = "";
    });

    // --- Rung 1: reason ---------------------------------------------------
    reasonInput.addEventListener("input", () => {
      const ok = reasonInput.value.trim().length >= MIN_REASON_CHARS;
      nextBtn.disabled = !ok;
      hintEl.textContent = ok
        ? "Good — a real reason beats a reflex."
        : I18N.reasonHint(MIN_REASON_CHARS - reasonInput.value.trim().length);
    });
    reasonInput.focus();

    nextBtn.addEventListener("click", async () => {
      if (cancelled) return;
      setSteps(2);

      // --- Rung 2: wait-out ----------------------------------------------
      swapBody(`
        <p class="ug-label">${esc(I18N.waitLabel(waitSeconds))}</p>
        <div class="ug-wait" role="progressbar" aria-valuemin="0" aria-valuemax="${waitSeconds}" aria-valuenow="0">
          <div class="ug-wait-fill" style="width:0%"></div>
        </div>
        <div class="ug-actions">
          <button class="ug-btn ug-btn-ghost" id="ug-cancel2">${esc(I18N.cancelBtn)}</button>
          <button class="ug-btn ug-btn-primary" id="ug-go2" disabled>${esc(I18N.passBtn)}</button>
        </div>
      `);
      const fill = body.querySelector(".ug-wait-fill");
      const bar = body.querySelector(".ug-wait");
      const go2 = body.querySelector("#ug-go2");
      body.querySelector("#ug-cancel2").addEventListener("click", () => {
        cancelled = true;
        mount.innerHTML = "";
      });

      const started = Date.now();
      const timer = setInterval(() => {
        const elapsed = (Date.now() - started) / 1000;
        const pct = Math.min(100, (elapsed / waitSeconds) * 100);
        if (fill) fill.style.width = `${pct}%`;
        if (bar) bar.setAttribute("aria-valuenow", String(Math.floor(elapsed)));
        if (elapsed >= waitSeconds) {
          clearInterval(timer);
          go2.disabled = false;
          go2.focus();
        }
      }, 200);

      go2.addEventListener("click", async () => {
        if (cancelled) return;

        // --- Rung 3 (strict / escalated): quiz ---------------------------
        if (wantsQuiz) {
          setSteps(3);
          swapBody(`
            <p class="ug-label">${esc(I18N.quizLabel)}</p>
            <div id="ug-quiz-mount"></div>
          `);
          const quizMount = body.querySelector("#ug-quiz-mount");
          const passQuiz = () => finish();
          if (typeof quizFactory === "function") {
            quizFactory(quizMount, passQuiz);
          } else {
            // No quiz implementation injected — fall back to a typed
            // confirmation so the tier never silently skips its cost.
            quizMount.innerHTML = `
              <input id="ug-confirm" class="ug-input" type="text"
                     placeholder="Type: unblock my time" maxlength="40" />
              <div class="ug-actions">
                <button class="ug-btn ug-btn-primary" id="ug-go3" disabled>${esc(I18N.passBtn)}</button>
              </div>
            `;
            const confirmInput = quizMount.querySelector("#ug-confirm");
            const go3 = quizMount.querySelector("#ug-go3");
            confirmInput.addEventListener("input", () => {
              go3.disabled = confirmInput.value.trim().toLowerCase() !== "unblock my time";
            });
            go3.addEventListener("click", () => finish());
          }
          return;
        }
        finish();
      });

      async function finish() {
        if (cancelled) return;
        await recordAttempt();
        mount.innerHTML = "";
        if (typeof onPass === "function") onPass();
      }
    });
  }

  /** Minimal styles for hosts that don't already load a design system. */
  function renderInlineStyles(root) {
    const doc = root.ownerDocument || document;
    const style = doc.createElement("style");
    style.textContent = `
      .ug-card { font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
        max-width: 420px; margin: 0 auto; padding: 18px; border-radius: 16px;
        background: rgba(28,28,32,.92); color: #f2f2f7; border: 1px solid rgba(255,255,255,.09);
        box-shadow: 0 18px 48px rgba(0,0,0,.45); }
      .ug-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; }
      .ug-title { font-weight:700; font-size:15px; }
      .ug-steps { font-size:11px; opacity:.55; letter-spacing:.04em; text-transform:uppercase; }
      .ug-body { display:flex; flex-direction:column; gap:10px; }
      .ug-label { font-size:13px; opacity:.85; margin:0; }
      .ug-hint { font-size:11.5px; opacity:.5; margin:0; min-height:14px; }
      .ug-input { width:100%; box-sizing:border-box; padding:10px 12px; border-radius:10px;
        border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06);
        color:inherit; font-size:14px; outline:none; }
      .ug-input:focus { border-color:#0A84FF; }
      .ug-wait { height:10px; border-radius:5px; background:rgba(255,255,255,.10); overflow:hidden; }
      .ug-wait-fill { height:100%; border-radius:5px; background:linear-gradient(90deg,#0A84FF,#5E5CE6);
        transition: width .2s linear; }
      .ug-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:2px; }
      .ug-btn { padding:8px 14px; border-radius:9px; border:0; font-size:13px; font-weight:600;
        cursor:pointer; }
      .ug-btn-primary { background:#0A84FF; color:#fff; }
      .ug-btn-primary:disabled { opacity:.35; cursor:default; }
      .ug-btn-ghost { background:transparent; color:rgba(255,255,255,.6); }
      .ug-foot { font-size:10.5px; opacity:.4; margin:12px 0 0; line-height:1.45; }
    `;
    (root.closest("body") || doc.head || doc.documentElement).appendChild(style);
    return style;
  }

  const FTUnblockGate = {
    getTier,
    setTier,
    getAttemptsToday,
    shouldEscalate,
    waitSecondsFor,
    runGate,
    renderInlineStyles,
    MIN_REASON_CHARS,
  };

  if (typeof window !== "undefined") window.FTUnblockGate = FTUnblockGate;
  if (typeof globalThis !== "undefined") globalThis.FTUnblockGate = FTUnblockGate;
})();
