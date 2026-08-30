/**
 * Block page JS — reads URL params and customizes the message.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get("d") || "";
  const reason = params.get("reason") || "";

  const iconEl = document.getElementById("block-icon");
  const titleEl = document.getElementById("block-title");
  const reasonEl = document.getElementById("block-reason");
  const timerEl = document.getElementById("block-timer");
  const msgEl = document.getElementById("block-message");

  if (reason === "time") {
    iconEl.textContent = "⏱️";
    titleEl.textContent = "Time Limit Reached";
    reasonEl.textContent = domain
      ? `You've spent your daily time limit on ${domain}.`
      : "You've spent your daily time limit on this site.";
    msgEl.textContent = "Blocked until midnight. Take a break — you earned it.";
  } else if (domain) {
    iconEl.textContent = "🔒";
    titleEl.textContent = "Site Blocked";
    reasonEl.textContent = `${domain} is blocked by a FocusTube Smart List.`;
  }
})();
