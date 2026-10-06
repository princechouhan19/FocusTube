/**
 * FocusTube local replacement for youtube-ambilight's `errors/sentry-reporter`.
 *
 * The upstream module ships crash reports to sentry.io via @sentry/browser.
 * FocusTube is 100% local and telemetry-free, so the engine's error reporter
 * is reduced to console logging. Every member referenced by the vendored
 * engine is implemented below (verified against upstream call sites:
 * SentryReporter.captureException is the only API used, plus the
 * parseSettingsToSentry / setVersion / setCrashOptions helpers and the
 * crashOptions binding consumed by errors/events.js).
 */
export const crashOptions = {
  video: false,
  technical: true,
  crash: true,
};

export const parseSettingsToSentry = () => {};

export const setVersion = () => {};

export const setCrashOptions = () => {};

export default class SentryReporter {
  static captureException(ex) {
    try {
      const name = ex?.name || 'Error';
      // SecurityError on canvas reads is an expected, recoverable condition
      // (DRM / cross-origin frames) — upstream also just logs it.
      if (name === 'SecurityError') {
        console.warn('[YTAL] Cannot read video pixels:', ex?.message);
        return;
      }
      console.warn('[YTAL]', ex);
    } catch (_) {
      /* never throw from the error reporter */
    }
  }

  static addBreadcrumb() {}

  static init() {}
}
