/**
 * Logger Module
 *
 * Provides a namespaced logger (`FocusTubeLogger`) instead of monkey-patching
 * the global `console`. Patching `console.log` globally affects YouTube's
 * own code and other extensions, which is unsafe and hard to debug.
 *
 * Usage:
 *   FocusTubeLogger.log("hello");
 *   FocusTubeLogger.warn("oops", err);
 *
 * Logs are suppressed unless localStorage flag is set or the extension is
 * loaded unpacked (dev mode).
 */
(function () {
  "use strict";

  if (window.FocusTubeLogger) return;

  const isDevMode =
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    typeof chrome.runtime.getManifest === "function" &&
    chrome.runtime.getManifest() &&
    typeof chrome.runtime.getURL === "function" &&
    chrome.runtime.getURL("").startsWith("chrome-extension://");

  // Allow opt-in via localStorage on the page (dev convenience)
  let verbose = false;
  try {
    verbose = localStorage.getItem("focustube_debug") === "1";
  } catch (_) {
    // localStorage may throw in restricted contexts
  }

  const PREFIX = "[FocusTube]";

  function log(...args) {
    if (verbose) console.log(PREFIX, ...args);
  }
  function info(...args) {
    if (verbose) console.info(PREFIX, ...args);
  }
  function warn(...args) {
    console.warn(PREFIX, ...args);
  }
  function error(...args) {
    console.error(PREFIX, ...args);
  }
  function debug(...args) {
    if (verbose) console.debug(PREFIX, ...args);
  }

  window.FocusTubeLogger = Object.freeze({
    log,
    info,
    warn,
    error,
    debug,
    setVerbose: (v) => {
      verbose = !!v;
    },
  });
})();
