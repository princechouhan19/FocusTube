/**
 * DOM Helpers Module
 * Provides safe DOM manipulation utilities with graceful fallbacks
 */

/**
 * Safely query selector with fallback
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (default: document)
 * @returns {Element|null}
 */
function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.warn(`Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Safely query selector all
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (default: document)
 * @returns {NodeList}
 */
function safeQuerySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.warn(`Invalid selector: ${selector}`, error);
    return [];
  }
}

/**
 * Check if element exists and is visible
 * @param {Element} element - Element to check
 * @returns {boolean}
 */
function isElementVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Hide element safely
 * @param {Element} element - Element to hide
 * @param {string} property - CSS property to modify (default: 'display')
 */
function hideElement(element, property = "display") {
  if (!element) return;
  try {
    if (property === "display") {
      element.style.setProperty("display", "none", "important");
    } else if (property === "visibility") {
      element.style.setProperty("visibility", "hidden", "important");
    } else if (property === "opacity") {
      element.style.setProperty("opacity", "0", "important");
    }
  } catch (error) {
    console.warn("Error hiding element:", error);
  }
}

/**
 * Show element safely
 * @param {Element} element - Element to show
 * @param {string} property - CSS property to restore
 */
function showElement(element, property = "display") {
  if (!element) return;
  try {
    if (property === "display") {
      element.style.removeProperty("display");
    } else if (property === "visibility") {
      element.style.removeProperty("visibility");
    } else if (property === "opacity") {
      element.style.removeProperty("opacity");
    }
  } catch (error) {
    console.warn("Error showing element:", error);
  }
}

/**
 * Add class to element
 * @param {Element} element - Target element
 * @param {string} className - Class to add
 */
function addClass(element, className) {
  if (!element) return;
  try {
    element.classList.add(className);
  } catch (error) {
    console.warn("Error adding class:", error);
  }
}

/**
 * Remove class from element
 * @param {Element} element - Target element
 * @param {string} className - Class to remove
 */
function removeClass(element, className) {
  if (!element) return;
  try {
    element.classList.remove(className);
  } catch (error) {
    console.warn("Error removing class:", error);
  }
}

/**
 * Inject dynamic CSS styles
 * @param {string} id - Unique ID for the style element
 * @param {string} css - CSS content
 */
function injectStyles(id, css) {
  const existing = document.getElementById(id);
  if (existing) {
    existing.textContent = css;
    return;
  }

  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

/**
 * Remove injected CSS styles
 * @param {string} id - Unique ID of the style element
 */
function removeStyles(id) {
  const style = document.getElementById(id);
  if (style) {
    style.remove();
  }
}

/**
 * Debounce function for performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };

  /**
   * Create element with attributes
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Attributes object
   * @param {string} textContent - Text content
   * @returns {Element}
   */
  function createElement(tag, attributes = {}, textContent = "") {
    try {
      const element = document.createElement(tag);

      Object.entries(attributes).forEach(([key, value]) => {
        if (key === "className") {
          element.className = value;
        } else if (key === "style" && typeof value === "object") {
          Object.entries(value).forEach(([prop, val]) => {
            element.style[prop] = val;
          });
        } else if (key.startsWith("data-")) {
          element.setAttribute(key, value);
        } else {
          element[key] = value;
        }
      });

      if (textContent) {
        element.textContent = textContent;
      }

      return element;
    } catch (error) {
      console.warn("Error creating element:", error);
      return null;
    }
  }

  /**
   * Insert element after another element
   * @param {Element} newElement - Element to insert
   * @param {Element} targetElement - Reference element
   */
  function insertAfter(newElement, targetElement) {
    if (!newElement || !targetElement) return;
    try {
      targetElement.parentNode.insertBefore(
        newElement,
        targetElement.nextSibling,
      );
    } catch (error) {
      console.warn("Error inserting element:", error);
    }
  }

  /**
   * Insert element before another element
   * @param {Element} newElement - Element to insert
   * @param {Element} targetElement - Reference element
   */
  function insertBefore(newElement, targetElement) {
    if (!newElement || !targetElement) return;
    try {
      targetElement.parentNode.insertBefore(newElement, targetElement);
    } catch (error) {
      console.warn("Error inserting element:", error);
    }
  }

  /**
   * Wait for element to appear in DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element|null>}
   */
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const element = safeQuerySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = safeQuerySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /**
   * Throttle function to limit execution rate
   * @param {Function} func - Function to throttle
   * @param {number} limit - Limit time in milliseconds
   * @returns {Function}
   */
  function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Export functions
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      safeQuerySelector,
      safeQuerySelectorAll,
      isElementVisible,
      hideElement,
      showElement,
      addClass,
      removeClass,
      toggleClass,
      createElement,
      insertAfter,
      insertBefore,
      waitForElement,
      debounce,
      throttle,
    };
  }
}
