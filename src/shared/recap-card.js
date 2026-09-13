/**
 * FocusTube — Weekly Recap Card (v1.17.0)
 * =======================================
 * A shareable, canvas-rendered PNG of your ring week: 7 mini triple-rings,
 * weekly badge tier, best day, streak, time saved. 100% local — drawn with
 * canvas 2D, exported via toBlob, zero network, zero libraries.
 *
 * Evidence anchor: self-monitoring + feedback are among the most effective
 * behavior-change techniques (Michie et al. 2009 BCT taxonomy); a shareable
 * artifact turns private progress into a commitment signal.
 *
 * Public API:
 *   FTRecap.renderCard({ points, goals, weekLabel, bestDay, streakDays, timeSavedMin, profileName })
 *       → Promise<Blob>          1200×1500 PNG blob
 *   FTRecap.download(blob, filename)
 */
(function () {
  "use strict";

  const W = 1200;
  const H = 1500;
  const BG_TOP = "#111114";
  const BG_BOTTOM = "#0A0A0C";
  const INK = "#F5F5F7";
  const INK_DIM = "rgba(245,245,247,.55)";
  const INK_FAINT = "rgba(245,245,247,.32)";
  const RING_COLORS = { deflected: "#FA114F", focused: "#92E82A", saved: "#00FDDC" };
  const ACCENT = "#0A84FF";

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function font(size, weight) {
    return `${weight || 400} ${size}px -apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif`;
  }

  /** One Apple-Fitness-style triple ring. */
  function drawRing(ctx, cx, cy, radius, pcts, closed) {
    const widths = [radius * 0.155, radius * 0.155, radius * 0.155];
    const gaps = radius * 0.1;
    const radii = [radius, radius - widths[0] - gaps, radius - 2 * (widths[0] + gaps)];
    const keys = ["deflected", "focused", "saved"];
    // Track behind
    keys.forEach((k, i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radii[i], 0, Math.PI * 2);
      ctx.lineWidth = widths[i];
      ctx.strokeStyle = "rgba(255,255,255,.09)";
      ctx.stroke();
    });
    // Progress (start at 12 o'clock)
    keys.forEach((k, i) => {
      const pct = Math.max(0.001, Math.min(1, pcts[k] || 0));
      ctx.beginPath();
      ctx.arc(cx, cy, radii[i], -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.lineWidth = widths[i];
      ctx.lineCap = "round";
      ctx.strokeStyle = RING_COLORS[k];
      ctx.stroke();
      ctx.lineCap = "butt";
    });
    if (closed) {
      ctx.beginPath();
      ctx.arc(cx, cy - radius - 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD60A";
      ctx.fill();
    }
  }

  async function renderCard(data) {
    const {
      points = [],
      goals = {},
      weekLabel = "",
      bestDay = null,
      streakDays = 0,
      timeSavedMin = 0,
      profileName = "",
    } = data;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, BG_TOP);
    grad.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = ACCENT;
    ctx.font = font(26, 700);
    ctx.textAlign = "center";
    const title = "WEEKLY RINGS";
    ctx.letterSpacing = "6px";
    ctx.fillText(title, W / 2, 110);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = INK;
    ctx.font = font(58, 800);
    ctx.fillText(weekLabel || "This week", W / 2, 185);

    if (profileName) {
      ctx.fillStyle = INK_DIM;
      ctx.font = font(26, 500);
      ctx.fillText(`by ${profileName}`, W / 2, 232);
    }

    // 7 day rings
    const cells = points.slice(-7);
    const cellW = 132;
    const startX = (W - cells.length * cellW) / 2 + cellW / 2;
    cells.forEach((p, i) => {
      const cx = startX + i * cellW;
      const cy = 430;
      const pcts = {
        deflected: Math.min(1, (Number(p.shortsSkipped || 0) + Number(p.adsBlocked || 0) + Number(p.quitsEarly || 0)) / (goals.deflected || 12)),
        focused: Math.min(1, Number(p.pomodoroCompleted || 0) / Math.max(1, (goals.focusMinutes || 120) / 25)),
        saved: Math.min(1, Number(p.timeSavedMinutes || 0) / (goals.savedMinutes || 60)),
      };
      const closed = pcts.deflected >= 1 && pcts.focused >= 1 && pcts.saved >= 1;
      drawRing(ctx, cx, cy, 46, pcts, closed);
      const dayLabel = p.dayLabel || (p.dayKey ? weekdayOf(p.dayKey) : `D${i + 1}`);
      ctx.fillStyle = closed ? "#FFD60A" : INK_FAINT;
      ctx.font = font(20, closed ? 700 : 500);
      ctx.textAlign = "center";
      ctx.fillText(dayLabel, cx, cy + 86);
    });

    // Stats band
    const closedDays = cells.filter((p) => {
      const d = (Number(p.shortsSkipped || 0) + Number(p.adsBlocked || 0) + Number(p.quitsEarly || 0)) >= (goals.deflected || 12)
        && Number(p.pomodoroCompleted || 0) >= Math.max(1, (goals.focusMinutes || 120) / 25)
        && Number(p.timeSavedMinutes || 0) >= (goals.savedMinutes || 60);
      return d;
    }).length;

    const stats = [
      { v: `${closedDays}/7`, l: "rings closed" },
      { v: `${Math.max(0, Number(streakDays) || 0)}`, l: "day streak" },
      { v: `${Math.round(Number(timeSavedMin) || 0) >= 60 ? `${Math.floor(Number(timeSavedMin) / 60)}h ${Number(timeSavedMin) % 60}m` : `${Math.round(Number(timeSavedMin) || 0)}m`}`, l: "time saved" },
    ];
    const bandY = 640;
    stats.forEach((s, i) => {
      const cx = W / 2 + (i - 1) * 300;
      ctx.fillStyle = INK;
      ctx.font = font(56, 800);
      ctx.textAlign = "center";
      ctx.fillText(s.v, cx, bandY);
      ctx.fillStyle = INK_DIM;
      ctx.font = font(22, 500);
      ctx.fillText(s.l, cx, bandY + 38);
    });

    // Best day ribbon
    ctx.textAlign = "center";
    if (bestDay) {
      ctx.fillStyle = "rgba(255,214,10,.14)";
      rr(ctx, W / 2 - 380, 780, 760, 92, 24);
      ctx.fill();
      ctx.fillStyle = "#FFD60A";
      ctx.font = font(30, 700);
      ctx.fillText(`★ Best day — ${bestDay}`, W / 2, 838);
    }

    // Badge tier
    const tier = tierOf(closedDays);
    if (tier !== "none") {
      const tierColor = tier === "gold" ? "#FFD60A" : tier === "silver" ? "#C7C7CC" : "#CD7F32";
      ctx.fillStyle = tierColor;
      ctx.font = font(40, 800);
      ctx.textAlign = "center";
      const medal = tier === "gold" ? "🥇" : tier === "silver" ? "🥈" : "🥉";
      ctx.fillText(`${medal} ${tier.toUpperCase()} WEEK`, W / 2, 960);
    }

    // Footer brand
    ctx.fillStyle = INK_FAINT;
    ctx.font = font(22, 500);
    ctx.textAlign = "center";
    ctx.fillText("FocusTube — close your rings, keep your time", W / 2, H - 90);
    ctx.fillText(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), W / 2, H - 52);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });

    function weekdayOf(dayKey) {
      const [y, m, d] = String(dayKey).split("-").map(Number);
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(y, m - 1, d, 12).getDay()];
    }
  }

  function tierOf(closedDays) {
    if (closedDays >= 5) return "gold";
    if (closedDays >= 3) return "silver";
    if (closedDays >= 1) return "bronze";
    return "none";
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `focustube-week-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  const FTRecap = { renderCard, download, tierOf };
  if (typeof window !== "undefined") window.FTRecap = FTRecap;
  if (typeof globalThis !== "undefined") globalThis.FTRecap = FTRecap;
})();
