/**
 * Event Listener Utilities
 * Manages event listeners with proper passive flag handling
 * Fixes: Non-passive event listener violations, scrolling performance
 */

(function() {
  'use strict';

  /**
   * Registry of all listeners for debugging and cleanup
   */
  const listenerRegistry = [];

  /**
   * Add listener with automatic passive flag
   * @param {Element|Window} target - Event target
   * @param {string} eventType - Event type (scroll, click, etc)
   * @param {Function} handler - Event handler
   * @param {boolean} forceNonPassive - Force non-passive (rare, document!)
   * @returns {Function} Cleanup function
   */
  window.safeAddListener = function(target, eventType, handler, forceNonPassive = false) {
    if (!target || !eventType || !handler) {
      console.warn('[FocusTube] Invalid listener params:', { target, eventType, handler });
      return () => {};
    }

    // Events that SHOULD be passive (don't call preventDefault)
    const passiveEvents = [
      'scroll',
      'wheel',
      'touchstart',
      'touchmove',
      'touchend',
      'mousemove',
      'mouseover',
      'mouseout',
      'resize',
      'load',
      'unload'
    ];

    // Events that MUST be non-passive (need preventDefault)
    const nonPassiveEvents = [
      'click',
      'dblclick',
      'keydown',
      'keyup',
      'keypress',
      'mousedown',
      'mouseup',
      'focus',
      'blur',
      'change',
      'input',
      'submit',
      'reset'
    ];

    // Determine if passive should be used
    let usePassive = passiveEvents.includes(eventType);
    if (forceNonPassive && nonPassiveEvents.includes(eventType)) {
      usePassive = false;
    }

    // Add listener with proper options
    const options = {
      passive: usePassive,
      capture: false
    };

    try {
      target.addEventListener(eventType, handler, options);
      
      // Track for debugging
      listenerRegistry.push({
        target: target.tagName || 'window',
        event: eventType,
        passive: usePassive,
        timestamp: Date.now()
      });

      // Return cleanup function
      return () => {
        target.removeEventListener(eventType, handler, options);
      };
    } catch (err) {
      console.error('[FocusTube] Failed to add listener:', { eventType, error: err });
      return () => {};
    }
  };

  /**
   * Batch add multiple listeners
   * @param {Element|Window} target - Event target
   * @param {Object} handlers - { eventType: handler, ... }
   * @returns {Function} Cleanup function that removes all
   */
  window.safeAddListeners = function(target, handlers) {
    const cleanups = [];
    
    for (const [eventType, handler] of Object.entries(handlers)) {
      const cleanup = window.safeAddListener(target, eventType, handler);
      cleanups.push(cleanup);
    }

    return () => cleanups.forEach(cleanup => cleanup());
  };

  /**
   * Get listener stats for debugging
   */
  window.getListenerStats = function() {
    const stats = {};
    listenerRegistry.forEach(({ event, passive }) => {
      if (!stats[event]) {
        stats[event] = { passive: 0, active: 0 };
      }
      stats[event][passive ? 'passive' : 'active']++;
    });
    return stats;
  };

  /**
   * Debug: Log all listeners
   */
  window.logListeners = function() {
    console.table(listenerRegistry);
  };

  // Export globally
  window.EventListenerUtils = {
    safeAddListener,
    safeAddListeners,
    getListenerStats,
    logListeners
  };

})();
