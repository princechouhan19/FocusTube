/**
 * Keyboard Shortcuts Module
 * Adds power-user keybindings (S for summary, C for screenshot)
 */

(function () {
  "use strict";

  function initShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      // 'S' key for Summary
      if (e.key.toLowerCase() === "s") {
        const summaryBtn = document.getElementById("yfp-summary-btn");
        if (summaryBtn) {
          e.preventDefault();
          summaryBtn.click();
          showToast("Generating AI Summary...");
        }
      }

      // 'C' key for Capture Screenshot
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        captureScreenshot();
      }
    });
  }

  function captureScreenshot() {
    // Find the main video element
    const video =
      document.querySelector("video.html5-main-video") ||
      document.querySelector("video");
    if (!video) {
      showToast("No video found to capture.");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataURL = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = dataURL;

      // Try to get video title for filename
      const titleEl =
        document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
        document.querySelector("h1.title");
      let title = "Video";
      if (titleEl && titleEl.textContent) {
        title = titleEl.textContent
          .replace(/[^a-zA-Z0-9]/g, "_")
          .substring(0, 30);
      }

      a.download = `FocusTube_${title}_${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast("Screenshot saved to downloads!");
    } catch (err) {
      console.error("[YFP] Screenshot capture failed:", err);
      showToast("Screenshot failed (CORS error or blocked)");
    }
  }

  function showToast(message) {
    let toast = document.getElementById("yfp-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "yfp-toast";
      Object.assign(toast.style, {
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(15, 23, 42, 0.9)",
        color: "#f8fafc",
        padding: "12px 24px",
        borderRadius: "8px",
        zIndex: "999999",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "15px",
        fontWeight: "500",
        pointerEvents: "none",
        opacity: "0",
        transition: "opacity 0.3s ease-in-out",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      });
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = "1";

    // Clear existing timeout
    if (toast.hideTimeout) {
      clearTimeout(toast.hideTimeout);
    }

    toast.hideTimeout = setTimeout(() => {
      toast.style.opacity = "0";
    }, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initShortcuts);
  } else {
    initShortcuts();
  }
})();
