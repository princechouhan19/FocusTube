/**
 * HTML Sanitization Utility
 * Provides safe HTML escaping for content inserted into innerHTML.
 * Critical for preventing XSS when rendering untrusted (e.g. AI-generated) content.
 *
 * This module is loaded at document_start before any feature module that
 * needs to render untrusted strings into the DOM.
 */
(function () {
  "use strict";

  const ENTITY_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#47;",
    "`": "&#96;",
    "=": "&#61;",
  };

  /**
   * Escape a string for safe insertion into HTML text content or
   * quoted attribute values.
   * @param {string} value - Any value (will be coerced to string)
   * @returns {string} Escaped string
   */
  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"'`=\/]/g, (ch) => ENTITY_MAP[ch]);
  }

  /**
   * Escape a string for safe insertion into a single-quoted JS string
   * embedded in an HTML attribute or inline script. Useful when building
   * data-* attributes from untrusted values.
   */
  function escapeJsString(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }

  /**
   * Validate that a URL is safe for use in src/href attributes.
   * Returns "" for anything other than http(s) URLs (or relative URLs
   * when allowRelative is true).
   * @param {string} url
   * @param {boolean} allowRelative
   * @returns {string}
   */
  function sanitizeUrl(url, allowRelative = false) {
    if (!url) return "";
    const str = String(url).trim();
    if (/^(https?:\/\/)/i.test(str)) return str;
    if (allowRelative && !/^javascript:/i.test(str) && !/^data:/i.test(str)) {
      return str;
    }
    // Allow known-safe protocol-relative URLs
    if (/^\/\//.test(str)) return "https:" + str;
    return "";
  }

  /**
   * Render an array of strings as escaped <li> items.
   * @param {string[]} items
   * @param {string} className
   * @returns {string}
   */
  function renderList(items, className = "") {
    if (!Array.isArray(items)) return "";
    const cls = className ? ` class="${escapeHtml(className)}"` : "";
    return items
      .map((item) => `<li${cls}>${escapeHtml(item)}</li>`)
      .join("");
  }

  /**
   * Render an array of strings as escaped inline tags (e.g. topic chips).
   * @param {string[]} items
   * @param {string} wrapperTag - e.g. "span"
   * @param {string} className
   * @returns {string}
   */
  function renderTags(items, wrapperTag = "span", className = "yfp-tag") {
    if (!Array.isArray(items)) return "";
    return items
      .map(
        (item) =>
          `<${wrapperTag} class="${escapeHtml(className)}">${escapeHtml(item)}</${wrapperTag}>`,
      )
      .join("");
  }

  // Expose globally for content scripts
  window.FocusTubeSanitize = {
    escapeHtml,
    escapeJsString,
    sanitizeUrl,
    renderList,
    renderTags,
  };
})();
