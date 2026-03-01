document.addEventListener("DOMContentLoaded", () => {
  // Trigger user profile fetch fresh from YouTube
  chrome.runtime.sendMessage({ action: "getUserProfile" }, (response) => {
    if (response?.success && response.profile) {
      updateUserProfileUI(
        response.profile.profileName,
        response.profile.profileImage,
        response.profile.profileEmail,
      );
    }
  });

  function updateUserProfileUI(name, image, email) {
    if (name || image || email) {
      const userProfile = document.getElementById("user-profile");
      const userAvatar = document.getElementById("user-avatar");
      const userName = document.getElementById("user-name");
      const userEmail = document.getElementById("user-email");

      if (name) userName.textContent = name;
      if (image) userAvatar.src = image;
      if (email) userEmail.textContent = email;
      userProfile.style.display = "flex";
    }
  }

  // Load stats from chrome storage
  chrome.storage.sync.get(
    [
      "statsShortsSkipped",
      "statsAdsBlocked",
      "statsSummariesGenerated",
      "statsQuitsEarly",
      "profileName",
      "profileImage",
    ],
    (result) => {
      // Redundant logic removed, handled by initial message fetch

      // Helper function to animate numbers counting up
      function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          // ease out cubic
          const easeOut = 1 - Math.pow(1 - progress, 3);
          obj.innerHTML = Math.floor(easeOut * (end - start) + start);
          if (progress < 1) {
            window.requestAnimationFrame(step);
          }
        };
        window.requestAnimationFrame(step);
      }

      const valShorts = result.statsShortsSkipped || 0;
      const valAds = result.statsAdsBlocked || 0;
      const valSummaries = result.statsSummariesGenerated || 0;
      const valQuits = result.statsQuitsEarly || 0;

      animateValue(document.getElementById("val-shorts"), 0, valShorts, 1500);
      animateValue(document.getElementById("val-ads"), 0, valAds, 1500);
      animateValue(
        document.getElementById("val-summaries"),
        0,
        valSummaries,
        1500,
      );
      animateValue(document.getElementById("val-quits"), 0, valQuits, 1500);

      const msgEl = document.getElementById("shame-msg");
      if (valQuits === 0) {
        msgEl.textContent =
          "Perfect so far! You've never quit a focus challenge.";
        msgEl.style.color = "#34d399";
      } else if (valQuits < 5) {
        msgEl.textContent =
          "Keep pushing through the hard questions next time.";
      } else if (valQuits < 20) {
        msgEl.textContent =
          "You're quitting a lot... FocusTube is disappointed.";
      } else {
        msgEl.textContent = "You are hopelessly addicted to distraction.";
      }
    },
  );
});
