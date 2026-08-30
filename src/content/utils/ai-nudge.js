/**
 * AI Nudge System — Motivational messages shown when a site is blocked.
 *
 * Design choice: per the user's preference, this module is LOCAL-only
 * by default. It ships with a curated library of 60+ motivational
 * messages and picks one at random per block event. If the user opts
 * in to `aiNudgeEnabled` in settings, it will additionally call the
 * background's `aiSummarize` handler to generate a personalized nudge
 * based on the user's profile goal and the blocked domain.
 *
 * Public API:
 *   AINudge.getRandomLocal()        // → string (always available)
 *   AINudge.generate(domain, reason) // → Promise<string> (uses AI if enabled)
 *   AINudge.renderInto(element, opts) // → Promise<void> (renders a card)
 */
(function () {
  "use strict";

  if (window.FocusTubeAINudge) return;

  const esc =
    (window.FocusTubeSanitize && window.FocusTubeSanitize.escapeHtml) ||
    ((v) => String(v == null ? "" : v));

  // --- Local message library ------------------------------------------
  // 60 messages across 6 themes. Each entry has a `text` and a `tone`
  // ("gentle" | "firm" | "playful") so the UI can pick a style.
  const LIBRARY = [
    // Gentle (20)
    { tone: "gentle", text: "You said you wanted to focus. This is what that looks like." },
    { tone: "gentle", text: "One small no now is a big yes to your future self." },
    { tone: "gentle", text: "Breathe. The site will still be there in an hour. Will your focus?" },
    { tone: "gentle", text: "Notice the urge. Let it pass. You don't have to act on it." },
    { tone: "gentle", text: "Your attention is the most valuable thing you own. Spend it well." },
    { tone: "gentle", text: "It's okay to want distraction. It's also okay to say not right now." },
    { tone: "gentle", text: "Two minutes of friction now saves two hours of regret later." },
    { tone: "gentle", text: "You're not missing anything. The internet will still be there." },
    { tone: "gentle", text: "This moment of resistance is the rep that builds the muscle." },
    { tone: "gentle", text: "Be kind to yourself — and firm with your time." },
    { tone: "gentle", text: "Close your eyes for three breaths before you decide what's next." },
    { tone: "gentle", text: "The version of you that you're becoming is watching this moment." },
    { tone: "gentle", text: "You can come back to this later. Right now, choose differently." },
    { tone: "gentle", text: "Small wins compound. This is one." },
    { tone: "gentle", text: "Your future self is begging you to stay on track." },
    { tone: "gentle", text: "It's just a website. It can wait." },
    { tone: "gentle", text: "You're stronger than the algorithm. Prove it." },
    { tone: "gentle", text: "Discomfort is the price of growth. Pay it gladly." },
    { tone: "gentle", text: "The notification will still be there in 25 minutes. Focus first." },
    { tone: "gentle", text: "You don't need to check. You need to focus." },

    // Firm (20)
    { tone: "firm", text: "No. Get back to work." },
    { tone: "firm", text: "You set this block for a reason. Honor it." },
    { tone: "firm", text: "This is not the time. This is the test." },
    { tone: "firm", text: "Every time you bypass this, you weaken the habit. Don't." },
    { tone: "firm", text: "Stop. Breathe. Return to the task." },
    { tone: "firm", text: "You promised yourself. Keep the promise." },
    { tone: "firm", text: "The quiz is harder than the focus. Just focus." },
    { tone: "firm", text: "You will thank yourself in 20 minutes. Stay." },
    { tone: "firm", text: "Discipline is choosing what you want most over what you want now." },
    { tone: "firm", text: "The urge is lying. The work is calling." },
    { tone: "firm", text: "You don't have the time. You have the choice." },
    { tone: "firm", text: "This is the moment. Don't waste it." },
    { tone: "firm", text: "Block the escape. Walk toward the work." },
    { tone: "firm", text: "Your goals are not optional. Neither is this block." },
    { tone: "firm", text: "Resist. The streak depends on it." },
    { tone: "firm", text: "No shortcut. Just the work." },
    { tone: "firm", text: "The distraction will outlast your willpower if you let it in. Don't." },
    { tone: "firm", text: "You are not your urges. You are what you do next." },
    { tone: "firm", text: "Focus is a refusal. Refuse." },
    { tone: "firm", text: "This page is closed. The work is open." },

    // Playful (20)
    { tone: "playful", text: "Nice try. Back to work, champ." },
    { tone: "playful", text: "The algorithm called. It said it misses you. Don't go back." },
    { tone: "playful", text: "Plot twist: you stay focused and finish early." },
    { tone: "playful", text: "Your future self just high-fived you. Don't make it weird." },
    { tone: "playful", text: "The site will be there. Your deadline won't." },
    { tone: "playful", text: "This block is doing its job. Are you doing yours?" },
    { tone: "playful", text: "Bold of you to assume I'd let you through." },
    { tone: "playful", text: "Pro tip: the work gets easier when you actually do it." },
    { tone: "playful", text: "The internet can wait. It's very patient." },
    { tone: "playful", text: "You vs. distraction. Round 47. Fight." },
    { tone: "playful", text: "Spoiler alert: you finish the thing and feel great." },
    { tone: "playful", text: "Your brain is trying to trick you. Don't fall for it." },
    { tone: "playful", text: "This is a sign. A literal sign that says no." },
    { tone: "playful", text: "If you close this tab and focus, you win. If not, the site wins." },
    { tone: "playful", text: "Plot armor activated: you cannot be distracted right now." },
    { tone: "playful", text: "The notification will expire. Your focus won't." },
    { tone: "playful", text: "You're not bored. You're just between tasks. Pick one." },
    { tone: "playful", text: "This site is on a timeout. So are you." },
    { tone: "playful", text: "Bold move, clicking here. Bolder move: not staying." },
    { tone: "playful", text: "Focus level: legendary. Distraction level: blocked." },
  ];

  // --- Helpers --------------------------------------------------------
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getLibraryByTone(tone) {
    if (!tone) return LIBRARY;
    return LIBRARY.filter((m) => m.tone === tone);
  }

  // --- Public API -----------------------------------------------------
  const AINudge = {
    LIBRARY,

    /**
     * Return a random local message (no AI call).
     * Optionally filter by tone.
     */
    getRandomLocal(tone) {
      const pool = getLibraryByTone(tone);
      return pickRandom(pool).text;
    },

    /**
     * Generate a nudge for the given blocked domain.
     *
     * If the user has enabled `aiNudgeEnabled` AND has an AI provider
     * API key configured, calls the background's `aiSummarize` handler
     * to generate a personalized one-line nudge. Falls back to a local
     * message on any error or timeout.
     */
    async generate(domain, reason) {
      try {
        const settings = await chrome.storage.local.get([
          "aiNudgeEnabled",
          "aiProvider",
          "geminiApiKey",
          "openaiApiKey",
          "mistralApiKey",
          "deepseekApiKey",
          "grokApiKey",
          "profileGoal",
        ]);

        if (!settings.aiNudgeEnabled) {
          return this.getRandomLocal();
        }

        const keyMap = {
          gemini: settings.geminiApiKey,
          openai: settings.openaiApiKey,
          mistral: settings.mistralApiKey,
          deepseek: settings.deepseekApiKey,
          grok: settings.grokApiKey,
        };
        const provider = settings.aiProvider || "gemini";
        if (!keyMap[provider]) {
          return this.getRandomLocal();
        }

        const goal = settings.profileGoal || "stay focused";
        const prompt =
          `You are a witty, kind, slightly firm focus coach. The user ` +
          `tried to visit ${domain} but it's blocked. Their stated goal ` +
          `is: "${goal}". Generate ONE short motivational sentence ` +
          `(max 18 words) to help them choose to keep working. No emojis, ` +
          `no quotes, no explanations — just the sentence.`;

        const resp = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: "aiSummarize", provider, prompt },
            (r) => resolve(r || { success: false }),
          );
        });

        if (resp && resp.success && resp.text) {
          const text = String(resp.text).trim().slice(0, 240);
          if (text) return text;
        }
        return this.getRandomLocal();
      } catch (err) {
        console.warn("[FocusTube AINudge] generate failed:", err);
        return this.getRandomLocal();
      }
    },

    /**
     * Render a nudge card into the given DOM element.
     * The card includes:
     *   - The nudge message (escaped)
     *   - A small "Take 3 breaths" button (10-second breathing animation)
     *   - A "+1 willpower" button that records a metric
     *
     * @param {HTMLElement} container - element to render into
     * @param {object} opts - { domain, reason }
     */
    async renderInto(container, opts = {}) {
      if (!container) return;
      const domain = esc(opts.domain || "this site");
      const reason = esc(opts.reason || "");

      const message = await this.generate(opts.domain, opts.reason);

      // Build the card with DOM APIs (no innerHTML for the message).
      container.textContent = "";

      const card = document.createElement("div");
      card.className = "lg-card";
      Object.assign(card.style, {
        marginTop: "16px",
        maxWidth: "440px",
        textAlign: "center",
      });

      const label = document.createElement("div");
      label.className = "lg-eyebrow";
      Object.assign(label.style, { marginBottom: "8px" });
      label.textContent = "Focus Nudge";
      card.appendChild(label);

      const msg = document.createElement("p");
      Object.assign(msg.style, {
        margin: "0 0 14px 0",
        fontSize: "var(--lg-text-md)",
        lineHeight: "1.5",
        color: "var(--lg-text)",
        fontStyle: "italic",
      });
      msg.textContent = message; // safe — textContent
      card.appendChild(msg);

      const btnRow = document.createElement("div");
      btnRow.className = "lg-flex-row";
      btnRow.style.justifyContent = "center";

      const breathBtn = document.createElement("button");
      breathBtn.className = "lg-btn lg-btn-soft-primary";
      breathBtn.style.fontSize = "var(--lg-text-sm)";
      breathBtn.style.padding = "6px 12px";
      breathBtn.textContent = "🌬️ 3 Breaths";
      breathBtn.onclick = () => this.startBreathing(card);
      btnRow.appendChild(breathBtn);

      const willBtn = document.createElement("button");
      willBtn.className = "lg-btn lg-btn-soft-success";
      willBtn.style.fontSize = "var(--lg-text-sm)";
      willBtn.style.padding = "6px 12px";
      willBtn.textContent = "💪 +1 Willpower";
      willBtn.onclick = async () => {
        willBtn.disabled = true;
        willBtn.textContent = "✓ Noted";
        try {
          await chrome.runtime.sendMessage({
            action: "recordMetric",
            metric: "willpowerPoints",
            amount: 1,
          });
        } catch (_) {}
      };
      btnRow.appendChild(willBtn);

      card.appendChild(btnRow);
      container.appendChild(card);
    },

    /**
     * Show a 10-second breathing animation overlay inside the given
     * parent element. Three cycles of inhale (4s) + hold (2s) + exhale (4s).
     */
    startBreathing(parent) {
      // Remove any existing breathing overlay.
      const existing = parent.querySelector(".focustube-breath");
      if (existing) existing.remove();

      const overlay = document.createElement("div");
      overlay.className = "focustube-breath";
      Object.assign(overlay.style, {
        position: "absolute",
        inset: "0",
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "100",
        borderRadius: "12px",
      });

      const circle = document.createElement("div");
      Object.assign(circle.style, {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: "var(--lg-gradient-primary)",
        transition: "transform 4s ease-in-out, opacity 4s ease-in-out",
        marginBottom: "16px",
        boxShadow: "var(--lg-shadow-glow)",
      });
      overlay.appendChild(circle);

      const label = document.createElement("div");
      Object.assign(label.style, {
        color: "#edebe7",
        fontSize: "16px",
        fontWeight: "600",
      });
      label.textContent = "Breathe in...";
      overlay.appendChild(label);

      parent.style.position = "relative";
      parent.appendChild(overlay);

      const phases = [
        { label: "Breathe in...", scale: 1.6, duration: 4000 },
        { label: "Hold", scale: 1.6, duration: 2000 },
        { label: "Breathe out...", scale: 1.0, duration: 4000 },
        { label: "Hold", scale: 1.0, duration: 2000 },
        { label: "Breathe in...", scale: 1.6, duration: 4000 },
        { label: "Hold", scale: 1.6, duration: 2000 },
        { label: "Breathe out...", scale: 1.0, duration: 4000 },
      ];

      let i = 0;
      const runPhase = () => {
        if (i >= phases.length) {
          overlay.remove();
          return;
        }
        const p = phases[i++];
        label.textContent = p.label;
        circle.style.transform = `scale(${p.scale})`;
        setTimeout(runPhase, p.duration);
      };
      runPhase();
    },
  };

  window.FocusTubeAINudge = AINudge;
})();
