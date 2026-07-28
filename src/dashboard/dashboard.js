const RANGE_META = {
  day: { title: "Today", subtitle: "A same-day view of your protected attention." },
  week: { title: "This Week", subtitle: "Seven-day rollup from your local browsing activity." },
  month: { title: "This Month", subtitle: "A 30-day trend of FocusTube activity on this device." },
};

let dashboardData = null;
let activeRange = "day";

document.addEventListener("DOMContentLoaded", async () => {
  const response = await loadDashboardData();
  if (!response?.success) {
    bindRangeTabs();
    renderEmptyState();
    return;
  }

  dashboardData = response;
  renderProfile(response.profile);
  renderLifetime(response.lifetime);
  bindRangeTabs();
  renderRange(activeRange);
});

async function loadDashboardData() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "getDashboardStats",
    });
    if (response?.success) {
      return response;
    }
  } catch (error) {}

  const stored = await chrome.storage.local.get([
    "statsShortsSkipped",
    "statsAdsBlocked",
    "statsSummariesGenerated",
    "statsQuitsEarly",
    "statsTimeSaved",
    "profileName",
    "profileImage",
    "profileEmail",
    "profileGoal",
  ]);

  const lifetime = {
    shortsSkipped: Number(stored.statsShortsSkipped) || 0,
    adsBlocked: Number(stored.statsAdsBlocked) || 0,
    summariesGenerated: Number(stored.statsSummariesGenerated) || 0,
    quitsEarly: Number(stored.statsQuitsEarly) || 0,
    timeSavedMinutes: Number(stored.statsTimeSaved) || 0,
  };

  const key = new Date().toISOString().slice(0, 10);
  const rangeData = {
    totals: { ...lifetime },
    points: [
      {
        key,
        ...lifetime,
      },
    ],
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
    report: {
      day: rangeData,
      week: rangeData,
      month: rangeData,
    },
  };
}

function bindRangeTabs() {
  document.querySelectorAll(".range-tab").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".range-tab")
        .forEach((tab) => tab.classList.toggle("active", tab === button));
      activeRange = button.dataset.range;
      renderRange(activeRange);
    });
  });
}

function renderProfile(profile) {
  document.getElementById("user-name").textContent =
    profile.profileName || "Guest User";
  document.getElementById("user-email").textContent =
    profile.profileEmail || "Not connected";
  document.getElementById("goal-text").textContent =
    profile.profileGoal || "Stay intentional";

  const avatar = document.getElementById("user-avatar");
  if (profile.profileImage) {
    avatar.src = profile.profileImage;
  } else {
    avatar.removeAttribute("src");
  }
}

function renderLifetime(lifetime) {
  document.getElementById("lifetime-shorts").textContent = lifetime.shortsSkipped;
  document.getElementById("lifetime-ads").textContent = lifetime.adsBlocked;
  document.getElementById("lifetime-summaries").textContent =
    lifetime.summariesGenerated;
  document.getElementById("lifetime-quits").textContent = lifetime.quitsEarly;
  document.getElementById("lifetime-time").textContent = formatMinutes(
    lifetime.timeSavedMinutes,
  );
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

  document.getElementById("metric-shorts").textContent =
    data.totals.shortsSkipped;
  document.getElementById("metric-ads").textContent = data.totals.adsBlocked;
  document.getElementById("metric-summaries").textContent =
    data.totals.summariesGenerated;
  document.getElementById("metric-quits").textContent = data.totals.quitsEarly;
  document.getElementById("metric-time").textContent = formatMinutes(
    data.totals.timeSavedMinutes,
  );

  renderChart(data.points, range);
  renderInsight(data.totals, range);
}

function renderEmptyState() {
  document.getElementById("range-title").textContent = "No data yet";
  document.getElementById("range-subtitle").textContent =
    "Use FocusTube for a bit and the dashboard will start filling in.";
  document.getElementById("chart-bars").innerHTML = "";
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

function renderChart(points, range) {
  const chart = document.getElementById("chart-bars");
  chart.innerHTML = "";

  const maxValue = Math.max(
    1,
    ...points.map(
      (point) =>
        point.shortsSkipped +
        point.adsBlocked +
        point.summariesGenerated +
        point.quitsEarly,
    ),
  );

  points.forEach((point) => {
    const group = document.createElement("div");
    group.className = "chart-bar-group";

    const stack = document.createElement("div");
    stack.className = "chart-stack";

    const segments = [
      { value: point.shortsSkipped, className: "sky" },
      { value: point.adsBlocked, className: "mint" },
      { value: point.summariesGenerated, className: "gold" },
      { value: point.quitsEarly, className: "coral" },
    ];

    segments.forEach((segment) => {
      const bar = document.createElement("div");
      bar.className = `bar-segment ${segment.className}`;
      const height = Math.max(4, (segment.value / maxValue) * 160);
      bar.style.height = `${segment.value > 0 ? height : 4}px`;
      bar.title = `${segment.value}`;
      stack.appendChild(bar);
    });

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = formatPointLabel(point.key, range);

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

function formatPointLabel(dayKey, range) {
  const date = new Date(`${dayKey}T00:00:00`);
  if (range === "day") {
    return "Now";
  }
  if (range === "week") {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
