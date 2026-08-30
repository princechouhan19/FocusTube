const RANGE_META = {
  day: { title: "Today", subtitle: "A same-day view of your protected attention." },
  week: { title: "This Week", subtitle: "Seven-day rollup from your local browsing activity." },
  month: { title: "This Month", subtitle: "A 30-day trend of FocusTube activity on this device." },
};

let dashboardData = null;
let activeRange = "day";

const log = (...args) => console.log("%c[FocusTube Dashboard]", "color:#d9a62e;font-weight:bold", ...args);
const logErr = (...args) => console.error("%c[FocusTube Dashboard]", "color:#c96a62;font-weight:bold", ...args);
const logWarn = (...args) => console.warn("%c[FocusTube Dashboard]", "color:#cf9448;font-weight:bold", ...args);

document.addEventListener("DOMContentLoaded", async () => {
  log("DOM ready, loading dashboard data...");

  // Bind interactive controls FIRST, before any awaits. If data loading
  // throws (e.g. the extension was reloaded and this page's context is
  // stale), the range tabs must still respond instead of leaving the
  // user with a dead UI.
  bindRangeTabs();
  bindControls();

  await refreshDashboard();
  loadTopSites();
});

async function refreshDashboard() {
  try {
    const response = await loadDashboardData();
    log("Dashboard data loaded:", response);

    if (!response || (!response.success && !response.report)) {
      logWarn("No dashboard data — rendering empty state");
      dashboardData = null;
      renderEmptyState();
      return;
    }

    dashboardData = response;
    hideRetry();

    renderProfile(response.profile || {});
    renderLifetime(response.lifetime || {});
    renderRange(activeRange);
  } catch (error) {
    // Most common cause: the extension was reloaded while this page was
    // open, so chrome.runtime messaging is dead ("Extension context
    // invalidated"). Surface it instead of silently failing.
    logErr("Failed to load dashboard data:", error);
    dashboardData = null;
    renderErrorState(error);
  }
}

function bindControls() {
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.classList.add("lg-spin");
      refreshDashboard().finally(() => {
        setTimeout(() => refreshBtn.classList.remove("lg-spin"), 400);
      });
    });
  }

  const retryBtn = document.getElementById("retry-load");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => refreshDashboard());
  }

  const versionEl = document.getElementById("footer-version");
  if (versionEl) {
    try {
      versionEl.textContent = `FocusTube v${chrome.runtime.getManifest().version}`;
    } catch (_) {
      versionEl.textContent = "FocusTube";
    }
  }
}

async function loadDashboardData() {
  try {
    log("Sending getDashboardStats to background...");
    const response = await chrome.runtime.sendMessage({
      action: "getDashboardStats",
    });
    log("Background response:", response);

    // The background wraps the result as { success, data: {...} }
    // The inner data object ALSO has success:true, plus profile/lifetime/report.
    if (response?.success && response?.data) {
      // Unwrap: return the inner object so dashboard.js sees { profile, lifetime, report }
      return response.data;
    }
    // Legacy fallback: some older paths return the inner object directly.
    if (response?.profile || response?.lifetime || response?.report) {
      return response;
    }
    logWarn("Background returned unexpected shape:", response);
  } catch (error) {
    logErr("Failed to message background:", error);
    throw error;
  }

  // Fallback: read directly from storage (offline / SW asleep).
  logWarn("Using storage fallback for dashboard data");
  let stored;
  try {
    stored = await chrome.storage.local.get([
      "statsShortsSkipped",
      "statsAdsBlocked",
      "statsSummariesGenerated",
      "statsQuitsEarly",
      "statsTimeSaved",
      "statsWillpowerPoints",
      "statsPomodoroCompleted",
      "profileName",
      "profileImage",
      "profileEmail",
      "profileGoal",
    ]);
  } catch (error) {
    logErr("Storage also unavailable:", error);
    throw error;
  }

  const lifetime = {
    shortsSkipped: Number(stored.statsShortsSkipped) || 0,
    adsBlocked: Number(stored.statsAdsBlocked) || 0,
    summariesGenerated: Number(stored.statsSummariesGenerated) || 0,
    quitsEarly: Number(stored.statsQuitsEarly) || 0,
    timeSavedMinutes: Number(stored.statsTimeSaved) || 0,
    willpowerPoints: Number(stored.statsWillpowerPoints) || 0,
    pomodoroCompleted: Number(stored.statsPomodoroCompleted) || 0,
  };

  const key = new Date().toISOString().slice(0, 10);
  const rangeData = {
    totals: { ...lifetime },
    points: [{ key, ...lifetime }],
  };

  return {
    success: true,
    profile: {
      profileName: stored.profileName || "Guest User",
      profileImage: stored.profileImage || "",
      profileEmail: stored.profileEmail || "",
      profileGoal: stored.profileGoal || "",
    },
    lifetime,
    report: { day: rangeData, week: rangeData, month: rangeData },
  };
}

async function loadTopSites() {
  try {
    log("Loading top sites for time-usage section...");
    const resp = await chrome.runtime.sendMessage({ action: "getTimeUsage" });
    log("Time usage response:", resp);
    if (resp?.success && resp.today) {
      renderTopSites(resp.today || {}, resp.limits || {}, resp.logos || {});
      return;
    }
    // Older background build (or stale service worker) — fall back to the
    // legacy action without limits info.
    logWarn("getTimeUsage unavailable, falling back to getTopSites");
    const alt = await chrome.runtime.sendMessage({ action: "getTopSites" });
    if (alt?.success && alt.sites) {
      renderTopSites(
        Object.fromEntries(alt.sites.map((s) => [s.domain, s.minutes])),
        {},
      );
      return;
    }
    showTopSitesError();
  } catch (err) {
    logWarn("Top sites failed:", err);
    showTopSitesError();
  }
}

function showTopSitesError() {
  const list = document.getElementById("top-sites-list");
  if (!list) return;
  list.innerHTML =
    '<p class="top-sites-empty">Time tracking couldn\'t be read — this page is running newer code than the extension background. Reload the extension (chrome://extensions → Reload) and reopen the dashboard.</p>';
}

function getSiteLogoUrl(domain, logos) {
  const entry = logos?.[domain];
  const url = typeof entry === "string" ? entry : entry?.url;
  return /^https?:\/\//i.test(url || "") ? url : `https://${domain}/favicon.ico`;
}

function attachSiteLogo(parent, domain, logos) {
  const icon = document.createElement("img");
  icon.className = "site-logo";
  icon.src = getSiteLogoUrl(domain, logos);
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  icon.onerror = () => {
    icon.replaceWith(Object.assign(document.createElement("span"), {
      className: "site-logo site-logo-fallback",
      textContent: domain.slice(0, 1).toUpperCase(),
      title: `${domain} icon unavailable`,
    }));
  };
  parent.appendChild(icon);
}

function renderTopSites(todayMinutes, limits, logos = {}) {
  let container = document.getElementById("top-sites-list");
  if (!container) return;
  container.innerHTML = "";

  const entries = Object.entries(todayMinutes)
    .filter(([, minutes]) => minutes > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (entries.length === 0) {
    container.innerHTML =
      '<p class="top-sites-empty">No browsing tracked yet today. Visit a few sites and this list fills in automatically.</p>';
    return;
  }

  const max = Math.max(1, ...entries.map(([, m]) => m));
  entries.forEach(([domain, minutes]) => {
    const limit = Number(limits[domain]) || 0;
    const ratio = limit > 0 ? minutes / limit : 0;

    const row = document.createElement("div");
    row.className = "top-site-row";

    attachSiteLogo(row, domain, logos);

    const name = document.createElement("span");
    name.className = "top-site-name";
    name.textContent = domain;
    name.title = domain;
    row.appendChild(name);

    const barBg = document.createElement("div");
    barBg.className = "top-site-bar";
    const barFill = document.createElement("div");
    barFill.className = "top-site-bar-fill";
    barFill.style.width = `${(minutes / max) * 100}%`;
    if (limit > 0) {
      if (ratio >= 1) {
        barFill.classList.add("over-limit");
      } else if (ratio >= 0.8) {
        barFill.classList.add("near-limit");
      }
    }
    barBg.appendChild(barFill);
    row.appendChild(barBg);

    const mins = document.createElement("span");
    mins.className = "top-site-time";
    if (limit > 0) {
      mins.classList.add(ratio >= 1 ? "over-limit" : ratio >= 0.8 ? "near-limit" : "has-limit");
      mins.textContent = `${Math.round(minutes)}m / ${limit}m`;
      mins.title = `${Math.round(minutes)} of ${limit} daily minutes used`;
    } else {
      mins.textContent = `${Math.round(minutes)}m`;
    }
    row.appendChild(mins);

    container.appendChild(row);
  });
}

// Watch Time & Topics panel — range-aware. Watch time is the sum of tracked
// per-site seconds for the selected range; topics come from hashtags and
// video categories captured by the YouTube topic tracker.
const WATCH_LABELS = {
  day: "watched today",
  week: "watched this week",
  month: "watched this month",
};

function renderWatchTopics(range) {
  const seconds = Number(dashboardData?.watchTime?.[range]) || 0;
  const totalEl = document.getElementById("watch-total");
  if (totalEl) totalEl.textContent = formatMinutes(Math.round(seconds / 60));
  const labelEl = document.getElementById("watch-label");
  if (labelEl) labelEl.textContent = WATCH_LABELS[range] || "watched";

  const list = document.getElementById("topics-list");
  if (!list) return;
  list.innerHTML = "";

  const topics = (dashboardData?.topics?.[range] || []).filter(
    (t) => t && t.topic && t.count > 0,
  );
  if (topics.length === 0) {
    list.innerHTML =
      '<p class="top-sites-empty">No topics yet — hashtags and categories from YouTube videos you watch will appear here.</p>';
    return;
  }

  const max = Math.max(1, ...topics.map((t) => t.count));
  topics.forEach((t) => {
    const row = document.createElement("div");
    row.className = "topic-row";

    const name = document.createElement("span");
    name.className = "top-site-name";
    name.textContent = t.topic;
    name.title = `${t.count} video${t.count === 1 ? "" : "s"} · ${t.topic}`;
    row.appendChild(name);

    const barBg = document.createElement("div");
    barBg.className = "top-site-bar";
    const barFill = document.createElement("div");
    barFill.className = "topic-bar-fill";
    barFill.style.width = `${(t.count / max) * 100}%`;
    barBg.appendChild(barFill);
    row.appendChild(barBg);

    const count = document.createElement("span");
    count.className = "topic-count";
    count.textContent = `${t.count}×`;
    count.title = `${t.count} video${t.count === 1 ? "" : "s"}`;
    row.appendChild(count);

    list.appendChild(row);
  });
}

function bindRangeTabs() {
  const tabs = [...document.querySelectorAll(".range-tab")];
  tabs.forEach((button, index) => {
    button.addEventListener("click", () => {
      activateRange(button.dataset.range);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next =
        event.key === "ArrowRight"
          ? (index + 1) % tabs.length
          : (index - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      activateRange(tabs[next].dataset.range);
    });
  });
}

function activateRange(range) {
  if (!RANGE_META[range]) return;
  activeRange = range;
  document.querySelectorAll(".range-tab").forEach((tab) => {
    const isActive = tab.dataset.range === range;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.tabIndex = isActive ? 0 : -1;
  });
  renderRange(activeRange);
}

function renderProfile(profile) {
  const safeSet = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  safeSet("user-name", profile.profileName || "Guest User");
  safeSet("user-email", profile.profileEmail || "Not connected");
  safeSet("goal-text", profile.profileGoal || "Stay intentional");

  const avatar = document.getElementById("user-avatar");
  if (!avatar) return;
  if (profile.profileImage) {
    avatar.src = profile.profileImage;
  } else {
    avatar.removeAttribute("src");
  }
}

function renderLifetime(lifetime) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("lifetime-shorts", lifetime.shortsSkipped);
  set("lifetime-ads", lifetime.adsBlocked);
  set("lifetime-summaries", lifetime.summariesGenerated);
  set("lifetime-quits", lifetime.quitsEarly);
  set("lifetime-time", formatMinutes(lifetime.timeSavedMinutes));
  set("lifetime-pomodoros-2", lifetime.pomodoroCompleted || 0);
  set("lifetime-willpower-2", lifetime.willpowerPoints || 0);
  // Hero stats
  set("hero-pomodoros", lifetime.pomodoroCompleted || 0);
  set("hero-willpower", lifetime.willpowerPoints || 0);
  set("hero-time", formatMinutes(lifetime.timeSavedMinutes));
}

function renderRange(range) {
  const data = dashboardData?.report?.[range];
  if (!data) {
    renderEmptyState();
    return;
  }

  document.getElementById("range-title").textContent = RANGE_META[range].title;
  document.getElementById("range-subtitle").textContent =
    RANGE_META[range].subtitle;
  hideRetry();

  // Null-safe: some IDs (e.g. metric-time) may not exist in every layout;
  // a missing optional element must never break the whole render.
  const safeSet = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  safeSet("metric-shorts", data.totals.shortsSkipped);
  safeSet("metric-ads", data.totals.adsBlocked);
  safeSet("metric-summaries", data.totals.summariesGenerated);
  safeSet("metric-quits", data.totals.quitsEarly);
  safeSet("metric-time", formatMinutes(data.totals.timeSavedMinutes));

  renderWatchTopics(range);
  renderChart(data.points, range);
  renderInsight(data.totals, range);

  // v1.1.0 — new dashboard widgets
  renderScore(dashboardData.lifetime, data.totals);
  renderHeatmap(dashboardData?.report?.month?.points || []);
  renderStreak(dashboardData?.report?.month?.points || []);
}

function renderEmptyState() {
  document.getElementById("range-title").textContent = "No data yet";
  document.getElementById("range-subtitle").textContent =
    "Use FocusTube for a bit and the dashboard will start filling in.";
  document.getElementById("chart-bars").innerHTML = "";
  document.getElementById("chart-note").textContent = "";
  renderWatchTopics(activeRange);
  renderInsight(
    {
      shortsSkipped: 0,
      adsBlocked: 0,
      summariesGenerated: 0,
      quitsEarly: 0,
      timeSavedMinutes: 0,
    },
    activeRange,
  );
}

function renderErrorState(error) {
  const msg = String(error?.message || error || "");
  document.getElementById("range-title").textContent = "Couldn't load data";
  document.getElementById("range-subtitle").textContent = msg.includes(
    "Extension context invalidated",
  )
    ? "The extension was reloaded — this page needs a refresh."
    : "Something went wrong while reading your stats.";
  document.getElementById("chart-bars").innerHTML = "";
  document.getElementById("chart-note").textContent = "";
  showRetry();
}

function showRetry() {
  const retryBtn = document.getElementById("retry-load");
  if (retryBtn) retryBtn.hidden = false;
}

function hideRetry() {
  const retryBtn = document.getElementById("retry-load");
  if (retryBtn) retryBtn.hidden = true;
}

const CHART_SERIES = [
  { field: "shortsSkipped", className: "blue", label: "Shorts" },
  { field: "adsBlocked", className: "green", label: "Ads" },
  { field: "summariesGenerated", className: "violet", label: "Summaries" },
  { field: "quitsEarly", className: "amber", label: "Quits" },
];

function renderChart(points, range) {
  const chart = document.getElementById("chart-bars");
  const note = document.getElementById("chart-note");
  chart.innerHTML = "";

  // A single "now" bar communicates nothing — for the Day tab we show the
  // 7-day context instead, with today highlighted, and say so.
  let data = points;
  let todayHighlight = false;
  if (range === "day") {
    data = dashboardData?.report?.week?.points || points;
    todayHighlight = true;
    if (note) note.textContent = "Last 7 days — today highlighted";
  } else if (note) {
    note.textContent = "";
  }

  const maxValue = Math.max(
    1,
    ...data.map((point) =>
      CHART_SERIES.reduce((sum, s) => sum + (Number(point[s.field]) || 0), 0),
    ),
  );

  const todayKey = new Date(
    new Date().setHours(0, 0, 0, 0),
  ).toLocaleDateString("sv"); // YYYY-MM-DD, local time

  data.forEach((point, index) => {
    const group = document.createElement("div");
    group.className = "chart-bar-group";
    if (todayHighlight && point.key === todayKey) {
      group.classList.add("today");
    }

    const stack = document.createElement("div");
    stack.className = "chart-stack";

    CHART_SERIES.forEach((series) => {
      const value = Number(point[series.field]) || 0;
      const bar = document.createElement("div");
      bar.className = `bar-segment ${series.className}`;
      const height = Math.max(4, (value / maxValue) * 160);
      bar.style.height = `${value > 0 ? height : 3}px`;
      const date = formatPointLabel(point.key, "week", true);
      bar.title = `${date}: ${value} ${series.label.toLowerCase()}`;
      stack.appendChild(bar);
    });

    const label = document.createElement("span");
    label.className = "bar-label";
    // For 30-day charts, label every 3rd bar to avoid crowding.
    if (range === "month" && index % 3 !== 0 && index !== data.length - 1) {
      label.innerHTML = "&nbsp;";
    } else {
      label.textContent = formatPointLabel(point.key, range);
    }

    group.appendChild(stack);
    group.appendChild(label);
    chart.appendChild(group);
  });
}

function renderInsight(totals, range) {
  const title = document.getElementById("insight-title");
  const body = document.getElementById("insight-body");

  if (totals.timeSavedMinutes >= 60) {
    title.textContent = "Strong protection";
    body.textContent = `You protected ${formatMinutes(
      totals.timeSavedMinutes,
    )} in the ${range}. That is meaningful reclaimed attention.`;
    return;
  }

  if (totals.quitsEarly > 0 && totals.quitsEarly >= totals.summariesGenerated) {
    title.textContent = "Friction is showing up";
    body.textContent =
      "Quit attempts are outpacing productive actions right now. Tighten your block windows and keep the challenge on.";
    return;
  }

  if (totals.adsBlocked + totals.shortsSkipped + totals.summariesGenerated === 0) {
    title.textContent = "Fresh slate";
    body.textContent =
      "There is not much tracked activity yet in this range. Use blocking, summaries, and shortcuts to start building the report.";
    return;
  }

  title.textContent = "Momentum building";
  body.textContent =
    "You are actively trimming distractions in this range. Keep the same rhythm and your weekly pattern will start to look much cleaner.";
}

function formatMinutes(minutes) {
  const safe = Number(minutes) || 0;
  if (safe >= 60) {
    const hours = Math.floor(safe / 60);
    const remainder = safe % 60;
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  }

  return `${safe}m`;
}

function formatPointLabel(dayKey, range, longForm = false) {
  const date = new Date(`${dayKey}T00:00:00`);
  if (longForm || range === "day") {
    return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  }
  if (range === "week") {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// v1.1.0: Productivity Score, Heatmap, Streak
// ---------------------------------------------------------------------------

/**
 * Compute a 0-100 productivity score.
 *
 * Formula:
 *   positive = shortsSkipped + adsBlocked + summariesGenerated + willpowerPoints
 *   negative = quitsEarly * 2  (each quit hurts more than each win)
 *   raw = positive - negative
 *   score = clamp(0, 100, 40 + raw * 2)
 *
 * The baseline of 40 means a brand-new user with no activity is at 40/100,
 * not 0 — the bar for "improving" starts from "did anything at all".
 */
function computeScore(lifetime, rangeTotals) {
  const positive =
    (rangeTotals.shortsSkipped || 0) +
    (rangeTotals.adsBlocked || 0) +
    (rangeTotals.summariesGenerated || 0) +
    (rangeTotals.willpowerPoints || 0) +
    (lifetime.pomodoroCompleted || 0) * 3 +
    (rangeTotals.timeSavedMinutes || 0) * 0.5;
  const negative = (rangeTotals.quitsEarly || 0) * 2;
  const raw = positive - negative;
  return Math.max(0, Math.min(100, Math.round(40 + raw * 1.5)));
}

function renderScore(lifetime, rangeTotals) {
  const score = computeScore(lifetime, rangeTotals);
  const valueEl = document.getElementById("score-value");
  const fillEl = document.getElementById("score-fill");

  if (valueEl) valueEl.textContent = score;

  if (fillEl) {
    // SVG circle: circumference = 2 * PI * 52 ≈ 326.7
    const circumference = 326.7;
    const offset = circumference - (score / 100) * circumference;
    fillEl.style.strokeDashoffset = offset;
    // Color shifts based on score
    const color = score >= 75 ? "var(--lg-success)" : score >= 50 ? "var(--lg-warning)" : "var(--lg-danger)";
    fillEl.style.stroke = color;
  }
}

/**
 * Render a GitHub-style 30-day heatmap.
 * Each cell's intensity is based on the day's total positive activity.
 */
function renderHeatmap(points) {
  const grid = document.getElementById("heatmap-grid");
  if (!grid) return;
  grid.innerHTML = "";

  // Find the max daily total to normalize intensity.
  const dailyTotals = points.map((p) =>
    (p.shortsSkipped || 0) +
    (p.adsBlocked || 0) +
    (p.summariesGenerated || 0) +
    (p.willpowerPoints || 0) +
    (p.pomodoroCompleted || 0),
  );
  const max = Math.max(1, ...dailyTotals);

  points.forEach((p, i) => {
    const cell = document.createElement("div");
    const total = dailyTotals[i];
    let level = 0;
    if (total > 0) {
      const ratio = total / max;
      level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
    }
    cell.className = `heat-cell level-${level}`;
    cell.title = `${p.key}: ${total} actions`;
    grid.appendChild(cell);
  });
}

/**
 * Compute the current streak of consecutive days with at least one
 * positive action (shorts skipped, ad blocked, summary generated,
 * pomodoro completed, or willpower point earned).
 */
function renderStreak(points) {
  const el = document.getElementById("streak-days");
  if (!el) return;

  const hasActivity = (p) =>
    (p.shortsSkipped || 0) +
    (p.adsBlocked || 0) +
    (p.summariesGenerated || 0) +
    (p.willpowerPoints || 0) +
    (p.pomodoroCompleted || 0) >
    0;

  // Walk the points array from the most recent backwards.
  // points is ordered oldest -> newest.
  let streak = 0;
  let i = points.length - 1;

  // Today with no activity YET shouldn't zero out yesterday's streak —
  // the day isn't over. Skip the last point once in that case.
  if (i >= 0 && !hasActivity(points[i])) {
    i -= 1;
  }

  for (; i >= 0; i--) {
    if (hasActivity(points[i])) {
      streak++;
    } else {
      break;
    }
  }
  el.textContent = `${streak} day${streak === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Live updates: re-render when local data changes so the dashboard reflects
// activity in near real time (time ticks, blocked ads, synced merges).
// ---------------------------------------------------------------------------
let liveRefreshTimer = null;
try {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== "local") return;
    const watched = [
      "focusAnalyticsDaily",
      "timeUsage",
      "topicStats",
      "statsShortsSkipped",
      "statsAdsBlocked",
      "statsSummariesGenerated",
      "statsQuitsEarly",
      "statsTimeSaved",
      "statsWillpowerPoints",
      "statsPomodoroCompleted",
    ];
    if (!watched.some((k) => k in changes)) return;
    if (liveRefreshTimer) clearTimeout(liveRefreshTimer);
    liveRefreshTimer = setTimeout(async () => {
      liveRefreshTimer = null;
      // Don't fight the initial load: only update an already-rendered view.
      if (!dashboardData) return;
      await refreshDashboard();
      loadTopSites();
    }, 800);
  });
} catch (_) {
  /* storage events unavailable (stale context) — manual refresh still works */
}
