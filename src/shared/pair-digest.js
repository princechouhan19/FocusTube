/**
 * FocusTube — Accountability Pairing (v1.17.0)
 * ============================================
 * Opt-in social commitment: exchange a WEEKLY rings card with one partner
 * through a transport the user owns (copy/paste, file, chat app). No relay,
 * no account, no network call — the payload is a small self-contained JSON
 * text block containing ONLY: a display name, the week label, per-day ring
 * closure counts (0–3), weekly badge tier, and streak length. No URLs, no
 * watch topics, no history, no settings — nothing sensitive leaves the
 * device (see docs/FEATURE_RESEARCH.md §7).
 *
 * Tamper-evidence: a djb2 checksum over the canonical payload lets the
 * receiver detect accidental corruption or casual edits. It is NOT
 * cryptography — the threat model is honest mistakes between partners.
 *
 * Public API:
 *   FTPair.buildMine({ name, points, goals, weekLabel })  → String (share text)
 *   FTPair.parse(text)                                    → card | null
 *   FTPair.summarize(card)  → { closedCount, badge, streak }
 *   FTPair.savePartner(card) / getPartner() / clearPartner()
 *   FTPair.renderSideBySide(container, myCard, partnerCard) — vanilla DOM
 */
(function () {
  "use strict";

  const PARTNER_KEY = "ftPartnerCard";

  function weekKeyOf(dayKey) {
    const [y, m, d] = String(dayKey).split("-").map(Number);
    const date = new Date(y, m - 1, d, 12);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function checksum(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i += 1) {
      h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
  }

  /**
   * points: day points (oldest → newest) with .dayKey; only the last 7 days
   * of the CURRENT week are embedded.
   */
  function buildMine({ name, points, goals, weekLabel, streakDays }) {
    const wk = weekLabel || weekKeyOf(todayKey());
    const days = (Array.isArray(points) ? points : [])
      .slice(-7)
      .map((p) => {
        const deflected = (Number(p.shortsSkipped) || 0) + (Number(p.adsBlocked) || 0) + (Number(p.quitsEarly) || 0);
        const focusedOk = (Number(p.pomodoroCompleted) || 0) >= Math.max(1, (Number(goals.focusMinutes) || 120) / 25);
        const closed =
          (deflected >= (Number(goals.deflected) || 12) ? 1 : 0) +
          (focusedOk ? 1 : 0) +
          ((Number(p.timeSavedMinutes) || 0) >= (Number(goals.savedMinutes) || 60) ? 1 : 0);
        return { d: String(p.dayKey).slice(5), c: closed };
      });
    const closedCount = days.filter((x) => x.c === 3).length;
    const badge = closedCount >= 5 ? "gold" : closedCount >= 3 ? "silver" : closedCount >= 1 ? "bronze" : "none";
    const payload = {
      v: 1,
      app: "focustube",
      name: String(name || "Friend").slice(0, 24),
      week: String(wk).slice(0, 24),
      days,
      closedCount,
      badge,
      streak: Math.max(0, Number(streakDays) || 0),
    };
    const body = JSON.stringify(payload);
    return `FOCUSTUBE-PAIR:v1:${checksum(body)}:${body}`;
  }

  function parse(text) {
    try {
      const raw = String(text || "").trim();
      const m = raw.match(/FOCUSTUBE-PAIR:v1:([a-z0-9]+):(\{.*\})/s);
      if (!m) return null;
      const [, sum, body] = m;
      if (checksum(body) !== sum) return null;
      const obj = JSON.parse(body);
      if (obj.app !== "focustube" || !Array.isArray(obj.days)) return null;
      obj.days = obj.days
        .filter((x) => x && typeof x.d === "string" && Number.isFinite(Number(x.c)))
        .slice(0, 7)
        .map((x) => ({ d: String(x.d).slice(0, 5), c: Math.max(0, Math.min(3, Number(x.c))) }));
      obj.closedCount = Math.max(0, Math.min(7, Number(obj.closedCount) || 0));
      obj.name = String(obj.name || "Friend").slice(0, 24);
      obj.week = String(obj.week || "").slice(0, 24);
      obj.streak = Math.max(0, Math.min(999, Number(obj.streak) || 0));
      if (!["gold", "silver", "bronze", "none"].includes(obj.badge)) obj.badge = "none";
      return obj;
    } catch (_) {
      return null;
    }
  }

  function summarize(card) {
    if (!card) return { closedCount: 0, badge: "none", streak: 0 };
    return { closedCount: card.closedCount, badge: card.badge, streak: card.streak };
  }

  async function savePartner(card) {
    await chrome.storage.local.set({ [PARTNER_KEY]: card });
  }

  async function getPartner() {
    try {
      const data = await chrome.storage.local.get(PARTNER_KEY);
      return (data && data[PARTNER_KEY]) || null;
    } catch (_) {
      return null;
    }
  }

  async function clearPartner() {
    await chrome.storage.local.remove(PARTNER_KEY);
  }

  function todayKey() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Vanilla-DOM side-by-side week strip. `mine`/`theirs` are parsed cards. */
  function renderSideBySide(container, mine, theirs) {
    if (!container) return;
    const row = (card, label, isMine) => {
      const dots = Array.from({ length: 7 }, (_, i) => {
        const day = card && card.days[i];
        const c = day ? day.c : 0;
        const color = c === 3 ? "#92E82A" : c > 0 ? "#FFD60A" : "rgba(255,255,255,.14)";
        return `<span class="ftp-dot${c === 3 ? " full" : ""}" style="background:${color}" title="${c}/3"></span>`;
      }).join("");
      const s = summarize(card);
      return `
        <div class="ftp-row${isMine ? " mine" : ""}">
          <div class="ftp-who">${escapeHtml(card ? card.name : label)}<span class="ftp-tag">${isMine ? "you" : "partner"}</span></div>
          <div class="ftp-dots">${dots}</div>
          <div class="ftp-meta">${s.closedCount}/7 · ${s.badge !== "none" ? s.badge : "—"} · ${s.streak}d</div>
        </div>`;
    };
    container.innerHTML = `
      <div class="ftp-board">
        ${row(mine, "You", true)}
        ${theirs ? row(theirs, "Partner", false) : `<div class="ftp-empty">No partner card imported yet — share yours, then paste theirs below.</div>`}
      </div>`;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  const FTPair = {
    buildMine,
    parse,
    summarize,
    savePartner,
    getPartner,
    clearPartner,
    renderSideBySide,
  };
  if (typeof window !== "undefined") window.FTPair = FTPair;
  if (typeof globalThis !== "undefined") globalThis.FTPair = FTPair;
})();
