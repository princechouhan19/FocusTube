const RANGE_META = {
  day: { title: "Today", subtitle: "A same-day view of your protected attention." },
  week: { title: "This Week", subtitle: "Seven-day rollup from your local browsing activity." },
  month: { title: "This Month", subtitle: "A 30-day trend of FocusTube activity on this device." },
};

let dashboardData = null;
let activeRange = "day";

// Day navigation (v1.10.0): null means "live today". Any other value is a
// "YYYY-MM-DD" anchor — every range (day/week/month) is then computed
// relative to that day and the header/labels reflect the viewed date.
let viewDateKey = null;

const getLocalDayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const todayKeyNow = () => getLocalDayKey(new Date());

const isViewingToday = () => !viewDateKey || viewDateKey === todayKeyNow();

const getAnchorKey = () => (isViewingToday() ? todayKeyNow() : viewDateKey);

// Shift a "YYYY-MM-DD" key by N days. Noon-based math keeps the calendar
// date stable across DST transitions.
function addDaysToKey(key, delta) {
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return todayKeyNow();
  date.setDate(date.getDate() + delta);
  return getLocalDayKey(date);
}

function formatAnchorDate(key, style = "long") {
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  if (style === "long") {
    return date.toLocaleDateString(undefined, {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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
  bindDayNav();

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
    renderDashboardDate(response.generatedAt);
    updateDayNav();
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

  // v1.14.0 — Daily Briefing: opens the digest on demand (manual view
  // bypasses the once-per-day onStartup gate).
  const digestBtn = document.getElementById("digest-btn");
  if (digestBtn) {
    digestBtn.addEventListener("click", () => {
      try {
        chrome.tabs.create({
          url: chrome.runtime.getURL("src/digest/digest.html?manual=1"),
        });
      } catch (err) {
        console.warn("[FocusTube] Cannot open digest:", err);
      }
    });
  }

  const retryBtn = document.getElementById("retry-load");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => refreshDashboard());
  }

  const todayBtn = document.getElementById("day-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", () => jumpToToday());
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

// ---------------------------------------------------------------------------
// Day navigation (v1.10.0): "< >" buttons browse the report one day at a
// time. "<" walks back through recorded history (bounded by the oldest day
// in storage); ">" walks forward and disables on today — the future has no
// data to show. The visible label doubles as a "back to today" shortcut.
// ---------------------------------------------------------------------------
function bindDayNav() {
  const prevBtn = document.getElementById("day-prev");
  const nextBtn = document.getElementById("day-next");
  const labelEl = document.getElementById("day-nav-label");

  prevBtn?.addEventListener("click", () => shiftViewDate(-1));
  nextBtn?.addEventListener("click", () => shiftViewDate(1));
  labelEl?.addEventListener("click", () => {
    if (!isViewingToday()) shiftViewDate(0);
  });
}

function shiftViewDate(delta) {
  let next;
  if (delta === 0) {
    // Label click: jump straight back to today.
    next = todayKeyNow();
  } else {
    next = addDaysToKey(getAnchorKey(), delta);
    const earliest =
      dashboardData?.dataEarliestKey || todayKeyNow();
    if (next < earliest) next = earliest;
    if (next > todayKeyNow()) next = todayKeyNow();
  }

  const target = next === todayKeyNow() ? null : next;
  if (target === viewDateKey) {
    updateDayNav();
    return;
  }

  viewDateKey = target;
  updateDayNav();
  refreshDashboard().finally(() => loadTopSites());
}

function updateDayNav() {
  const prevBtn = document.getElementById("day-prev");
  const nextBtn = document.getElementById("day-next");
  const labelEl = document.getElementById("day-nav-label");
  const todayBtn = document.getElementById("day-today");
  if (!prevBtn || !nextBtn || !labelEl) return;

  const anchor = getAnchorKey();
  const today = todayKeyNow();
  const viewingToday = isViewingToday();
  const earliest = dashboardData?.dataEarliestKey || anchor;

  labelEl.textContent = viewingToday
    ? "Today"
    : formatAnchorDate(anchor, "short");
  labelEl.classList.toggle("is-past", !viewingToday);
  labelEl.title = viewingToday
    ? "Viewing today — press < to browse previous days"
    : "Click to jump back to today";

  prevBtn.disabled = anchor <= earliest;
  nextBtn.disabled = viewingToday;
  prevBtn.title = "Previous day";
  nextBtn.title = viewingToday ? "Already on today" : "Next day";

  if (todayBtn) todayBtn.hidden = viewingToday;
}

async function jumpToToday() {
  if (isViewingToday()) return;
  viewDateKey = null;
  updateDayNav();
  await refreshDashboard();
  loadTopSites();
}

async function loadDashboardData() {
  try {
    log("Sending getDashboardStats to background...");
    const response = await chrome.runtime.sendMessage({
      action: "getDashboardStats",
      options: isViewingToday() ? {} : { anchorKey: viewDateKey },
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
      "focusAnalyticsDaily",
      "timeUsage",
      "topicStats",
      "topicSeconds",
      "siteLogos",
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

  // Build the anchored report straight from raw storage so the day
  // navigation keeps working even when the service worker is asleep.
  return {
    success: true,
    ...buildLocalReport(stored, lifetime),
  };
}

// Minimal anchor-aware aggregator mirroring the background's report shape.
// Used only by the storage fallback path above.
function buildLocalReport(stored, lifetime) {
  const analytics = stored.focusAnalyticsDaily || {};
  const timeUsage = stored.timeUsage || {};
  const topicStats = stored.topicStats || {};
  const topicSeconds = stored.topicSeconds || {};
  const metricKeys = [
    "shortsSkipped",
    "adsBlocked",
    "summariesGenerated",
    "quitsEarly",
    "willpowerPoints",
    "pomodoroCompleted",
    "timeSavedMinutes",
  ];

  const anchorKey = getAnchorKey();
  const anchor = new Date(`${anchorKey}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const sameMonthAsToday =
    anchor.getFullYear() === today.getFullYear() &&
    anchor.getMonth() === today.getMonth();
  const monthEnd = sameMonthAsToday
    ? today
    : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const monthDays =
    Math.round((monthEnd - monthStart) / 86400000) + 1;
  const windows = {
    day: { end: anchor, days: 1 },
    week: { end: anchor, days: 7 },
    month: { end: monthEnd, days: monthDays },
  };

  const report = {};
  const watchTime = {};
  const topics = {};
  const siteUsage = {};
  for (const [label, window] of Object.entries(windows)) {
    const totals = Object.fromEntries(metricKeys.map((k) => [k, 0]));
    const points = [];
    let secondsWatched = 0;
    const topicAgg = {};
    const topicSecAgg = {};
    const siteAgg = {};
    for (let offset = window.days - 1; offset >= 0; offset -= 1) {
      const date = new Date(window.end);
      date.setDate(date.getDate() - offset);
      const key = getLocalDayKey(date);
      const dayMetrics = analytics[key] || {};
      const point = { key };
      metricKeys.forEach((metric) => {
        const value = Number(dayMetrics[metric]) || 0;
        totals[metric] += value;
        point[metric] = value;
      });
      const dayUsage = timeUsage[key] || {};
      let pointSeconds = 0;
      for (const sec of Object.values(dayUsage)) {
        pointSeconds += Number(sec) || 0;
        secondsWatched += Number(sec) || 0;
      }
      for (const [domain, sec] of Object.entries(dayUsage)) {
        siteAgg[domain] = (siteAgg[domain] || 0) + (Number(sec) || 0);
      }
      point.timeSpentSeconds = pointSeconds;
      point.activeSites = Object.keys(dayUsage).length;
      for (const [topic, count] of Object.entries(topicStats[key] || {})) {
        const t = String(topic).slice(0, 40);
        topicAgg[t] = (topicAgg[t] || 0) + (Number(count) || 0);
      }
      for (const [topic, sec] of Object.entries((topicSeconds || {})[key] || {})) {
        const t = String(topic).slice(0, 40);
        topicSecAgg[t] = (topicSecAgg[t] || 0) + (Number(sec) || 0);
      }
      points.push(point);
    }

    // Previous same-length window, for the dashboard's trend chips.
    const prevAgg = {};
    {
      const prevEnd = new Date(window.end);
      prevEnd.setDate(prevEnd.getDate() - window.days);
      for (let offset = 0; offset < window.days; offset += 1) {
        const date = new Date(prevEnd);
        date.setDate(date.getDate() - offset);
        const key = getLocalDayKey(date);
        for (const [topic, count] of Object.entries(topicStats[key] || {})) {
          const t = String(topic).slice(0, 40);
          prevAgg[t] = (prevAgg[t] || 0) + (Number(count) || 0);
        }
      }
    }

    report[label] = { totals, points };
    watchTime[label] = secondsWatched;
    topics[label] = Object.entries(topicAgg)
      .map(([topic, count]) => ({
        topic,
        count,
        minutes: Math.round((topicSecAgg[topic] || 0) / 60),
        prevCount: prevAgg[topic] || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    siteUsage[label] = siteAgg;
  }

  const dataKeys = [
    ...Object.keys(analytics),
    ...Object.keys(timeUsage),
    ...Object.keys(topicStats),
  ];

  return {
    profile: {
      profileName: stored.profileName || "Guest User",
      profileImage: stored.profileImage || "",
      profileEmail: stored.profileEmail || "",
      profileGoal: stored.profileGoal || "",
    },
    lifetime,
    report,
    watchTime,
    topics,
    siteUsage,
    siteLogos: stored.siteLogos || {},
    generatedAt: Date.now(),
    anchorKey,
    todayKey: todayKeyNow(),
    dataEarliestKey:
      dataKeys.length > 0
        ? dataKeys.reduce((min, k) => (k < min ? k : min))
        : anchorKey,
    calendar: {
      monthLabel: anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      monthDaysElapsed: sameMonthAsToday ? today.getDate() : monthDays,
      daysInMonth: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate(),
    },
  };
}

async function loadTopSites() {
  // When anchored on a past day, the panel must show THAT day's usage from
  // the anchored report — not the background's live "today" snapshot.
  if (!isViewingToday()) {
    renderTopSitesForRange(activeRange);
    return;
  }
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
      '<p class="top-sites-empty">No browsing recorded in this period yet. Visit a few sites and this history fills in automatically.</p>';
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
    // v1.14.0 — human hours, not raw minutes: "8h 10m / 8h 20m" instead of
    // "490m / 500m". Reuses the same formatter as the hero stats so every
    // duration in the dashboard reads in hours and minutes.
    if (limit > 0) {
      mins.classList.add(ratio >= 1 ? "over-limit" : ratio >= 0.8 ? "near-limit" : "has-limit");
      mins.textContent = `${formatMinutes(minutes)} / ${formatMinutes(limit)}`;
      mins.title = `${formatMinutes(minutes)} of ${formatMinutes(limit)} daily budget used`;
    } else {
      mins.textContent = formatMinutes(minutes);
    }
    row.appendChild(mins);

    container.appendChild(row);
  });
}

function renderTopSitesForRange(range) {
  const secondsByDomain = dashboardData?.siteUsage?.[range] || {};
  const minutesByDomain = Object.fromEntries(
    Object.entries(secondsByDomain).map(([domain, seconds]) => [
      domain,
      Math.round((Number(seconds) || 0) / 6) / 10,
    ]),
  );
  const title = document.getElementById("top-sites-title");
  const subtitle = document.getElementById("top-sites-subtitle");
  const viewingToday = isViewingToday();
  const label =
    range === "day"
      ? viewingToday
        ? "Today"
        : formatAnchorDate(getAnchorKey(), "short")
      : range === "week"
        ? viewingToday
          ? "This Week"
          : `Week to ${formatAnchorDate(getAnchorKey(), "short")}`
        : viewingToday
          ? "This Month"
          : formatAnchorDate(getAnchorKey(), "long");
  if (title) title.textContent = `Top Sites · ${label}`;
  if (subtitle) subtitle.textContent = "By recorded time";
  renderTopSites(minutesByDomain, {}, dashboardData?.siteLogos || {});
}

function renderDashboardDate(timestamp) {
  const el = document.getElementById("dashboard-date");
  if (!el) return;
  if (!isViewingToday()) {
    el.textContent = `History · ${formatAnchorDate(getAnchorKey(), "long")}`;
    return;
  }
  const date = new Date(Number(timestamp) || Date.now());
  el.textContent = `Today · ${date.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })}`;
}

// Watch Time & Topics panel — range-aware. Watch time is the sum of tracked
// per-site seconds for the selected range; topics come from hashtags and
// video categories captured by the YouTube topic tracker.
const WATCH_LABELS = {
  day: "watched today",
  week: "watched this week",
  month: "watched this month",
};

function getWatchLabel(range) {
  if (isViewingToday()) return WATCH_LABELS[range] || "watched";
  const anchor = formatAnchorDate(getAnchorKey(), "long");
  if (range === "day") return `watched ${anchor}`;
  if (range === "week") return `watched in week to ${anchor}`;
  return `watched in ${anchor}`;
}

function renderWatchTopics(range) {
  const seconds = Number(dashboardData?.watchTime?.[range]) || 0;
  const totalEl = document.getElementById("watch-total");
  if (totalEl) totalEl.textContent = formatMinutes(Math.round(seconds / 60));
  const labelEl = document.getElementById("watch-label");
  if (labelEl) labelEl.textContent = getWatchLabel(range);

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

    // v1.14.0: count, real watch time (when the tracker saw the video's
    // duration) and a trend chip vs the previous same-length window.
    const count = document.createElement("span");
    count.className = "topic-count";
    count.textContent =
      t.minutes >= 1 ? `${t.count}× · ${formatMinutes(t.minutes)}` : `${t.count}×`;
    count.title = `${t.count} video${t.count === 1 ? "" : "s"}${
      t.minutes >= 1 ? ` · ${formatMinutes(t.minutes)} watched` : ""
    }`;
    row.appendChild(count);

    const trend = document.createElement("span");
    trend.className = "topic-trend";
    if (!t.prevCount) {
      trend.textContent = "NEW";
      trend.classList.add("flat");
      trend.title = "New in this period";
    } else if (t.count > t.prevCount) {
      const pct = Math.round(((t.count - t.prevCount) / t.prevCount) * 100);
      trend.textContent = `▲ ${pct}%`;
      trend.classList.add("up");
      trend.title = `${pct}% more than the previous ${RANGE_META[activeRange]?.label || "period"}`;
    } else if (t.count < t.prevCount) {
      const pct = Math.round(((t.prevCount - t.count) / t.prevCount) * 100);
      trend.textContent = `▼ ${pct}%`;
      trend.classList.add("down");
      trend.title = `${pct}% less than the previous ${RANGE_META[activeRange]?.label || "period"}`;
    } else {
      trend.textContent = "—";
      trend.classList.add("flat");
      trend.title = "Same as the previous period";
    }
    row.appendChild(trend);

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

  const viewingToday = isViewingToday();
  document.getElementById("range-title").textContent =
    range === "day" && !viewingToday
      ? formatAnchorDate(getAnchorKey(), "long")
      : RANGE_META[range].title;
  document.getElementById("range-subtitle").textContent =
    range === "day" && !viewingToday
      ? "Your protected attention on this day. Use the arrows to browse."
      : RANGE_META[range].subtitle;
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

  // v1.17.0 — Watch Intent match rate (implementation-intention evidence:
  // sessions that end on-purpose vs drift). Display-only this release; it
  // feeds the next Focus-Score quality signal.
  renderIntentMatch(range);

  renderWatchTopics(range);
  renderTopSitesForRange(range);
  renderChart(data.points, range);
  renderInsight(data.totals, range);

  // v1.1.0 — new dashboard widgets. v1.13.0: score moved to the pure
  // FocusScore module (research-grounded, anti-gaming) + animated render.
  renderScore(dashboardData.lifetime, data.totals, data.points);
  renderHeatmap(dashboardData?.report?.month?.points || []);
  renderStreak(dashboardData?.report?.month?.points || []);
  renderFocusRings();
  // v1.16.0 — animated month overview (tiles, daily ring strip, badges).
  renderMonthlyReview();
}

function renderEmptyState() {
  document.getElementById("range-title").textContent = "No data yet";
  document.getElementById("range-subtitle").textContent =
    "Use FocusTube for a bit and the dashboard will start filling in.";
  renderChart([], activeRange);
  document.getElementById("chart-note").textContent = "";
  renderHeatmap(dashboardData?.report?.month?.points || []);
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
  renderFocusRings();
}

function renderErrorState(error) {
  const msg = String(error?.message || error || "");
  document.getElementById("range-title").textContent = "Couldn't load data";
  document.getElementById("range-subtitle").textContent = msg.includes(
    "Extension context invalidated",
  )
    ? "The extension was reloaded — this page needs a refresh."
    : "Something went wrong while reading your stats.";
  renderChart([], activeRange);
  document.getElementById("chart-note").textContent = "";
  const grid = document.getElementById("heatmap-grid");
  if (grid) grid.innerHTML = '<div class="chart-empty">Heatmap unavailable — no data loaded.</div>';
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
  // 7-day context instead, with the viewed day highlighted, and say so.
  let data = points;
  let todayHighlight = false;
  if (range === "day") {
    data = dashboardData?.report?.week?.points || points;
    todayHighlight = true;
    if (note) {
      note.textContent = isViewingToday()
        ? "Last 7 days — today highlighted"
        : `7 days to ${formatAnchorDate(getAnchorKey(), "short")} — viewed day highlighted`;
    }
  } else if (note) {
    note.textContent = "";
  }

  const maxValue = Math.max(
    1,
    ...data.map((point) =>
      CHART_SERIES.reduce((sum, s) => sum + (Number(point[s.field]) || 0), 0),
    ),
  );

  // All-zero period (typical first run): show a friendly hint instead of
  // a row of empty stubs that looks like a rendering bug.
  const hasAnyActivity = data.some((point) =>
    CHART_SERIES.reduce((sum, s) => sum + (Number(point[s.field]) || 0), 0) > 0,
  );
  if (!hasAnyActivity) {
    const empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.textContent =
      "No activity in this period yet — skip a Short, block an ad, or run a Pomodoro and it will show up here.";
    chart.appendChild(empty);
    return;
  }

  const highlightKey = getAnchorKey(); // viewed day, not blind "today"

  data.forEach((point, index) => {
    const group = document.createElement("div");
    group.className = "chart-bar-group";
    if (todayHighlight && point.key === highlightKey) {
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
  const periodNoun =
    range === "day"
      ? isViewingToday()
        ? "today"
        : `on ${formatAnchorDate(getAnchorKey(), "long")}`
      : range === "week"
        ? "this week"
        : "this month";

  if (totals.timeSavedMinutes >= 60) {
    title.textContent = "Strong protection";
    body.textContent = `You protected ${formatMinutes(
      totals.timeSavedMinutes,
    )} ${periodNoun}. That is meaningful reclaimed attention.`;
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
  // v1.14.0: round once up-front so fractional usage ("8h 10.4m") can
  // never leak into the label from per-site second->minute conversion.
  const safe = Math.round(Number(minutes) || 0);
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
 * v1.13.0: the formula lives in src/shared/focus-score.js (pure module, so
 * it can be unit-tested in node and shared with future surfaces). It is a
 * research-grounded composite — saturation curves, per-day caps, streak
 * component, union-deduped time-saved — that cannot be maxed by repeating
 * one-tap actions. The old linear formula (40 + raw*1.5) reached 100 after
 * three "Block 30 min" presses.
 */
function computeScore(lifetime, rangeTotals, points) {
  return (window.FocusScore || globalThis.FocusScore).compute(
    lifetime,
    rangeTotals,
    points,
  ).score;
}

/** Reduced-motion aware: skip count-up/ring draw when the user opted out. */
function prefersReducedMotion() {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Animate a numeric readout from its current value to `target`.
 * iOS-style: short ease-out, no bounce on text (numbers must stay legible).
 */
function animateNumber(el, target, duration = 700) {
  if (!el) return;
  const from = parseInt(el.textContent, 10);
  if (Number.isNaN(from)) {
    el.textContent = String(target);
    return;
  }
  if (from === target || prefersReducedMotion()) {
    el.textContent = String(target);
    return;
  }
  const t0 = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    el.textContent = String(Math.round(from + (target - from) * easeOut(t)));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const SCORE_RING_CIRCUMFERENCE = 326.7; // 2π × 52

function renderScore(lifetime, rangeTotals, points) {
  const { score } = (window.FocusScore || globalThis.FocusScore).compute(
    lifetime,
    rangeTotals,
    points,
  );
  const valueEl = document.getElementById("score-value");
  const fillEl = document.getElementById("score-fill");

  if (valueEl) animateNumber(valueEl, score);

  if (fillEl) {
    // Apple Fitness ring draw: transition stroke-dashoffset from empty.
    // The CSS rule in dashboard.css carries the 900ms ease; here we only
    // make sure the first paint starts from the empty ring, then fill on
    // the next frame so the transition actually plays.
    const target =
      SCORE_RING_CIRCUMFERENCE - (score / 100) * SCORE_RING_CIRCUMFERENCE;
    const start = prefersReducedMotion()
      ? target
      : SCORE_RING_CIRCUMFERENCE;
    if (fillEl.style.strokeDashoffset === "" || fillEl.dataset.drawn !== "1") {
      fillEl.style.transition = "none";
      fillEl.style.strokeDashoffset = start;
      void fillEl.getBoundingClientRect(); // flush
      fillEl.style.transition = "";
      requestAnimationFrame(() => {
        fillEl.style.strokeDashoffset = target;
      });
      fillEl.dataset.drawn = "1";
    } else {
      fillEl.style.strokeDashoffset = target;
    }
    // Apple Fitness ring: tier gradient fill + same-hue faint track.
    const ring = document.getElementById("score-ring");
    const trackEl = ring ? ring.querySelector(".score-track") : null;
    let fill;
    if (score >= 75) {
      fill = "url(#ring-grad-good)";
      if (trackEl) trackEl.style.stroke = "var(--ios-ring-good-track)";
    } else if (score >= 50) {
      fill = "url(#ring-grad-mid)";
      if (trackEl) trackEl.style.stroke = "var(--ios-ring-mid-track)";
    } else {
      fill = "url(#ring-grad-low)";
      if (trackEl) trackEl.style.stroke = "var(--ios-ring-low-track)";
    }
    fillEl.style.stroke = fill;
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
    (p.pomodoroCompleted || 0) +
    // Browsing data is meaningful historical activity too. One point per
    // five minutes keeps it comparable with discrete focus actions.
    Math.round((Number(p.timeSpentSeconds) || 0) / 300),
  );
  const max = Math.max(1, ...dailyTotals);
  const subtitle = document.getElementById("heatmap-subtitle");
  const title = document.getElementById("heatmap-title");
  const monthLabel = dashboardData?.calendar?.monthLabel || "This Month";
  if (title) title.textContent = `${monthLabel} Activity`;
  if (subtitle && points.length) {
    const daysInMonth = dashboardData?.calendar?.daysInMonth || points.length;
    subtitle.textContent = `1–${points.length} of ${daysInMonth} days`;
  }

  const totalDays = dashboardData?.calendar?.daysInMonth || points.length;
  for (let i = 0; i < totalDays; i += 1) {
    const p = points[i];
    const cell = document.createElement("div");
    if (!p) {
      cell.className = "heat-cell future";
      cell.title = `${monthLabel || "This month"} · Day ${i + 1}: not reached yet`;
      cell.setAttribute("aria-label", cell.title);
      grid.appendChild(cell);
      continue;
    }
    const total = dailyTotals[i];
    let level = 0;
    if (total > 0) {
      const ratio = total / max;
      level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
    }
    cell.className = `heat-cell level-${level}`;
    const mins = Math.round((Number(p.timeSpentSeconds) || 0) / 60);
    cell.title = `${formatPointLabel(p.key, "month", true)} · ${total} activity points · ${mins}m across ${p.activeSites || 0} sites`;
    cell.setAttribute("aria-label", cell.title);
    // Apple-style cascade: cells pop in left→right with a tiny stagger.
    if (!prefersReducedMotion()) {
      cell.style.animationDelay = `${Math.min(i * 12, 600)}ms`;
      cell.classList.add("heat-cell-enter");
    }
    grid.appendChild(cell);
  }
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
// Focus Rings (v1.15.0 USP) — Apple-Fitness-style daily ritual. The rings are
// a DAILY concept, so they always render the anchor day's totals (report.day),
// independent of which range tab (day/week/month) is active — and day
// navigation rewinds them together with the rest of the report.
// ---------------------------------------------------------------------------
/**
 * v1.17.0 — Watch Intent match rate. Reads the `watchIntents` log written by
 * the YouTube content script and shows, for the anchor day, the share of
 * purposeful sessions that ended on-purpose (watched ≤ planned + grace).
 * Falls back to the trailing 7 days when the day has no scored intents.
 */
async function renderIntentMatch(range) {
  const el = document.getElementById("metric-intent");
  if (!el) return;
  try {
    const stored = await chrome.storage.local.get("watchIntents");
    const map = (stored && stored.watchIntents) || {};
    const anchorKey = getAnchorKey();

    const scoreDay = (dayKey) => {
      const list = Array.isArray(map[dayKey]) ? map[dayKey] : [];
      const scored = list.filter((x) => x && x.matched !== null && x.matched !== undefined);
      const hit = scored.filter((x) => x.matched === true).length;
      return { hit, total: scored.length };
    };

    let { hit, total } = scoreDay(anchorKey);
    let scope = "today";
    if (total === 0) {
      // trailing 7 days ending at the anchor
      const anchor = new Date(`${anchorKey}T12:00:00`);
      hit = 0;
      total = 0;
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(anchor);
        d.setDate(d.getDate() - i);
        const pad = (n) => String(n).padStart(2, "0");
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const s = scoreDay(key);
        hit += s.hit;
        total += s.total;
      }
      scope = "7d";
    }

    if (total === 0) {
      el.textContent = "—";
      el.title = "Watch Intents land here — answer the \u201cWhat are you here for?\u201d prompt on YouTube";
      return;
    }
    const pct = Math.round((hit / total) * 100);
    el.textContent = `${pct}%`;
    el.title = `Watch Intent match (${scope}): ${hit} of ${total} purposeful sessions ended on-purpose`;
  } catch (_) {
    el.textContent = "—";
  }
}

async function renderFocusRings() {
  const viz = document.getElementById("rings-viz");
  if (!viz || typeof FGRings === "undefined") return;

  const safeSet = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  try {
    const goals = await FGRings.readGoals();
    const dayTotals = dashboardData?.report?.day?.totals || {};
    const ringData = FGRings.compute(dayTotals, goals);
    FGRings.render(viz, ringData, { size: 168, animate: true });

    // v1.16.0 — ring-closing celebration. Fires only for TODAY's rings
    // (past-day browsing is a recap, not a moment), deduped per (day, ring)
    // through the focusRingsCelebrated storage key shared with the popup.
    if (typeof FGRings.maybeCelebrate === "function") {
      FGRings.maybeCelebrate(viz, ringData, {
        dayKey: getAnchorKey(),
        todayKey: todayKeyNow(),
      }).catch(() => {});
    }

    safeSet(
      "ring-val-deflected",
      `${Math.round(ringData.deflected.value)} / ${ringData.deflected.goal}`,
    );
    safeSet(
      "ring-val-focused",
      `${FGRings.formatMinutes(ringData.focused.value)} / ${FGRings.formatMinutes(ringData.focused.goal)}`,
    );
    safeSet(
      "ring-val-saved",
      `${FGRings.formatMinutes(ringData.saved.value)} / ${FGRings.formatMinutes(ringData.saved.goal)}`,
    );

    const subtitle = document.getElementById("rings-subtitle");
    if (subtitle) {
      subtitle.textContent =
        ringData.allClosed
          ? "All rings closed — brilliant."
          : `${ringData.closedCount} of 3 closed · ${3 - ringData.closedCount} to go`;
    }

    const streakEl = document.getElementById("rings-streak");
    if (streakEl) {
      const streak = FGRings.streakFromPoints(
        dashboardData?.report?.month?.points || [],
        goals,
      );
      streakEl.hidden = false;
      if (streak.days > 0) {
        streakEl.textContent = streak.atRisk
          ? `${streak.days}-day all-rings streak — today's rings are still open`
          : `${streak.days}-day all-rings streak — keep the chain alive`;
      } else {
        streakEl.textContent = "Close all three rings to start a streak";
      }
    }

    // v1.17.0 — Streak Insurance line: freezes banked, repair CTA.
    const insEl = document.getElementById("rings-insurance");
    if (insEl && typeof FGRings.insuranceFromPoints === "function") {
      const ins = FGRings.insuranceFromPoints(
        dashboardData?.report?.month?.points || [],
        goals,
      );
      const parts = [];
      if (ins.freezesLeft > 0) {
        parts.push(
          `🛡 ${ins.freezesLeft} streak freeze${ins.freezesLeft > 1 ? "s" : ""} banked`,
        );
      }
      if (ins.repair) {
        const remaining = Math.max(
          0,
          ins.repair.neededMinutes - ins.repair.haveMinutes,
        );
        parts.push(
          `🔧 Repair yesterday's break: ${FGRings.formatMinutes(remaining)} more focus time today`,
        );
      }
      if (parts.length > 0) {
        insEl.textContent = parts.join("  ·  ");
        insEl.hidden = false;
      } else if (ins.freezesEarned === 0) {
        insEl.textContent =
          "Close all rings on 4+ days this week to bank a streak freeze";
        insEl.hidden = false;
      } else {
        insEl.hidden = true;
      }
    }
  } catch (err) {
    console.warn("[FocusTube] Focus Rings render failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Monthly Review (v1.16.0) — the month as one interactive, animated story:
// count-up tiles, a day-by-day mini-ring strip, Fitness-style weekly badges
// and a best-day highlight. Renders the ANCHOR month, so browsing back to a
// past day rewinds the whole review with the rest of the report.
// ---------------------------------------------------------------------------

const MR_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function mrPrefersReducedMotion() {
  try {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    return false;
  }
}

/** Ease-out count-up for review tiles; instant when reduced motion. */
function mrAnimateCount(el, target, fmt) {
  if (!el) return;
  const safeTarget = Math.max(0, Number(target) || 0);
  if (mrPrefersReducedMotion() || safeTarget === 0) {
    el.textContent = fmt(safeTarget);
    return;
  }
  const start = performance.now();
  const duration = 750;
  const tick = (now) => {
    const k = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(safeTarget * eased);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Split a month's points into fixed 7-day weeks (1–7, 8–14, …). Fixed weeks
 * (not ISO weeks) keep the badges grid predictable and month-aligned.
 */
function mrChunkWeeks(monthPoints) {
  const weeks = [];
  for (let i = 0; i < monthPoints.length; i += 7) {
    weeks.push(monthPoints.slice(i, i + 7));
  }
  return weeks;
}

const MR_BADGE_TIER_LABEL = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  none: "",
};

async function renderMonthlyReview() {
  const panel = document.getElementById("monthly-review");
  if (!panel || typeof FGRings === "undefined") return;

  try {
    const anchorKey = getAnchorKey();
    const anchor = new Date(`${anchorKey}T12:00:00`);
    if (Number.isNaN(anchor.getTime())) return;
    const year = anchor.getFullYear();
    const month = anchor.getMonth();

    const title = document.getElementById("mr-title");
    const subtitle = document.getElementById("mr-subtitle");
    if (subtitle) subtitle.textContent = `${MR_MONTH_NAMES[month]} ${year}`;

    const monthPoints = (dashboardData?.report?.month?.points || []).filter((p) => {
      const key = String(p.key || "");
      return key.startsWith(
        `${year}-${String(month + 1).padStart(2, "0")}-`,
      );
    });

    const goals = await FGRings.readGoals();
    const ringDataByDay = monthPoints.map((p) => FGRings.compute(p, goals));

    const totals = monthPoints.reduce(
      (acc, p) => {
        acc.saved += Number(p.timeSavedMinutes) || 0;
        acc.deflected +=
          (Number(p.adsBlocked) || 0) +
          (Number(p.shortsSkipped) || 0) +
          (Number(p.quitsEarly) || 0);
        acc.sessions += Number(p.pomodoroCompleted) || 0;
        return acc;
      },
      { saved: 0, deflected: 0, sessions: 0 },
    );
    const ringsClosed = ringDataByDay.reduce((sum, r) => sum + r.closedCount, 0);

    mrAnimateCount(document.getElementById("mr-saved"), totals.saved, (v) =>
      FGRings.formatMinutes(v),
    );
    mrAnimateCount(
      document.getElementById("mr-deflected"),
      totals.deflected,
      (v) => String(Math.round(v)),
    );
    mrAnimateCount(
      document.getElementById("mr-sessions"),
      totals.sessions,
      (v) => String(Math.round(v)),
    );
    mrAnimateCount(
      document.getElementById("mr-rings"),
      ringsClosed,
      (v) => String(Math.round(v)),
    );

    // Day-by-day strip: one 22px mini ring-trio per recorded day.
    const daysEl = document.getElementById("mr-days");
    if (daysEl) {
      daysEl.innerHTML = "";
      const reduced = mrPrefersReducedMotion();
      // v1.17.0 — Streak Insurance markers (🛡 frozen / 🔧 repaired) derived
      // from the same points, so history stays honest.
      const insurance =
        typeof FGRings.insuranceFromPoints === "function"
          ? FGRings.insuranceFromPoints(
              monthPoints.map((p) => ({ ...p, dayKey: p.key })),
              goals,
            )
          : null;
      const markerByKey = {};
      if (insurance) {
        insurance.days.forEach((d) => {
          if (d.marker) markerByKey[d.dayKey] = d.marker;
        });
      }
      monthPoints.forEach((p, i) => {
        const ringData = ringDataByDay[i];
        const marker = markerByKey[p.key];
        const cell = document.createElement("div");
        cell.className = `mr-day mr-day--${ringData.closedCount}${marker ? ` mr-day--${marker}` : ""}`;
        cell.setAttribute("role", "listitem");
        const viz = document.createElement("div");
        viz.className = "mr-day-viz";
        FGRings.render(viz, ringData, { size: 24, mini: true, animate: false });
        viz.title =
          `${formatAnchorDate(p.key, "short")} — ${ringData.closedCount}/3 rings closed` +
          (marker === "frozen" ? " · 🛡 streak freeze used" : "") +
          (marker === "repaired" ? " · 🔧 repaired next day" : "");
        cell.appendChild(viz);
        if (marker) {
          const glyph = document.createElement("span");
          glyph.className = `mr-day-glyph`;
          glyph.textContent = marker === "frozen" ? "🛡" : "🔧";
          cell.appendChild(glyph);
        }
        if (!reduced) {
          cell.classList.add("mr-day-enter");
          cell.style.animationDelay = `${Math.min(i * 22, 900)}ms`;
        }
        daysEl.appendChild(cell);
      });
      if (monthPoints.length === 0) {
        const empty = document.createElement("p");
        empty.className = "mr-empty";
        empty.textContent = "No days recorded for this month yet.";
        daysEl.appendChild(empty);
      }
    }

    // Weekly badges — Apple Fitness award tiers over all-three-closed days.
    const badgesEl = document.getElementById("mr-badges");
    if (badgesEl) {
      badgesEl.innerHTML = "";
      const weeks = mrChunkWeeks(monthPoints);
      const reduced = mrPrefersReducedMotion();
      weeks.forEach((week, wi) => {
        const closedDays = week.filter((p) => FGRings.compute(p, goals).allClosed).length;
        const tier = FGRings.badgeTier(closedDays, week.length);
        const badge = document.createElement("div");
        badge.className = `mr-badge mr-badge--${tier}`;
        badge.setAttribute("role", "listitem");
        badge.title =
          `Week ${wi + 1} — all rings closed on ${closedDays} of ${week.length} day(s)` +
          (tier !== "none" ? ` · ${MR_BADGE_TIER_LABEL[tier]} badge` : "");

        const count = document.createElement("span");
        count.className = "mr-badge-count";
        count.textContent = `${closedDays}/${week.length}`;
        badge.appendChild(count);

        const dots = document.createElement("span");
        dots.className = "mr-badge-dots";
        ["deflected", "focused", "saved"].forEach((key) => {
          const dot = document.createElement("i");
          dot.className = `mr-badge-dot mr-badge-dot--${key}`;
          dots.appendChild(dot);
        });
        badge.appendChild(dots);

        const label = document.createElement("span");
        label.className = "mr-badge-label";
        label.textContent =
          tier === "none" ? `Week ${wi + 1}` : `Week ${wi + 1} · ${MR_BADGE_TIER_LABEL[tier]}`;
        badge.appendChild(label);

        if (!reduced) {
          badge.classList.add("mr-badge-enter");
          badge.style.animationDelay = `${wi * 90}ms`;
        }
        badgesEl.appendChild(badge);
      });
    }

    // Best-day highlight.
    const bestEl = document.getElementById("mr-best");
    if (bestEl) {
      let bestIndex = -1;
      monthPoints.forEach((p, i) => {
        if (bestIndex === -1) {
          bestIndex = i;
          return;
        }
        const a = ringDataByDay[i];
        const b = ringDataByDay[bestIndex];
        if (
          a.closedCount > b.closedCount ||
          (a.closedCount === b.closedCount &&
            (Number(p.timeSavedMinutes) || 0) >
              (Number(monthPoints[bestIndex].timeSavedMinutes) || 0))
        ) {
          bestIndex = i;
        }
      });
      if (bestIndex >= 0 && ringDataByDay[bestIndex].closedCount > 0) {
        const p = monthPoints[bestIndex];
        const r = ringDataByDay[bestIndex];
        bestEl.hidden = false;
        bestEl.textContent =
          `Best day — ${formatAnchorDate(p.key, "long")} · ` +
          `${r.closedCount}/3 rings · ${FGRings.formatMinutes(
            Number(p.timeSavedMinutes) || 0,
          )} saved`;
      } else {
        bestEl.hidden = true;
      }
    }

    // v1.17.0 — recap card + accountability pairing actions.
    mrBindActions({ goals, monthPoints, anchorKey });
  } catch (err) {
    console.warn("[FocusTube] Monthly Review render failed:", err);
  }
}

/**
 * v1.17.0 — binds the Monthly Review header actions once per page load and
 * refreshes the pair board from storage on every render.
 *   · Export recap card → FTRecap canvas PNG of the current week (local).
 *   · Pair week        → side-by-side week vs. a partner's shared card,
 *                        transported by copy/paste (no network, ever).
 */
function mrBindActions({ goals, monthPoints, anchorKey }) {
  const recapBtn = document.getElementById("mr-recap-btn");
  const pairBtn = document.getElementById("mr-pair-btn");

  if (recapBtn && typeof FTRecap !== "undefined" && !recapBtn.dataset.bound) {
    recapBtn.dataset.bound = "1";
    recapBtn.addEventListener("click", async () => {
      recapBtn.disabled = true;
      try {
        const points = monthPoints.slice(-7).map((p) => ({
          ...p,
          dayLabel: formatAnchorDate(p.key, "short").slice(0, 3),
        }));
        const profile = await chrome.storage.local.get("profileName");
        const last7 = points.length ? points : [];
        const closedDays = last7.filter((p) => FGRings.compute(p, goals).allClosed).length;
        const savedMin = last7.reduce((s, p) => s + (Number(p.timeSavedMinutes) || 0), 0);
        const streak = FGRings.streakWithInsurance(
          dashboardData?.report?.month?.points || [],
          goals,
        );
        const best = last7.reduce(
          (bestP, p) => {
            const r = FGRings.compute(p, goals);
            return r.closedCount > bestP.count
              ? { count: r.closedCount, label: formatAnchorDate(p.key, "long") }
              : bestP;
          },
          { count: 0, label: null },
        );
        const blob = await FTRecap.renderCard({
          points: last7,
          goals,
          weekLabel: `Week of ${formatAnchorDate(last7[0]?.key || anchorKey, "long")}`,
          bestDay: best.label,
          streakDays: streak.days,
          timeSavedMin: savedMin,
          profileName: profile.profileName || "",
          closedDays,
        });
        FTRecap.download(blob);
        recapBtn.textContent = "Saved ✓";
        setTimeout(() => (recapBtn.textContent = "Export recap card"), 1600);
      } catch (err) {
        console.warn("[FocusTube] recap card failed:", err);
        recapBtn.textContent = "Export failed";
        setTimeout(() => (recapBtn.textContent = "Export recap card"), 1600);
      } finally {
        recapBtn.disabled = false;
      }
    });
  }

  if (pairBtn && typeof FTPair !== "undefined" && !pairBtn.dataset.bound) {
    pairBtn.dataset.bound = "1";
    pairBtn.addEventListener("click", () => mrTogglePair({ goals, monthPoints, anchorKey }));
  }

  // refresh the pair board with the current week each render
  const pairPanel = document.getElementById("mr-pair");
  if (pairPanel && !pairPanel.hidden && typeof FTPair !== "undefined") {
    mrPaintPairBoard({ goals, monthPoints, anchorKey });
  }
}

async function mrPaintPairBoard({ goals, monthPoints, anchorKey }) {
  const pairPanel = document.getElementById("mr-pair");
  if (!pairPanel || typeof FTPair === "undefined") return;
  const weekPoints = monthPoints.slice(-7).map((p) => ({ ...p, dayKey: p.key }));
  const streak = FGRings.streakWithInsurance(
    dashboardData?.report?.month?.points || [],
    goals,
  );
  const profile = await chrome.storage.local.get("profileName");
  const mineText = FTPair.buildMine({
    name: profile.profileName || "You",
    points: weekPoints,
    goals,
    weekLabel: anchorKey.slice(0, 7),
    streakDays: streak.days,
  });
  const mine = FTPair.parse(mineText);
  const theirs = await FTPair.getPartner();
  FTPair.renderSideBySide(
    pairPanel.querySelector(".ftp-board-mount"),
    mine,
    theirs,
  );
}

async function mrTogglePair(ctx) {
  const pairPanel = document.getElementById("mr-pair");
  if (!pairPanel) return;
  if (!pairPanel.hidden) {
    pairPanel.hidden = true;
    return;
  }
  pairPanel.hidden = false;
  pairPanel.innerHTML = `
    <div class="mr-pair-inner">
      <div class="ftp-board-mount"></div>
      <div class="mr-pair-grid">
        <div>
          <h4>Your share text <span class="mr-pair-hint">— send it to your partner (chat, file, anything)</span></h4>
          <textarea id="mr-pair-mine" class="mr-pair-text" rows="3" readonly></textarea>
          <button id="mr-pair-copy" class="mr-action-btn">Copy</button>
        </div>
        <div>
          <h4>Paste your partner's card <span class="mr-pair-hint">— only ring counts are shared, never URLs or topics</span></h4>
          <textarea id="mr-pair-input" class="mr-pair-text" rows="3" placeholder="FOCUSTUBE-PAIR:v1:…"></textarea>
          <div class="mr-pair-rowbtns">
            <button id="mr-pair-import" class="mr-action-btn mr-action-btn--primary">Import partner</button>
            <button id="mr-pair-clear" class="mr-action-btn">Remove partner</button>
          </div>
          <p id="mr-pair-status" class="mr-pair-status"></p>
        </div>
      </div>
    </div>`;
  await mrPaintPairBoard(ctx);

  const mineText = FTPair.buildMine({
    name: (await chrome.storage.local.get("profileName")).profileName || "You",
    points: ctx.monthPoints.slice(-7).map((p) => ({ ...p, dayKey: p.key })),
    goals: ctx.goals,
    weekLabel: ctx.anchorKey.slice(0, 7),
    streakDays: FGRings.streakWithInsurance(
      dashboardData?.report?.month?.points || [],
      ctx.goals,
    ).days,
  });
  const mineArea = pairPanel.querySelector("#mr-pair-mine");
  mineArea.value = mineText;

  pairPanel.querySelector("#mr-pair-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(mineArea.value);
      const btn = pairPanel.querySelector("#mr-pair-copy");
      btn.textContent = "Copied ✓";
      setTimeout(() => (btn.textContent = "Copy"), 1400);
    } catch (_) {
      mineArea.select();
      document.execCommand("copy");
    }
  });

  pairPanel.querySelector("#mr-pair-import").addEventListener("click", async () => {
    const status = pairPanel.querySelector("#mr-pair-status");
    const card = FTPair.parse(pairPanel.querySelector("#mr-pair-input").value);
    if (!card) {
      status.textContent = "That text doesn't look like a FocusTube pair card (or was edited).";
      return;
    }
    await FTPair.savePartner(card);
    status.textContent = `Partner saved: ${card.name} — ${card.closedCount}/7 rings closed.`;
    await mrPaintPairBoard(ctx);
  });

  pairPanel.querySelector("#mr-pair-clear").addEventListener("click", async () => {
    await FTPair.clearPartner();
    const status = pairPanel.querySelector("#mr-pair-status");
    status.textContent = "Partner card removed.";
    await mrPaintPairBoard(ctx);
  });
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
      "focusRingsGoals",
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
      // The current anchor (today or a browsed past day) is preserved —
      // sync merges can retroactively change historical days too.
      if (!dashboardData) return;
      await refreshDashboard();
      loadTopSites();
    }, 800);
  });
} catch (_) {
  /* storage events unavailable (stale context) — manual refresh still works */
}
