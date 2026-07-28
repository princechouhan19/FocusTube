/**
 * Glass Theme Module
 * Applies a global glassmorphism skin to YouTube when enabled.
 */

(function () {
  "use strict";

  let settings = {};
  const ROOT_CLASS = "yfp-modern-glass";

  function applyTheme(enabled) {
    const root = document.documentElement;
    const body = document.body;
    if (!root) return;
    if (enabled) {
      root.classList.add(ROOT_CLASS);
      if (body) body.classList.add(ROOT_CLASS);
      root.setAttribute("data-yfp-modern-glass", "1");
      console.log("[YFP] Modern Glass Theme enabled");
    } else {
      root.classList.remove(ROOT_CLASS);
      if (body) body.classList.remove(ROOT_CLASS);
      root.removeAttribute("data-yfp-modern-glass");
      console.log("[YFP] Modern Glass Theme disabled");
    }
  }

  async function init() {
    if (typeof loadSettings === "function") {
      settings = await loadSettings();
    }
    applyTheme(!!settings.modernGlassTheme);
  }

  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    applyTheme(!!settings.modernGlassTheme);
  }

  if (typeof onSettingsChanged === "function") {
    onSettingsChanged((changes) => {
      if (changes.modernGlassTheme) {
        updateSettings({ modernGlassTheme: changes.modernGlassTheme.newValue });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("yt-navigate-finish", () => {
    applyTheme(!!settings.modernGlassTheme);
  });

  window.YFPGlassTheme = {
    init,
    updateSettings,
    applyTheme,
  };
})();
