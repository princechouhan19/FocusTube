/**
 * FocusTube Ambient Light engine — vendored youtube-ambilight (isolated world)
 * Machine-generated bundle — DO NOT EDIT BY HAND.
 *
 * Source: youtube-ambilight by Wessel Kroos
 *         https://github.com/WesselKroos/youtube-ambilight
 *         MIT License — see third_party/youtube-ambilight/LICENSE
 * Vendor: FocusTube third_party/youtube-ambilight (pristine upstream files)
 * Build:  node scripts/build_ambilight.js
 *
 * Local replacements bundled in place of upstream modules:
 *   libs/settings.js          -> vendor-modules/settings.adapter.js (headless)
 *   libs/storage.js           -> vendor-modules/storage.shim.js (ytal: keys)
 *   libs/errors/sentry-reporter.js -> vendor-modules/sentry-reporter.stub.js
 *                                      (no telemetry: FocusTube is 100% local)
 */

(function () {
'use strict';
const __modules = {};
const __require = (key) => {
  const m = __modules[key];
  if (!m) throw new Error('[YTAL bundle] module not loaded: ' + key);
  return m;
};

// ==================== module: generic (third_party/youtube-ambilight/src/libs/generic.js) ====================
__modules["generic"] = (() => {
const __exports = {};
const uuidv4 = () => {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
};

const waitForDomElement = (check, container, timeout) =>
  new Promise((resolve, reject) => {
    if (check()) {
      resolve();
    } else {
      let timeoutId;
      const observer = new MutationObserver(
        function domElementMutation(mutationsList, observer) {
          if (!check()) return;

          if (timeoutId) clearTimeout(timeoutId);
          observer.disconnect();
          resolve();
        }.bind(this),
        true
      );
      if (timeout) {
        timeoutId = setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element not found after ${timeout}ms`));
        });
      }
      observer.observe(container, {
        childList: true,
        subtree: true,
      });
      return observer;
    }
  });

let errorHandler = (ex) => {
  console.error(ex);
};
const setErrorHandler = (handler) => {
  errorHandler = handler;
};

let displayErrorHandler;
const setDisplayErrorHandler = (handler) => {
  displayErrorHandler = handler;
};

const wrapErrorHandlerHandleError = (stack, ex, reportOnce, reported) => {
  if (reportOnce) {
    if (reported.includes(ex.message)) return;
    reported.push(ex.message);
  }
  appendErrorStack(stack, ex);
  if (errorHandler) errorHandler(ex);
  if (displayErrorHandler) displayErrorHandler(ex);
};

const withErrorHandler = (callback, reportOnce, stack, reported) => {
  const callbackName = callback.name || 'anonymous';
  const container = {
    [callbackName]: (...args) => {
      try {
        return callback(...args);
      } catch (ex) {
        wrapErrorHandlerHandleError(stack, ex, reportOnce, reported);
      }
    },
  };
  return container[callbackName];
};

const withAsyncErrorHandler = (callback, reportOnce, stack, reported) => {
  const callbackName = callback.name || 'anonymous';
  const container = {
    [callbackName]: async (...args) => {
      try {
        return await callback(...args);
      } catch (ex) {
        wrapErrorHandlerHandleError(stack, ex, reportOnce, reported);
      }
    },
  };
  return container[callbackName];
};

const wrapErrorHandler = (callback, reportOnce = false) =>
  (callback.constructor.name === 'AsyncFunction'
    ? withAsyncErrorHandler
    : withErrorHandler)(callback, reportOnce, new Error().stack, []);

const setTimeout = (handler, timeout) => {
  return globalThis.setTimeout(wrapErrorHandler(handler), timeout);
};

const eventListenerCallbacks = [];
function on(elem, eventNames, callback, options, reportOnce = false) {
  try {
    const stack = new Error().stack;
    const callbacksName = `on_${eventNames.split(' ').join('_')}`;
    let reported = [];
    const namedCallbacks = {
      [callbacksName]: async (...args) => {
        try {
          await callback(...args);
        } catch (ex) {
          if (reportOnce) {
            if (reported.includes(ex.message)) return;
            reported.push(ex.message);
          }

          const e = args.length ? args[0] : {};
          const type =
            e.type === 'keydown' ? `${e.type} keyCode: ${e.keyCode}` : e.type;
          ex.message = `${ex.message} \nOn event: ${type}`;

          try {
            if (elem) {
              ex.message = `${ex.message} \nElem: ${elem.toString()} ${
                elem.nodeName || ''
              }#${elem.id || ''}.${elem.className || ''}`;
            }
          } catch (elemEx) {
            ex.details = {
              ...(ex.details || {}),
              elemEx,
            };
          }

          try {
            if (e?.target) {
              ex.message = `${ex.message} \nTarget: ${e.target.toString()} ${
                e.target.nodeName || ''
              }#${e.target.id || ''}.${e.target.className || ''}`;
            }
          } catch (targetEx) {
            ex.details = {
              ...(ex.details || {}),
              targetEx,
            };
          }

          try {
            if (e?.currentTarget) {
              ex.message = `${
                ex.message
              } \nCurrentTarget: ${e.currentTarget.toString()} ${
                e.currentTarget.nodeName || ''
              }#${e.currentTarget.id || ''}.${e.currentTarget.className || ''}`;
            }
          } catch (currentTargetEx) {
            ex.details = {
              ...(ex.details || {}),
              currentTargetEx,
            };
          }

          ex.details = {
            ...(ex.details || {}),
            eventNames,
            options,
            reportOnce,
          };

          appendErrorStack(stack, ex);
          if (errorHandler) errorHandler(ex);
        }
      },
    };
    const eventListenerCallback = namedCallbacks[callbacksName];
    const eventNamesList = eventNames.split(' ');

    const existingEventListenerCallback = eventListenerCallbacks.find(
      (e) =>
        e.args.elem === elem &&
        e.args.callback === callback &&
        JSON.stringify(e.args.options) === JSON.stringify(options)
    );

    for (const eventName of eventNamesList) {
      if (existingEventListenerCallback) {
        if (
          existingEventListenerCallback.args.eventNamesList.includes(eventName)
        ) {
          continue;
        } else {
          existingEventListenerCallback.args.eventNamesList.push(eventName);
        }
      }
      elem.addEventListener(eventName, eventListenerCallback, options);
    }

    if (!existingEventListenerCallback) {
      eventListenerCallbacks.push({
        args: {
          elem,
          eventNamesList,
          callback,
          options,
        },
        callback: eventListenerCallback,
      });
    }
  } catch (ex) {
    ex.details = {
      eventNames,
      options,
      reportOnce,
    };

    try {
      if (elem) {
        ex.message = `${ex.message} \nFor element: ${elem.toString()} ${
          elem.nodeName || ''
        }#${elem.id || ''}.${elem.className || ''}`;
      }
    } catch (elemEx) {
      ex.details = {
        ...(ex.details || {}),
        elemEx,
      };
    }

    console.log('catched', ex);
    throw ex;
  }
}

function off(elem, eventNames, callback) {
  try {
    const list = eventNames.split(' ');
    for (const eventName of list) {
      const eventListenerCallback = eventListenerCallbacks.find(
        (e) =>
          e.args.elem === elem &&
          e.args.callback === callback &&
          e.args.eventNamesList.includes(eventName)
      );
      if (!eventListenerCallback) continue;

      eventListenerCallback.args.eventNamesList.splice(
        eventListenerCallback.args.eventNamesList.indexOf(eventName),
        1
      );

      if (eventListenerCallback.args.eventNamesList.length === 0) {
        eventListenerCallbacks.splice(
          eventListenerCallbacks.indexOf(eventListenerCallback),
          1
        );
      }

      elem.removeEventListener(
        eventName,
        eventListenerCallback.callback,
        eventListenerCallback.args.options
      );
    }
  } catch (ex) {
    ex.details = {
      eventNames,
    };

    try {
      if (elem) {
        ex.message = `${ex.message} \nFor element: ${elem.toString()} ${
          elem.nodeName || ''
        }#${elem.id || ''}.${elem.className || ''}`;
      }
    } catch (elemEx) {
      ex.details = {
        ...(ex.details || {}),
        elemEx,
      };
    }

    throw ex;
  }
}

const raf = (callback) =>
  requestAnimationFrame(wrapErrorHandler(callback));

const colorSpace =
  // rec2020 in canvas is not yet supported
  // globalThis.matchMedia('(color-gamut: rec2020)').matches
  //   ? 'rec2020'
  //   : (
  globalThis.matchMedia('(color-gamut: p3)').matches ? 'display-p3' : 'srgb';
//  )

const extendedColorSpace =
  // rec2020 in canvas is not yet supported
  globalThis.matchMedia('(color-gamut: rec2020)').matches
    ? 'rec2020'
    : globalThis.matchMedia('(color-gamut: p3)').matches
    ? 'display-p3'
    : 'srgb';

const ctxOptions = {
  // alpha: false, // Decreases performance on some platforms
  // desynchronized: true,
  imageSmoothingQuality: 'low',
  colorSpace,
  extendedColorSpace,
};

class Canvas {
  constructor(width, height, pixelated) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    if (pixelated) {
      canvas.style.imageRendering = 'pixelated';
    }
    return canvas;
  }
}

class SafeOffscreenCanvas {
  constructor(width, height, pixelated) {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      if (pixelated) {
        canvas.style.imageRendering = 'pixelated';
      }
      return canvas;
    }
  }
}

function requestIdleCallback(callback, options, reportOnce = false) {
  return globalThis.requestIdleCallback
    ? globalThis.requestIdleCallback(
        wrapErrorHandler(callback, reportOnce),
        options
      )
    : globalThis.setTimeout(wrapErrorHandler(callback, reportOnce), 1); // Safari (not supported but there are users that try)
}

const appendErrorStack = (stack, ex) => {
  try {
    const stackToAppend = stack?.substring(stack?.indexOf('\n') + 1);
    const stackToSearch = stackToAppend?.substring(
      stackToAppend?.indexOf('\n') + 1
    ); // The first line in the stack trace can contain an extra function name
    const alreadyContainsStack =
      (ex?.stack || ex?.message || ex?.toString())?.indexOf(stackToSearch) !==
      -1;
    if (!alreadyContainsStack) {
      ex.stack = `${ex.stack || ex.message || ex.toString()}\n${stackToAppend}`;
    }
  } catch (ex) {
    console.warn(ex);
  }
};

let _supportsWebGL;
const supportsWebGL = () => {
  if (_supportsWebGL === undefined) {
    try {
      _supportsWebGL =
        !!globalThis.WebGLRenderingContext &&
        (!!document.createElement('canvas')?.getContext('webgl') ||
          !!document.createElement('canvas')?.getContext('webgl2'));
    } catch {
      _supportsWebGL = false;
    }
  }
  return _supportsWebGL;
};

let _supportsColorMix;
const supportsColorMix = () => {
  if (_supportsColorMix === undefined) {
    try {
      _supportsColorMix = CSS.supports(
        'background-color: color-mix(in srgb, #000 0%, #000)'
      );
    } catch {
      _supportsColorMix = false;
    }
  }
  return _supportsColorMix;
};

const isWatchPageUrl = () =>
  ['/watch', '/live/'].some((path) => location.pathname.startsWith(path)) ||
  isEmbedPageUrl();

const isEmbedPageUrl = () => location.pathname?.startsWith('/embed/');

const getCookie = async (name) =>
  globalThis.cookieStore
    ? await cookieStore.get(name)
    : document.cookie
        .split('; ')
        .map((cookie) => {
          const nameValue = cookie.split(/=(.*)/s);
          return {
            name: nameValue[0],
            value: nameValue[1],
          };
        })
        .find((cookie) => cookie.name === name);

const networkStateToString = (value) =>
  (({
    0: 'NETWORK_EMPTY',
    1: 'NETWORK_IDLE',
    2: 'NETWORK_LOADING',
    3: 'NETWORK_NO_SOURCE',
  }[value] ||
    value) ??
  'UNKNOWN');

const readyStateToString = (value) =>
  (({
    0: 'HAVE_NOTHING',
    1: 'HAVE_METADATA',
    2: 'HAVE_CURRENT_DATA',
    3: 'HAVE_FUTURE_DATA',
    4: 'HAVE_ENOUGH_DATA',
  }[value] ||
    value) ??
  'UNKNOWN');

const mediaErrorToString = (value) =>
  (({
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
  }[value] ||
    value) ??
  'UNKNOWN');

const webGLErrorToString = (value) =>
  (({
    1280: 'GL_INVALID_ENUM',
    1281: 'GL_INVALID_VALUE',
    1282: 'GL_INVALID_OPERATION',
    1285: 'GL_OUT_OF_MEMORY',
    1286: 'GL_INVALID_FRAMEBUFFER_OPERATION',
    1287: 'GL_CONTEXT_LOST_WEBGL',
  }[value] ||
    value) ??
  'UNKNOWN');

const VIEW_DISABLED = 'DISABLED';
const VIEW_DETACHED = 'DETACHED';
const VIEW_SMALL = 'SMALL';
const VIEW_THEATER = 'THEATER';
const VIEW_FULLSCREEN = 'FULLSCREEN';
const VIEW_POPUP = 'POPUP';

const watchSelectors = [
  'ytd-watch-flexy',
  'ytd-watch-fixie',
  'ytd-watch-grid',
];

let warningElem;
let warningElemText;
const setWarning = (text) => {
  if (!warningElem) {
    const elem = document.createElement('div');
    elem.style.position = 'fixed';
    elem.style.zIndex = 999999;
    elem.style.left = 0;
    elem.style.bottom = 0;
    elem.style.padding = '5px 8px';
    elem.style.background = 'rgba(0,0,0,.99)';
    elem.style.color = '#fff';
    elem.style.border = '1px solid #f80';
    elem.style.borderTopRightRadius = '3px';
    elem.style.whiteSpace = 'pre-wrap';
    elem.style.fontSize = '15px';
    elem.style.lineHeight = '18px';
    elem.style.fontFamily = 'sans-serif';
    elem.style.overflowWrap = 'anywhere';
    elem.style.overflow = 'hidden';
    warningElem = elem;

    const closeButton = document.createElement('button');
    closeButton.style.position = 'absolute';
    closeButton.style.zIndex = 2;
    closeButton.style.right = 0;
    closeButton.style.top = 0;
    closeButton.style.border = 'none';
    closeButton.style.borderBottomLeftRadius = '3px';
    closeButton.style.padding = '0px 8px';
    closeButton.style.background = '#f80';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.fontFamily = 'inherit';
    closeButton.style.lineHeight = '20px';
    closeButton.style.fontSize = '22px';
    closeButton.style.color = '#000';
    closeButton.style.cursor = 'pointer';
    closeButton.textContent = 'x';
    on(closeButton, 'click', () => setWarning(''));
    elem.appendChild(closeButton);

    const titleElem = document.createElement('div');
    titleElem.style.fontWeight = 'bold';
    titleElem.style.color = '#008cff';
    titleElem.style.fontSize = '22px';
    titleElem.style.lineHeight = '28px';
    titleElem.textContent = 'Ambient light for YouTube™\n';
    elem.appendChild(titleElem);

    const textElem = document.createElement('div');
    warningElemText = textElem;
    elem.appendChild(textElem);
  }

  const elem = warningElem;
  if (text) {
    warningElemText.textContent = text;
    document.documentElement.appendChild(elem);
  } else {
    warningElemText.textContent = '';
    elem.remove();
  }
};

const isNetworkError = (ex) =>
  ex?.message === 'Failed to fetch' || // Chromium
  ex?.message === 'NetworkError when attempting to fetch resource.'; // Firefox

const setStyleProperty = (elem, name, value, priority = '') => {
  const currentValue = elem.style.getPropertyValue(name) ?? '';
  const currentPriority = elem.style.getPropertyPriority(name) ?? '';
  if (currentValue === value && currentPriority === priority) return; // Prevent MutationObservers from firing

  elem.style.setProperty(name, value, priority);
};

const canvas2DCrashTips = `

Reload the webpage to try it again.

Possible causes:
- The memory of your GPU is fully used by another application.
- You have to many YouTube webpages visible at the same time. You GPU can only render a limit amount of ambient lights at the same time.
- You have changed a setting to a value that is incompatible with your GPU. Undo your last change and refresh the webpage. Or reset all settings with the reset button at the top right.`;

const canvasWebGLCrashTips = `${canvas2DCrashTips}

Another possible workaround could be to turn off the "Quality" > "WebGL renderer" setting (This is an advanced setting). But if you do so, know that the legacy renderer requires more power.`;
__exports["Canvas"] = Canvas;
__exports["SafeOffscreenCanvas"] = SafeOffscreenCanvas;
__exports["on"] = on;
__exports["off"] = off;
__exports["requestIdleCallback"] = requestIdleCallback;
__exports["uuidv4"] = uuidv4;
__exports["waitForDomElement"] = waitForDomElement;
__exports["setErrorHandler"] = setErrorHandler;
__exports["setDisplayErrorHandler"] = setDisplayErrorHandler;
__exports["wrapErrorHandler"] = wrapErrorHandler;
__exports["setTimeout"] = setTimeout;
__exports["raf"] = raf;
__exports["ctxOptions"] = ctxOptions;
__exports["appendErrorStack"] = appendErrorStack;
__exports["supportsWebGL"] = supportsWebGL;
__exports["supportsColorMix"] = supportsColorMix;
__exports["isWatchPageUrl"] = isWatchPageUrl;
__exports["isEmbedPageUrl"] = isEmbedPageUrl;
__exports["getCookie"] = getCookie;
__exports["networkStateToString"] = networkStateToString;
__exports["readyStateToString"] = readyStateToString;
__exports["mediaErrorToString"] = mediaErrorToString;
__exports["webGLErrorToString"] = webGLErrorToString;
__exports["VIEW_DISABLED"] = VIEW_DISABLED;
__exports["VIEW_DETACHED"] = VIEW_DETACHED;
__exports["VIEW_SMALL"] = VIEW_SMALL;
__exports["VIEW_THEATER"] = VIEW_THEATER;
__exports["VIEW_FULLSCREEN"] = VIEW_FULLSCREEN;
__exports["VIEW_POPUP"] = VIEW_POPUP;
__exports["watchSelectors"] = watchSelectors;
__exports["setWarning"] = setWarning;
__exports["isNetworkError"] = isNetworkError;
__exports["setStyleProperty"] = setStyleProperty;
__exports["canvas2DCrashTips"] = canvas2DCrashTips;
__exports["canvasWebGLCrashTips"] = canvasWebGLCrashTips;
return __exports;
})();

// ==================== module: utils (third_party/youtube-ambilight/src/libs/utils.js) ====================
__modules["utils"] = (() => {
const __exports = {};
const getOS = () => {
  try {
    const list = [
      { match: 'window', name: 'Windows' },
      { match: 'mac', name: 'Mac' },
      { match: 'cros', name: 'Chrome+OS' },
      { match: 'ubuntu', name: 'Ubuntu+(Linux)' },
      { match: 'android', name: 'Android' },
      { match: 'ios', name: 'iOS' },
      { match: 'x11', name: 'Linux' },
    ];
    const ua = globalThis.navigator.userAgent;
    const os = list.find((os) => ua.toLowerCase().indexOf(os.match) >= 0);
    return os ? os.name : '';
  } catch {
    return null;
  }
};

const browsersUAList = [
  { ua: 'Firefox', name: 'Firefox' },
  { ua: 'OPR', name: 'Opera' },
  { ua: 'Edg', name: 'Edge' },
  { ua: 'Chrome', name: 'Chrome' },
];

const getBrowser = () => {
  try {
    const ua = globalThis.navigator.userAgent;
    const browser = browsersUAList.find(
      (browser) => ua.indexOf(browser.ua) >= 0
    );
    return browser ? browser.name : '';
  } catch {
    return null;
  }
};

const getBrowserVersion = () => {
  try {
    const browserName = getBrowser();
    const browserUA = browsersUAList.find(
      (browser) => browserName === browser.name
    ).ua;
    const ua = globalThis.navigator.userAgent;
    const matches = ua.match(`${browserUA}/([0-9.]+)`);
    return matches.length === 2 ? matches[1] : ua;
  } catch {
    return null;
  }
};

const getVersion = () => {
  try {
    return (chrome.runtime.getManifest() || {}).version;
  } catch {
    return null;
  }
};

const getFeedbackFormLink = (version) => {
  version = version || getVersion() || '';
  const os = getOS() || '';
  const browser = getBrowser() || '';
  const browserVersion = getBrowserVersion();
  return `https://docs.google.com/forms/d/e/1FAIpQLSe5lenJCbDFgJKwYuK_7U_s5wN3D78CEP5LYf2lghWwoE9IyA/viewform?usp=pp_url&entry.1590539866=${version}&entry.1676661118=${os}&entry.964326861=${browser}&entry.908541589=${browserVersion}`;
};

const privacyPolicyLinks = {
  Firefox:
    'https://addons.mozilla.org/firefox/addon/youtube-ambientlight/privacy/',
};
const getPrivacyPolicyLink = () => {
  const browser = getBrowser();
  return (
    privacyPolicyLinks[browser] ||
    'https://github.com/WesselKroos/youtube-ambilight#privacy--security'
  );
};
__exports["getBrowser"] = getBrowser;
__exports["getVersion"] = getVersion;
__exports["getFeedbackFormLink"] = getFeedbackFormLink;
__exports["getPrivacyPolicyLink"] = getPrivacyPolicyLink;
return __exports;
})();

// ==================== module: errors/ambient-light-error (third_party/youtube-ambilight/src/libs/errors/ambient-light-error.js) ====================
__modules["errors/ambient-light-error"] = (() => {
const __exports = {};
class AmbientlightError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}
__exports["AmbientlightError"] = AmbientlightError;
return __exports;
})();

// ==================== module: messaging/utils (third_party/youtube-ambilight/src/libs/messaging/utils.js) ====================
__modules["messaging/utils"] = (() => {
const __exports = {};
const origin = 'https://www.youtube.com';
const extensionId = 'youtube-ambient-light-extension';

const isSameWindowMessage = (event) =>
  event.source === window && event.origin === origin;
__exports["origin"] = origin;
__exports["extensionId"] = extensionId;
__exports["isSameWindowMessage"] = isSameWindowMessage;
return __exports;
})();

// ==================== module: worker (third_party/youtube-ambilight/src/libs/worker.js) ====================
__modules["worker"] = (() => {
const __exports = {};
const workerFromCode = async (func) => {
  try {
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas class is undefined');
    } else if (!OffscreenCanvas.prototype.transferToImageBitmap) {
      throw new Error('OffscreenCanvas.transferToImageBitmap is undefined');
    }

    let created = () => undefined;
    let timeout;
    try {
      const promise = new Promise((resolve, reject) => {
        created = (error) => {
          if (error) return reject(error);
          resolve();
        };
      });

      const worker = new Worker(
        URL.createObjectURL(
          new Blob(['(', func.toString(), ')()'], { type: 'text/javascript' })
        )
      );
      worker.onerror = (e) =>
        created(
          new Error(
            e?.message ??
              'Worker creation failed probably because it violates the worker-src or script-src Content Security Policy'
          )
        );
      worker.onmessage = (e) => {
        if (e.data === false) {
          created();
        }
      };
      worker.postMessage(false);
      timeout = setTimeout(
        () => created(new Error('Worker creation timed-out after 5 seconds')),
        5000
      );
      await promise;

      worker.onerror = undefined;
      worker.onmessage = undefined;
      return worker;
    } finally {
      clearTimeout(timeout);
      created = undefined;
    }
  } catch (error) {
    console.warn(
      `Failed to create a native worker. Creating a fallback worker on the main thread instead (${error.message})`
    );

    class FallbackWorker {
      isFallbackWorker = true;
      constructor(func) {
        const globalScope = (this.globalScope = {
          postMessage: (data) => {
            if (this.onmessage)
              this.onmessage({
                data,
              });
          },
          onmessage: () => console.error('onmessage not implemented'),
          isFallbackWorker: true,
        });
        func.bind(globalScope)();
      }

      onerror = (error) => {
        console.error(error);
      };

      postMessage = (data) => {
        try {
          this.globalScope.onmessage({
            data,
          });
        } catch (error) {
          this.onerror(error);
        }
      };
    }

    return new FallbackWorker(func);
  }
};
__exports["workerFromCode"] = workerFromCode;
return __exports;
})();

// ==================== module: errors/sentry-reporter (src/content/youtube/ambilight/vendor-modules/sentry-reporter.stub.js) ====================
__modules["errors/sentry-reporter"] = (() => {
const __exports = {};
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
const crashOptions = {
  video: false,
  technical: true,
  crash: true,
};

const parseSettingsToSentry = () => {};

const setVersion = () => {};

const setCrashOptions = () => {};

class SentryReporter {
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
__exports["default"] = SentryReporter;
__exports["crashOptions"] = crashOptions;
__exports["parseSettingsToSentry"] = parseSettingsToSentry;
__exports["setVersion"] = setVersion;
__exports["setCrashOptions"] = setCrashOptions;
return __exports;
})();

// ==================== module: storage (src/content/youtube/ambilight/vendor-modules/storage.shim.js) ====================
__modules["storage"] = (() => {
const __exports = {};
const { appendErrorStack, wrapErrorHandler } = __require('generic');
/**
 * FocusTube local replacement for youtube-ambilight's `storage` module.
 *
 * The upstream module persists opaque engine keys (webGLCrash,
 * majorPerformanceCaveatDetected, last-failed-theme-toggle, …) directly into
 * chrome.storage.local. FocusTube reads the whole storage area into its
 * settings object (chrome.storage.local.get(null)), so un-namespaced keys
 * would leak into the FocusTube settings/export surface. This shim keeps the
 * upstream storage API byte-compatible while prefixing every key with
 * `ytal:` so the two data sets never mix.
 */


const KEY_PREFIX = 'ytal:';

class Storage {
  async set(
    nameOrNamesAndValues,
    value = undefined,
    throwOnUninstalled = false
  ) {
    try {
      const multiple = typeof nameOrNamesAndValues !== 'string';
      const namesAndValues = multiple
        ? nameOrNamesAndValues
        : { [nameOrNamesAndValues]: value };

      const prefixed = {};
      for (const [name, val] of Object.entries(namesAndValues)) {
        prefixed[KEY_PREFIX + name] = val;
      }

      const stack = new Error().stack;
      try {
        if (!chrome?.runtime?.id) throw new Error('uninstalled');
        await chrome.storage.local.set(prefixed);
      } catch (ex) {
        if (!chrome?.runtime?.id) ex = new Error('uninstalled');
        appendErrorStack(stack, ex);
        if (
          ex &&
          (throwOnUninstalled ||
            !(
              ex.message === 'uninstalled' ||
              ex.message?.includes('QuotaExceededError')
            ))
        )
          throw ex;
      }
    } catch (ex) {
      if (
        ex &&
        (throwOnUninstalled ||
          !(
            ex.message === 'uninstalled' ||
            ex.message?.includes('QuotaExceededError')
          ))
      )
        throw ex;
    }
  }

  async get(nameOrNames, throwOnUninstalled = false) {
    try {
      const multiple = typeof nameOrNames !== 'string';
      const names = multiple ? nameOrNames : [nameOrNames];
      const prefixedNames = names.map((name) => KEY_PREFIX + name);
      const stack = new Error().stack;
      try {
        if (!chrome?.runtime?.id) throw new Error('uninstalled');

        const result = await chrome.storage.local.get(prefixedNames);
        if (multiple) {
          const unprefixed = {};
          for (const name of names) {
            const value = result[KEY_PREFIX + name];
            unprefixed[name] = value === undefined ? null : value;
          }
          return unprefixed;
        }
        const single = result[KEY_PREFIX + nameOrNames];
        return single === undefined ? null : single;
      } catch (ex) {
        if (!chrome?.runtime?.id) ex = new Error('uninstalled');
        appendErrorStack(stack, ex);
        if (
          ex &&
          (throwOnUninstalled ||
            !(
              ex.message === 'uninstalled' ||
              ex.message?.includes('QuotaExceededError')
            ))
        )
          throw ex;
      }
    } catch (ex) {
      if (
        ex &&
        (throwOnUninstalled ||
          !(
            ex.message === 'uninstalled' ||
            ex.message?.includes('QuotaExceededError')
          ))
      )
        throw ex;
    }
  }

  onChangedListeners = [];

  addListener(handler) {
    try {
      const wrappedHandler = wrapErrorHandler((changes) => {
        // Un-prefix the change keys so upstream listeners see their own names.
        const unprefixed = {};
        for (const [key, change] of Object.entries(changes || {})) {
          if (key.startsWith(KEY_PREFIX)) {
            unprefixed[key.slice(KEY_PREFIX.length)] = change;
          }
        }
        if (Object.keys(unprefixed).length) handler(unprefixed);
      }, true);
      chrome.storage.local.onChanged.addListener(wrappedHandler);
      this.onChangedListeners.push({ handler, wrappedHandler });
    } catch (ex) {
      console.warn(
        "Failed to listen to storage changes. If any setting changes you'll have to manually refresh the page to update them."
      );
      console.debug(ex);
    }
  }

  removeListener(handler) {
    try {
      const entry = this.onChangedListeners.find(
        (entry) => entry.handler === handler
      );
      if (!entry)
        throw new Error(
          'Cannot remove a storage.local.onChange listener that has never been added'
        );

      chrome.storage.local.onChanged.removeListener(entry.wrappedHandler);

      this.onChangedListeners.splice(
        this.onChangedListeners.indexOf(entry),
        1
      );
    } catch {
      console.warn(
        "Failed to listen to storage changes. If any setting changes you'll have to manually refresh the page to update them."
      );
    }
  }
}

const storage = new Storage();

const defaultCrashOptions = {
  video: false,
  technical: true,
  crash: true,
};
__exports["storage"] = storage;
__exports["defaultCrashOptions"] = defaultCrashOptions;
return __exports;
})();

// ==================== module: settings-config (third_party/youtube-ambilight/src/libs/settings-config.js) ====================
__modules["settings-config"] = (() => {
const __exports = {};
const { supportsColorMix, supportsWebGL } = __require('generic');
const { getBrowser } = __require('utils');



const SettingsConfig = [
  {
    type: 'section',
    label: 'Settings',
    name: 'sectionSettingsCollapsed',
    default: true,
  },
  {
    name: 'advancedSettings',
    label: 'Advanced',
    type: 'checkbox',
    default: false,
  },
  {
    type: 'section',
    label: 'Stats',
    name: 'sectionStatsCollapsed',
    default: true,
    advanced: true,
  },
  {
    name: 'showFPS',
    label: 'Framerates',
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    name: 'showFrametimes',
    label: 'Frametimes graph',
    description: 'Uses: CPU power',
    questionMark: {
      title:
        'The measured display framerate is not a reflection of the real performance.\nBecause the measurement uses an extra percentage of CPU usage.\nHowever, this statistic could be helpful to debug other issues.',
    },
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    name: 'showResolutions',
    label: 'Resolutions & drawtimes',
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    name: 'showBarDetectionStats',
    label: 'Bar detection',
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    type: 'section',
    label: 'Quality',
    name: 'sectionQualityPerformanceCollapsed',
    default: true,
  },
  {
    name: 'webGL',
    label: 'WebGL renderer (uses less power)',
    description: 'Changing this reloads the webpage',
    type: 'checkbox',
    default: true,
  },
  {
    name: 'resolution',
    label: 'Resolution',
    type: 'list',
    default: 100,
    unit: '%',
    valuePoints: (() => {
      const points = [6.25];
      while (points[points.length - 1] < 400) {
        points.push(points[points.length - 1] * 2);
      }
      return points;
    })(),
    manualinput: false,
  },
  {
    name: 'framerateLimit',
    label: 'Limit framerate (per second)',
    type: 'list',
    default: 60,
    min: 0,
    max: 60,
    step: 1,
  },
  {
    name: 'frameSync',
    label: 'Synchronization',
    questionMark: {
      title:
        'How much energy will be spent on sychronising ambient light frames with video frames.\n\nDecoded framerate: Lowest CPU & GPU usage.\nMight result in dropped and delayed frames.\n\nDisplay framerate: Highest CPU & GPU usage.\nMight still result in delayed frames on high refreshrate monitors (120hz and higher) and higher than 1080p videos.\n\nVideo framerate: Lowest CPU & GPU usage.\nUses the newest browser technology to always keep the frames in sync.',
    },
    type: 'list',
    default: 2,
    min: 0,
    max: 2,
    step: 1,
    snapPoints: [
      { value: 0, label: 'Decoded' },
      { value: 1, label: 'Display' },
      { value: 2, label: 'Video' },
    ],
    manualinput: false,
    advanced: true,
    experimental: true,
  },
  {
    name: 'energySaver',
    label: 'Save energy on static videos',
    questionMark: {
      title:
        'Limits the framerate on videos with an (almost) static image\n\nStill image: 1 frame per 5 seconds\nSmall movements: 1 frame per second',
    },
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    name: 'prioritizePageLoadSpeed',
    label: 'Prioritize page load speed',
    description: 'Loads the ambient light after the page has loaded',
    type: 'checkbox',
    default: true,
  },
  {
    name: 'layoutPerformanceImprovements',
    label: 'YouTube responsiveness fixes',
    description: 'Improves the responsiveness of the webpage',
    questionMark: {
      title: `Some of the improvements on the /watch page include:
- Faster webpage resizing and scrolling (Most noticeable after you've loaded in more than 100 comments)
- Faster loadingtimes for comments and/or related videos
- Smoother timeline scrubbing (Most noticeable after you've loaded in more than 100 comments or with a livestream chat window open)
- Smoother livestream chat scrolling (and new messages will be appended quicker to the chat)
- Smoother playlist scrolling (Most noticeable in a playlist with more than 25 videos)
- Smoother dragging/re-ordering videos in a playlist (Most noticeable in a playlist with more than 25 videos)`,
    },
    type: 'checkbox',
    default: true,
    advanced: true,
  },
  {
    name: 'debandingBlendMode',
    label: 'Optimize debanding for',
    questionMark: {
      title:
        "The normal blend mode is usefull to fix banding in dark colors on LCD's.\nBut on OLED's it's better to use the \"overlay\" blend mode to retain pure blacks.",
    },
    type: 'list',
    default: 0,
    min: 0,
    max: 1,
    step: 1,
    snapPoints: [
      { value: 0, label: 'LCD (normal)' },
      { value: 1, label: 'OLED (overlay)' },
    ],
    manualinput: false,
    advanced: true,
    new: true,
  },
  {
    type: 'section',
    label: 'Page header',
    name: 'sectionOtherPageHeaderCollapsed',
    default: true,
  },
  {
    name: 'headerShadowSize',
    label: 'Shadows size',
    type: 'list',
    default: 0,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'headerShadowOpacity',
    label: 'Shadows opacity',
    type: 'list',
    default: 30,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'headerImagesOpacity',
    label: 'Images opacity',
    type: 'list',
    default: 100,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'headerFillOpacity',
    label: 'Background opacity',
    description: 'Only applies when scrolled down',
    type: 'list',
    default: 100,
    min: -100,
    max: 100,
    step: 0.1,
    advanced: true,
  },

  {
    type: 'section',
    label: 'Page content',
    name: 'sectionOtherPageContentCollapsed',
    default: true,
  },
  {
    name: 'surroundingContentShadowSize',
    label: 'Shadows size',
    type: 'list',
    default: 15,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'surroundingContentShadowOpacity',
    label: 'Shadows opacity',
    type: 'list',
    default: 30,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'surroundingContentTextAndBtnOnly',
    label: 'Shadows on texts and buttons only',
    description: 'Decreases scrolling & video stutter',
    type: 'checkbox',
    advanced: true,
    default: true,
  },
  {
    name: 'surroundingContentImagesOpacity',
    label: 'Images opacity',
    type: 'list',
    default: 100,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'surroundingContentFillOpacity',
    label: 'Buttons & boxes background opacity',
    type: 'list',
    default: 10,
    min: -100,
    max: 100,
    step: 0.1,
  },
  {
    name: 'pageBackgroundGreyness',
    label: 'Background greyness',
    type: 'list',
    default: 0,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'immersiveTheaterView',
    label: 'Hide everything in theater mode',
    type: 'checkbox',
    default: false,
  },
  {
    name: 'relatedScrollbar',
    label: 'Related videos as scrollable list',
    description: 'Also improves scrolling through comments',
    type: 'checkbox',
    advanced: true,
    default: false,
  },
  {
    name: 'hideScrollbar',
    label: 'Hide scrollbar',
    type: 'checkbox',
    advanced: true,
    default: false,
  },
  {
    type: 'section',
    label: 'Video',
    name: 'sectionVideoResizingCollapsed',
    default: true,
  },
  {
    name: 'videoScale.SMALL',
    label: 'Size (in small view)',
    type: 'list',
    default: 100,
    min: 25,
    max: 200,
    step: 0.1,
    new: true,
  },
  {
    name: 'videoScale.THEATER',
    label: 'Size (in theater view)',
    type: 'list',
    default: 100,
    min: 25,
    max: 200,
    step: 0.1,
    new: true,
  },
  {
    name: 'videoScale.FULLSCREEN',
    label: 'Size (in fullscreen)',
    type: 'list',
    default: 100,
    min: 25,
    max: 200,
    step: 0.1,
    new: true,
  },
  {
    name: 'videoShadowSize',
    label: 'Shadow size',
    type: 'list',
    default: 0,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'videoShadowOpacity',
    label: 'Shadow opacity',
    type: 'list',
    default: 50,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'videoDebandingStrength',
    label: 'Debanding (noise)',
    questionMark: {
      title:
        'Click for more information about debanding (noise /dithering).\nTip: Change the "Quality > Optimize debanding for" setting to "OLED" to retain pure blacks on OLED displays.',
      href: 'https://www.lifewire.com/what-is-dithering-4686105',
    },
    type: 'list',
    default: 0,
    min: 0,
    max: 100,
    step: 1,
    advanced: true,
  },
  {
    name: 'videoOverlayEnabled',
    label: 'Sync video with ambient light',
    questionMark: {
      title:
        'Delays the video frames according to the ambient light frametimes.\nThis makes sure that that the ambient light is never out of sync with the video,\nbut it can introduce stuttering and/or dropped frames.',
    },
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    name: 'videoOverlaySyncThreshold',
    label: 'Sync video disable threshold',
    description: 'Disable when dropping % of frames',
    type: 'list',
    default: 5,
    min: 1,
    max: 100,
    step: 1,
    advanced: true,
  },
  {
    name: 'chromiumBugVideoJitterWorkaround',
    label: 'Video jitter workaround',
    description: 'Uses: CPU & GPU power',
    questionMark: {
      title:
        'Chromium has a bug that jitters the video playback when your display \nhas a higher framerate than 60Hz. This workaround prevents the jittering \nby forcing the browser to run at the framerate of your display instead. \nClick the questionmark for more information about this bug in Chromium browsers.',
      href: 'https://github.com/WesselKroos/youtube-ambilight/issues/166',
    },
    type: 'checkbox',
    default: false, // Should not be enabled by default because it also adds CPU & GPU overhead on 60Hz displays. (60Hz+ detection keeps toggling between off/on when VRR is enabled in the OS.)
    advanced: true,
  },
  {
    name: 'chromiumDirectVideoOverlayWorkaround',
    label: 'Video artifacts workaround',
    description:
      'This workaround must be disabled for \nNVidia RTX Virtual Super Resolution (VSR)',
    questionMark: {
      title: `This workaround can fix several artifacts/bugs,
when videos are in hardware accelerated overlays (MPO).
Examples are: random black/white squares, flickering or a squeezed video.

Click on the questionmark for more and updated information about these artifacts/bugs.`,
      href: 'https://github.com/WesselKroos/youtube-ambilight/blob/master/TROUBLESHOOT.md#3-nvidia-rtx-video-super-resolution-vsr--nvidia-rtx-video-hdr-does-not-work',
    },
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    type: 'section',
    label: 'Remove black & colored bars',
    name: 'sectionHorizontalBarsCollapsed',
    default: true,
  },
  {
    name: 'detectHorizontalBarSizeEnabled',
    label: 'Remove black bars',
    description: 'Uses: CPU power',
    type: 'checkbox',
    default: false,
    defaultKey: 'B',
  },
  {
    name: 'detectVerticalBarSizeEnabled',
    label: 'Remove black sidebars',
    description: 'Uses: CPU power',
    type: 'checkbox',
    default: false,
    defaultKey: 'V',
  },
  {
    name: 'detectColoredHorizontalBarSizeEnabled',
    label: 'Detection: Remove colored bars',
    type: 'checkbox',
    default: false,
  },
  {
    name: 'detectHorizontalBarSizeOffsetPercentage',
    label: 'Detection: Offset',
    type: 'list',
    default: 0,
    min: -5,
    max: 5,
    step: 0.1,
    advanced: true,
  },
  {
    name: 'barSizeDetectionAverageHistorySize',
    label: 'Detection: Frames average',
    questionMark: {
      title:
        'The amount of video frames to detect an average bar size from. \nA lower amount of frames results in a faster detection, \nbut does also increase the amount of inaccurate detections.',
    },
    type: 'list',
    default: 4,
    min: 1,
    max: 30,
    step: 1,
    advanced: true,
  },
  {
    name: 'barSizeDetectionAllowedElementsPercentage',
    label: 'Detection: Certainty threshold',
    questionMark: {
      title:
        'At 10% only clear bars are removed.\nA higher percentage can also remove bars with some elements.\nAnd an even higher percentage can crop to a squared element in the center.',
    },
    type: 'list',
    default: 20,
    min: 10,
    max: 90,
    step: 10,
    // advanced: true,
  },
  {
    name: 'barSizeDetectionAllowedUnevenBarsPercentage',
    label: 'Detection: Uneven threshold',
    questionMark: {
      title:
        'Higher percentages detect a more uneven bar.\nFor example: A bar is uneven when the top bar is smaller than the bottem bar.\nBut with a high percentage you also increase the risk that straight objects or lines are seen as bars.',
    },
    type: 'list',
    default: 10,
    min: 1,
    max: 50,
    step: 1,
    advanced: true,
    new: true,
  },
  {
    name: 'horizontalBarsClipPercentage',
    label: 'Bar size',
    type: 'list',
    default: 0,
    min: 0,
    max: 40,
    step: 0.1,
    snapPoints: [
      { value: 8.7, label: 8 },
      { value: 12.3, label: 12, flip: true },
      { value: 13.5, label: 13 },
    ],
    advanced: true,
  },
  {
    name: 'verticalBarsClipPercentage',
    label: 'Sidebars size',
    type: 'list',
    default: 0,
    min: 0,
    max: 40,
    step: 0.1,
    advanced: true,
  },
  {
    name: 'horizontalBarsClipPercentageReset',
    label: 'Reset bars next video',
    type: 'checkbox',
    default: true,
    advanced: true,
  },
  {
    name: 'detectVideoFillScaleEnabled',
    label: 'Fill video to removed bars',
    type: 'checkbox',
    default: false,
    defaultKey: 'H',
  },
  {
    type: 'section',
    label: 'Filters',
    name: 'sectionImageAdjustmentCollapsed',
    default: true,
  },
  {
    name: 'brightness',
    label: 'Brightness',
    type: 'list',
    default: 100,
    min: 0,
    max: 200,
    step: 1,
  },
  {
    name: 'contrast',
    label: 'Contrast',
    type: 'list',
    default: 100,
    min: 0,
    max: 200,
    step: 1,
    advanced: true,
  },
  {
    name: 'vibrance',
    label: 'Colors',
    type: 'list',
    default: 100,
    min: 0,
    max: 200,
    step: 0.1,
  },
  {
    name: 'saturation',
    label: 'Saturation',
    type: 'list',
    default: 100,
    min: 0,
    max: 200,
    step: 1,
  },
  {
    type: 'section',
    label: 'HDR Filters',
    name: 'sectionHdrImageAdjustmentCollapsed',
    default: false,
    hdr: true,
  },
  {
    name: 'hdrBrightness',
    label: 'Brightness',
    type: 'list',
    default: 100,
    min: 0,
    max: 200,
    step: 1,
    hdr: true,
  },
  {
    name: 'hdrContrast',
    label: 'Contrast',
    type: 'list',
    default: 100,
    min: 0,
    max: 200,
    step: 1,
    hdr: true,
  },
  {
    name: 'hdrSaturation',
    label: 'Saturation',
    type: 'list',
    default: 100,
    min: 0,
    max: 200,
    step: 1,
    hdr: true,
  },
  {
    type: 'section',
    label: 'Directions',
    name: 'sectionDirectionsCollapsed',
    default: true,
    advanced: true,
  },
  {
    name: 'directionTopEnabled',
    label: 'Top',
    type: 'checkbox',
    default: true,
    advanced: true,
  },
  {
    name: 'directionRightEnabled',
    label: 'Right',
    type: 'checkbox',
    default: true,
    advanced: true,
  },
  {
    name: 'directionBottomEnabled',
    label: 'Bottom',
    type: 'checkbox',
    default: true,
    advanced: true,
  },
  {
    name: 'directionLeftEnabled',
    label: 'Left',
    type: 'checkbox',
    default: true,
    advanced: true,
  },
  {
    type: 'section',
    label: 'Ambient light',
    name: 'sectionAmbientlightCollapsed',
    default: false,
  },
  {
    name: 'blur2',
    label: 'Blur',
    description: 'Uses: GPU memory',
    type: 'list',
    default: 30,
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    name: 'edge',
    label: 'Edge size',
    description: 'To better see what changes: Turn the blur to 0%',
    type: 'list',
    default: 12,
    min: 2,
    max: 50,
    step: 0.1,
    advanced: true,
  },
  {
    name: 'spread',
    label: 'Spread',
    description: 'Uses: GPU power',
    type: 'list',
    default: 17,
    min: 0,
    max: 400,
    step: 0.1,
  },
  {
    name: 'spreadFadeStart',
    label: 'Spread fade start',
    type: 'list',
    default: 15,
    min: -50,
    max: 100,
    step: 0.1,
    advanced: true,
  },
  {
    name: 'spreadFadeCurve',
    label: 'Spread fade curve',
    description: 'To better see what changes: Turn the blur to 0%',
    type: 'list',
    default: 35,
    min: 1,
    max: 100,
    step: 1,
    advanced: true,
  },
  {
    name: 'debandingStrength',
    label: 'Debanding (noise)',
    questionMark: {
      title:
        'Click for more information about (noise /dithering).\nTip: Change the "Quality > Optimize debanding for" setting to "OLED" to retain pure blacks on OLED displays.',
      href: 'https://www.lifewire.com/what-is-dithering-4686105',
    },
    type: 'list',
    default: 0,
    min: 0,
    max: 100,
    step: 1,
    advanced: true,
  },
  {
    name: 'frameFading',
    label: 'Fade in duration',
    description: 'Uses: GPU memory',
    questionMark: {
      title: 'Fading between changes in the ambient light',
    },
    type: 'list',
    default: 0,
    min: 0,
    max: 21.2, // 15 seconds
    step: 0.02,
    manualinput: false,
  },
  {
    name: 'flickerReduction',
    label: 'Flicker reduction',
    questionMark: {
      title:
        'Reduces flickering by limiting the speed at which brightness changes in the ambient light',
    },
    type: 'list',
    default: 0,
    min: 0,
    max: 100,
    step: 1,
    manualinput: false,
    advanced: true,
  },
  {
    name: 'frameBlending',
    label: 'Smooth motion (frame blending)',
    questionMark: {
      title: 'Click for more information about Frame blending',
      href: 'https://www.youtube.com/watch?v=m_wfO4fvH8M&t=81s',
    },
    description: 'Uses: GPU power. Also works with "Sync video"',
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    name: 'frameBlendingSmoothness',
    label: 'Smooth motion strength',
    type: 'list',
    default: 80,
    min: 0,
    max: 100,
    step: 1,
    advanced: true,
  },
  {
    name: 'fixedPosition',
    label: 'Fixed position',
    description: 'Ignores the scroll position of the page',
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    type: 'section',
    label: 'View modes',
    name: 'sectionViewsCollapsed',
    default: false,
  },
  {
    name: 'enableInViews',
    label: 'Enable in layouts',
    type: 'list',
    manualinput: false,
    default: 0,
    min: 0,
    max: 5,
    step: 1,
    snapPoints: [
      { value: 0, label: 'All' },
      { value: 1, label: 'Small' },
      { value: 2, hiddenLabel: 'Small & Theater' },
      { value: 3, label: 'Theater' },
      { value: 4, hiddenLabel: 'Theater & Fullscreen' },
      { value: 5, label: 'Fullscreen' },
    ],
  },
  {
    name: 'enableInPictureInPicture',
    label: 'Picture in picture',
    type: 'checkbox',
    default: false,
    advanced: true,
  },
  {
    name: 'enableInEmbed',
    label: 'Embedded videos',
    type: 'checkbox',
    default: true,
    advanced: true,
  },
  {
    name: 'enableInVRVideos',
    label: 'VR/360 videos',
    type: 'checkbox',
    default: true,
    advanced: true,
  },
  {
    type: 'section',
    label: 'General',
    name: 'sectionGeneralCollapsed',
    default: false,
  },
  {
    name: 'theme',
    label: 'Appearance (theme)',
    type: 'list',
    manualinput: false,
    default: 1,
    min: -1,
    max: 1,
    step: 1,
    snapPoints: [
      { value: -1, label: 'Light' },
      { value: 0, label: 'Default' },
      { value: 1, label: 'Dark' },
    ],
  },
  {
    name: 'enabled',
    label: 'Enabled',
    type: 'checkbox',
    default: true,
    defaultKey: 'G',
  },
];

const WebGLOnlySettings = [
  'resolution',
  'vibrance',
  'frameFading',
  'flickerReduction',
  'fixedPosition',
  'chromiumBugVideoJitterWorkaround',
];

let prepared = false;
const prepareSettingsConfigOnce = () => {
  if (prepared) return;

  const settingsToRemove = [];
  for (const setting of SettingsConfig) {
    if (supportsWebGL()) {
      if (setting.name === 'resolution' && getBrowser() === 'Firefox') {
        setting.default = 50;
      }
    } else {
      if (WebGLOnlySettings.includes(setting.name)) {
        settingsToRemove.push(setting.name);
      }
      if (['webGL'].includes(setting.name)) {
        setting.default = false;
        setting.disabled = 'You have disabled WebGL in your browser.';
      }
    }

    if (setting.name === 'frameSync') {
      if (!HTMLVideoElement.prototype.requestVideoFrameCallback) {
        setting.max = 1;
        setting.default = 0;
      } else if (getBrowser() === 'Firefox') {
        // FireFox workaround: requestVideoFrameCallback is limited to 24fps. Use decoded video frames by default instead
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1935256
        setting.default = 0;
      }
    }
  }

  if (getBrowser() === 'Firefox') {
    settingsToRemove.push('enableInVRVideos');
  }

  if (!supportsColorMix()) {
    settingsToRemove.push('pageBackgroundGreyness');
  }

  for (const settingName of settingsToRemove) {
    const settingIndex = SettingsConfig.findIndex(
      (setting) => setting.name === settingName
    );
    SettingsConfig.splice(settingIndex, 1);
  }

  prepared = true;
};
__exports["default"] = SettingsConfig;
__exports["WebGLOnlySettings"] = WebGLOnlySettings;
__exports["prepareSettingsConfigOnce"] = prepareSettingsConfigOnce;
return __exports;
})();

// ==================== module: errors/dom (third_party/youtube-ambilight/src/libs/errors/dom.js) ====================
__modules["errors/dom"] = (() => {
const __exports = {};
const getNodeSelector = (elem) => {
  if (!elem.tagName) return elem.nodeName; // Document

  const idSelector = elem.id ? `#${elem.id}` : '';
  const classSelector = elem.classList?.length
    ? `.${Array.from(elem.classList).sort().join('.')}`
    : '';
  return `${elem.tagName.toLowerCase()}${idSelector}${classSelector}`;
};

const getNodeTree = (elem) => {
  if (!elem) return [];

  const tree = [];
  tree.push(elem);
  while (elem.parentNode && elem.parentNode.tagName) {
    tree.unshift(elem.parentNode);
    elem = elem.parentNode;
  }
  return tree;
};

const getNodeTreeString = (elem) =>
  getNodeTree(elem)
    .map((node, i) => `${' '.repeat(i)}${getNodeSelector(node)}`)
    .join('\n');

const createNodeEntry = (node, level) => ({
  level,
  node,
  children: [],
});

// const findEntry = (node, entry) => {
//   if(entry.node === node) return entry
//   for (entry of entry.children) {
//     const foundEntry = findEntry(node, entry)
//     if(foundEntry) return foundEntry
//   }
// }

const nodeEntryToString = (entry) => {
  let lines = [`${' '.repeat(entry.level)}${getNodeSelector(entry.node)}`];
  for (const childEntry of entry.children) {
    lines.push(nodeEntryToString(childEntry));
  }
  return lines.join('\n');
};

const getSelectorTreeString = (selector) => {
  const trees = Array.from(document.querySelectorAll(selector)).map((elem) =>
    getNodeTree(elem)
  );

  const documentTrees = [];
  for (const nodeTree of trees) {
    let documentTree;
    let previousEntry;
    for (const node of nodeTree) {
      if (!previousEntry) {
        documentTree = documentTrees.find((dt) => dt.node === node);
        if (!documentTree) {
          documentTree = createNodeEntry(node, 0);
          documentTrees.push(documentTree);
        }
        previousEntry = documentTree;
        continue;
      }

      const existingEntry = previousEntry.children.find(
        (entry) => entry.node === node
      );
      if (existingEntry) {
        previousEntry = existingEntry;
        continue;
      }

      const entry = createNodeEntry(node, previousEntry.level + 1);
      previousEntry.children.push(entry);
      previousEntry = entry;
    }
  }

  return documentTrees
    .map((documentTree) =>
      documentTree
        ? nodeEntryToString(documentTree)
        : `No nodes found for selector: '${selector}'`
    )
    .join('\n');
};

const getOtherUnknownAppElems = () =>
  Array.from(document.body?.children ?? []).filter(
    (elem) =>
      elem.tagName.endsWith('-APP') &&
      ![
        'YTD-APP',
        'YTVP-APP',
        'YTCP-APP',
        'YTLR-APP',
        'DAILY-COMPANION-APP',
      ].includes(elem.tagName)
  );

const getPageElems = () => {
  const allSelector =
    'html, body, ytd-app, #content.ytd-app, ytd-watch-flexy, ytd-watch-fixie, ytd-watch-grid, #player-container, ytd-player, #container.ytd-player, .html5-video-player, .html5-video-container, video, .video-stream, .html5-main-video';
  const otherAppElems = getOtherUnknownAppElems();

  return {
    counts: allSelector.split(',').reduce((counts, selector) => {
      selector = selector.trim();
      counts[selector] = document.querySelectorAll(selector).length;
      return counts;
    }, {}),
    otherApps: otherAppElems.map((elem) => elem.tagName),
    otherAppsTree:
      otherAppElems.length > 0
        ? getSelectorTreeString(
            otherAppElems.map((elem) => elem.tagName).join(',')
          )
        : undefined,
    ΩTree: getSelectorTreeString(allSelector),
  };
};
__exports["getNodeTreeString"] = getNodeTreeString;
__exports["getSelectorTreeString"] = getSelectorTreeString;
__exports["getOtherUnknownAppElems"] = getOtherUnknownAppElems;
__exports["getPageElems"] = getPageElems;
return __exports;
})();

// ==================== module: messaging/injected (third_party/youtube-ambilight/src/libs/messaging/injected.js) ====================
__modules["messaging/injected"] = (() => {
const __exports = {};
const { wrapErrorHandler } = __require('generic');
const { extensionId, isSameWindowMessage } = __require('messaging/utils');



class InjectedScript {
  globalListener;
  listeners = [];

  addMessageListener = (type, handler) => {
    // console.log('injected addMessageListener', type)
    if (!this.globalListener) {
      // console.log('injected addMessageListenerGlobal')
      this.globalListener = wrapErrorHandler(
        function injectedScriptMessageListenerGlobal(event) {
          if (!event.detail || typeof event.detail !== 'string') return;
          const detail = JSON.parse(event.detail);
          // console.log('received in contentScript', event.detail?.type, event.detail?.injectedScript, event, '|', event.detail?.contentScript);
          if (
            !isSameWindowMessage ||
            detail?.injectedScript !== extensionId ||
            !detail?.type
          )
            return;

          for (const listener of this.listeners) {
            listener(detail);
          }
        }.bind(this),
        true
      );
      document.addEventListener('ytal-message', this.globalListener);
    }

    const listener = wrapErrorHandler(
      function injectedScriptMessageListener(detail) {
        // console.log('injected message?', type, event.detail?.type)
        if (detail.type !== type) return;

        // console.log('injected message!', type)
        handler(detail?.message);
      }.bind(this),
      true
    );

    this.listeners.push(listener);
    return listener;
  };

  removeMessageListener = (listener) => {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      // console.log('injected removeMessageListener', index, listener)
      this.listeners.splice(index, 1);
    }

    if (this.globalListener && this.listeners.length === 0) {
      // console.log('injected removeMessageListenerGlobal', this.globalListener)
      document.removeEventListener('ytal-message', this.globalListener);
      this.globalListener = undefined;
    }
  };

  postMessage(type, message) {
    const event = new CustomEvent('ytal-message', {
      // bubbles: true,
      detail: JSON.stringify({
        type,
        message,
        contentScript: extensionId,
      }),
    });
    // console.log('dispatched from contentScript', type, extensionId);
    return document.dispatchEvent(event);
  }

  receiveMessage = (type, timeout = 3000) =>
    new Promise(function receiveMessagePromise(resolve, reject) {
      try {
        const receivedMessage = function reveicedMessage(message) {
          clearTimeout(timeoutId);
          injectedScript.removeMessageListener(changedListener);
          resolve(message);
        }.bind(this);

        const receiveMessageTimeout = function receiveMessageTimeout() {
          console.warn(
            `Never received a response message for "${type}" after ${timeout}ms`
          );
          receivedMessage();
        }.bind(this);

        const timeoutId = setTimeout(receiveMessageTimeout, timeout); // Fallback in case messaging fails
        const changedListener = injectedScript.addMessageListener(
          type,
          receivedMessage
        );
      } catch (ex) {
        reject(ex);
      }
    });

  postAndReceiveMessage = async (type, message, timeout) => {
    const receiveMessagePromise = this.receiveMessage(type, timeout);
    this.postMessage(type, message);
    return await receiveMessagePromise;
  };
}
const injectedScript = new InjectedScript();
__exports["injectedScript"] = injectedScript;
return __exports;
})();

// ==================== module: messaging/content (third_party/youtube-ambilight/src/libs/messaging/content.js) ====================
__modules["messaging/content"] = (() => {
const __exports = {};
const { wrapErrorHandler } = __require('generic');
const { extensionId, isSameWindowMessage } = __require('messaging/utils');



class ContentScript {
  globalListener;
  listeners = [];

  addMessageListener = (type, handler) => {
    // console.log('content addMessageListener', type)
    if (!this.globalListener) {
      // console.log('content addMessageListenerGlobal')
      this.globalListener = wrapErrorHandler(
        function contentScriptMessageListenerGlobal(event) {
          if (!event.detail || typeof event.detail !== 'string') return;
          const detail = JSON.parse(event.detail);
          // console.log('received in injectedScript', event.detail?.type, event.detail?.contentScript, event, '|', event.detail?.injectedScript);
          if (
            !isSameWindowMessage ||
            detail?.contentScript !== extensionId ||
            !detail?.type
          )
            return;

          for (const listener of this.listeners) {
            listener(detail);
          }
        }.bind(this),
        true
      );
      document.addEventListener('ytal-message', this.globalListener);
    }

    const listener = wrapErrorHandler(
      function contentScriptMessageListener(detail) {
        // console.log('content message?', type, event.detail?.type)
        if (detail.type !== type) return;

        // console.log('content message!', type)
        handler(detail?.message);
      }.bind(this),
      true
    );

    this.listeners.push(listener);
    return listener;
  };

  removeMessageListener = (listener) => {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      // console.log('content removeMessageListener', index, listener)
      this.listeners.splice(index, 1);
    }

    if (this.globalListener && this.listeners.length === 0) {
      // console.log('content removeMessageListenerGlobal', this.globalListener)
      document.removeEventListener('ytal-message', this.globalListener, true);
      this.globalListener = undefined;
    }
  };

  postMessage = (type, message) => {
    const event = new CustomEvent('ytal-message', {
      detail: JSON.stringify({
        type,
        message,
        injectedScript: extensionId,
      }),
    });
    // console.log('dispatched from injectedScript', type, extensionId);
    return document.dispatchEvent(event);
  };
}
const contentScript = new ContentScript();
__exports["contentScript"] = contentScript;
return __exports;
})();

// ==================== module: errors/events (third_party/youtube-ambilight/src/libs/errors/events.js) ====================
__modules["errors/events"] = (() => {
const __exports = {};
const { on } = __require('generic');
const { default: SentryReporter, crashOptions } = __require('errors/sentry-reporter');
const { AmbientlightError } = __require('errors/ambient-light-error');




class ErrorEvents {
  list = [];

  constructor() {
    on(
      window,
      'beforeunload',
      () => {
        if (!this.list.length) return;

        this.add('tab beforeunload');
        this.send();
      },
      false
    );

    on(
      window,
      'pagehide',
      () => {
        if (!this.list.length) return;

        this.add('tab pagehide');
      },
      false
    );

    on(
      document,
      'visibilitychange',
      () => {
        if (document.visibilityState !== 'hidden') return;
        if (!this.list.length) return;

        this.add('tab visibilitychange hidden');
        this.send();
      },
      false
    );
  }

  send = (message, force) => {
    const lastEvent = this.list[this.list.length - 1];
    const lastTime = lastEvent.time;
    const firstTime = this.list[0].firstTime || this.list[0].time;
    if (!force && lastTime - firstTime < 5) {
      return; // Give the site 5 seconds to load the watch page or move the video element
    }

    const firstEvent = this.list.splice(0, 1);
    const details = {
      firstEvent,
      events: this.list.reverse(),
    };
    this.list = [];

    SentryReporter.captureException(
      new AmbientlightError(
        message ?? 'Closed or hid the page with pending errors',
        details
      )
    );
  };

  add = (type, details = {}) => {
    if (!crashOptions?.technical) {
      details = undefined;
    }
    const time = Math.round(performance.now()) / 1000;

    if (this.list.length) {
      const last = this.list.slice(-1)[0];
      const {
        count: lastCount,
        time: lastTime,
        firstTime,
        type: lastType,
        ...lastDetails
      } = last;

      if (
        lastType === type &&
        JSON.stringify(lastDetails) === JSON.stringify(details)
      ) {
        last.count = lastCount ? lastCount + 1 : 2;
        last.time = time;
        last.firstTime = firstTime || lastTime;
        return;
      }
    }

    let event = {
      type,
      time,
      ...details,
    };
    event.time = time;
    this.list.push(event);
  };
}
__exports["ErrorEvents"] = ErrorEvents;
return __exports;
})();

// ==================== module: static-image-detection (third_party/youtube-ambilight/src/libs/static-image-detection.js) ====================
__modules["static-image-detection"] = (() => {
const __exports = {};
const { appendErrorStack } = __require('generic');
const { workerFromCode } = __require('worker');



const workerCode = function () {
  // This is a copy of the SafeOffscreenCanvas in generic.js because this is inside a worker
  class SafeOffscreenCanvas {
    constructor(width, height, pixelated) {
      if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        if (pixelated) {
          canvas.style.imageRendering = 'pixelated';
        }
        return canvas;
      }
    }
  }

  let canvas;
  let ctx;
  const getStoryboardPageImageDatas = async (storyboard, page) => {
    const url = storyboard.baseUrl.replace('$M', page);
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    if (!canvas) {
      canvas = new SafeOffscreenCanvas(bitmap.width, bitmap.height);
      ctx = canvas.getContext('2d', {
        willReadFrequently: true,
      });
    } else if (
      canvas.width !== bitmap.width ||
      canvas.height !== bitmap.height
    ) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    ctx.drawImage(bitmap, 0, 0);

    // const width = bitmap.width / storyboard.x
    // const height = bitmap.height / storyboard.y
    const imageDatas = [];
    for (let yi = 0; yi < storyboard.y; yi++) {
      for (let xi = 0; xi < storyboard.x; xi++) {
        const i = storyboard.x * storyboard.y * page + storyboard.x * yi + xi;
        if (i >= storyboard.images) break;

        imageDatas.push(
          ctx.getImageData(
            xi * storyboard.width,
            yi * storyboard.height,
            storyboard.width,
            storyboard.height
          )
        );
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return imageDatas;
  };

  // // On a scale from 0 till 1
  // const getImageDataDifference = (image1, image2) => {
  //   const diffIgnore = 8 // Exponential weighing?
  //   let diffSum = 0;
  //   for(let i = 0; i < image1.data.length; i++) {
  //     if(i % 4 === 3) continue; // skip alpha channel

  //     const diff = Math.abs(image1.data[i] - image2.data[i])
  //     diffSum += Math.max(0, (diff - diffIgnore));
  //   }
  //   return diffSum / (image1.data.length * .75) / (255 - diffIgnore);
  // };

  // // On a scale from 0 till 1, max grouped per pixel
  // const getImageDataDifference = (image1, image2) => {
  //   const diffIgnore = 8 // Exponential weighing?
  //   let diffSum = 0;
  //   for(let i = 0; i < image1.data.length; i += 4) {
  //     const diff = Math.max(
  //       Math.abs(image1.data[i] - image2.data[i]),
  //       Math.abs(image1.data[i+1] - image2.data[i+1]),
  //       Math.abs(image1.data[i+2] - image2.data[i+2])
  //     )
  //     diffSum += Math.max(0, (diff - diffIgnore));
  //   }
  //   return diffSum / (image1.data.length * .25) / (255 - diffIgnore);
  // };

  // // On a scale from 0 till 1, luminance
  // // gamma = 2.2
  // const sRGBtoLin = (colorChannel) => (colorChannel <= 0.04045)
  //   ? colorChannel / 12.92
  //   : Math.pow(((colorChannel + 0.055) / 1.055), 2.4);
  // const rgbToLuminance = (r, g, b) => (0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b));
  // const getImageDataDifference = (image1, image2) => {
  //   let diffSum = 0;
  //   for(let i = 0; i < image1.data.length; i += 4) {
  //     const diff = Math.abs(
  //       rgbToLuminance(image1.data[i] / 255, image1.data[i+1] / 255, image1.data[i+2] / 255)
  //       - rgbToLuminance(image2.data[i] / 255, image2.data[i+1] / 255, image2.data[i+2] / 255)
  //     );
  //     diffSum += diff;
  //   }
  //   return diffSum / (image1.data.length * .25);
  // };
  // // On a scale from 0 till 1, max grouped per pixel
  // // gamma = 2.2
  // const getImageDataDifference = (image1, image2) => {
  //   const diffIgnore = (20 / 255) // Exponential weighing?
  //   let diffSum = 0;
  //   for(let i = 0; i < image1.data.length; i += 4) {
  //     const diff = Math.max(
  //       Math.abs(sRGBtoLin(image1.data[i]   / 255) - sRGBtoLin(image2.data[i]   / 255)),
  //       Math.abs(sRGBtoLin(image1.data[i+1] / 255) - sRGBtoLin(image2.data[i+1] / 255)),
  //       Math.abs(sRGBtoLin(image1.data[i+2] / 255) - sRGBtoLin(image2.data[i+2] / 255))
  //     )
  //     diffSum += Math.max(0, (diff - diffIgnore));
  //   }
  //   return diffSum / (image1.data.length * .25) / (1 - diffIgnore);
  // };
  const getImageDataDifference = (image1, image2) => {
    const diffs = [];
    for (let i = 0; i < image1.data.length; i += 4) {
      // let diff = Math.max(
      //   Math.abs(sRGBtoLin(image1.data[i]   / 255) - sRGBtoLin(image2.data[i]   / 255)),
      //   Math.abs(sRGBtoLin(image1.data[i+1] / 255) - sRGBtoLin(image2.data[i+1] / 255)),
      //   Math.abs(sRGBtoLin(image1.data[i+2] / 255) - sRGBtoLin(image2.data[i+2] / 255))
      // )
      // let diff = (
      //   0.2126 * Math.abs(sRGBtoLin(image1.data[i]   / 255) - sRGBtoLin(image2.data[i]   / 255)) +
      //   0.7152 * Math.abs(sRGBtoLin(image1.data[i+1] / 255) - sRGBtoLin(image2.data[i+1] / 255)) +
      //   0.0722 * Math.abs(sRGBtoLin(image1.data[i+2] / 255) - sRGBtoLin(image2.data[i+2] / 255))
      // )
      diffs.push(
        0.2126 *
          Math.max(
            0,
            Math.abs(image1.data[i] / 255 - image2.data[i] / 255) - 0.03
          ) +
          0.7152 *
            Math.max(
              0,
              Math.abs(image1.data[i + 1] / 255 - image2.data[i + 1] / 255) -
                0.03
            ) +
          0.0722 *
            Math.max(
              0,
              Math.abs(image1.data[i + 2] / 255 - image2.data[i + 2] / 255) -
                0.03
            )
      );
      // diffs.push(
      //   0.2126 * Math.max(0, Math.abs(sRGBtoLin(image1.data[i]   / 255) - sRGBtoLin(image2.data[i]   / 255)) - .03) +
      //   0.7152 * Math.max(0, Math.abs(sRGBtoLin(image1.data[i+1] / 255) - sRGBtoLin(image2.data[i+1] / 255)) - .03) +
      //   0.0722 * Math.max(0, Math.abs(sRGBtoLin(image1.data[i+2] / 255) - sRGBtoLin(image2.data[i+2] / 255)) - .03)
      // );
    }

    // diffs = diffs
    //   .sort((a, b) => a - b)
    //   .slice(Math.floor(diffs.length / 8), Math.floor((diffs.length / 8) * 7))
    //   .reduce((i, sum) => sum + i, 0)

    let diffSum = 0;
    for (let diff of diffs) {
      diffSum += diff;
    }
    const diff = diffSum / diffs.length;
    return diff;
  };

  const getStoryboardPageDifferences = (imageDatas) => {
    const diffs = [];
    for (let i = 1; i < imageDatas.length; i++) {
      diffs.push(getImageDataDifference(imageDatas[i - 1], imageDatas[i]));
    }
    return diffs;
  };

  const getAverageVideoFramesDifference = async (storyboard) => {
    let pages = (storyboard.images - 1) / (storyboard.x * storyboard.y);
    // Only pick the last page if >= 67% is filled with images
    if (pages > 3) {
      if (pages % Math.floor(pages) >= 0.67) pages -= 1;
      pages = Math.floor(pages);
    } else {
      pages = Math.ceil(pages);
    }

    const secondPage = pages > 3 ? Math.min(1, pages) : 0;
    const middlePage = Math.floor((pages - 1) / 2);
    const secondlastPage = pages > 4 ? pages - 2 : pages - 1;

    const secondPageImageDatasPromise = getStoryboardPageImageDatas(
      storyboard,
      secondPage
    );
    const middlePageImageDatasPromise =
      middlePage > secondPage && middlePage < secondlastPage
        ? getStoryboardPageImageDatas(storyboard, middlePage)
        : [];
    const secondlastPageImageDatasPromise =
      secondlastPage >= middlePage
        ? getStoryboardPageImageDatas(storyboard, secondlastPage)
        : [];

    const secondPageImageDatas = await secondPageImageDatasPromise;
    const middlePageImageDatas = await middlePageImageDatasPromise;
    const secondlastPageImageDatas = await secondlastPageImageDatasPromise;

    const imageDatas = [
      ...secondPageImageDatas,
      ...middlePageImageDatas,
      ...secondlastPageImageDatas,
    ];
    const differences = getStoryboardPageDifferences(imageDatas);

    const averageDifference =
      differences.reduce((diffs, diff) => diffs + diff, 0) / differences.length;
    return averageDifference;
  };

  this.onmessage = async (e) => {
    if (e.data === false) {
      // Signal that the worker was successfully created
      this.postMessage(false);
      return;
    }

    const id = e.data.id;
    const baseUrl = e.data.storyboard.baseUrl;
    try {
      const difference = await getAverageVideoFramesDifference(
        e.data.storyboard
      );
      this.postMessage({
        id,
        baseUrl,
        difference,
      });
    } catch (ex) {
      this.postMessage({
        id,
        baseUrl,
        error: ex,
      });
    }
  };
};

const getStoryboard = (format) => {
  // eslint-disable-next-line no-unused-vars
  const [baseUrl, _1, _2, sb] = format.split('|').map((i) => i?.split('#'));
  if (!baseUrl?.length || !(sb?.length > 7)) return;

  const decodedBaseUrl = `${baseUrl[0]
    .replace('$L', '2')
    .replace('$N', sb[6])}&sigh=${decodeURIComponent(sb[7])}`;
  const width = Math.round(parseInt(sb[0], 10) / 10) * 10; // Round because it's sometimes for example 159 or 161 instead of 160
  const height = Math.round(parseInt(sb[1], 10) / 10) * 10;
  return {
    baseUrl: decodedBaseUrl,
    width,
    height,
    images: parseInt(sb[2], 10),
    x: parseInt(sb[3], 10),
    y: parseInt(sb[4], 10),
  };
};

let worker;
let workerMessageId = 0;
let lastDifference = {
  baseUrl: undefined,
  value: 1,
};
let onMessagePromise;
let nextGetIsWaiting = false;

const getAverageVideoFramesDifference = async (format) => {
  if (onMessagePromise) {
    nextGetIsWaiting = true;
    while (onMessagePromise) {
      await onMessagePromise;
    }
    nextGetIsWaiting = false;
  }

  const storyboard = await getStoryboard(format);
  if (!storyboard) return; // Failed to retrieve the storyboard data

  const alreadyCalculated = lastDifference.baseUrl === storyboard.baseUrl;
  if (alreadyCalculated) return lastDifference.value;

  if (!worker) {
    worker = await workerFromCode(workerCode);
  }

  workerMessageId++;
  const id = workerMessageId;

  const stack = new Error().stack;
  onMessagePromise = new Promise(
    function onMessagePromise(resolve, reject) {
      worker.onerror = (err) => {
        if (!(err instanceof Error)) {
          const details = err;
          err = new Error(
            `static-image-detection-worker.js: ${
              err.message ?? 'Unknown error'
            }`
          );
          err.details = details;
        }
        reject(err);
      };
      worker.onmessage = function onMessage(e) {
        try {
          if (e.data.id !== workerMessageId) return;

          if (e.data.error) {
            // Readable name for the worker script
            if (e.data.error.stack?.replace) {
              e.data.error.stack = e.data.error.stack?.replace(
                /blob:.+?:\/.+?:/g,
                'extension://scripts/static-image-detection-worker.js:'
              );
            }
            appendErrorStack(stack, e.data.error);
            throw e.data.error;
          }

          lastDifference = {
            baseUrl: e.data.baseUrl,
            value: e.data.difference,
          };
          resolve(e.data.difference);
        } catch (ex) {
          reject(ex);
        }
      }.bind(this);
    }.bind(this)
  );
  worker.postMessage({
    id,
    storyboard,
  });
  const difference = await onMessagePromise;
  onMessagePromise = undefined;
  return nextGetIsWaiting ? undefined : difference;
};

const cancelGetAverageVideoFramesDifference = () => {
  workerMessageId++;
};
__exports["getAverageVideoFramesDifference"] = getAverageVideoFramesDifference;
__exports["cancelGetAverageVideoFramesDifference"] = cancelGetAverageVideoFramesDifference;
return __exports;
})();

// ==================== module: projector-shadow (third_party/youtube-ambilight/src/libs/projector-shadow.js) ====================
__modules["projector-shadow"] = (() => {
const __exports = {};
const { Canvas, ctxOptions, SafeOffscreenCanvas } = __require('generic');

const WIDTH = 512;
const HEIGHT = 512;

class ProjectorShadow {
  constructor(offscreen = true) {
    this.elem = offscreen
      ? new SafeOffscreenCanvas(512, 512, true)
      : new Canvas(512, 512);
    this.ctx = this.elem.getContext('2d', { ...ctxOptions, alpha: true });
  }

  rescale(scale, projectorSize, settings) {
    if (this.elem.style) {
      this.elem.style.transform = `scale(${scale.x + 0.01}, ${scale.y + 0.01})`;
    }

    const {
      spreadFadeCurve,
      spreadFadeStart,
      directionTopEnabled,
      directionRightEnabled,
      directionBottomEnabled,
      directionLeftEnabled,
    } = settings;

    const cacheKey = JSON.stringify({
      scale,
      projectorSize,
      spreadFadeCurve,
      spreadFadeStart,
      directionTopEnabled,
      directionRightEnabled,
      directionBottomEnabled,
      directionLeftEnabled,
    });

    // When cleared because the page was hidden
    if (this.elem.width !== WIDTH || this.elem.height !== HEIGHT) {
      this.elem.width = WIDTH;
      this.elem.height = HEIGHT;
    } else if (this.cacheKey !== cacheKey) {
      this.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    } else {
      return;
    }

    const edge = {
      w: (projectorSize.w * scale.x - projectorSize.w) / 2 / scale.x,
      h: (projectorSize.h * scale.y - projectorSize.h) / 2 / scale.y,
    };
    const video = {
      w: projectorSize.w / scale.x,
      h: projectorSize.h / scale.y,
    };

    const darkest = 1;
    const easing = 16 / (spreadFadeCurve * 0.64);
    const keyframes = this.plotKeyframes(256, easing, darkest);

    let fadeOutFrom = spreadFadeStart / 100;
    const fadeOutMinH = -(video.h / 2 / edge.h);
    const fadeOutMinW = -(video.w / 2 / edge.w);
    fadeOutFrom = Math.max(fadeOutFrom, fadeOutMinH, fadeOutMinW);

    try {
      this.drawGradient(
        video.h,
        edge.h,
        keyframes,
        fadeOutFrom,
        darkest,
        false
      );
      this.drawGradient(video.w, edge.w, keyframes, fadeOutFrom, darkest, true);
    } catch (ex) {
      ex.details = {
        ...ex.details,
        scale: { ...scale },
        projectorSize: { ...projectorSize },
        easing,
      };
      throw ex;
    }

    // Directions
    const scaleW = WIDTH / (video.w + edge.w + edge.w);
    const scaleH = HEIGHT / (video.h + edge.h + edge.h);
    this.ctx.fillStyle = '#000000';

    if (!directionTopEnabled) {
      this.ctx.beginPath();

      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(scaleW * edge.w, scaleH * edge.h);
      this.ctx.lineTo(
        scaleW * (edge.w + video.w / 2),
        scaleH * (edge.h + video.h / 2)
      );
      this.ctx.lineTo(scaleW * (edge.w + video.w), scaleH * edge.h);
      this.ctx.lineTo(scaleW * (edge.w + video.w + edge.w), 0);

      this.ctx.fill();
    }

    if (!directionRightEnabled) {
      this.ctx.beginPath();

      this.ctx.lineTo(scaleW * (edge.w + video.w + edge.w), 0);
      this.ctx.lineTo(scaleW * (edge.w + video.w), scaleH * edge.h);
      this.ctx.lineTo(
        scaleW * (edge.w + video.w / 2),
        scaleH * (edge.h + video.h / 2)
      );
      this.ctx.lineTo(scaleW * (edge.w + video.w), scaleH * (edge.h + video.h));
      this.ctx.lineTo(
        scaleW * (edge.w + video.w + edge.w),
        scaleH * (edge.h + video.h + edge.h)
      );

      this.ctx.fill();
    }

    if (!directionBottomEnabled) {
      this.ctx.beginPath();

      this.ctx.moveTo(0, scaleH * (edge.h + video.h + edge.h));
      this.ctx.lineTo(scaleW * edge.w, scaleH * (edge.h + video.h));
      this.ctx.lineTo(
        scaleW * (edge.w + video.w / 2),
        scaleH * (edge.h + video.h / 2)
      );
      this.ctx.lineTo(scaleW * (edge.w + video.w), scaleH * (edge.h + video.h));
      this.ctx.lineTo(
        scaleW * (edge.w + video.w + edge.w),
        scaleH * (edge.h + video.h + edge.h)
      );

      this.ctx.fill();
    }

    if (!directionLeftEnabled) {
      this.ctx.beginPath();

      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(scaleW * edge.w, scaleH * edge.h);
      this.ctx.lineTo(
        scaleW * (edge.w + video.w / 2),
        scaleH * (edge.h + video.h / 2)
      );
      this.ctx.lineTo(scaleW * edge.w, scaleH * (edge.h + video.h));
      this.ctx.lineTo(0, scaleH * (edge.h + video.h + edge.h));

      this.ctx.fill();
    }

    this.cacheKey = cacheKey;
  }

  plotKeyframes = (length, powerOf, darkest) => {
    const keyframes = [];
    for (let i = 1; i < length; i++) {
      keyframes.push({
        p: i / length,
        o: Math.pow(i / length, powerOf) * darkest,
      });
    }
    return keyframes.map(({ p, o }) => ({
      p: Math.round(p * 10000) / 10000,
      o: Math.round(o * 10000) / 10000,
    }));
  };

  //Shadow gradient
  drawGradient = (...args) => {
    const [size, edge, keyframes, fadeOutFrom, darkest, horizontal] = args;

    const points = [
      0,
      ...keyframes.map((e) =>
        Math.max(0, edge - edge * e.p - edge * fadeOutFrom * (1 - e.p))
      ),
      edge - edge * fadeOutFrom,
      edge + size + edge * fadeOutFrom,
      ...keyframes
        .reverse()
        .map((e) =>
          Math.min(
            edge + size + edge,
            edge + size + edge * e.p + edge * fadeOutFrom * (1 - e.p)
          )
        ),
      edge + size + edge,
    ];

    const pointMax = points[points.length - 1];

    let gradientStops = [];
    gradientStops.push([
      Math.min(1, points[0] / pointMax),
      `rgba(0,0,0,${darkest})`,
    ]);
    for (let i = 0; i < keyframes.length; i++) {
      const e = keyframes[i];
      gradientStops.push([
        Math.min(1, points[0 + keyframes.length - i] / pointMax),
        `rgba(0,0,0,${e.o})`,
        i,
        e,
      ]);
    }
    gradientStops.push([
      Math.min(1, points[1 + keyframes.length] / pointMax),
      `rgba(0,0,0,0)`,
    ]);
    gradientStops.push([
      Math.min(1, points[2 + keyframes.length] / pointMax),
      `rgba(0,0,0,0)`,
    ]);
    keyframes.reverse();
    for (let i = 0; i < keyframes.length; i++) {
      const e = keyframes[i];
      gradientStops.push([
        Math.min(1, points[2 + keyframes.length * 2 - i] / pointMax),
        `rgba(0,0,0,${e.o})`,
        i,
        e,
      ]);
    }
    gradientStops.push([
      Math.min(1, points[3 + keyframes.length * 2] / pointMax),
      `rgba(0,0,0,${darkest})`,
    ]);

    gradientStops = gradientStops.map((args) => [
      Math.round(args[0] * 10000) / 10000,
      args[1],
      args[2],
      args[3]?.p,
      args[3]?.o,
    ]);

    const gradient = this.ctx.createLinearGradient(
      0,
      0,
      horizontal ? WIDTH : 0,
      !horizontal ? HEIGHT : 0
    );

    for (let i = 0; i < gradientStops.length; i++) {
      const gs = gradientStops[i];
      try {
        gradient.addColorStop(...gs);
      } catch (ex) {
        ex.details = {
          i,
          gs,
          size,
          edge,
          fadeOutFrom,
          darkest,
          horizontal,
          Ωpoints: JSON.parse(JSON.stringify(points)),
          Ωkeyframes: JSON.parse(JSON.stringify(keyframes)),
          ΩgradientStops: JSON.parse(JSON.stringify(gradientStops)),
        };
        throw ex;
      }
    }

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  };
}
__exports["default"] = ProjectorShadow;
return __exports;
})();

// ==================== module: canvas-webgl (third_party/youtube-ambilight/src/libs/canvas-webgl.js) ====================
__modules["canvas-webgl"] = (() => {
const __exports = {};
const { AmbientlightError } = __require('errors/ambient-light-error');
const { canvasWebGLCrashTips, ctxOptions, requestIdleCallback, webGLErrorToString, wrapErrorHandler } = __require('generic');



// export class WebGLCanvas {
//   constructor(width, height) {
//     this.canvas = document.createElement('canvas');
//     this.canvas.width = width;
//     this.canvas.height = height;
//     this.canvas._getContext = this.canvas.getContext;
//     this.canvas.getContext = async (type, options) => {
//       if(type === '2d') {
//         this.canvas.ctx = this.ctx = this.ctx || await new WebGLContext(this.canvas, type, options);
//       } else {
//         this.canvas.ctx = this.ctx = this.canvas._getContext(type, options);
//       }
//       return this.ctx;
//     }
//     return this.canvas;
//   }
// }

class WebGLOffscreenCanvas {
  constructor(width, height, ambientlight, settings) {
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(width, height);
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.canvas._getContext = this.canvas.getContext;
    this.canvas.getContext = async (type, options = {}) => {
      if (type === '2d') {
        this.canvas.ctx = this.ctx =
          this.canvas.ctx ||
          (await new WebGLContext(
            this.canvas,
            type,
            options,
            ambientlight,
            settings
          ));
      } else {
        this.canvas.ctx = this.ctx = this.canvas._getContext(type, options);
      }
      return this.ctx;
    };
    return this.canvas;
  }
}

class WebGLContext {
  lostCount = 0;

  constructor(canvas, type, options, ambientlight, settings) {
    return async function WebGLContextConstructor() {
      this.ambientlight = ambientlight;
      this.settings = settings;
      this.setWarning = settings.setWarning;
      this.canvas = canvas;
      this.canvas.addEventListener(
        'webglcontextlost',
        wrapErrorHandler(
          function webGLContextLost(event) {
            event.preventDefault();

            this.lost = true;
            this.lostCount++;
            this.viewport = undefined;
            this.scaleX = undefined;
            this.scaleY = undefined;
            this.program = undefined; // Prevent warning: Cannot delete program from old context. in initCtx

            console.log(`WebGLContext lost (${this.lostCount})`);
            this.setWebGLWarning('restore');
          }.bind(this)
        ),
        false
      );
      this.canvas.addEventListener(
        'webglcontextrestored',
        wrapErrorHandler(
          async function webGLContextRestored() {
            // console.log(`WebGLContext restored (${this.lostCount})`)
            if (this.lostCount >= 3) {
              console.error(
                'WebGLContext was lost 3 times. The current restoration has been aborted to prevent an infinite restore loop.'
              );
              this.setWebGLWarning('3 times restore');
              return;
            }

            await new Promise((resolve) => requestAnimationFrame(resolve));
            if (!(await this.initCtx())) return;

            if (this.ctx && !this.ctx.isContextLost()) {
              this.lost = false;
              if (
                !this.ambientlight.projector?.lost &&
                !this.ambientlight.projector?.blurLost
              )
                this.setWarning('');
            } else {
              console.error(`WebGLContext restore failed (${this.lostCount})`);
              this.setWebGLWarning('restore');
            }
          }.bind(this)
        ),
        false
      );
      this.canvas.addEventListener(
        'webglcontextcreationerror',
        wrapErrorHandler(
          function webGLContextCreationError(e) {
            // console.warn(`WebGLContext creationerror: ${e.statusMessage}`)
            this.webglcontextcreationerrors.push({
              message: e.statusMessage || '?',
              time: performance.now(),
              webGLVersion: this.webGLVersion,
            });
          }.bind(this)
        ),
        false
      );

      this.options = options;
      await this.initCtx();
      this.initializedTime = performance.now();

      return this;
    }.bind(this)();
  }

  setWebGLWarning(action = 'restore') {
    this.setWarning(
      `Failed to ${action} the WebGL renderer from a GPU crash.${canvasWebGLCrashTips}`
    );
  }

  webglcontextcreationerrors = [];
  // syncCompilation prevents black flickering while settings are changed
  async initCtx(syncCompilation = false) {
    if (this.program) {
      try {
        this.ctx.finish(); // Wait for any pending draw calls to finish
        this.ctx.deleteProgram(this.program); // Free GPU memory
      } catch (ex) {
        console.warn('Failed to delete previous WebGLContext program', ex);
      }
      this.program = undefined;
    }

    if (!this.ctx) {
      this.ctxOptions = {
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false, // Allows the browser to swap the visible- and drawbuffers, which is faster
        // alpha: false, // Decreases performance on some platforms
        depth: false,
        antialias: false,
        desynchronized: true,
        ...this.options,
      };
      this.webGLVersion = 2;
      this.ctx = await this.canvas.getContext('webgl2', this.ctxOptions);
      if (!this.ctx) {
        this.webGLVersion = 1;
        this.ctx = await this.canvas.getContext('webgl', this.ctxOptions);
        if (!this.ctx) {
          this.webGLVersion = undefined;
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for any additional webglcontextcreationerrors to be captured

          const errors = this.webglcontextcreationerrors;
          this.webglcontextcreationerrors = [];

          let lastErrorMessage = '';
          for (const error of errors) {
            const duplicate = error.message === lastErrorMessage;
            lastErrorMessage = error.message;
            if (duplicate) error.message = '"';
          }

          throw new AmbientlightError(
            `WebGLContext creation failed: ${lastErrorMessage}`,
            errors
          );
        }
      }
    }

    if (this.isContextLost()) return;

    if (
      'drawingBufferColorSpace' in this.ctx &&
      'unpackColorSpace' in this.ctx
    ) {
      this.ctx.drawingBufferColorSpace = ctxOptions.colorSpace;
      // // unpacking to another color space seems to be way to expensive on the GPU - dropped support for now
      // this.ctx.unpackColorSpace = ctxOptions.extendedColorSpace === 'rec2020' ? 'srgb' : ctxOptions.colorSpace // Compensate when a rec2020 display is used to compensate the lack of rec2020 support in canvas
    }

    let flickerReductionDifference;
    if (this.settings.flickerReduction) {
      flickerReductionDifference = (118 - this.settings.flickerReduction) / 118;
    }

    // Shaders
    const vertexShaderSrc = `
      precision lowp float;
      attribute vec2 vPosition;
      attribute vec2 vUV;
      varying vec2 fUV;
      
      void main(void) {
        fUV = vUV;
        gl_Position = vec4(vPosition, 0, 1);
      }
    `
      .replace(/\n {6}/g, '\n')
      .replace(/ +\n/g, '')
      .replace(/\n+/g, '\n')
      .trim();
    const fragmentShaderSrc = `
      precision lowp float;
      varying vec2 fUV;
      uniform sampler2D textureSampler[${
        this.settings.flickerReduction ? 2 : 1
      }];
      uniform float fMipmapLevel;
      ${this.settings.flickerReduction ? 'uniform float fPreviousCleared;' : ''}
      
      void main(void) {
        ${
          this.settings.flickerReduction
            ? `
        vec4 currentColor = texture2D(textureSampler[0], fUV${
          this.webGLVersion !== 1 ? ', fMipmapLevel' : ''
        });
        if(fPreviousCleared < .5) {
          vec4 previousColor = texture2D(textureSampler[1], fUV${
            this.webGLVersion !== 1 ? ', fMipmapLevel' : ''
          });
          
          float difference = abs(
            (currentColor.r * .213 + currentColor.g * .715 + currentColor.b * .072) - 
            (previousColor.r * .213 + previousColor.g * .715 + previousColor.b * .072)
          );
          float percentage = 1.;
          percentage = min(1., (1. - (difference * difference * difference)) * ${flickerReductionDifference.toFixed(
            3
          )});
          gl_FragColor = currentColor * percentage + previousColor * (1. - percentage);
          return;
        }
        `
            : ''
        }
        gl_FragColor = texture2D(textureSampler[0], fUV${
          this.webGLVersion !== 1 ? ', fMipmapLevel' : ''
        });
      }
    `
      .replace(/\n {6}/g, '\n')
      .replace(/ +\n/g, '')
      .replace(/\n+/g, '\n')
      .trim();
    const vertexShader = this.ctx.createShader(this.ctx.VERTEX_SHADER);
    const fragmentShader = this.ctx.createShader(this.ctx.FRAGMENT_SHADER);
    this.ctx.shaderSource(vertexShader, vertexShaderSrc);
    this.ctx.shaderSource(fragmentShader, fragmentShaderSrc);
    this.ctx.compileShader(vertexShader);
    this.ctx.compileShader(fragmentShader);

    // Program
    const program = this.ctx.createProgram();
    this.ctx.attachShader(program, vertexShader);
    this.ctx.attachShader(program, fragmentShader);
    this.ctx.linkProgram(program);

    const parallelShaderCompileExt = syncCompilation
      ? undefined
      : this.ctx.getExtension('KHR_parallel_shader_compile');
    if (parallelShaderCompileExt?.COMPLETION_STATUS_KHR) {
      // The first getProgramParameter COMPLETION_STATUS_KHR request returns always false on chromium and the return value seems to be cached between animation frames
      this.ctx.getProgramParameter(
        program,
        parallelShaderCompileExt.COMPLETION_STATUS_KHR
      );
      await new Promise((resolve) => requestAnimationFrame(resolve));

      try {
        let compiled = false;
        while (!compiled) {
          const completionStatus = this.ctx.getProgramParameter(
            program,
            parallelShaderCompileExt.COMPLETION_STATUS_KHR
          );
          // COMPLETION_STATUS_KHR can be null because of webgl-lint
          if (completionStatus === false) {
            await new Promise((resolve) =>
              requestIdleCallback(resolve, { timeout: 200 })
            );
            await new Promise((resolve) => requestAnimationFrame(resolve));
          } else {
            compiled = true;
          }
        }
        if (!compiled) return;
      } catch (ex) {
        ex.details = {};

        try {
          ex.details = {
            program: program?.toString(),
            webGLVersion: this.webGLVersion,
            ctxOptions: this.ctxOptions,
          };
        } catch (ex) {
          ex.details = {
            detailsException: ex,
          };
        }

        // // Did not give any insights that could help to fix bugs
        // try {
        //   const debugRendererInfo = this.ctx.getExtension('WEBGL_debug_renderer_info')
        //   ex.details.gpuVendor = debugRendererInfo?.UNMASKED_VENDOR_WEBGL
        //     ? this.ctx.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL)
        //     : 'unknown'
        //   ex.details.gpuRenderer = debugRendererInfo?.UNMASKED_RENDERER_WEBGL
        //     ? this.ctx.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL)
        //     : 'unknown'
        // } catch(ex) {
        //   ex.details.gpuError = ex
        // }

        throw ex;
      }
    }

    // Validate these parameters after program compilation to prevent render blocking validation
    const vertexShaderCompiled = this.ctx.getShaderParameter(
      vertexShader,
      this.ctx.COMPILE_STATUS
    );
    const fragmentShaderCompiled = this.ctx.getShaderParameter(
      fragmentShader,
      this.ctx.COMPILE_STATUS
    );
    const programLinked = this.ctx.getProgramParameter(
      program,
      this.ctx.LINK_STATUS
    );
    if (!vertexShaderCompiled || !fragmentShaderCompiled || !programLinked) {
      const programCompilationError = new Error('Program compilation failed');
      programCompilationError.name = 'WebGLError';
      programCompilationError.details = {
        webGLVersion: this.webGLVersion,
        ctxOptions: this.ctxOptions,
      };

      try {
        programCompilationError.details = {
          ...programCompilationError.details,
          vertexShaderCompiled,
          vertexShaderInfoLog: this.ctx.getShaderInfoLog(vertexShader),
          fragmentShaderCompiled,
          fragmentShaderInfoLog: this.ctx.getShaderInfoLog(fragmentShader),
          programLinked,
          programInfoLog: this.ctx.getProgramInfoLog(program),
        };
      } catch (ex) {
        programCompilationError.details.getCompiledAndLinkedInfoLogsError = ex;
      }

      try {
        this.ctx.validateProgram(program);
        programCompilationError.details.programValidated =
          this.ctx.getProgramParameter(program, this.ctx.VALIDATE_STATUS);
        programCompilationError.details.programValidationInfoLog =
          this.ctx.getProgramInfoLog(program);
      } catch (ex) {
        programCompilationError.details.validateProgramError = ex;
      }

      try {
        const ext = this.ctx.getExtension('WEBGL_debug_shaders');
        if (ext) {
          programCompilationError.details.Ωsources = {
            vertexShader: ext.getTranslatedShaderSource(vertexShader),
            fragmentShader: ext.getTranslatedShaderSource(fragmentShader),
          };
          if (!programCompilationError.details.Ωsources.vertexShader) {
            programCompilationError.details.Ωsources.vertexShaderCode =
              vertexShaderSrc;
          }
          if (!programCompilationError.details.Ωsources.fragmentShader) {
            programCompilationError.details.Ωsources.fragmentShaderCode =
              fragmentShaderSrc;
          }
        }
      } catch (ex) {
        programCompilationError.details.debugShadersError = ex;
      }

      try {
        const debugRendererInfo = this.ctx.getExtension(
          'WEBGL_debug_renderer_info'
        );
        programCompilationError.details.gpuVendor =
          debugRendererInfo?.UNMASKED_VENDOR_WEBGL
            ? this.ctx.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL)
            : 'unknown';
        programCompilationError.details.gpuRenderer =
          debugRendererInfo?.UNMASKED_RENDERER_WEBGL
            ? this.ctx.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL)
            : 'unknown';
      } catch (ex) {
        programCompilationError.details.gpuError = ex;
      }

      if (
        programCompilationError.details.vertexShaderInfoLog ||
        programCompilationError.details.fragmentShaderInfoLog ||
        programCompilationError.details.getCompiledAndLinkedInfoLogsError ||
        programCompilationError.details.programValidationInfoLog ||
        programCompilationError.details.validateProgramError ||
        programCompilationError.details.Ωsources?.vertexShader ||
        programCompilationError.details.Ωsources?.vertexShaderCode ||
        programCompilationError.details.Ωsources?.fragmentShader ||
        programCompilationError.details.Ωsources?.fragmentShaderCode ||
        programCompilationError.details.debugShadersError
      ) {
        programCompilationError.name = 'WebGLErrorWithInfoLog';
      }

      throw programCompilationError;
    }

    //// Probably can be removed because has already check if the program is linked and both shaders have been compiled. There is also no use that reported this error in the last 2 weeks
    // this.ctx.validateProgram(program)
    // const programValidated = this.ctx.getProgramParameter(program, this.ctx.VALIDATE_STATUS)
    // if(!programValidated) {
    //   const programValidationError = new Error('Program validation failed')
    //   programValidationError.details = {}

    //   try {
    //     programValidationError.details = {
    //       vertexShaderInfoLog: this.ctx.getShaderInfoLog(vertexShader),
    //       fragmentShaderInfoLog: this.ctx.getShaderInfoLog(fragmentShader),
    //       programInfoLog: this.ctx.getProgramInfoLog(program)
    //     }
    //   } catch(ex) {
    //     programValidationError.details.getCompiledAndLinkedInfoLogsError = ex
    //   }

    //   try {
    //     const ext = this.ctx.getExtension('WEBGL_debug_shaders');
    //     if(ext) {
    //       programValidationError.details.Ωsources = {
    //         vertexShader: ext.getTranslatedShaderSource(vertexShader),
    //         fragmentShader: ext.getTranslatedShaderSource(fragmentShader)
    //       }
    //     }
    //   } catch(ex) {
    //     programValidationError.details.debugShadersError = ex
    //   }

    //   throw programValidationError
    // }

    this.ctx.useProgram(program);
    this.program = program;

    this.fMipmapLevelLoc = this.ctx.getUniformLocation(
      this.program,
      'fMipmapLevel'
    );

    // Buffers
    const vUVBuffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, vUVBuffer);
    this.ctx.bufferData(
      this.ctx.ARRAY_BUFFER,
      new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]),
      this.ctx.STATIC_DRAW
    );
    const vUVLoc = this.ctx.getAttribLocation(this.program, 'vUV');
    this.ctx.vertexAttribPointer(
      vUVLoc,
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    this.ctx.enableVertexAttribArray(vUVLoc);

    const vPositionBuffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, vPositionBuffer);
    this.ctx.bufferData(
      this.ctx.ARRAY_BUFFER,
      new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]),
      this.ctx.STATIC_DRAW
    );
    const vPositionLoc = this.ctx.getAttribLocation(this.program, 'vPosition');
    this.ctx.vertexAttribPointer(
      vPositionLoc,
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    this.ctx.enableVertexAttribArray(vPositionLoc);

    this.textures = [];
    for (let i = 0; i < (this.settings.flickerReduction ? 2 : 1); i++) {
      const texture = this.ctx.createTexture();
      this.ctx.activeTexture(this.ctx[`TEXTURE${i}`]);
      this.ctx.bindTexture(this.ctx.TEXTURE_2D, texture);
      this.ctx.texParameteri(
        this.ctx.TEXTURE_2D,
        this.ctx.TEXTURE_MAG_FILTER,
        this.ctx.LINEAR
      );
      if (this.webGLVersion == 1) {
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          this.ctx.TEXTURE_MIN_FILTER,
          this.ctx.LINEAR
        );
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          this.ctx.TEXTURE_WRAP_S,
          this.ctx.CLAMP_TO_EDGE
        );
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          this.ctx.TEXTURE_WRAP_T,
          this.ctx.CLAMP_TO_EDGE
        );
      } else {
        this.ctx.hint(this.ctx.GENERATE_MIPMAP_HINT, this.ctx.NICEST);
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          this.ctx.TEXTURE_MAX_LEVEL,
          8
        );
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          this.ctx.TEXTURE_MIN_FILTER,
          this.ctx.LINEAR_MIPMAP_LINEAR
        );
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          this.ctx.TEXTURE_WRAP_S,
          this.ctx.MIRRORED_REPEAT
        );
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          this.ctx.TEXTURE_WRAP_T,
          this.ctx.MIRRORED_REPEAT
        );
      }
      const tfaExt =
        this.ctx.getExtension('EXT_texture_filter_anisotropic') ||
        this.ctx.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
        this.ctx.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
      if (tfaExt) {
        const max =
          this.ctx.getParameter(tfaExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          tfaExt.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(16, max)
        );
      }
      this.ctx.texImage2D(
        this.ctx.TEXTURE_2D,
        0,
        this.ctx.RGBA,
        1,
        1,
        0,
        this.ctx.RGBA,
        this.ctx.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255])
      );
      this.textures.push(texture);
    }
    this.ctx.activeTexture(this.ctx['TEXTURE0']);

    const textureSamplerLoc = this.ctx.getUniformLocation(
      this.program,
      'textureSampler'
    );
    this.ctx.uniform1iv(
      textureSamplerLoc,
      this.textures.map((_, i) => i)
    );

    if (this.settings.flickerReduction) {
      this.fPreviousClearedLoc = this.ctx.getUniformLocation(
        this.program,
        'fPreviousCleared'
      );
      this.ctx.uniform1f(this.fPreviousClearedLoc, 1);
      this.fPreviousCleared = 1;
    } else {
      this.fPreviousClearedLoc = undefined;
      this.fPreviousCleared = undefined;
    }

    return true;
  }

  clearRect = () => {
    if (this.ctxIsInvalid || this.lost) return;

    this.ctx.activeTexture(this.ctx['TEXTURE0']);
    this.ctx.texImage2D(
      this.ctx.TEXTURE_2D,
      0,
      this.ctx.RGBA,
      1,
      1,
      0,
      this.ctx.RGBA,
      this.ctx.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );

    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT); // Or set preserveDrawingBuffer to false te always draw from a clear canvas

    this.clearPreviousRect();
  };

  clearPreviousRect = () => {
    if (
      !this.settings.flickerReduction ||
      !this.fPreviousClearedLoc ||
      this.fPreviousCleared === 1
    )
      return;

    this.ctx.activeTexture(this.ctx['TEXTURE1']);
    this.ctx.texImage2D(
      this.ctx.TEXTURE_2D,
      0,
      this.ctx.RGBA,
      1,
      1,
      0,
      this.ctx.RGBA,
      this.ctx.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );
    this.ctx.activeTexture(this.ctx['TEXTURE0']);

    this.ctx.uniform1f(this.fPreviousClearedLoc, 1);
    this.fPreviousCleared = 1;
  };

  defaultScale = new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]);
  _cachedScale = new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]);
  _cachedScaleX = 1;
  _cachedScaleY = 1;
  getCachedScale(x, y) {
    if (this._cachedScaleX !== x || this._cachedScaleY !== y) {
      this._cachedScale = new Float32Array([-x, y, -x, -y, x, -y, x, y]);
      this._cachedScaleX = x;
      this._cachedScaleY = y;
    }
    return this._cachedScale;
  }

  drawImage = (
    src,
    srcX,
    srcY,
    srcWidth,
    srcHeight,
    destX,
    destY,
    destWidth,
    destHeight
  ) => {
    if (this.ctxIsInvalid || this.lost) return;

    const internalFormat = this.ctx.RGBA;
    const format = this.ctx.RGBA;
    const formatType = this.ctx.UNSIGNED_BYTE;

    if (destX === undefined) {
      destX = srcX;
      destY = srcY;
      destWidth = srcWidth;
      destHeight = srcHeight;
      srcX = 0;
      srcY = 0;
      srcWidth = undefined;
      srcHeight = undefined;
    }

    srcWidth = srcWidth || src.videoWidth || src.width;
    srcHeight = srcHeight || src.videoHeight || src.height;
    destWidth = destWidth || this.ctx.drawingBufferWidth;
    destHeight = destHeight || this.ctx.drawingBufferHeight;

    // Crop src
    const scaleX = 1 + (srcX / srcWidth) * 2;
    const scaleY = 1 + (srcY / srcHeight) * 2;
    if (scaleX !== this.scaleX || scaleY !== this.scaleY) {
      this.ctx.bufferData(
        this.ctx.ARRAY_BUFFER,
        this.getCachedScale(scaleX, scaleY),
        this.ctx.STATIC_DRAW
      );
      this.scaleX = scaleX;
      this.scaleY = scaleY;
    }

    const resolutionChanged =
      !this.viewport ||
      this.viewport.width !== destWidth ||
      this.viewport.height !== destHeight;

    if (resolutionChanged) {
      this.ctx.viewport(0, 0, destWidth, destHeight);
      this.viewport = { width: destWidth, height: destHeight };
    }

    const mipmapLevel = 1; // Math.max(0, (Math.log(srcHeight / destHeight) / Math.log(2)) - 2)
    if (mipmapLevel !== this.fMipmapLevel) {
      // console.log('video', mipmapLevel, `${srcHeight} -> ${destHeight}`)
      this.fMipmapLevel = mipmapLevel;
      this.ctx.uniform1f(this.fMipmapLevelLoc, mipmapLevel);
    }

    let start = this.settings.showResolutions ? performance.now() : undefined;
    // Chromium bug 1074473: Using texImage2D because texSubImage2D from a video element is 80x slower than texImage2D
    this.ctx.texImage2D(
      this.ctx.TEXTURE_2D,
      0,
      internalFormat,
      format,
      formatType,
      src
    );

    // Don't generate mipmaps in WebGL1 because video resolutions are not a power of 2
    if (this.webGLVersion !== 1) {
      this.ctx.generateMipmap(this.ctx.TEXTURE_2D);
    }
    if (this.settings.showResolutions)
      this.loadTime = performance.now() - start;

    if (this.settings.showResolutions) start = performance.now();
    this.ctx.drawArrays(this.ctx.TRIANGLE_FAN, 0, 4);

    if (
      this.settings.flickerReduction &&
      this.fPreviousClearedLoc &&
      this.fPreviousCleared === 1
    ) {
      this.fPreviousCleared = 0;
      this.ctx.uniform1f(this.fPreviousClearedLoc, 0);
    }

    if (this.settings.flickerReduction) {
      this.ctx.activeTexture(this.ctx['TEXTURE1']);
      this.ctx.texImage2D(
        this.ctx.TEXTURE_2D,
        0,
        internalFormat,
        format,
        formatType,
        this.canvas
      );
      if (this.webGLVersion !== 1) {
        this.ctx.generateMipmap(this.ctx.TEXTURE_2D);
      }
      this.ctx.activeTexture(this.ctx['TEXTURE0']);
    }

    if (resolutionChanged) {
      this.checkForDrawErrors();
    }

    if (this.settings.showResolutions)
      this.drawTime = performance.now() - start;
  };

  drawErrors = [];
  checkForDrawErrors = () => {
    // Only do this once for the first texture. Because getError takes 0.3 to 20ms
    const webGLError = this.ctx.getError();

    if (webGLError === this.ctx.NO_ERROR) {
      this.drawErrors.length = 0;
      this.setWarning('');
      return;
    }

    // Reset cpu-memory cached texture data
    this.viewport = undefined;

    const error = new AmbientlightError(
      `WebGL error: ${webGLErrorToString(webGLError)}`,
      {
        program: this.program?.toString(),
        webGLVersion: this.webGLVersion,
        ctxOptions: this.ctxOptions,
      }
    );
    error.name = 'WebGLDrawError';

    this.drawErrors.push(error);
    if (this.drawErrors.length < 3) {
      console.warn(error);
      this.ambientlight.setDrawWarning(error);
      return;
    }

    error.details.previousErrors = this.drawErrors.slice(0, -1);
    throw error;
  };

  getImageDataBuffers = [];
  getImageDataBuffersIndex = 0;
  getImageData = (
    x = 0,
    y = 0,
    width = this.ctx.drawingBufferWidth,
    height = this.ctx.drawingBufferHeight
  ) => {
    if (this.ctxIsInvalid || this.lost) return;

    // Enough for 10 ImageData objects for the blackbar detection
    if (this.getImageDataBuffersIndex > 9) {
      this.getImageDataBuffersIndex = 0;
    } else {
      this.getImageDataBuffersIndex++;
    }

    let buffer = this.getImageDataBuffers[this.getImageDataBuffersIndex];
    const bufferLength = width * height * 4;
    if (!buffer) {
      this.getImageDataBuffers[this.getImageDataBuffersIndex] = buffer = {
        data: new Uint8Array(bufferLength),
      };
    } else if (buffer.data.length !== bufferLength) {
      buffer.data = new Uint8Array(bufferLength);
    }

    buffer.width = width - x;
    buffer.height = height - y;
    this.ctx.readPixels(
      x,
      y,
      width,
      height,
      this.ctx.RGBA,
      this.ctx.UNSIGNED_BYTE,
      buffer.data
    );

    return buffer;
  };

  get ctxIsInvalid() {
    const invalid = this.isContextLost() || !this.program;
    if (invalid && !this.ctxIsInvalidWarned && !this.program) {
      this.ctxIsInvalidWarned = true;
      console.log('WebGLContext is lost');
    }
    return invalid;
  }

  isContextLost = () => {
    return !this.ctx || this.ctx.isContextLost();
  };
}
__exports["WebGLOffscreenCanvas"] = WebGLOffscreenCanvas;
__exports["WebGLContext"] = WebGLContext;
return __exports;
})();

// ==================== module: projector-2d (third_party/youtube-ambilight/src/libs/projector-2d.js) ====================
__modules["projector-2d"] = (() => {
const __exports = {};
const { Canvas, canvas2DCrashTips, ctxOptions, on, raf } = __require('generic');
const { default: ProjectorShadow } = __require('projector-shadow');



class Projector2d {
  type = 'Projector2d';
  width = 1;
  height = 1;
  lostCount = 0;

  constructor(ambientlight, containerElem, initProjectorListeners, settings) {
    this.ambientlight = ambientlight;
    this.containerElem = containerElem;
    this.initProjectorListeners = initProjectorListeners;
    this.settings = settings;

    this.shadow = new ProjectorShadow(false);
    this.shadow.elem.classList.add('ambientlight__shadow');
    this.containerElem.appendChild(this.shadow.elem);

    this.boundaryElem = this.shadow.elem;
  }

  remove() {
    this.containerElem.remove(this.projectorListElem);
  }

  onProjectorCtxLost = () => {
    console.warn('Lost 2d projector');
    this.lostCount++;
    // event.preventDefault(); // Prevents restoration

    // Invalidate shadow
    if (this.shadow?.elem) {
      this.shadow.elem.width = 1;
    }

    this.settings.setWarning(
      `Failed to restore the renderer from a GPU crash.${canvas2DCrashTips}`
    );
  };

  onProjectorCtxRestored = (event) => {
    if (this.lostCount >= 3 * this.projectors.length) {
      console.error('Projector2D context restore failed 3 times');

      this.settings.setWarning(
        `Failed to restore 3 times the renderer from a GPU crash.${canvas2DCrashTips}`
      );
      return;
    }

    console.warn('Restored 2d projector');
    const projectorElem = event.currentTarget;
    projectorElem.width = 1; // Reset size
    this.ambientlight.buffersCleared = true; // Trigger resize before redraw
    this.ambientlight.sizesChanged = true; // Trigger resize before redraw
    // The bardetection worker offscreencanvas does not trigger contextrestored events
    this.ambientlight.barDetection.clear();

    if (this.scheduledRedrawAfterRestoreId)
      cancelAnimationFrame(this.scheduledRedrawAfterRestoreId);

    this.scheduledRedrawAfterRestoreId = raf(async () => {
      this.scheduledRedrawAfterRestoreId = undefined;
      await this.ambientlight.optionalFrame();
      this.initProjectorListeners();
      this.settings.setWarning('');
    });
  };

  recreate(levels) {
    this.levels = levels;
    if (!this.projectors) {
      this.projectors = [];
    }

    this.projectors = this.projectors.filter(function removeExcessProjector(
      projector,
      i
    ) {
      if (i >= levels) {
        projector.elem.remove();
        return false;
      }
      return true;
    });

    for (let i = this.projectors.length; i < levels; i++) {
      const projectorElem = new Canvas(this.width, this.height);
      projectorElem.classList.add('ambientlight__projector');
      on(projectorElem, 'contextlost', this.onProjectorCtxLost);
      on(projectorElem, 'contextrestored', this.onProjectorCtxRestored);

      const projectorCtx = projectorElem.getContext('2d', ctxOptions);
      this.containerElem.prepend(projectorElem);

      this.projectors.push({
        elem: projectorElem,
        ctx: projectorCtx,
      });
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    for (const projector of this.projectors) {
      if (projector.elem.width !== width) projector.elem.width = width;
      if (projector.elem.height !== height) projector.elem.height = height;
    }
  }

  rescale(scales, lastScale, projectorSize, crop, settings) {
    this.crop = crop;
    for (let i = 0; i < scales.length; i++) {
      this.projectors[
        i
      ].elem.style.transform = `scale(${scales[i].x}, ${scales[i].y})`;
    }

    this.shadow.rescale(lastScale, projectorSize, settings);
  }

  draw(src) {
    const srcWidth = src.videoWidth || src.width;
    const srcHeight = src.videoHeight || src.height;

    const croppedSrcX = srcWidth * this.crop[0];
    const croppedSrcY = srcHeight * this.crop[1];
    const croppedSrcWidth = srcWidth * (1 - this.crop[0] * 2);
    const croppedSrcHeight = srcHeight * (1 - this.crop[1] * 2);

    for (const projector of this.projectors) {
      projector.ctx.drawImage(
        src,
        croppedSrcX,
        croppedSrcY,
        croppedSrcWidth,
        croppedSrcHeight,
        0,
        0,
        projector.elem.width,
        projector.elem.height
      );
    }
  }

  clearRect() {
    for (const projector of this.projectors) {
      projector.ctx.clearRect(
        0,
        0,
        projector.elem.width,
        projector.elem.height
      );
    }
  }
}
__exports["default"] = Projector2d;
return __exports;
})();

// ==================== module: projector-webgl (third_party/youtube-ambilight/src/libs/projector-webgl.js) ====================
__modules["projector-webgl"] = (() => {
const __exports = {};
const { default: SentryReporter } = __require('errors/sentry-reporter');
const { AmbientlightError } = __require('errors/ambient-light-error');
const { canvasWebGLCrashTips, ctxOptions, requestIdleCallback, SafeOffscreenCanvas, webGLErrorToString, wrapErrorHandler } = __require('generic');
const { default: ProjectorShadow } = __require('projector-shadow');
const { storage } = __require('storage');






class ProjectorWebGL {
  type = 'ProjectorWebGL';
  lostCount = 0;
  blurLostCount = 0;
  scales = [{ x: 1, y: 1 }];
  projectors = [];
  static subProjectorDimensionMax = 3;
  atTop = true;

  constructor(ambientlight, containerElem, initProjectorListeners, settings) {
    return async function ProjectorWebGLConstructor() {
      this.ambientlight = ambientlight;
      this.atTop = ambientlight.atTop;
      this.containerElem = containerElem;
      this.initProjectorListeners = initProjectorListeners;
      this.settings = settings;
      this.setWarning = settings.setWarning;

      this.initShadow();
      this.initBlurCtx();
      const initialized = await this.initCtx();
      if (!initialized) this.setWebGLWarning('create');

      this.initializedTime = performance.now();
      return this;
    }.bind(this)();
  }

  invalidateShaderCache() {
    this.viewport = undefined;
    this.fVibrance = undefined;
    this.vPosition = undefined;
    this.vUV = undefined;
    this.cropped = undefined;
    this.fScale = undefined;
    this.fScaleStep = undefined;
    this.fScalesLength = undefined;
    this.fCrop = undefined;
    this.fTextureMipmapLevel = undefined;
    this.fTextureOpacity = undefined;
    this.drawTextureSize = {
      width: 0,
      height: 0,
    };
  }

  handleWindowResize = async () => {
    if (this.ambientlight.isPageHidden) return;

    this.updateCrop();
    await this.ambientlight.optionalFrame();
  };

  handleAtTopChange = async (atTop) => {
    this.atTop = atTop;
    if (this.ambientlight.isPageHidden) return;

    this.updateCrop();
    this.ambientlight.buffersCleared = true;
    await this.ambientlight.optionalFrame();
  };

  remove() {
    this.containerElem.remove(this.elem);
  }

  // TODO: Cut off left, top and right canvas outside the browser + blur size
  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  initShadow() {
    this.shadow = new ProjectorShadow();
    this.projectors[2] = {
      elem: this.shadow.elem,
      ctx: this.blurCtx,
    };
  }

  drawIndex = 0;
  drawBorder = 0;
  drawTextureSize = {
    width: 0,
    height: 0,
  };
  draw = (src) => {
    if (
      !this.ctx ||
      this.ctxIsInvalid ||
      src.ctx?.ctxIsInvalid ||
      this.lost ||
      !this.viewport
    )
      return;

    // ctx is being initialized but not ready yet
    if (
      this.projectorsCount > 1 &&
      this.projectorsCount !== this.fTextureOpacity?.length
    )
      return;

    if (!this.cropped) this.updateCrop();

    const srcWidth = src.videoWidth || src.width;
    const srcHeight = src.videoHeight || src.height;

    const textureMipmapLevel = Math.max(
      0,
      Math.log(srcHeight / this.height) / Math.log(2) - 0
    );
    if (textureMipmapLevel !== this.fTextureMipmapLevel) {
      this.fTextureMipmapLevel = textureMipmapLevel;
      this.ctx.uniform1f(this.fTextureMipmapLevelLoc, textureMipmapLevel);
    }

    const subProjectorsDimensionMultiplier = Math.sqrt(this.subProjectorsCount);
    const textureSize =
      this.projectorsCount > 1
        ? {
            width:
              (srcWidth + this.drawBorder) * subProjectorsDimensionMultiplier,
            height:
              (srcHeight + this.drawBorder) * subProjectorsDimensionMultiplier,
          }
        : {
            width: srcWidth,
            height: srcHeight,
          };
    const updateTextureSize =
      this.drawTextureSize.width !== textureSize.width ||
      this.drawTextureSize.height !== textureSize.height;

    const blurCanvasBound = Math.floor(this.blurBound / this.blurCanvasScale);
    const blurCanvasWidthMinBounds =
      this.blurCanvas.width - blurCanvasBound * 2;
    const blurCanvasHeightMinBounds =
      this.blurCanvas.height - blurCanvasBound * 2;

    const internalFormat = this.ctx.RGBA;
    const format = this.ctx.RGBA;
    const formatType = this.ctx.UNSIGNED_BYTE;

    let start = this.settings.showResolutions ? performance.now() : undefined;
    if (this.projectorsCount > 1) {
      if (updateTextureSize) {
        this.drawInitial = true;
        this.drawIndex = 0;
      }

      // Set opacities

      const filledOpacities = this.fTextureOpacity.slice(
        this.projectorsCount - 1 - this.drawIndex
      );
      const emptyOpacities = this.fTextureOpacity.slice(
        0,
        this.projectorsCount - 1 - this.drawIndex
      );
      const opacities = [
        ...(this.drawInitial
          ? filledOpacities.map((o, i) =>
              i === 0 ? emptyOpacities.reduce((s, o) => s + o, o) : o
            )
          : filledOpacities),
        ...(this.drawInitial ? emptyOpacities.map(() => 0) : emptyOpacities),
      ];

      // Draw texture

      const textureIndex = Math.floor(this.drawIndex / this.subProjectorsCount);
      const previousTextureIndex = Math.floor(
        (this.drawIndex - 1) / this.subProjectorsCount
      );

      const isNewTexture = textureIndex !== previousTextureIndex;
      const drawInitialAndIsNewTexture = this.drawInitial && isNewTexture;

      const subIndex = this.drawIndex % this.subProjectorsCount;
      const xIndex = subIndex % subProjectorsDimensionMultiplier;
      const yIndex =
        Math.floor(subIndex / subProjectorsDimensionMultiplier) %
        subProjectorsDimensionMultiplier;
      const x = (srcWidth + this.drawBorder) * xIndex;
      const y = (srcHeight + this.drawBorder) * yIndex;

      if (this.drawInitial) {
        const isLastSubTexture = this.drawIndex == this.projectorsCount - 1;
        if (isLastSubTexture) this.drawInitial = false;
      }

      this.ctx.uniform1fv(this.fTextureOpacityLoc, new Float32Array(opacities));
      this.ctx.activeTexture(this.ctx[`TEXTURE${textureIndex + 1}`]);
      if (drawInitialAndIsNewTexture) {
        this.ctx.texImage2D(
          this.ctx.TEXTURE_2D,
          0,
          internalFormat,
          textureSize.width,
          textureSize.height,
          0,
          format,
          formatType,
          null
        );
      }
      this.ctx.texSubImage2D(
        this.ctx.TEXTURE_2D,
        0,
        x,
        y,
        format,
        formatType,
        src
      );
      this.ctx.generateMipmap(this.ctx.TEXTURE_2D);
    } else {
      if (updateTextureSize) {
        this.ctx.texImage2D(
          this.ctx.TEXTURE_2D,
          0,
          internalFormat,
          format,
          formatType,
          src
        );
      } else {
        this.ctx.texSubImage2D(
          this.ctx.TEXTURE_2D,
          0,
          0,
          0,
          format,
          formatType,
          src
        );
      }
      this.ctx.generateMipmap(this.ctx.TEXTURE_2D);
    }
    if (this.settings.showResolutions)
      this.loadTime = performance.now() - start;

    if (this.settings.showResolutions) start = performance.now();
    this.ctx.drawArrays(this.ctx.TRIANGLES, 0, this.vPosition.length / 2);

    const isNewTextureUpload =
      this.drawTextureSize.width === 0 && this.drawTextureSize.height === 0;
    if (isNewTextureUpload) {
      this.checkForDrawErrors();
    }

    if (this.settings.showResolutions)
      this.drawTime = performance.now() - start;

    if (this.settings.showResolutions) start = performance.now();
    this.blurCtx.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);
    if (this.settings.showResolutions) {
      this.blurClearTime = performance.now() - start;
      start = performance.now();
    }
    this.blurCtx.drawImage(
      this.elem,
      blurCanvasBound,
      blurCanvasBound,
      blurCanvasWidthMinBounds,
      blurCanvasHeightMinBounds
    );
    if (this.settings.showResolutions)
      this.blurDrawTime = performance.now() - start;

    if (updateTextureSize) {
      this.drawTextureSize = textureSize;
    }
    this.drawIndex =
      (this.drawIndex + 1 + Math.round(Math.random() * 0.5)) %
      this.projectorsCount;
  };

  drawErrors = [];
  checkForDrawErrors = () => {
    // Only do this once for the first texture. Because getError takes 0.3 to 20ms
    const webGLError = this.ctx.getError();

    if (webGLError === this.ctx.NO_ERROR) {
      this.drawErrors.length = 0;
      this.setWarning('');
      return;
    }

    // Reset cpu-memory cached texture data
    this.drawInitial = true;

    const error = new AmbientlightError(
      `WebGL error: ${webGLErrorToString(webGLError)}`,
      {
        program: this.program?.toString(),
        webGLVersion: this.webGLVersion,
        majorPerformanceCaveat: this.majorPerformanceCaveat,
        ctxOptions: this.ctxOptions,
      }
    );
    error.name = 'ProjectorWebGLDrawError';

    this.drawErrors.push(error);
    if (this.drawErrors.length < 3) {
      console.warn(error);
      this.ambientlight.setDrawWarning(error);
      return;
    }

    error.details.previousErrors = this.drawErrors.slice(0, -1);
    throw error;
  };

  setWebGLWarning(action = 'restore') {
    this.setWarning(
      `Failed to ${action} the WebGL renderer from a GPU crash.${canvasWebGLCrashTips}`
    );
  }

  onBlurCtxLost = wrapErrorHandler(
    function wrappedOnBlurCtxLost(event) {
      event.preventDefault();
      this.blurLost = true;
      this.blurLostCount++;
      this.invalidateShaderCache();

      // Invalidate shadow
      if (this.shadow?.elem) {
        this.shadow.elem.width = 1;
      }

      console.log(`ProjectorWebGL blur context lost (${this.blurLostCount})`);
      this.setWebGLWarning('restore');

      // The bardetection worker offscreencanvas does not trigger contextlost events
      this.ambientlight.barDetection.clear();
    }.bind(this)
  );

  onBlurCtxRestored = wrapErrorHandler(
    async function wrappedOnBlurCtxRestored() {
      console.log(
        `ProjectorWebGL blur context restored (${this.blurLostCount})`
      );
      if (this.blurLostCount >= 3) {
        console.error(
          'ProjectorWebGL blur context was lost 3 times. The current restoration has been aborted to prevent an infinite restore loop.'
        );
        this.setWebGLWarning('3 times restore');
        return;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
      this.initBlurCtx();
      if (
        this.blurCtx &&
        (!this.blurCtx.isContextLost || !this.blurCtx.isContextLost())
      ) {
        if (!this.ctxIsInvalid) {
          this.initProjectorListeners();
          this.blurLost = false;
          if (!this.lost && !this.ambientlight.projectorBuffer?.lost)
            this.setWarning('');

          // The bardetection worker offscreencanvas does not trigger contextrestored events
          this.ambientlight.barDetection.clear();
        }
      } else {
        console.error(
          `ProjectorWebGL blur context restore failed (${this.blurLostCount})`
        );
        this.setWebGLWarning('restore');
      }
    }.bind(this)
  );

  initBlurCtx() {
    if (this.blurCanvas) {
      this.containerElem.removeChild(this.blurCanvas);
      if (this.blurCtx) {
        this.blurCanvas.removeEventListener('contextlost', this.onBlurCtxLost);
        this.blurCanvas.removeEventListener(
          'contextrestored',
          this.onBlurCtxRestored
        );
      }
    }

    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.classList.add('ambientlight__projector');
    this.containerElem.prepend(this.blurCanvas);
    this.boundaryElem = this.blurCanvas;
    this.blurCanvas.addEventListener('contextlost', this.onBlurCtxLost);
    this.blurCanvas.addEventListener('contextrestored', this.onBlurCtxRestored);
    this.blurCtx = this.blurCanvas.getContext('2d', {
      ...ctxOptions,
      alpha: true,
      desynchronized: false, // true: Does not work when canvas elements are not hardware accelerated
    });
    if (!this.blurCtx) {
      throw new Error('ProjectorWebGL blur context creation failed');
    }
    this.projectors[0] = {
      elem: this.blurCanvas,
      ctx: this.blurCtx,
    };

    if (this.blurLost) {
      this.blurLost = false;
    }
  }

  async getMajorPerformanceCaveatDetected() {
    try {
      return (await storage.get('majorPerformanceCaveatDetected')) || false;
    } catch (ex) {
      SentryReporter.captureException(ex);
    }
  }

  async majorPerformanceCaveatDetected() {
    this.majorPerformanceCaveat = true;
    const detected = await this.getMajorPerformanceCaveatDetected();
    if (detected) return;

    const message =
      'The browser warned that this is a slow device. If you have a graphics card, make sure to enable hardware acceleration in the browser.\n(The resolution setting has been turned down to 25% for better performance)';
    // console.warn(`ProjectorWebGL: ${message}`)
    this.setWarning(message, true);
    this.settings.set('resolution', 25, true);
    await storage.set('majorPerformanceCaveatDetected', true);
  }

  async noMajorPerformanceCaveatDetected() {
    this.majorPerformanceCaveat = false;
    const detected = await this.getMajorPerformanceCaveatDetected();
    if (detected === false) return;

    await storage.set('majorPerformanceCaveatDetected', false);
  }

  onCtxLost = wrapErrorHandler(
    function projectorCtxLost(event) {
      event.preventDefault();

      this.lost = true;
      this.lostCount++;
      this.program = undefined; // Prevent warning: Cannot delete program from old context. in initCtx
      this.invalidateShaderCache();

      console.log(`ProjectorWebGL context lost (${this.lostCount})`);
      this.setWebGLWarning('restore');
    }.bind(this)
  );

  onCtxRestored = wrapErrorHandler(
    async function projectorCtxRestored() {
      // console.log(`ProjectorWebGL restored (${this.lostCount})`)
      if (this.lostCount >= 3) {
        console.error('ProjectorWebGL context restore failed 3 times');
        this.setWebGLWarning('3 times restore');
        return;
      }
      try {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!(await this.initCtx())) return;
      } catch (ex) {
        this.setWebGLWarning();
        throw ex;
      }

      this.initShadow();
      this.initBlurCtx();
      if (this.ctx) {
        if (!this.ctxIsInvalid) {
          this.initProjectorListeners();
          this.lost = false;
          if (!this.blurLost && !this.ambientlight.projectorBuffer?.lost)
            this.setWarning('');
        }
      } else {
        console.error(
          `ProjectorWebGL context restore failed (${this.lostCount})`
        );
        this.setWebGLWarning('restore');
        return;
      }

      if (this.handleRestored) this.handleRestored();
    }.bind(this)
  );

  webglcontextcreationerrors = [];
  onCtxCreationError = wrapErrorHandler(
    function projectorCtxCreationError(e) {
      // console.warn(`ProjectorWebGL creationerror: ${e.statusMessage}`)
      this.webglcontextcreationerrors.push({
        webGLVersion: this.webGLVersion,
        failIfMajorPerformanceCaveat:
          this.ctxOptions.failIfMajorPerformanceCaveat,
        message: e.statusMessage || '?',
        time: performance.now(),
      });
    }.bind(this)
  );

  // syncCompilation prevents black flickering while settings are changed
  async initCtx(syncCompilation = false) {
    if (this.cancelCompilation) return false;
    if (this.compilationPromise) {
      this.cancelCompilation = true;
      await this.compilationPromise;
      this.cancelCompilation = undefined;
    }

    if (
      (this.webGLVersion === 2 || this.webGLVersion === 1) &&
      !this.ctx &&
      this.elem
    ) {
      this.elem.removeEventListener('contextlost', this.onCtxLost);
      this.elem.removeEventListener('contextrestored', this.onCtxRestored);
      this.elem.removeEventListener(
        'webglcontextcreationerror',
        this.onCtxCreationError
      );
      this.elem = undefined;
      this.webGLVersion = undefined;
    }

    if (!this.elem) {
      this.elem = new SafeOffscreenCanvas(1, 1);
      this.elem.addEventListener('webglcontextlost', this.onCtxLost, false);
      this.elem.addEventListener(
        'webglcontextrestored',
        this.onCtxRestored,
        false
      );
      this.elem.addEventListener(
        'webglcontextcreationerror',
        this.onCtxCreationError,
        false
      );
    }

    if (!this.ctx) {
      this.ctxOptions = {
        failIfMajorPerformanceCaveat: true,
        preserveDrawingBuffer: false, // Allows the browser to swap the visible- and drawbuffers, which is faster
        premultipliedAlpha: false,
        alpha: true,
        depth: false,
        antialias: false,
        desynchronized: false,
      };
      this.webGLVersion = 2;
      this.ctx = this.elem.getContext('webgl2', this.ctxOptions);
      if (this.ctx) {
        this.noMajorPerformanceCaveatDetected();
      } else {
        this.webGLVersion = 1;
        this.ctx = this.elem.getContext('webgl', this.ctxOptions);
        if (this.ctx) {
          this.noMajorPerformanceCaveatDetected();
        } else {
          this.ctxOptions.failIfMajorPerformanceCaveat = false;
          this.webGLVersion = 2;
          this.ctx = this.elem.getContext('webgl2', this.ctxOptions);
          if (this.ctx) {
            this.majorPerformanceCaveatDetected();
          } else {
            this.webGLVersion = 1;
            this.ctx = this.elem.getContext('webgl', this.ctxOptions);
            if (this.ctx) {
              this.majorPerformanceCaveatDetected();
            } else {
              this.webGLVersion = undefined;
              await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for any additional webglcontextcreationerrors to be captured

              const errors = this.webglcontextcreationerrors;
              this.webglcontextcreationerrors = [];

              let lastErrorMessage = '';
              for (const error of errors) {
                const duplicate = error.message === lastErrorMessage;
                lastErrorMessage = error.message;
                if (duplicate) error.message = '"';
              }

              throw new AmbientlightError(
                `ProjectorWebGL context creation failed: ${lastErrorMessage}`,
                errors
              );
            }
          }
        }
      }
    }

    if (!this.ctx || this.ctx.isContextLost()) return;

    if (
      'drawingBufferColorSpace' in this.ctx &&
      'unpackColorSpace' in this.ctx
    ) {
      this.ctx.drawingBufferColorSpace = ctxOptions.colorSpace;
      this.ctx.unpackColorSpace = ctxOptions.colorSpace;
    }

    this.projectors[1] = {
      elem: this.elem,
      ctx: this,
    };

    // Program
    const program = this.ctx.createProgram();

    // Textures
    this.ctx.hint(this.ctx.GENERATE_MIPMAP_HINT, this.ctx.NICEST);
    const tfaExt =
      this.ctx.getExtension('EXT_texture_filter_anisotropic') ||
      this.ctx.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
      this.ctx.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    const maxAnisotropy = tfaExt
      ? Math.min(
          16,
          this.ctx.getParameter(tfaExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1
        )
      : 0;

    // Texture - Shadow
    this.shadowTexture = this.ctx.createTexture();
    this.ctx.activeTexture(this.ctx.TEXTURE0);
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.shadowTexture);
    this.ctx.texParameteri(
      this.ctx.TEXTURE_2D,
      this.ctx.TEXTURE_MIN_FILTER,
      this.ctx.LINEAR
    );
    this.ctx.texParameteri(
      this.ctx.TEXTURE_2D,
      this.ctx.TEXTURE_MAG_FILTER,
      this.ctx.LINEAR
    );
    this.ctx.texParameteri(
      this.ctx.TEXTURE_2D,
      this.ctx.TEXTURE_WRAP_S,
      this.ctx.CLAMP_TO_EDGE
    );
    this.ctx.texParameteri(
      this.ctx.TEXTURE_2D,
      this.ctx.TEXTURE_WRAP_T,
      this.ctx.CLAMP_TO_EDGE
    );
    this.ctx.texImage2D(
      this.ctx.TEXTURE_2D,
      0,
      this.ctx.RGBA,
      1,
      1,
      0,
      this.ctx.RGBA,
      this.ctx.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );

    // Texture - Projectors
    this.projectorsTexture = [];
    const maxTextures = Math.min(
      this.ctx.getParameter(this.ctx.MAX_TEXTURE_IMAGE_UNITS) || 8,
      16
    ); // MAX_TEXTURE_IMAGE_UNITS can be more than 16 in software mode
    const maxProjectorTextures = maxTextures - 1;
    ProjectorWebGL.subProjectorDimensionMax = this.webGLVersion === 2 ? 3 : 2; // WebGL1 does not allow non-power-of-two textures
    this.subProjectorsCount = 1;
    const frameFading = Math.round(Math.pow(this.settings.frameFading, 2));
    for (
      let i = 1;
      i < ProjectorWebGL.subProjectorDimensionMax &&
      frameFading + 1 > maxProjectorTextures * Math.pow(i, 2);
      i++
    ) {
      this.subProjectorsCount = Math.pow(i + 1, 2);
    }
    this.projectorsCount = Math.min(
      frameFading + 1,
      maxProjectorTextures * this.subProjectorsCount
    );
    const projectorsTextureCount = Math.ceil(
      this.projectorsCount / this.subProjectorsCount
    );
    for (let i = 0; i < projectorsTextureCount; i++) {
      this.projectorsTexture[i] = this.ctx.createTexture();
      this.ctx.activeTexture(this.ctx[`TEXTURE${i + 1}`]);
      this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.projectorsTexture[i]);
      this.ctx.texParameteri(
        this.ctx.TEXTURE_2D,
        this.ctx.TEXTURE_MIN_FILTER,
        this.ctx.LINEAR_MIPMAP_LINEAR
      );
      this.ctx.texParameteri(
        this.ctx.TEXTURE_2D,
        this.ctx.TEXTURE_MAG_FILTER,
        this.ctx.LINEAR
      );
      this.ctx.texParameteri(
        this.ctx.TEXTURE_2D,
        this.ctx.TEXTURE_WRAP_S,
        this.ctx.CLAMP_TO_EDGE
      );
      this.ctx.texParameteri(
        this.ctx.TEXTURE_2D,
        this.ctx.TEXTURE_WRAP_T,
        this.ctx.CLAMP_TO_EDGE
      );
      if (this.webGLVersion !== 1) {
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          this.ctx.TEXTURE_MAX_LEVEL,
          16
        );
      }
      if (maxAnisotropy) {
        this.ctx.texParameteri(
          this.ctx.TEXTURE_2D,
          tfaExt.TEXTURE_MAX_ANISOTROPY_EXT,
          maxAnisotropy
        );
      }
      this.ctx.texImage2D(
        this.ctx.TEXTURE_2D,
        0,
        this.ctx.RGBA,
        1,
        1,
        0,
        this.ctx.RGBA,
        this.ctx.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255])
      );
      this.ctx.generateMipmap(this.ctx.TEXTURE_2D);
    }

    // Shaders
    const vertexShaderSrc = `
      precision lowp float;

      attribute vec2 vPosition;

      attribute vec2 vUV;
      varying vec2 fUV;
      
      void main(void) {
        fUV = vUV;
        gl_Position = vec4(vPosition, 0, 1);
      }
    `
      .replace(/\n {6}/g, '\n')
      .replace(/ +\n/g, '')
      .replace(/\n+/g, '\n')
      .trim();
    const vertexShader = this.ctx.createShader(this.ctx.VERTEX_SHADER);
    this.ctx.shaderSource(vertexShader, vertexShaderSrc);
    this.ctx.compileShader(vertexShader);
    this.ctx.attachShader(program, vertexShader);

    const fragmentShaderSrc = `
      precision lowp float;
      varying vec2 fUV;
      uniform sampler2D textureSampler[${this.projectorsTexture.length}];
      uniform float fTextureMipmapLevel;
      ${
        this.projectorsCount > 1
          ? `uniform float fTextureOpacity[${this.projectorsCount}];`
          : ''
      }
      uniform vec2 fCropOffsetUV;
      uniform vec2 fCropScaleUV;
      uniform sampler2D shadowSampler;
      uniform vec2 fScale;
      uniform vec2 fScaleStep;
      ${this.settings.vibrance !== 100 ? 'uniform float fVibrance;' : ''}

      vec4 multiTexture() {
        vec2 direction = ceil(fUV * 2.) - 1.;
        vec2 iUV = ((direction - fUV) * fScale) / ((direction - .5) * fScaleStep);
        int impreciseI = int(min(iUV[0], iUV[1]));
        for (int preciseI = 0; preciseI < 200; preciseI++) {
          if (preciseI < impreciseI) continue;
          int i = ${this.webGLVersion === 1 ? 'impreciseI' : 'preciseI'};
          vec2 scaledUV = (fUV - .5) * (fScale / (fScale - fScaleStep * vec2(i)));
          vec2 croppedUV = fCropOffsetUV + (scaledUV / fCropScaleUV);
          
          ${(() => {
            if (this.projectorsCount > 1) {
              const subProjectorsDimensionMultiplier = Math.sqrt(
                this.subProjectorsCount
              );
              const croppedUvScale = (1 / subProjectorsDimensionMultiplier)
                .toString()
                .padEnd(2, '.');

              return `${new Array(this.subProjectorsCount)
                .fill(undefined)
                .map((_, i) => {
                  if (i === 0)
                    return `vec2 uv0 = ${
                      croppedUvScale !== '1.'
                        ? `(croppedUV * ${croppedUvScale})`
                        : 'croppedUV'
                    };`;

                  const xIndex = i % subProjectorsDimensionMultiplier;
                  const yIndex =
                    Math.floor(i / subProjectorsDimensionMultiplier) %
                    subProjectorsDimensionMultiplier;
                  const offsetUVx = (
                    (1 / subProjectorsDimensionMultiplier) *
                    xIndex
                  )
                    .toString()
                    .padEnd(2, '.');
                  const offsetUVy = (
                    (1 / subProjectorsDimensionMultiplier) *
                    yIndex
                  )
                    .toString()
                    .padEnd(2, '.');

                  // Todo: Ommit the drawBorder by calculating the rescale caused by: .5 - drawBorder
                  return `vec2 uv${i} = uv0${
                    offsetUVx !== '0.' || offsetUVy !== '0.'
                      ? ` + vec2(${offsetUVx},${offsetUVy})`
                      : ''
                  };`;
                })
                .join('\n')}`;
            } else {
              return ``;
            }
          })()}

          return ${(() => {
            if (this.projectorsCount > 1) {
              return `${new Array(this.projectorsCount)
                .fill(undefined)
                .map((_, i) => {
                  const projectorIndex = Math.floor(
                    i / this.subProjectorsCount
                  );
                  const subIndex = i % this.subProjectorsCount;

                  // Todo: Ommit the drawBorder by calculating the rescale caused by: .5 - drawBorder
                  return `(fTextureOpacity[${i}] * texture2D(textureSampler[${projectorIndex}], uv${subIndex}, fTextureMipmapLevel))`;
                })
                .join('\n+ ')};`;
            } else {
              return `texture2D(textureSampler[0], croppedUV, fTextureMipmapLevel);`;
            }
          })()}
        }
        return vec4(0.0, 0.0, 0.0, 1.0);
      }
      
      ${
        this.settings.vibrance !== 100
          ? `
      vec3 rgb2hsv(vec3 c)
      {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }

      vec3 hsv2rgb(vec3 c)
      {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      float saturate(float c, float v) {
        float x = c;
        if(v < 0.) {
          x = 1. - c;
        }

        float a = 1. + 5. * (1. - abs(v));
        float y = a * a - x * ( (a * a - 1.) / (a * a) ) - (a - x / a) * (a - x / a);
        float d = y - x;
        y = min(1., x + d * 5.);

        if(v >= 0.) {
          return y;
        } else {
          return 1. - y;
        }
      }
      `
          : ''
      }

      void main(void) {
        vec3 ambientlight = multiTexture().rgb;
        float shadowAlpha = texture2D(shadowSampler, fUV).a;
        ${
          this.settings.vibrance !== 100
            ? `
          if(fVibrance != 0.) {
            vec3 ambientlightHSV = rgb2hsv(ambientlight);
            ambientlightHSV[1] = saturate(ambientlightHSV[1], fVibrance);
            ambientlight = hsv2rgb(ambientlightHSV);
          }
        `
            : ''
        }
        gl_FragColor = vec4(ambientlight, 1. - shadowAlpha);
      }
    `
      .replace(/\n {6}/g, '\n')
      .replace(/ +\n/g, '')
      .replace(/\n+/g, '\n')
      .trim();
    const fragmentShader = this.ctx.createShader(this.ctx.FRAGMENT_SHADER);
    this.ctx.shaderSource(fragmentShader, fragmentShaderSrc);
    this.ctx.compileShader(fragmentShader);
    this.ctx.attachShader(program, fragmentShader);

    // Delete previous program
    if (this.program) {
      try {
        this.ctx.finish(); // Wait for any pending draw calls to finish
        this.ctx.deleteProgram(this.program); // Free GPU memory
      } catch (ex) {
        console.warn('Failed to delete previous ProjectorWebGL program', ex);
      }
      this.program = undefined;
      this.invalidateShaderCache();
    }

    // Program
    this.ctx.linkProgram(program);

    const parallelShaderCompileExt = syncCompilation
      ? undefined
      : this.ctx.getExtension('KHR_parallel_shader_compile');
    if (parallelShaderCompileExt?.COMPLETION_STATUS_KHR) {
      let resolveCompilationPromise;
      this.compilationPromise = new Promise(
        (resolve) =>
          (resolveCompilationPromise = async () => {
            resolveCompilationPromise = undefined;
            await new Promise((resolve) => setTimeout(resolve, 0)); // Make sure to finish the current task first
            this.compilationPromise = undefined;
            resolve();
          })
      );

      // The first getProgramParameter COMPLETION_STATUS_KHR request returns always false on chromium and the return value seems to be cached between animation frames
      this.ctx.getProgramParameter(
        program,
        parallelShaderCompileExt.COMPLETION_STATUS_KHR
      );
      await new Promise((resolve) => requestAnimationFrame(resolve));

      try {
        let compiled = false;
        while (!compiled) {
          const completionStatus = this.ctx.getProgramParameter(
            program,
            parallelShaderCompileExt.COMPLETION_STATUS_KHR
          );
          // COMPLETION_STATUS_KHR can be null because of webgl-lint
          if (completionStatus === false) {
            await new Promise((resolve) =>
              requestIdleCallback(resolve, { timeout: 200 })
            );
            await new Promise((resolve) => requestAnimationFrame(resolve));
          } else {
            compiled = true;
          }
        }

        if (this.cancelCompilation && compiled) {
          try {
            compiled = false;
            this.ctx.deleteProgram(program); // Free GPU memory
          } catch (ex) {
            console.warn('Failed to delete new ProjectorWebGL program', ex);
          }
        }

        resolveCompilationPromise();
        if (!compiled) return false;
      } catch (ex) {
        try {
          ex.details = {
            program: program?.toString(),
            webGLVersion: this.webGLVersion,
            majorPerformanceCaveat: this.majorPerformanceCaveat,
            ctxOptions: this.ctxOptions,
          };
        } catch (ex) {
          ex.details = {
            detailsException: ex,
          };
        }
        // // Did not give any insights that could help to fix bugs
        // try {
        //   const debugRendererInfo = this.ctx.getExtension('WEBGL_debug_renderer_info')
        //   ex.details.gpuVendor = debugRendererInfo?.UNMASKED_VENDOR_WEBGL
        //     ? this.ctx.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL)
        //     : 'unknown'
        //   ex.details.gpuRenderer = debugRendererInfo?.UNMASKED_RENDERER_WEBGL
        //     ? this.ctx.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL)
        //     : 'unknown'
        // } catch(ex) {
        //   ex.details.gpuError = ex
        // }

        resolveCompilationPromise();
        throw ex;
      }
    }

    // Validate these parameters after program compilation to prevent render blocking validation
    const vertexShaderCompiled = this.ctx.getShaderParameter(
      vertexShader,
      this.ctx.COMPILE_STATUS
    );
    const fragmentShaderCompiled = this.ctx.getShaderParameter(
      fragmentShader,
      this.ctx.COMPILE_STATUS
    );
    const programLinked = this.ctx.getProgramParameter(
      program,
      this.ctx.LINK_STATUS
    );
    if (!vertexShaderCompiled || !fragmentShaderCompiled || !programLinked) {
      const programCompilationError = new Error('Program compilation failed');
      programCompilationError.name = 'WebGLError';
      programCompilationError.details = {
        webGLVersion: this.webGLVersion,
        ctxOptions: this.ctxOptions,
      };

      try {
        programCompilationError.details = {
          ...programCompilationError.details,
          vertexShaderCompiled,
          vertexShaderInfoLog: this.ctx.getShaderInfoLog(vertexShader),
          fragmentShaderCompiled,
          fragmentShaderInfoLog: this.ctx.getShaderInfoLog(fragmentShader),
          programLinked,
          programInfoLog: this.ctx.getProgramInfoLog(program),
        };
      } catch (ex) {
        programCompilationError.details.getCompiledAndLinkedInfoLogsError = ex;
      }

      try {
        this.ctx.validateProgram(program);
        programCompilationError.details.programValidated =
          this.ctx.getProgramParameter(program, this.ctx.VALIDATE_STATUS);
        programCompilationError.details.programValidationInfoLog =
          this.ctx.getProgramInfoLog(program);
      } catch (ex) {
        programCompilationError.details.validateProgramError = ex;
      }

      try {
        const ext = this.ctx.getExtension('WEBGL_debug_shaders');
        if (ext) {
          programCompilationError.details.Ωsources = {
            vertexShader: ext.getTranslatedShaderSource(vertexShader),
            fragmentShader: ext.getTranslatedShaderSource(fragmentShader),
          };
          if (!programCompilationError.details.Ωsources.vertexShader) {
            programCompilationError.details.Ωsources.vertexShaderCode =
              vertexShaderSrc;
          }
          if (!programCompilationError.details.Ωsources.fragmentShader) {
            programCompilationError.details.Ωsources.fragmentShaderCode =
              fragmentShaderSrc;
          }
        }
      } catch (ex) {
        programCompilationError.details.debugShadersError = ex;
      }

      try {
        const debugRendererInfo = this.ctx.getExtension(
          'WEBGL_debug_renderer_info'
        );
        programCompilationError.details.gpuVendor =
          debugRendererInfo?.UNMASKED_VENDOR_WEBGL
            ? this.ctx.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL)
            : 'unknown';
        programCompilationError.details.gpuRenderer =
          debugRendererInfo?.UNMASKED_RENDERER_WEBGL
            ? this.ctx.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL)
            : 'unknown';
      } catch (ex) {
        programCompilationError.details.gpuError = ex;
      }

      if (
        programCompilationError.details.vertexShaderInfoLog ||
        programCompilationError.details.fragmentShaderInfoLog ||
        programCompilationError.details.getCompiledAndLinkedInfoLogsError ||
        programCompilationError.details.programValidationInfoLog ||
        programCompilationError.details.validateProgramError ||
        programCompilationError.details.Ωsources?.vertexShader ||
        programCompilationError.details.Ωsources?.vertexShaderCode ||
        programCompilationError.details.Ωsources?.fragmentShader ||
        programCompilationError.details.Ωsources?.fragmentShaderCode ||
        programCompilationError.details.debugShadersError
      ) {
        programCompilationError.name = 'WebGLErrorWithInfoLog';
      }

      throw programCompilationError;
    }

    //// Probably can be removed because has already check if the program is linked and both shaders have been compiled. There is also no use that reported this error in the last 2 weeks
    // this.ctx.validateProgram(this.program)
    // const programValidated = this.ctx.getProgramParameter(this.program, this.ctx.VALIDATE_STATUS)
    // if(!programValidated) {
    //   const programValidationError = new Error('Program validation failed')
    //   programValidationError.details = {}

    //   try {
    //     programValidationError.details = {
    //       vertexShaderInfoLog: this.ctx.getShaderInfoLog(vertexShader),
    //       fragmentShaderInfoLog: this.ctx.getShaderInfoLog(fragmentShader),
    //       programInfoLog: this.ctx.getProgramInfoLog(this.program)
    //     }
    //   } catch(ex) {
    //     programValidationError.details.getCompiledAndLinkedInfoLogsError = ex
    //   }

    //   try {
    //     const ext = this.ctx.getExtension('WEBGL_debug_shaders');
    //     if(ext) {
    //       programValidationError.details.Ωsources = {
    //         vertexShader: ext.getTranslatedShaderSource(vertexShader),
    //         fragmentShader: ext.getTranslatedShaderSource(fragmentShader)
    //       }
    //     }
    //   } catch(ex) {
    //     programValidationError.details.debugShadersError = ex
    //   }

    //   throw programValidationError
    // }

    this.ctx.useProgram(program);
    this.program = program;

    // Buffers
    const vUVLoc = this.ctx.getAttribLocation(this.program, 'vUV');
    this.vUVBuffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.vUVBuffer);
    this.ctx.vertexAttribPointer(
      vUVLoc,
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    this.ctx.enableVertexAttribArray(vUVLoc);

    const vPositionLoc = this.ctx.getAttribLocation(this.program, 'vPosition');
    this.vPositionBuffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.vPositionBuffer);
    this.ctx.vertexAttribPointer(
      vPositionLoc,
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    this.ctx.enableVertexAttribArray(vPositionLoc);

    const shadowSamplerLoc = this.ctx.getUniformLocation(
      this.program,
      'shadowSampler'
    );
    this.ctx.uniform1i(shadowSamplerLoc, 0);

    const textureSamplerLoc = this.ctx.getUniformLocation(
      this.program,
      'textureSampler'
    );
    this.ctx.uniform1iv(
      textureSamplerLoc,
      this.projectorsTexture.map((_, i) => 1 + i)
    );

    this.fTextureMipmapLevelLoc = this.ctx.getUniformLocation(
      this.program,
      'fTextureMipmapLevel'
    );
    this.ctx.uniform1f(this.fTextureMipmapLevelLoc, 0);

    if (this.settings.vibrance !== 100) {
      this.fVibranceLoc = this.ctx.getUniformLocation(
        this.program,
        'fVibrance'
      );
      this.ctx.uniform1f(this.fVibranceLoc, 0);
    }

    this.fScaleLoc = this.ctx.getUniformLocation(this.program, 'fScale');
    this.ctx.uniform2fv(this.fScaleLoc, new Float32Array([1, 1]));

    this.fScaleStepLoc = this.ctx.getUniformLocation(
      this.program,
      'fScaleStep'
    );
    this.ctx.uniform2fv(this.fScaleStepLoc, new Float32Array([1, 1]));

    this.fCropOffsetUVLoc = this.ctx.getUniformLocation(
      this.program,
      'fCropOffsetUV'
    );
    this.ctx.uniform2fv(this.fCropOffsetUVLoc, new Float32Array([0, 0]));

    this.fCropScaleUVLoc = this.ctx.getUniformLocation(
      this.program,
      'fCropScaleUV'
    );
    this.ctx.uniform2fv(this.fCropScaleUVLoc, new Float32Array([0, 0]));

    if (this.projectorsCount > 1) {
      this.fTextureOpacityLoc = this.ctx.getUniformLocation(
        this.program,
        'fTextureOpacity'
      );
      this.ctx.uniform1fv(
        this.fTextureOpacityLoc,
        new Float32Array(Array(this.projectorsCount).fill(0))
      );
    }

    this.invalidateShaderCache();

    this.updateCtx();
    return true;
  }

  rescale(scales, lastScale, projectorSize, crop, settings) {
    if (this.shadow) {
      this.shadow.rescale(lastScale, projectorSize, settings);
    }

    this.scaleStep = {
      x: scales[2]?.x - scales[1]?.x,
      y: scales[2]?.y - scales[1]?.y,
    };
    this.scale = lastScale;
    this.scalesLength = scales.length;
    this.crop = crop;

    const width = Math.floor(projectorSize.w * this.scale.x);
    const height = Math.floor(projectorSize.h * this.scale.y);
    if (this.elem) {
      this.elem.width = width;
      this.elem.height = height;
    }

    this.blurCanvasScale = settings.blur2 > 1 ? 2 : 1;
    const blurPx = settings.blur2 * (this.height / 512) * 1.275;
    const blurRadius = 2.64;
    this.blurBound = Math.max(1, Math.ceil(blurPx * blurRadius));
    if (this.blurCanvas) {
      const blurCanvasWidth = width + this.blurBound * 2;
      const blurCanvasHeight = height + this.blurBound * 2;
      // Scale down when blur > 1 for a free performance boost on Firefox
      const scaledWidth = Math.floor(blurCanvasWidth / this.blurCanvasScale);
      const scaledHeight = Math.floor(blurCanvasHeight / this.blurCanvasScale);
      if (this.blurCanvas.width !== scaledWidth)
        this.blurCanvas.width = scaledWidth;
      if (this.blurCanvas.height !== scaledHeight)
        this.blurCanvas.height = scaledHeight;
      this.blurCanvas.style.transform = `scale(${
        this.scale.x + (this.blurBound * 2) / projectorSize.w
      }, ${this.scale.y + (this.blurBound * 2) / projectorSize.h})`;
    }
    if (this.blurCtx) {
      this.blurCtx.filter = `blur(${blurPx / this.blurCanvasScale}px)`;
    }

    this.updateCtx();
  }

  async updateVibrance() {
    const hadVibranceFilter = this.fVibrance !== undefined;
    const hasVibranceFilter = this.settings.vibrance !== 100;
    if (hasVibranceFilter === hadVibranceFilter) return true;

    return await this.initCtx();
  }

  updateCtx() {
    if (this.ctxIsInvalid || this.lost) return;

    if (this.settings.vibrance !== 100) {
      let vibrance = this.settings.vibrance / 100 - 1;
      vibrance =
        (vibrance < 0 ? -1 : 1) * (1 - Math.pow(1 - Math.abs(vibrance), 3));
      const fVibranceChanged = this.fVibrance !== vibrance;
      if (fVibranceChanged) {
        this.fVibrance = vibrance;
        this.ctx.uniform1f(this.fVibranceLoc, this.fVibrance);
      }
    }

    const fScaleChanged =
      this.fScale?.x !== this.scale?.x || this.fScale?.y !== this.scale?.y;
    if (fScaleChanged) {
      this.fScale = this.scale;
      this.ctx.uniform2fv(
        this.fScaleLoc,
        new Float32Array([this.fScale?.x, this.fScale?.y])
      );
    }

    const fScaleStepChanged =
      this.fScaleStep?.x !== this.scaleStep?.x ||
      this.fScaleStep?.y !== this.scaleStep?.y;
    if (fScaleStepChanged) {
      this.fScaleStep = this.scaleStep;
      this.ctx.uniform2fv(
        this.fScaleStepLoc,
        new Float32Array([this.fScaleStep?.x, this.fScaleStep?.y])
      );
    }

    const crop = this.crop || [0, 0];
    const fCropChanged = crop.some(
      (crop, i) => crop !== (this.fCrop || [undefined, undefined])[i]
    );
    if (fCropChanged) {
      this.fCrop = crop;
      const fCropScaleUV = crop.map((crop) => 1 / (1 - crop * 2));
      const fCropOffsetUV = fCropScaleUV.map(
        (cropScale, i) => crop[i] + 1 / (cropScale * 2)
      );
      this.ctx.uniform2fv(
        this.fCropOffsetUVLoc,
        new Float32Array(fCropOffsetUV)
      );
      this.ctx.uniform2fv(this.fCropScaleUVLoc, new Float32Array(fCropScaleUV));
    }

    if (this.projectorsCount > 1) {
      const fTextureOpacityChanged =
        this.projectorsCount > 1 &&
        !(this.fTextureOpacity?.length === this.projectorsCount);
      if (fTextureOpacityChanged) {
        const easing = (x) => x * x;
        this.fTextureOpacity = new Array(this.projectorsCount)
          .fill(undefined)
          .map((_, i) => easing((i + 1) / this.projectorsCount))
          .map((e, i, list) => (!i ? e : e - list[i - 1]));
      }
    }

    this.ctx.activeTexture(this.ctx.TEXTURE0);
    this.ctx.texImage2D(
      this.ctx.TEXTURE_2D,
      0,
      this.ctx.ALPHA,
      this.ctx.ALPHA,
      this.ctx.UNSIGNED_BYTE,
      this.shadow.elem
    );
    this.ctx.activeTexture(this.ctx.TEXTURE1);

    if (
      !this.viewport ||
      this.viewport.width !== this.ctx.drawingBufferWidth ||
      this.viewport.height !== this.ctx.drawingBufferHeight
    ) {
      this.viewport = {
        width: this.ctx.drawingBufferWidth,
        height: this.ctx.drawingBufferHeight,
      };
      this.ctx.viewport(
        0,
        0,
        this.ctx.drawingBufferWidth,
        this.ctx.drawingBufferHeight
      );
    }

    if (!this.cropped) {
      this.updateCrop();
    }

    if (!this.vPosition || !this.vUV) {
      this.updatePositionAndUvCoordinates();
    }
  }

  updateCrop() {
    if (
      this.ctxIsInvalid ||
      this.lost ||
      !this.blurCanvas ||
      !this.ambientlight?.videoContainerElem
    )
      return;

    const videoBoundingElem = this.ambientlight.shouldStyleVideoParentElem
      ? this.ambientlight.videoContainerElem
      : this.ambientlight.videoElem;
    if (!videoBoundingElem) return;

    let videoRect = videoBoundingElem.getBoundingClientRect();
    if (!videoRect?.width || !videoRect?.height) return;

    const canvasRect = this.blurCanvas.getBoundingClientRect();
    if (!canvasRect?.width || !canvasRect?.height) return;

    const blurScale = canvasRect.height / this.blurCanvas.height; // Todo: The blurRadius is appearently incorrect?
    const blurSize = this.blurBound * blurScale;
    const windowRect = {
      left: -blurSize,
      top: -window.scrollY - blurSize,
      right: window.innerWidth + blurSize,
      bottom: window.innerHeight + blurSize,
    };
    const canvasRectCenter = {
      x: canvasRect.left + canvasRect.width / 2,
      y: canvasRect.top + canvasRect.height / 2,
    };
    const cropRect = {
      left: Math.max(canvasRect.left, windowRect.left),
      top: Math.max(canvasRect.top, windowRect.top),
      right: Math.min(canvasRect.right, windowRect.right),
      bottom: Math.min(
        canvasRect.bottom,
        windowRect.bottom + (this.settings.fixedPosition ? 0 : 100)
      ), // 100 = a single scroll step
    };
    const cropPerc = {
      left:
        (canvasRectCenter.x - cropRect.left) /
        (canvasRectCenter.x - canvasRect.left),
      top:
        (canvasRectCenter.y - cropRect.top) /
        (canvasRectCenter.y - canvasRect.top),
      right:
        (cropRect.right - canvasRectCenter.x) /
        (canvasRect.right - canvasRectCenter.x),
      bottom:
        this.atTop || this.settings.fixedPosition
          ? (cropRect.bottom - canvasRectCenter.y) /
            (canvasRect.bottom - canvasRectCenter.y)
          : 1,
    };
    const crop = {
      t: Math.max(0, cropPerc.top.toFixed(4)),
      r: Math.max(0, cropPerc.right.toFixed(4)),
      b: -Math.max(0, cropPerc.bottom.toFixed(4)),
      l: -Math.max(0, cropPerc.left.toFixed(4)),
    };

    videoRect =
      this.settings.fixedPosition && !this.atTop
        ? {
            left: canvasRectCenter.x,
            top: canvasRectCenter.y,
            right: canvasRectCenter.x,
            bottom: canvasRectCenter.y,
          }
        : {
            left: videoRect.left + blurSize,
            top: videoRect.top + blurSize,
            right: videoRect.right - blurSize,
            bottom: videoRect.bottom - blurSize,
          };
    const cutPerc = {
      left:
        (canvasRectCenter.x - videoRect.left) /
        (canvasRectCenter.x - canvasRect.left),
      top:
        (canvasRectCenter.y - videoRect.top) /
        (canvasRectCenter.y - canvasRect.top),
      right:
        (videoRect.right - canvasRectCenter.x) /
        (canvasRect.right - canvasRectCenter.x),
      bottom:
        (videoRect.bottom - canvasRectCenter.y) /
        (canvasRect.bottom - canvasRectCenter.y),
    };
    const cut = {
      t: Math.min(Math.max(0, cutPerc.top.toFixed(4)), crop.t),
      r: Math.min(Math.max(0, cutPerc.right.toFixed(4)), crop.r),
      b: -Math.min(Math.max(0, cutPerc.bottom.toFixed(4)), -crop.b),
      l: -Math.min(Math.max(0, cutPerc.left.toFixed(4)), -crop.l),
    };

    this.updatePositionAndUvCoordinates(crop, cut);
    this.cropped = true;
  }

  updatePositionAndUvCoordinates(
    crop = { t: 1, r: 1, b: -1, l: -1 },
    cut = { t: 0, r: 0, b: 0, l: 0 }
  ) {
    // Convert cut and crop rectangles to position coordinates
    //   [p1x, p1y, p2x, p2y, p3x, p3y] = triangle points
    const vPosition = [
      // Bottom
      crop.l,
      crop.b,
      crop.r,
      crop.b,
      cut.r,
      cut.b,
      crop.l,
      crop.b,
      cut.r,
      cut.b,
      cut.l,
      cut.b,

      // Right
      crop.r,
      crop.t,
      crop.r,
      crop.b,
      cut.r,
      cut.t,
      crop.r,
      crop.b,
      cut.r,
      cut.b,
      cut.r,
      cut.t,

      // Top
      crop.l,
      crop.t,
      cut.r,
      cut.t,
      cut.l,
      cut.t,
      crop.l,
      crop.t,
      crop.r,
      crop.t,
      cut.r,
      cut.t,

      // Left
      crop.l,
      crop.t,
      crop.l,
      crop.b,
      cut.l,
      cut.t,
      crop.l,
      crop.b,
      cut.l,
      cut.b,
      cut.l,
      cut.t,
    ];

    if (JSON.stringify(this.vPosition) === JSON.stringify(vPosition)) return;

    this.vPosition = vPosition;

    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);

    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.vPositionBuffer);
    this.ctx.bufferData(
      this.ctx.ARRAY_BUFFER,
      new Float32Array(this.vPosition),
      this.ctx.STATIC_DRAW
    );

    // Convert positions coordinates to UV coördinates
    this.vUV = this.vPosition.map(
      (p, i) =>
        ((i % 2 == 0 ? p : -p) + // Flip the y-axis of UV coördinates
          1) /
        2
    );

    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.vUVBuffer);
    this.ctx.bufferData(
      this.ctx.ARRAY_BUFFER,
      new Float32Array(this.vUV),
      this.ctx.STATIC_DRAW
    );
  }

  clearRect() {
    this.invalidateShaderCache();

    if (this.shadow?.elem) {
      this.shadow.elem.width = 1;
    }

    if (this.ctx && !this.ctx.isContextLost() && this.program) {
      // Shadow
      this.ctx.activeTexture(this.ctx.TEXTURE0);
      this.ctx.texImage2D(
        this.ctx.TEXTURE_2D,
        0,
        this.ctx.RGBA,
        1,
        1,
        0,
        this.ctx.RGBA,
        this.ctx.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255])
      );
      // this.ctx.texImage2D(this.ctx.TEXTURE_2D, 0, this.ctx.ALPHA, this.ctx.ALPHA, this.ctx.UNSIGNED_BYTE, null)

      // Video textures
      for (let i = 0; i < this.projectorsTexture.length; i++) {
        this.ctx.activeTexture(this.ctx[`TEXTURE${i + 1}`]);
        this.ctx.texImage2D(
          this.ctx.TEXTURE_2D,
          0,
          this.ctx.RGBA,
          1,
          1,
          0,
          this.ctx.RGBA,
          this.ctx.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 255])
        );
        this.ctx.generateMipmap(this.ctx.TEXTURE_2D);
        // this.ctx.texImage2D(this.ctx.TEXTURE_2D, 0, this.ctx.RGBA, this.ctx.RGBA, this.ctx.UNSIGNED_BYTE, null)
      }

      this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);
    }

    if (
      this.blurCtx &&
      (!this.blurCtx.isContextLost || !this.blurCtx.isContextLost())
    ) {
      this.blurCtx.clearRect(
        0,
        0,
        this.blurCanvas.width,
        this.blurCanvas.height
      );
    }
  }

  get ctxIsInvalid() {
    const invalid =
      !this.ctx ||
      this.ctx.isContextLost() ||
      !this.program ||
      !this.blurCtx ||
      (this.blurCtx.isContextLost && this.blurCtx.isContextLost());
    if (invalid && !this.ctxIsInvalidWarned && !this.program) {
      this.ctxIsInvalidWarned = true;
      console.log(`ProjectorWebGL context is lost`);
    }
    return invalid;
  }
}
__exports["default"] = ProjectorWebGL;
return __exports;
})();

// ==================== module: bar-detection (third_party/youtube-ambilight/src/libs/bar-detection.js) ====================
__modules["bar-detection"] = (() => {
const __exports = {};
const { appendErrorStack, requestIdleCallback, SafeOffscreenCanvas, wrapErrorHandler } = __require('generic');
const { default: SentryReporter } = __require('errors/sentry-reporter');
const { workerFromCode } = __require('worker');




const workerCode = function () {
  class ImageHelper {
    imageData;
    channels = 4;

    get width() {
      return this.imageData?.width ?? 0;
    }

    get height() {
      return this.imageData?.height ?? 0;
    }

    getDataOffset(x, y) {
      return (y * this.width + x) * this.channels;
    }

    getPixel(x, y, data, dataOffset, alpha = true) {
      // Throttle worker thread
      // for (let i = 0; i < 100_000; i++) {}

      let returnValue = !data;
      if (returnValue) data = new Uint8Array(4);
      if (!dataOffset) dataOffset = 0;

      const offset = this.getDataOffset(x, y);
      if (offset < 0 || offset > (this.imageData?.data?.length ?? 0)) {
        data[dataOffset + 0] = 0;
        data[dataOffset + 1] = 0;
        data[dataOffset + 2] = 0;
        if (alpha) data[dataOffset + 3] = 0;
      } else {
        data[dataOffset + 0] = this.imageData?.data?.[offset];
        data[dataOffset + 1] = this.imageData?.data?.[offset + 1];
        data[dataOffset + 2] = this.imageData?.data?.[offset + 2];
        if (alpha) data[dataOffset + 3] = this.imageData?.data?.[offset + 3];
      }

      if (returnValue) return data;
    }
  }

  let catchedWorkerCreationError = false;
  let canvas;
  let canvasIsCreatedInWorker = false;
  let ctx;
  let globalRunId = 0;
  let globalXOffsetIndex = 0;
  let image = new ImageHelper();
  const scanlinesAmount = 5;

  const postError = (ex) => {
    if (!catchedWorkerCreationError) {
      catchedWorkerCreationError = true;
      this.postMessage({
        id: -1,
        error: ex,
      });
    }
  };

  const sortSizes = (averageSize) => (a, b) => {
    const aGap = Math.abs(averageSize - a.yIndex);
    const bGap = Math.abs(averageSize - b.yIndex);
    return aGap === bGap ? 0 : aGap > bGap ? 1 : -1;
  };

  const colorChannels = image.channels - 1;
  const colorsLength = 116;
  const averageColorColorsData = new Uint8Array(colorsLength * colorChannels);
  const averageColorsIndexes = new Uint8Array(colorsLength);
  const averageColorsIndexesDiffs = new Uint16Array(colorsLength);
  const averageColorsLength = Math.floor(colorsLength * 0.25);
  const averageColor = new Uint32Array(colorChannels);

  function sortAverageColors(ai, bi) {
    return averageColorsIndexesDiffs[ai] - averageColorsIndexesDiffs[bi];
  }

  function getAverageColor(yAxis) {
    const colors = averageColorColorsData;
    const colorsIndexes = averageColorsIndexes;
    const colorsIndexesDiffs = averageColorsIndexesDiffs;

    for (
      let i = 0,
        yMax = image[yAxis],
        linesY = [2, 4, yMax - 4, yMax - 2],
        xStep = 16,
        offset = xStep * 2,
        xMax = image[yAxis === 'height' ? 'width' : 'height'],
        colorsOffset = 0;
      i < linesY.length;
      i++
    ) {
      for (let x = offset, y = linesY[i]; x <= xMax - offset; x += xStep) {
        if (yAxis === 'height') {
          image.getPixel(x, y, colors, colorsOffset, false);
        } else {
          image.getPixel(y, x, colors, colorsOffset, false);
        }
        colorsOffset += colorChannels;
      }
    }

    // Reset indexes
    for (let i = 0; i < colorsIndexes.length; i++) {
      colorsIndexes[i] = i;
    }

    const shrinkBy = Math.floor(averageColorsLength / 2);
    for (
      let includedColorsLength = colorsLength;
      includedColorsLength >= averageColorsLength;
      includedColorsLength -= shrinkBy
    ) {
      // Update averageColor
      for (let iRGB = 0; iRGB < colorChannels; iRGB++) {
        averageColor[iRGB] = 0;
        for (let i = 0; i < includedColorsLength; i++) {
          const colorsIndex = colorsIndexes[i];
          const colorOffset = colorsIndex * colorChannels + iRGB;
          averageColor[iRGB] += colors[colorOffset]; // Take color based on indexed colors
        }
        averageColor[iRGB] = Math.round(
          averageColor[iRGB] / includedColorsLength
        );
      }

      if (includedColorsLength - shrinkBy < averageColorsLength) break;

      // Update color vs averageColor difference in indexes
      for (let i = 0; i < colorsIndexesDiffs.length; i++) {
        const colorsIndex = colorsIndexes[i];
        if (i < includedColorsLength) {
          const pixelOffset = colorsIndex * colorChannels;
          const diff =
            Math.abs(averageColor[0] - colors[pixelOffset]) +
            Math.abs(averageColor[1] - colors[pixelOffset + 1]) +
            Math.abs(averageColor[2] - colors[pixelOffset + 2]);
          colorsIndexesDiffs[colorsIndex] = diff;
        } else {
          colorsIndexesDiffs[colorsIndex] += 1000;
        }
      }

      // Sort indexes based on colorsIndexesDiffs
      colorsIndexes.sort(sortAverageColors);
    }

    // console.log(
    //   'average color',
    //   averageColor
    //     .map((c) => c.toFixed(0).toString().padStart(3, ' '))
    //     .join('|'),
    //   new Array(colorsIndexes.length).fill(undefined).map((_, i) => {
    //     const colorsIndex = colorsIndexes[i];
    //     const pixelOffset = colorsIndex * colorChannels;

    //     const color = [
    //       colors[pixelOffset],
    //       colors[pixelOffset + 1],
    //       colors[pixelOffset + 2],
    //     ];

    //     const info = [
    //       // colorsIndex,
    //       color.map((c) => c.toFixed(0).toString().padStart(3, ' ')).join('|'),
    //       Math.abs(averageColor[0] - color[0]) +
    //         Math.abs(averageColor[1] - color[1]) +
    //         Math.abs(averageColor[2] - color[2]),
    //       colorsIndexesDiffs[colorsIndex],
    //     ];

    //     return info;
    //   })
    // );

    return Array.from(averageColor);
  }

  function getHueDeviation(a, b) {
    return (
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
    );
  }

  function getBrightnessDeviation(a, b) {
    return Math.abs(a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  }

  const maxBlackDeviation = {
    hue: 16,
    brightness: 8,
    sum: 20,
    score: 155 * 3 + 155 * 3,
  };
  const maxDarkDeviation = {
    hue: 22,
    brightness: 22,
    sum: 36,
    score: 155 * 3 + 155 * 3,
  };
  const maxLightDeviation = {
    hue: 32,
    brightness: 64,
    sum: 86,
    score: 255 * 3 + 255 * 3,
  };

  function getMaxDeviationLimits(color) {
    const brightness = color[0] + color[1] + color[2];
    return brightness > 500
      ? maxLightDeviation
      : brightness > 20
      ? maxDarkDeviation
      : maxBlackDeviation;
  }

  function isColorWithinMaxDeviation(currentColor, referenceColor) {
    const hueDeviation = getHueDeviation(currentColor, referenceColor);
    const brightnessDeviation = getBrightnessDeviation(
      currentColor,
      referenceColor
    );
    const maxDeviation = getMaxDeviationLimits(referenceColor);

    return (
      hueDeviation <= maxDeviation.hue &&
      brightnessDeviation <= maxDeviation.brightness &&
      hueDeviation + brightnessDeviation <= maxDeviation.sum
    );
  }

  // const channels = 4;
  const enhancedCertainty = true; // Todo: create setting?
  const minDeviationScore = enhancedCertainty ? 0.25 : 0.4;
  const edgePointXRange = 32;
  const edgePointYRange = enhancedCertainty ? 8 : 16;
  const edgePointYCenter = 2 / edgePointYRange;

  const easeInOutQuad = (x) =>
    x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

  const getCertaintyColorData = new Uint8Array(4);
  const getCertainty = (pointX, pointY, yAxis, yDirection, color) => {
    // return .8;
    //, linesX) => {
    const x = pointX - (enhancedCertainty ? edgePointXRange : 1);
    const y =
      pointY -
      edgePointYRange *
        2 *
        (yDirection === 1 ? edgePointYCenter : 1 - edgePointYCenter);
    const xLength = 1 + (enhancedCertainty ? edgePointXRange * 2 : 0);
    const yLength = 1 + edgePointYRange * 2;

    // let data = enhancedCertainty
    //   ? ctx.getImageData(
    //       ...(yAxis === 'height'
    //         ? [x, y, xLength, yLength]
    //         : [y, x, yLength, xLength])
    //     ).data
    //   : [];
    // if (!enhancedCertainty) {
    //   let start = y;
    //   let length = yLength;
    //   if (start < 0) {
    //     data = new Array(-start).fill(0);
    //     length += start;
    //     start = 0;
    //     data = data.concat(...imageLine.data.slice(start, start + length));
    //   } else {
    //     data = imageLine.data.slice(start, start + length);
    //   }
    // }

    // console.log(point, yAxis, yDirection, color)
    // console.log(x, y, xLength, yLength)
    // console.log(data)

    let score = 0;
    // let iColor = getCertaintyColorData;

    for (let dx = 0; dx < xLength; dx += 2) {
      // const ix = dx * (yAxis === 'height' ? 1 : yLength);

      for (let dy = 0; dy < yLength; dy += 2) {
        const dy2 = yDirection === 1 ? dy : yLength - 1 - dy;
        // const iy = dy2 * (yAxis === 'height' ? xLength : 1);
        // const i = ix + iy;
        let iColor = getCertaintyColorData;
        if (yAxis === 'height') {
          image.getPixel(x + dx, y + dy2, iColor);
        } else {
          image.getPixel(y + dy2, x + dx, iColor);
        }
        if (iColor[3] === 0) iColor = color;
        // data[i + 3] === 0
        //   ? color // Outside canvas bounds
        //   : [data[i], data[i + 1], data[i + 2]];
        const expectWithinDeviation =
          dy < Math.floor(1 + edgePointYRange * 2 * edgePointYCenter);
        // const within = isColorWithinMaxDeviation(iColor, color)
        // console.log(dx, dy2, '|', ix, iy, '|', i, JSON.stringify(iColor), within)
        // if (within === expectWithinDeviation) {

        if (!expectWithinDeviation) {
          const maxDeviation = getMaxDeviationLimits(color);

          const hueDeviation = getHueDeviation(iColor, color);
          const brightnessDeviation = getBrightnessDeviation(iColor, color);
          const deviationScore = Math.max(
            0,
            Math.min(
              1 - minDeviationScore,
              (hueDeviation + brightnessDeviation) / maxDeviation.score / 0.05
            )
          );
          // console.log(dx, dy, deviationScore, iColor, color, hueDeviation, brightnessDeviation)
          score += minDeviationScore + deviationScore;
        } else {
          const within = isColorWithinMaxDeviation(iColor, color);
          if (within) score += 1;
        }
        // }
      }
    }
    const length = (1 + (xLength - 1) / 2) * (1 + (yLength - 1) / 2);
    const certainty = (score - length / 2) / (length / 2);

    return easeInOutQuad(certainty);
  };

  const largeStep = 4;
  const ignoreEdge = 2;
  const middleYOffset = 10;

  const minCertainty = 0.65;
  const maxCertaintyChecks = enhancedCertainty ? 3 : 5;
  const sureCertainty = enhancedCertainty ? 0.65 : 0.65;

  const getAverageLineColorRange = 9;
  const getAverageLineColorRangeOffset = (getAverageLineColorRange - 1) / 2;
  const getAverageLineColorData = new Uint8Array(4 * getAverageLineColorRange);
  function getAverageLineColor(x, y, yAxis, iColor) {
    const iColors = getAverageLineColorData;
    const range = getAverageLineColorRange;
    const rangeOffset = getAverageLineColorRangeOffset;
    for (let i = 0; i < range; i++) {
      const x2 = x + (i - rangeOffset) * 2;
      const iColorsOffset = i * 4;
      if (yAxis === 'height') {
        image.getPixel(x2, y, iColors, iColorsOffset);
      } else {
        image.getPixel(y, x2, iColors, iColorsOffset);
      }
    }
    for (let i = 0; i < 4; i++) {
      let sum = 0;
      for (let j = 0; j < range; j++) {
        sum += iColors[j * 4 + i];
      }
      iColor[i] = Math.round(sum / range);
    }
  }

  const detectEdgesColorData = new Uint8Array(4);
  function detectEdges(linesX, color, yAxis) {
    const maxY = image[yAxis];
    const middleY = maxY / 2; // imageLines[0].data.length / 2;
    const topEdges = [];
    const bottomEdges = [];
    // console.log('detectEdges', maxY, yAxis, linesX, color);
    const iColor = detectEdgesColorData;

    for (const x of linesX) {
      // const { xIndex, data } = imageLine;
      let step = largeStep;
      let wasDeviating = false;
      let wasUncertain = false;
      // From the top down
      let mostCertainEdge;
      let detectedEdges = 0;
      // Example video of a lot of uncertain edges: https://www.youtube.com/watch?v=mTmet4jAkEA
      for (let y = ignoreEdge; y < maxY; y += step) {
        if (wasUncertain) {
          wasUncertain = false;
          step = 1;
        }

        getAverageLineColor(x, y, yAxis, iColor);

        // image.getPixel(
        //   ...(yAxis === 'height' ? [x, y] : [y, x]), iColor
        // ); // [data[i], data[i + 1], data[i + 2]];
        const limitNotReached = y < middleY - middleYOffset - 1; // Below the top limit
        if (!limitNotReached || detectedEdges > maxCertaintyChecks) {
          // console.log(xIndex, i, mostCertainEdge, JSON.parse(JSON.stringify(topEdges)))
          if (mostCertainEdge?.certainty > minCertainty) {
            topEdges.find(
              (edge) =>
                x === edge.xIndex && mostCertainEdge.yIndex === edge.yIndex
            ).deviates = false;
            // topEdges.push({
            //   xIndex,
            //   yIndex: mostCertainEdge.i / channels,
            //   certainty: mostCertainEdge.certainty,
            //   deviates: mostCertainEdge.certainty < .5 ? true : undefined
            // })
          } else {
            topEdges.push({
              xIndex: x,
              yIndex: 0,
              certainty: 0,
              deviates: true,
            });
          }
          break;
        }

        const isDeviating = !isColorWithinMaxDeviation(iColor, color);

        if (limitNotReached && wasDeviating && !isDeviating) {
          wasDeviating = false;
          continue;
        }

        if (limitNotReached && wasDeviating === isDeviating) continue;

        // Change the step from large to 1 pixel
        if (y !== 0 && step === largeStep) {
          y = Math.max(-1, y - 1 * step);
          step = Math.ceil(1, Math.floor(step / 2));
          continue;
        }

        const certainty = getCertainty(x, y / 1, yAxis, 1, color, linesX);
        detectedEdges++;
        if (limitNotReached && certainty < sureCertainty) {
          // console.log('uncertain top', xIndex, i / channels, certainty)
          // step = largeStep
          wasUncertain = true;
          wasDeviating = true;
          if (!(mostCertainEdge?.certainty >= certainty)) {
            mostCertainEdge = {
              // i,
              yIndex: y,
              certainty,
            };
          }
          topEdges.push({
            xIndex: x,
            yIndex: y,
            certainty: certainty,
            deviates: true,
          });
          continue;
        }

        // console.log('found', certainty)
        // Found the first video pixel, add to topEdges
        topEdges.push({
          xIndex: x,
          yIndex: y,
          certainty,
        });
        break;
      }

      step = largeStep;
      wasDeviating = false;
      wasUncertain = false;
      mostCertainEdge = undefined;
      detectedEdges = 0;
      // From the bottom up
      for (let y = maxY - 1 + ignoreEdge; y >= 0; y -= step) {
        if (wasUncertain) {
          wasUncertain = false;
          step = 1;
        }

        getAverageLineColor(x, y, yAxis, iColor);

        // image.getPixel(
        //   ...(yAxis === 'height' ? [x, y] : [y, x]), iColor
        // ); // [data[i], data[i + 1], data[i + 2]];
        const limitNotReached = y > middleY + middleYOffset; // Above the bottom limit
        if (!limitNotReached || detectedEdges > maxCertaintyChecks) {
          if (mostCertainEdge?.certainty > minCertainty) {
            bottomEdges.find(
              (edge) =>
                x === edge.xIndex && mostCertainEdge.yIndex === edge.yIndex
            ).deviates = false;
            // bottomEdges.push({
            //   xIndex,
            //   yIndex: (data.length - mostCertainEdge.i) / channels,
            //   certainty: mostCertainEdge.certainty,
            //   deviates: mostCertainEdge.certainty < .5 ? true : undefined
            // })
          } else {
            bottomEdges.push({
              xIndex: x,
              yIndex: 0,
              certainty: 0,
              deviates: true,
            });
          }
          break;
        }
        const isDeviating = !isColorWithinMaxDeviation(iColor, color);

        if (limitNotReached && wasDeviating && !isDeviating) {
          wasDeviating = false;
          continue;
        }

        if (limitNotReached && wasDeviating === isDeviating) continue;

        // Change the step from large to 1 pixel
        if (y !== maxY - 1 && step === largeStep) {
          y = Math.min(maxY - 1, y + step);
          step = Math.ceil(1, Math.floor(step / 2));
          continue;
        }

        const certainty = getCertainty(x, y, yAxis, -1, color, linesX);
        detectedEdges++;
        if (limitNotReached && certainty < sureCertainty) {
          // console.log('uncertain bottom', xIndex, i / channels, certainty)
          // step = largeStep
          wasUncertain = true;
          wasDeviating = true;
          if (!(mostCertainEdge?.certainty >= certainty)) {
            mostCertainEdge = {
              yIndex: maxY - y,
              // i,
              certainty,
            };
          }
          bottomEdges.push({
            xIndex: x,
            yIndex: maxY - y,
            certainty: certainty,
            deviates: true,
          });
          continue;
        }

        // console.log('found', certainty)
        // Found the first video pixel, add to bottomEdges
        bottomEdges.push({
          xIndex: x,
          yIndex: maxY - y,
          certainty,
        });
        break;
      }
    }

    return { topEdges, bottomEdges };
  }

  const reduceAverageSize = (edges) =>
    edges.reduce((sum, edge) => sum + edge.yIndex, 0) / edges.length;

  function getExceedsDeviationLimit(
    edges,
    topEdges,
    bottomEdges,
    linesX,
    maxSize,
    scale,
    allowedAnomaliesPercentage,
    allowedUnevenBarsPercentage
  ) {
    if (
      !topEdges.filter((e) => !e.deviates).length ||
      !bottomEdges.filter((e) => !e.deviates).length
    ) {
      return true;
    }

    const threshold =
      linesX.length * 2 * (1 - (allowedAnomaliesPercentage - 10) / 100);
    if (edges.filter((e) => !e.deviates).length < threshold) {
      return true;
    }

    while (edges.filter((e) => !e.deviates).length > threshold) {
      const nonDeviatingEdges = edges.filter((e) => !e.deviates);
      const averageSize = reduceAverageSize(nonDeviatingEdges);
      nonDeviatingEdges.sort(sortSizes(averageSize));
      const deviatingEdge = nonDeviatingEdges[nonDeviatingEdges.length - 1];
      deviatingEdge.deviates = true;
    }

    // while(topEdges.filter(e => !e.deviates && !e.deviatesTop).length > threshold) {
    //   const nonDeviatingEdges = topEdges.filter(e => !e.deviates && !e.deviatesTop)
    //   const averageSize = reduceAverageSize(nonDeviatingEdges)
    //   nonDeviatingEdges
    //     .sort(sortSizes(averageSize))
    //     .slice(nonDeviatingEdges.length - 1)
    //     .forEach(e => {
    //       e.deviatesTop = true
    //     })
    // }

    // while(bottomEdges.filter(e => !e.deviates && !e.deviatesBottom).length > threshold) {
    //   const nonDeviatingEdges = bottomEdges.filter(e => !e.deviates && !e.deviatesBottom)
    //   const averageSize = reduceAverageSize(nonDeviatingEdges)
    //   nonDeviatingEdges
    //     .sort(sortSizes(averageSize))
    //     .slice(nonDeviatingEdges.length - 1)
    //     .forEach(e => {
    //       e.deviatesBottom = true
    //     })
    // }

    const maxAllowedSideDeviation = maxSize * (0.008 * scale);

    const nonDeviatingTopEdges = topEdges.filter(
      (e) => !e.deviates && !e.deviatesTop
    );

    const maxTopDeviation = Math.abs(
      Math.max(...nonDeviatingTopEdges.map((e) => e.yIndex)) -
        Math.min(...nonDeviatingTopEdges.map((e) => e.yIndex))
    );
    const topDeviationIsAllowed = maxTopDeviation <= maxAllowedSideDeviation;

    const nonDeviatingBottomEdges = bottomEdges.filter(
      (e) => !e.deviates && !e.deviatesBottom
    );
    const maxBottomDeviation = Math.abs(
      Math.max(...nonDeviatingBottomEdges.map((e) => e.yIndex)) -
        Math.min(...nonDeviatingBottomEdges.map((e) => e.yIndex))
    );
    const bottomDeviationIsAllowed =
      maxBottomDeviation <= maxAllowedSideDeviation;

    if (!topDeviationIsAllowed && !bottomDeviationIsAllowed) {
      // console.log(
      //   !topDeviationIsAllowed ? `top deviates ${maxTopDeviation}` : '',
      //   !topDeviationIsAllowed ? topEdges : '',
      //   !bottomDeviationIsAllowed ? `bottom deviates ${maxBottomDeviation}` : '',
      //   !bottomDeviationIsAllowed ? bottomEdges : '',
      //   maxAllowedSideDeviation
      // )
      return true;
    }

    const averageTopSize = reduceAverageSize(nonDeviatingTopEdges);
    const averageBottomSize = reduceAverageSize(nonDeviatingBottomEdges);
    const sidesDeviation = Math.abs(averageTopSize - averageBottomSize);

    const maxAllowedDeviation =
      maxSize * (0.003 + allowedUnevenBarsPercentage * 0.0008) * scale;
    const minMaxAllowedSideDeviation = maxSize * (0.016 * scale);
    // let maxAllowedSidesDeviation = maxAllowedSideDeviation
    let maxAllowedSidesDeviation = maxAllowedDeviation;
    if (
      averageTopSize < minMaxAllowedSideDeviation ||
      averageBottomSize < minMaxAllowedSideDeviation
    ) {
      // console.log(`A side a lower than the maximum side deviation\n${averageTopSize} | ${averageBottomSize} < ${minMaxAllowedSideDeviation}`, nonDeviatingTopEdges, nonDeviatingBottomEdges)
      maxAllowedSidesDeviation = 2;
    } else {
      // console.log(`${averageTopSize} | ${averageBottomSize} < ${minMaxAllowedSideDeviation}`, nonDeviatingTopEdges)
    }

    if (sidesDeviation > maxAllowedSidesDeviation) {
      // console.log('average top & bottom deviates', sidesDeviation, maxAllowedSidesDeviation)
      return true;
    }

    // Allow a higher deviation between top and bottom edges
    const nonDeviatingEdgeSizes = edges
      .filter((e) => !e.deviates)
      .map((e) => e.yIndex);
    const maxDeviation = Math.abs(
      Math.max(...nonDeviatingEdgeSizes) - Math.min(...nonDeviatingEdgeSizes)
    );
    if (maxDeviation > maxAllowedDeviation) {
      // console.log('all edges deviate', maxDeviation, maxAllowedDeviation)
      return true;
    }
  }

  function getPercentage(
    exceedsDeviationLimit,
    maxSize,
    scale,
    edges,
    linesX,
    currentPercentage = 0,
    offsetPercentage = 0
  ) {
    const lowerSizeThreshold = maxSize * ((currentPercentage - 2) / 100);
    const baseOffsetPercentage = 0.3 * ((1 + scale) / 2);
    let certainty = 1;

    let size;
    if (exceedsDeviationLimit) {
      const uncertainLowerEdges = edges.filter(
        (e) => e.certainty > 0.02 && e.yIndex < lowerSizeThreshold
      );
      if (uncertainLowerEdges.length / (linesX.length * 2) < 0.3)
        return {
          percentage: undefined,
          certainty: 0,
        };

      certainty =
        uncertainLowerEdges.reduce((sum, edge) => sum + edge.certainty, 0) /
        uncertainLowerEdges.length;
      const lowestEdge = uncertainLowerEdges.sort(
        (a, b) => a.yIndex - b.yIndex
      )[0];
      // const lowestSize = Math.min(...uncertainLowerSizes.map((e) => e.yIndex));
      // let lowestPercentage = Math.round((lowestSize / maxSize) * 10000) / 100
      // // console.log(lowestPercentage, lowestSize, currentPercentage)
      // if(lowestPercentage >= currentPercentage - 2) {
      //   return // deviating lowest percentage is higher than the current percentage
      // }

      // console.log('semi-certain lower percentage', lowestEdge, certainty, edges)
      size = lowestEdge.yIndex;
      if (size < 0) {
        size = 0;
      } else {
        size += maxSize * (offsetPercentage / 100);
      }
    } else {
      // size = Math.max(...edges.filter(e => !e.deviates).map(e => e.yIndex))
      const sortedEdges = edges.filter((e) => !e.deviates).sort(sortSizes(0));
      size = reduceAverageSize(
        sortedEdges.slice(Math.floor(sortedEdges.length / 2))
      );
      // size = reduceAverageSize(edges.filter(e => !e.deviates))
      // console.log(size, currentPercentage)
      if (size < 0) {
        size = 0;
      } else {
        size += maxSize * ((baseOffsetPercentage + offsetPercentage) / 100);
      }
    }

    let percentage = Math.round((size / maxSize) * 10000) / 100;
    const maxPercentage = 38;
    percentage = Math.min(percentage, maxPercentage);
    // console.log('percentage', percentage, edges)
    return {
      percentage,
      certainty,
    };
  }

  const workerDetectBarSizeLinesX = new Uint16Array(5);
  try {
    const workerDetectBarSize = (
      id,
      xLength,
      yAxis,
      scale,
      detectColored,
      offsetPercentage,
      currentPercentage,
      allowedAnomaliesPercentage,
      allowedUnevenBarsPercentage,
      xOffset
    ) => {
      const partSizeBorderMultiplier =
        -0.1 + (2 * allowedAnomaliesPercentage) / 100;
      // .1 .6 .6 .6
      // xOffset = partSizeBorderMultiplier ? xOffset * .5 : xOffset

      const partSize = Math.floor(
        canvas[xLength] / (scanlinesAmount + partSizeBorderMultiplier * 2)
      );
      // const imageLines = [];
      // const linesX = new Uint16Array(5);
      const linesX = workerDetectBarSizeLinesX;
      let linesXIndex = 0;
      for (
        let index =
          Math.ceil(partSize / 2) - 1 + partSizeBorderMultiplier * partSize;
        index < canvas[xLength] - partSizeBorderMultiplier * partSize;
        index += partSize
      ) {
        // if (id < globalRunId) {
        //   imageLines.length = 0;
        //   return;
        // }
        const xIndex = Math.min(
          Math.max(
            0,
            Math.round(
              index + Math.round(xOffset * (partSize / 2) - partSize / 4)
            )
          ),
          canvas[xLength] - 1
        );
        linesX[linesXIndex] = xIndex;
        linesXIndex++;
        // await getLineImageData(imageLines, yAxis, xIndex);
      }

      // > Used 2000kb untill now

      // console.log(imageSquare.length)

      // console.log(`scanned ${imageLines.length} lines`)
      // if (id < globalRunId) {
      //   imageLines.length = 0;
      //   return;
      // }

      // const perpendicularImageLines = [];
      // await getLineImageData(perpendicularImageLines, xLength, 3);
      // await getLineImageData(perpendicularImageLines, xLength, 6);
      // await getLineImageData(
      //   perpendicularImageLines,
      //   xLength,
      //   canvas[xLength] - 3
      // );
      // await getLineImageData(
      //   perpendicularImageLines,
      //   xLength,
      //   canvas[xLength] - 6
      // );

      // if (id < globalRunId) {
      //   imageLines.length = 0;
      //   return;
      // }

      const color = getAverageColor(yAxis);
      // > Used 3600kb untill now

      // console.log('average color', color, linesX);
      if (
        !detectColored &&
        (color[0] + color[1] + color[2] > 16 ||
          Math.abs(color[0] - color[1]) > 3 ||
          Math.abs(color[1] - color[2]) > 3 ||
          Math.abs(color[2] - color[0]) > 3)
      ) {
        const topEdges = linesX.map((x) => ({
          xIndex: x,
          yIndex: 0,
          deviates: true,
        }));
        const bottomEdges = linesX.map((x) => ({
          xIndex: x,
          yIndex: 0,
          deviates: true,
        }));
        // imageLines.length = 0;

        // console.log('no valid color found', color, topEdges, bottomEdges, percentage);
        return {
          percentage: 0,
          topEdges,
          bottomEdges,
          color,
        };
      }

      const { topEdges, bottomEdges } = detectEdges(linesX, color, yAxis);
      // console.log(JSON.stringify(topEdges), JSON.stringify(bottomEdges))
      // console.log(topEdges, bottomEdges)

      const maxSize = image[yAxis]; // imageLines[0].data.length / channels;
      const edges = topEdges.concat(bottomEdges);
      const exceedsDeviationLimit = getExceedsDeviationLimit(
        edges,
        topEdges,
        bottomEdges,
        linesX,
        maxSize,
        scale,
        allowedAnomaliesPercentage,
        allowedUnevenBarsPercentage
      );

      // console.log(JSON.stringify(edges), exceedsDeviationLimit)

      const { percentage, certainty } = getPercentage(
        exceedsDeviationLimit,
        maxSize,
        scale,
        edges,
        linesX,
        currentPercentage,
        offsetPercentage
      );
      // console.log('percentage', percentage, edges)

      if (
        !(percentage < currentPercentage) &&
        edges.filter((edge) => !edge.deviates).length / (linesX.length * 2) <
          (100 - allowedAnomaliesPercentage) / 100
      ) {
        // console.log(`Discarded. Found ${topEdges.length + bottomEdges.length} of ${imageLines.length * 2}. Required: ${(100 - allowedAnomaliesPercentage)}%`)
        for (const edge of topEdges) {
          edge.deviates = true;
        }
        for (const edge of bottomEdges) {
          edge.deviates = true;
        }
        // imageLines.length = 0;

        return {
          topEdges,
          bottomEdges,
          color,
        };
      }

      // imageLines.length = 0;
      return {
        percentage,
        certainty,
        topEdges,
        bottomEdges,
        color,
      };
    };

    const createContext = () => {
      ctx = canvas.getContext('2d', {
        // alpha: false, // Decreases performance on some platforms
        desynchronized: true,
        willReadFrequently: true,
      });
      ctx.imageSmoothingEnabled = false;
    };

    const createCanvas = (width, height) => {
      canvas = new OffscreenCanvas(width, height);
      canvas.addEventListener('contextlost', () => {
        try {
          // Free GPU memory
          canvas.width = 1;
          canvas.height = 1;
        } catch (ex) {
          postError(ex);
        }
      });
      canvas.addEventListener('contextrestored', () => {
        try {
          canvas.width = 1;
          canvas.height = 1;
        } catch (ex) {
          postError(ex);
        }
      });

      canvasIsCreatedInWorker = true;

      createContext();
    };

    this.onmessage = async (e) => {
      if (e.data === false) {
        // Signal that the worker was successfully created
        this.postMessage(false);
        return;
      }

      const id = e.data.id;
      globalRunId = id;

      try {
        if (e.data.type === 'cancellation') {
          globalXOffsetIndex = 0;
          return;
        }
        // contextlost/contextrestored are never fired in our worker. Keeping our context lost
        if (e.data.type === 'clear') {
          globalXOffsetIndex = 0;
          if (
            canvas &&
            canvasIsCreatedInWorker &&
            canvas.width !== 1 &&
            canvas.height !== 1
          )
            createCanvas(1, 1);
          return;
        }

        const {
          detectColored,
          detectHorizontal,
          detectVertical,
          offsetPercentage,
          currentHorizontalPercentage,
          currentVerticalPercentage,
          // ratio
          allowedAnomaliesPercentage,
          allowedUnevenBarsPercentage,
          canvasInfo,
          xOffsetSize,
        } = e.data;

        if (canvasInfo.bitmap) {
          const bitmap = canvasInfo.bitmap;
          if (!canvas) {
            createCanvas(512, 512);
          } else if (canvas.width !== 512 || canvas.height !== 512) {
            canvas.width = 512;
            canvas.height = 512;

            createContext();
          }
          ctx.drawImage(bitmap, 0, 0, 512, 512);
          bitmap.close();
        } else {
          canvas = canvasInfo.canvas;
          canvasIsCreatedInWorker = false;
          ctx = canvasInfo.ctx;
        }

        image.imageData = ctx.getImageData(0, 0, 512, 512);
        // > Used 1.400kb up until now

        globalXOffsetIndex++;
        if (globalXOffsetIndex >= xOffsetSize) globalXOffsetIndex = 0;
        // const xOffset = xOffsetSize === 1 ? .5 : (globalXOffsetIndex / (xOffsetSize - 1))
        const xOffset =
          xOffsetSize === 1
            ? 0.5
            : xOffsetSize === 2
            ? globalXOffsetIndex
            : (Math.ceil(globalXOffsetIndex / 2) + (globalXOffsetIndex % 2)) /
              (xOffsetSize - 1);
        // console.log(xOffsetSize, globalXOffsetIndex, xOffset)

        let horizontalBarSizeInfo = detectHorizontal
          ? await workerDetectBarSize(
              id,
              'width',
              'height',
              1,
              detectColored,
              offsetPercentage,
              currentHorizontalPercentage,
              allowedAnomaliesPercentage,
              allowedUnevenBarsPercentage,
              xOffset
            )
          : undefined;
        let verticalBarSizeInfo = detectVertical
          ? await workerDetectBarSize(
              id,
              'height',
              'width',
              1,
              detectColored,
              offsetPercentage,
              currentVerticalPercentage,
              allowedAnomaliesPercentage,
              allowedUnevenBarsPercentage,
              xOffset
            )
          : undefined;
        if (id !== globalRunId) {
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.postMessage({
          id,
          horizontalBarSizeInfo,
          verticalBarSizeInfo,
        });
      } catch (ex) {
        if (id === globalRunId) {
          ctx?.clearRect?.(0, 0, canvas?.width ?? 0, canvas?.height ?? 0);
        }
        this.postMessage({
          id,
          error: ex,
        });
      }
    };
  } catch (ex) {
    postError(ex);
  }
};

class BarDetection {
  worker;
  runId = 0;
  canvas;
  ctx;
  catchedDetectBarSizeError = false;
  changes = [];
  history = {
    horizontal: [],
    vertical: [],
  };
  current = {
    horizontal: undefined,
    vertical: undefined,
  };

  constructor(ambientlight) {
    this.ambientlight = ambientlight;
  }

  reset = () => {
    this.clear();

    this.history = {
      horizontal: [],
      vertical: [],
    };
    this.current = {
      horizontal: undefined,
      vertical: undefined,
    };
    this.changes = [];
  };

  clear = () => {
    this.runId++; // invalidate current worker processes
    if (this.worker) {
      this.worker.postMessage({
        id: this.runId,
        type: 'clear',
      });
    }

    this.running = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  };

  cancel = () => {
    this.runId++; // invalidate current worker processes
    if (this.worker) {
      this.worker.postMessage({
        id: this.runId,
        type: 'cancellation',
      });
    }

    this.running = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  };

  detect = async (
    buffer,
    detectColored,
    offsetPercentage,
    detectHorizontal,
    currentHorizontalPercentage,
    detectVertical,
    currentVerticalPercentage,
    ratio,
    allowedToTransfer,
    averageHistorySize,
    allowedAnomaliesPercentage,
    allowedUnevenBarsPercentage,
    callback
  ) => {
    if (this.running) {
      return;
    }

    this.runId++;
    const runId = this.runId;
    this.running = true;

    if (!this.worker) {
      this.worker = await workerFromCode(workerCode);
      const stack = new Error().stack;
      this.worker.onmessage = (e) => {
        if (this.onWorkerMessageListener) {
          return this.onWorkerMessageListener(e);
        }
        if (e.data.id !== -1) {
          // console.warn('Ignoring old bar detection message:', e.data)
          return;
        }
        if (e.data.error) {
          appendErrorStack(stack, e.data.error);
          SentryReporter.captureException(e.data.error);
        }
      };
      this.worker.onerror = (err) => {
        if (!(err instanceof Error)) {
          const details = err;
          err = new Error(
            `bar-detection-worker.js: ${err.message ?? 'Unknown error'}`
          );
          err.details = details;
        }

        if (this.onWorkerRejectListener) {
          return this.onWorkerRejectListener(err);
        }
        SentryReporter.captureException(err);
      };
    }

    // Ignore previous percentages in cases: new video src, seeked or setting changed
    if (this.history.horizontal.length === 0)
      currentHorizontalPercentage = undefined;
    if (this.history.vertical.length === 0)
      currentVerticalPercentage = undefined;

    requestIdleCallback(
      async function detectIdleCallback() {
        await this.idleHandler(
          runId,
          buffer,
          detectColored,
          offsetPercentage,
          detectHorizontal,
          currentHorizontalPercentage,
          detectVertical,
          currentVerticalPercentage,
          ratio,
          allowedToTransfer,
          averageHistorySize,
          allowedAnomaliesPercentage,
          allowedUnevenBarsPercentage,
          callback
        );
      }.bind(this),
      { timeout: 1 },
      true
    );
  };

  maxDivergencePercentage = 0.75;
  groupByPercentage = 0.5;
  // Todo: with 40% certainty + colors: Fix 11 11 11 -> 0 -> 11 -> 0 0 0 at https://www.youtube.com/watch?v=bPNL6nmc-pA&t=46s
  averagePercentage(
    barSizeInfo = {},
    currentInfo = {},
    minPercentage,
    history,
    averageHistorySize
  ) {
    // Todo:
    // Doesn't reset to 0% when the detected color changed without found percentage with a good certainty
    // - [ ] Attach color data to the detected percentage, just like certainty.
    // - [ ] Reset to 0% if color changed a lot
    // Example: https://www.youtube.com/watch?v=sLpFyDQiuK4&t=208
    // Problem (casues shaking): https://www.youtube.com/watch?v=kt9Xbsg4HKM&t=23

    let { percentage, color, certainty } = barSizeInfo;
    let { percentage: currentPercentage, color: currentColor } = currentInfo;

    // console.log(currentPercentage, currentColor, '->', percentage, certainty, color)
    // Reset to zero when the color changed a lot
    let colorChanged = false;
    if (currentColor && color) {
      if (
        // [...history.map(info => info.color), color].every(color => (
        //   Math.abs(currentColor[0] - color[0]) +
        //   Math.abs(currentColor[1] - color[1]) +
        //   Math.abs(currentColor[2] - color[2])
        // ) > 50)
        Math.abs(currentColor[0] - color[0]) +
          Math.abs(currentColor[1] - color[1]) +
          Math.abs(currentColor[2] - color[2]) >
        50
      ) {
        // console.log('color changed', currentColor,
        //   [...history.map(info => info.color), color]
        // );
        // console.log('color changed', currentColor.join(','), '->', color.join(','), percentage, certainty)
        if (percentage === undefined || certainty < 0.8) percentage = 0;
        certainty = 1;
        colorChanged = true;
        // history.push({
        //   percentage: 0,
        //   certainty: 1,
        //   color,
        // });
        // return 0;
      }
    }

    // if (certainty === undefined) certainty = 1

    if (percentage === undefined) {
      if (!history.length && !currentPercentage) {
        history.push({
          percentage: 0,
          certainty: 1,
          color,
        });
        return 0;
      }
      return;
    }

    const detectedPercentage = percentage;

    // Detected a small adjustment in percentages but could be caused by an artifact in the video. Pick the most occuring of the last percentages
    // percentage = [...history, detectedPercentage].sort((a, b) => b - a)[Math.floor(history.length / 2)]
    let percentages = [
      ...history,
      {
        percentage: detectedPercentage,
        certainty,
        color,
      },
    ];
    for (const info of percentages) {
      info.occurrences = percentages.filter(
        ({ percentage }) =>
          Math.abs(info.percentage - percentage) < this.groupByPercentage
      ).length;
    }
    // .reduce((groups, { percentage, certainty }) => {
    //   // certainty = certainty === 1 ? 1 : certainty;
    //   const similarGroup = groups.find(group =>
    //     group.percentages.some((groupPercentage) =>
    //       Math.abs(groupPercentage - percentage) < .3));

    //   if(certainty < 1) (2 / averageHistorySize) + certainty
    //   if(similarGroup) {
    //     // if(similarGroup.certainty < 1 && certainty < 1) {
    //     //   similarGroup.certainty += (2 / averageHistorySize);
    //     // } else {
    //       similarGroup.certainty += certainty;
    //     // }
    //     similarGroup.percentages.push(percentage)
    //   } else {
    //     groups.push({
    //       certainty,
    //       percentages: [percentage]
    //     })
    //   }

    //   return groups;
    // }, [])
    // .reduce((percentages, group) => {
    //   percentages[Math.max(...group.percentages)] = group.certainty;
    //   return percentages;
    // }, {});
    if (!colorChanged) {
      percentage = parseFloat(
        percentages.reduce((a, b) => (a.occurrences > b.occurrences ? a : b))
          .percentage
      );
      // console.log('averaging', percentage, percentagesOccurrence, history)

      // Is the occurences difference is less than half the history length ? Then prevent flickering
      if (
        percentage !== currentPercentage &&
        // Math.abs(
        (percentages.find((info) => info.percentage === percentage)
          ?.occurrences ?? 0) -
          (percentages.find((info) => info.percentage === currentPercentage)
            ?.occurrences ?? 0) <=
          // )
          history.length / 2
      ) {
        // console.log(
        //   'prevent flickering. Reset to currentPercentage:',
        //   percentage,
        //   '->',
        //   currentPercentage
        // );
        percentage = currentPercentage;
      }
    }
    // console.log('average', detectedPercentage, percentage, percentagesOccurrence, history)

    let adjustment = percentage - currentPercentage;
    // console.log('percentage check', currentPercentage, '->', percentage, '[', adjustment, '] (', detectedPercentage, ')') // history)
    if (
      percentage !== 0 &&
      adjustment > -this.maxDivergencePercentage &&
      adjustment <= 0
    ) {
      // Ignore small adjustments
      adjustment = detectedPercentage - currentPercentage;
      if (adjustment > -this.maxDivergencePercentage && adjustment <= 0) {
        percentage = undefined;
      } else {
        // console.log(
        //   'medium change, reset to currentpercentage',
        //   percentage,
        //   '->',
        //   currentPercentage,
        //   '[',
        //   adjustment,
        //   '] (',
        //   detectedPercentage,
        //   ')'
        percentage = currentPercentage; // Disable throttling
      }
    }

    // Reduce recurring flickering to one flicker
    const ignoreRecurringLowerPercentage =
      percentage < currentPercentage &&
      history.some(
        ({ percentage: previousPercentage }) =>
          Math.abs(currentPercentage - previousPercentage) <
          this.groupByPercentage
      ) &&
      history.some(
        ({ percentage: previousPercentage }) =>
          Math.abs(detectedPercentage - previousPercentage) <
          this.groupByPercentage
      );

    // console.log(
    //   'percentage:',
    //   percentage,
    //   'ignore lower recurring:',
    //   ignoreRecurringLowerPercentage,
    //   'colorchange:',
    //   colorChanged,
    //   JSON.parse(JSON.stringify(history))
    // );

    if (colorChanged && percentage !== currentPercentage) {
      // console.log('colorChanged, clearing history with deviating percentages');
      const nonDeviatingPercentages = history.filter(
        (info) =>
          Math.abs(info.percentage - percentage) < this.maxDivergencePercentage
      );
      if (history.length !== nonDeviatingPercentages.length) {
        history.splice(0, history.length);
        history.push(...nonDeviatingPercentages);
      }
    }

    history.push({ percentage: detectedPercentage, certainty, color });
    if (history.length > averageHistorySize)
      history.splice(0, history.length - averageHistorySize);

    if (ignoreRecurringLowerPercentage) {
      return;
    }

    return percentage < minPercentage ? 0 : percentage;
  }

  idleHandler = async (
    runId,
    buffer,
    detectColored,
    offsetPercentage,
    detectHorizontal,
    currentHorizontalPercentage,
    detectVertical,
    currentVerticalPercentage,
    ratio,
    allowedToTransfer,
    averageHistorySize,
    allowedAnomaliesPercentage,
    allowedUnevenBarsPercentage,
    callback
  ) => {
    if (this.runId !== runId) return;

    let canvasInfo;
    let bufferCtx;
    try {
      const start = performance.now();

      if (
        this.worker.isFallbackWorker ||
        !allowedToTransfer ||
        !buffer.transferToImageBitmap ||
        !buffer.getContext
      ) {
        if (!this.canvas) {
          this.canvas = new SafeOffscreenCanvas(
            512,
            512
            // Math.min(buffer.videoWidth || buffer.width || 512, 512),
            // Math.min(buffer.videoHeight || buffer.height || 512, 512)
          );
          // Smallest size to prevent many garbage collections caused by transferToImageBitmap
          this.ctx = undefined;
        }

        if (
          !this.ctx ||
          (this.ctx?.isContextLost && this.ctx.isContextLost())
        ) {
          this.ctx = this.canvas.getContext('2d', {
            // alpha: false, // Decreases performance on some platforms
            desynchronized: true,
          });
          this.ctx.imageSmoothingEnabled = true;
        }

        this.ctx.drawImage(buffer, 0, 0, this.canvas.width, this.canvas.height);
        canvasInfo =
          this.worker.isFallbackWorker || !this.canvas.transferToImageBitmap
            ? {
                canvas: this.canvas,
                ctx: this.ctx,
              }
            : {
                bitmap: this.canvas.transferToImageBitmap(),
              };
      } else {
        bufferCtx = buffer.getContext('2d');
        if (bufferCtx instanceof Promise) bufferCtx = await bufferCtx;
        if (
          bufferCtx &&
          (!bufferCtx.isContextLost || !bufferCtx.isContextLost())
        ) {
          canvasInfo = {
            bitmap: buffer.transferToImageBitmap(),
          };
        }
      }

      if (this.runId !== runId) {
        if (canvasInfo?.bitmap) {
          canvasInfo.bitmap.close();
        }
        return;
      }

      if (!canvasInfo) {
        this.running = false;
        return;
      }

      this.ambientlight.stats.updateBarDetectionImage(
        canvasInfo.bitmap ?? canvasInfo.canvas
      );

      const stack = new Error().stack;
      const onMessagePromise = new Promise(
        function onMessagePromise(resolve, reject) {
          this.onWorkerRejectListener = (err) => reject(err);
          this.onWorkerMessageListener = async (e) => {
            try {
              if (e.data.id !== this.runId) {
                // console.warn('Ignoring old bar detection percentage:',
                //   this.runId, e.data.id, e.data.horizontalPercentage,  e.data.verticalPercentage)
                // console.log(e.data.id, 'onmessage but discarded')
                resolve();
                return;
              }
              if (e.data.error) {
                const error = e.data.error;
                // Readable name for the worker script
                error.stack = error.stack?.replace(
                  /blob:.+?:\/.+?:/g,
                  'extension://scripts/bar-detection-worker.js:'
                );
                appendErrorStack(stack, error);
                throw error;
              }

              const minPercentage = 1.25 + offsetPercentage;
              const { horizontalBarSizeInfo = {}, verticalBarSizeInfo = {} } =
                e.data;

              const firstDetection =
                this.history.horizontal.length === 0 &&
                this.history.vertical.length === 0;

              let horizontalPercentage = this.averagePercentage(
                horizontalBarSizeInfo,
                this.current.horizontal,
                minPercentage,
                this.history.horizontal,
                averageHistorySize
              );
              let verticalPercentage = this.averagePercentage(
                verticalBarSizeInfo,
                this.current.vertical,
                minPercentage,
                this.history.vertical,
                averageHistorySize
              );
              let barsFound =
                horizontalPercentage !== undefined ||
                verticalPercentage !== undefined;

              // console.log(currentHorizontalPercentage, horizontalBarSizeInfo.percentage, horizontalPercentage, this.history.horizontal)
              await this.ambientlight.stats.updateBarDetectionResult(
                barsFound,
                horizontalBarSizeInfo,
                verticalBarSizeInfo,
                horizontalPercentage ?? currentHorizontalPercentage ?? 0,
                verticalPercentage ?? currentVerticalPercentage ?? 0
              );

              if (e.data.id !== this.runId) {
                // console.warn('Ignoring old bar detection percentage:',
                //   this.runId, e.data.id, e.data.horizontalPercentage,  e.data.verticalPercentage)
                // console.log(e.data.id, 'onmessage but discarded after updateBarDetectionResult')
                resolve();
                return;
              }

              if (firstDetection) {
                if (horizontalPercentage === undefined)
                  horizontalPercentage = 0;
                if (verticalPercentage === undefined) verticalPercentage = 0;
                barsFound = true;
              }

              const barsChanged =
                (barsFound &&
                  horizontalPercentage !== undefined &&
                  horizontalPercentage !== currentHorizontalPercentage) ||
                (verticalPercentage !== undefined &&
                  verticalPercentage !== currentVerticalPercentage);

              const detectedLargeChange =
                (horizontalBarSizeInfo.percentage > minPercentage &&
                  Math.abs(
                    horizontalBarSizeInfo.percentage -
                      (currentHorizontalPercentage || 0)
                  ) > 0.5) ||
                (verticalBarSizeInfo.percentage > minPercentage &&
                  Math.abs(
                    verticalBarSizeInfo.percentage -
                      (currentVerticalPercentage || 0)
                  ) > 0.5);
              if (barsChanged || detectedLargeChange) {
                const now = performance.now();
                if (
                  barsChanged ||
                  this.changes[this.changes.length - 1] < now - 3000
                ) {
                  this.changes.push(now);
                }
              }

              if (horizontalPercentage !== undefined) {
                this.current.horizontal = {
                  percentage: horizontalPercentage,
                  color: horizontalBarSizeInfo.color, // Can desync with percentage, return from averagePercentage as well?
                };
              }
              if (verticalPercentage !== undefined) {
                this.current.vertical = {
                  percentage: verticalPercentage,
                  color: verticalBarSizeInfo.color, // Can desync with percentage, return from averagePercentage as well?
                };
              }

              if (barsChanged) {
                callback(horizontalPercentage, verticalPercentage);
              }

              // console.log(e.data.id, 'onmessage received', barsChanged, horizontalPercentage, verticalPercentage)
              resolve();
            } catch (ex) {
              reject(ex);
            }
          };
        }.bind(this)
      );
      this.worker.postMessage(
        {
          id: runId,
          canvasInfo,
          detectColored,
          offsetPercentage,
          detectHorizontal,
          currentHorizontalPercentage,
          detectVertical,
          currentVerticalPercentage,
          ratio,
          allowedAnomaliesPercentage,
          allowedUnevenBarsPercentage,
          xOffsetSize: averageHistorySize,
        },
        canvasInfo.bitmap ? [canvasInfo.bitmap] : undefined
      );
      await onMessagePromise;
      if (this.runId !== runId) return;

      const now = performance.now();
      const duration = now - start;
      this.ambientlight.stats.addBarDetectionDuration(duration);

      if (this.changes.length > 1) {
        const minuteAgo = performance.now() - 60000;
        this.changes = this.changes.filter((change) => change > minuteAgo);
      } else if (!this.changes.length) {
        this.changes.push(now - 3001);
      }

      let minThrottle;
      const lastChange = this.changes[this.changes.length - 1];
      if (this.changes.length >= 5) {
        minThrottle =
          lastChange + 60000 < now ? 1000 : lastChange + 8000 < now ? 500 : 0;
      } else {
        minThrottle =
          lastChange + 15000 < now ? 1000 : lastChange + 3000 < now ? 500 : 0;
      }

      const throttle = Math.max(
        minThrottle,
        Math.min(5000, Math.pow(duration, 1.2) - 250)
      );
      this.ambientlight.stats.updateBarDetectionInfo(
        throttle,
        this.changes[this.changes.length - 1]
      );

      this.timeout = setTimeout(
        wrapErrorHandler(() => {
          this.timeout = undefined;
          if (this.runId !== runId) return;

          this.running = false;
        }),
        throttle
      );
    } catch (ex) {
      // Happens when the video has been emptied or canvas is cleared before the idleCallback has been executed
      const isKnownError =
        ex.message?.includes('ImageBitmap construction failed') || // Chromium
        ex.name === 'DataCloneError'; // Firefox
      if (!isKnownError) {
        ex.details = {
          ...(ex.details ? { details: ex.details } : {}),
          detectColored,
          offsetPercentage,
          detectHorizontal,
          currentHorizontalPercentage,
          detectVertical,
          currentVerticalPercentage,
          ratio,
          allowedToTransfer,
          buffer: buffer
            ? {
                width: buffer.width,
                height: buffer.height,
                ctx: buffer.ctx?.constructor?.name,
                type: buffer.constructor?.name,
              }
            : undefined,
          bufferCtx: bufferCtx?.constructor?.name,
          canvasInfo: canvasInfo
            ? {
                canvas: canvasInfo?.canvas
                  ? {
                      width: canvasInfo.canvas.width,
                      height: canvasInfo.canvas.height,
                      type: canvasInfo.canvas.constructor?.name,
                    }
                  : undefined,
                ctx: canvasInfo.ctx?.constructor?.name,
                bitmap: canvasInfo?.bitmap
                  ? {
                      width: canvasInfo.bitmap.width,
                      height: canvasInfo.bitmap.height,
                      type: canvasInfo.bitmap.constructor?.name,
                    }
                  : undefined,
              }
            : undefined,
        };
      }

      if (this.runId === runId) {
        if (canvasInfo?.bitmap) {
          canvasInfo.bitmap.close();
        }
        this.running = false;
      }

      if (this.catchedDetectBarSizeError || isKnownError) return;

      this.catchedDetectBarSizeError = true;
      throw ex;
    }
  };
}
__exports["default"] = BarDetection;
return __exports;
})();

// ==================== module: theming (third_party/youtube-ambilight/src/libs/theming.js) ====================
__modules["theming"] = (() => {
const __exports = {};
const { getCookie, isEmbedPageUrl, isWatchPageUrl, on, requestIdleCallback, wrapErrorHandler } = __require('generic');
const { injectedScript } = __require('messaging/injected');
const { default: SentryReporter } = __require('errors/sentry-reporter');
const { storage } = __require('storage');





const THEME_LIGHT = -1;
const THEME_DEFAULT = 0;
const THEME_DARK = 1;

class Theming {
  constructor(ambientlight) {
    this.ambientlight = ambientlight;
    this.settings = ambientlight.settings;
  }

  initListeners() {
    // Appearance (theme) changes initiated by the YouTube menu
    this.youtubeTheme = this.isDarkTheme() ? 1 : -1;
    on(
      document,
      'yt-action',
      async (e) => {
        if (!this.settings.enabled) return;
        const name = e?.detail?.actionName;
        if (name === 'yt-signal-action-toggle-dark-theme-off') {
          this.youtubeTheme = await this.prefCookieToTheme();
          this.updateTheme();
        } else if (name === 'yt-signal-action-toggle-dark-theme-on') {
          this.youtubeTheme = await this.prefCookieToTheme();
          this.updateTheme();
        } else if (name === 'yt-signal-action-toggle-dark-theme-device') {
          this.youtubeTheme = await this.prefCookieToTheme();
          this.updateTheme();
        } else if (name === 'yt-forward-redux-action-to-live-chat-iframe') {
          // Let YouTube change the theme to an incorrect color in this process
          requestIdleCallback(
            function forwardReduxActionToLiveChatIframe() {
              // Fix the theme to the correct color after the process
              if (!this.ambientlight.isOnVideoPage) return;
              if (e.detail.args?.[0]?.type === 'SET_WATCH_SCROLL_TOP') return;

              this.updateLiveChatTheme();
            }.bind(this),
            { timeout: 1 }
          );
        }
      },
      undefined,
      true
    );

    try {
      // Firefox does not support the cookieStore
      if (globalThis.cookieStore?.addEventListener) {
        cookieStore.addEventListener(
          'change',
          wrapErrorHandler(async (e) => {
            for (const change of e.changed) {
              if (change.name !== 'PREF') continue;

              this.youtubeTheme = await this.prefCookieToTheme(change.value);
              this.updateTheme();
            }
          }, true)
        );
      }
      matchMedia('(prefers-color-scheme: dark)').addEventListener(
        'change',
        wrapErrorHandler(async () => {
          this.youtubeTheme = await this.prefCookieToTheme();
          this.updateTheme();
        }, true)
      );
    } catch (ex) {
      SentryReporter.captureException(ex);
    }

    let themeCorrections = 0;
    this.themeObserver = new MutationObserver(
      wrapErrorHandler(
        function themeMutation() {
          if (!this.shouldToggleTheme()) return;

          themeCorrections++;
          this.updateTheme();
          if (themeCorrections === 5) this.themeObserver.disconnect();
        }.bind(this),
        true
      )
    );
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['dark'],
    });

    if (isEmbedPageUrl()) return;

    this.initLiveChat(); // Depends on this.youtubeTheme set in initListeners
  }

  prefCookieToTheme = async (cookieValue) => {
    if (!cookieValue) {
      cookieValue = (await getCookie('PREF'))?.value || '';
    }

    let f6 = new URLSearchParams(cookieValue)?.get('f6') || null;
    if (f6 != null && /^[A-Fa-f0-9]+$/.test(f6)) {
      f6 = parseInt(f6, 16);
    }
    f6 = f6 || 0;

    if (f6 & (1 << 165 % 31)) return THEME_DARK;
    if (f6 & (1 << 174 % 31)) return THEME_LIGHT;
    if (matchMedia('(prefers-color-scheme: dark)').matches) return THEME_DARK;
    return THEME_LIGHT;
  };

  isDarkTheme = () => document.documentElement.getAttribute('dark') != null;

  shouldBeDarkTheme = (enabledAndVisible) => {
    const enabled =
      enabledAndVisible === undefined
        ? !this.settings.enabled || this.ambientlight.isHidden
        : !enabledAndVisible;
    const toTheme =
      enabled || this.settings.theme === THEME_DEFAULT
        ? this.youtubeTheme
        : this.settings.theme;
    return toTheme === THEME_DARK;
  };

  shouldToggleTheme = () => {
    const toDark = this.shouldBeDarkTheme();
    return !(this.isDarkTheme() === toDark || (toDark && !isWatchPageUrl()));
  };

  updateTheme = wrapErrorHandler(
    async function updateTheme(fromSettings = false) {
      if (
        this.updatingTheme ||
        (!fromSettings && this.settings.theme === THEME_DEFAULT) ||
        !this.shouldToggleTheme()
      )
        return;

      this.updatingTheme = true;

      if (this.themeToggleFailed !== false) {
        const lastFailedThemeToggle = await new Promise(
          // eslint-disable-next-line no-async-promise-executor
          async (resolve, reject) => {
            try {
              let timeout = setTimeout(() => {
                timeout = undefined;
                resolve();
              }, 5000);
              const result = await storage.get('last-failed-theme-toggle');
              if (!timeout) return;

              clearTimeout(timeout);
              resolve(result);
            } catch (ex) {
              reject(ex);
            }
          }
        );

        if (lastFailedThemeToggle) {
          const now = new Date().getTime();
          const withinThresshold = now - 10000 < lastFailedThemeToggle;
          if (withinThresshold) {
            this.settings.setWarning(
              `Because the previous theme toggle attempt failed to prevent repeated page refreshes, the automatic toggle to the ${
                this.isDarkTheme() ? 'light' : 'dark'
              } appearance has been disabled for 10 seconds.\n\nSet the "Appearance (theme)" setting to "Default" to disable the automatic appearance toggle permanently if it keeps on failing.\n(And let me know via the feedback form that it failed so that I can fix it in the next version of the extension)`
            );
            this.updatingTheme = false;
            return;
          }
          storage.set('last-failed-theme-toggle', undefined);
        }
        if (this.themeToggleFailed) {
          this.settings.setWarning('');
          this.themeToggleFailed = false;
        }

        if (!this.shouldToggleTheme()) {
          this.updatingTheme = false;
          return;
        }
      }

      await this.toggleDarkTheme();
      this.updatingTheme = false;
    }.bind(this),
    true
  );

  async updateDocumentTheme(toDark) {
    await injectedScript.postAndReceiveMessage('update-theme', toDark);
  }

  async toggleDarkTheme() {
    const wasDark = this.isDarkTheme();
    await this.updateDocumentTheme(!wasDark);
    if (!isEmbedPageUrl()) {
      this.updateLiveChatTheme();
    }

    const isDark = this.isDarkTheme();
    if (wasDark !== isDark) return;

    this.themeToggleFailed = true;
    await storage.set('last-failed-theme-toggle', new Date().getTime());
    this.settings.setWarning(
      `Failed to toggle the page theme to from ${
        wasDark ? 'dark' : 'light'
      } to ${
        isDark ? 'dark' : 'light'
      } mode.\n\nSet the "Appearance (theme)" setting to "Default" to disable the automatic appearance toggle permanently if it keeps on failing.\n(And let me know via the feedback form that it failed so that I can fix it in the next version of the extension)`
    );
  }

  initLiveChat = () => {
    this.initLiveChatSecondaryElem();
    if (this.secondaryElem) return;

    const observer = new MutationObserver(
      wrapErrorHandler(
        function initLiveChatMutation() {
          this.initLiveChatSecondaryElem();
          if (!this.secondaryElem) return;

          observer.disconnect();
        }.bind(this),
        true
      )
    );
    observer.observe(this.ambientlight.ytdAppElem, {
      childList: true,
      subtree: true,
    });
  };

  initLiveChatSecondaryElem = () => {
    this.secondaryElem = document.querySelector('#secondary');
    if (!this.secondaryElem) return;

    this.initLiveChatElem();
    const observer = new MutationObserver(
      wrapErrorHandler(this.initLiveChatElem)
    );
    observer.observe(this.secondaryElem, {
      childList: true,
    });
  };

  initLiveChatElem = () => {
    const liveChatElem = document.querySelector('ytd-app ytd-live-chat-frame');
    if (!liveChatElem || this.liveChatElem === liveChatElem) return;

    liveChatElem.dataset.ytalElem = 'live-chat';
    this.liveChatElem = liveChatElem;

    this.initLiveChatIframe();
    const observer = new MutationObserver(
      wrapErrorHandler(this.initLiveChatIframe)
    );
    observer.observe(liveChatElem, {
      childList: true,
    });
  };

  initLiveChatIframe = () => {
    const iframeElem = document.querySelector(
      'ytd-app ytd-live-chat-frame iframe'
    );
    if (!iframeElem || this.liveChatIframeElem === iframeElem) return;

    this.liveChatIframeElem = iframeElem;
    this.updateLiveChatTheme();
    on(iframeElem, 'load', () => {
      this.ambientlight.updateLayoutPerformanceImprovements();
      this.updateLiveChatTheme();
    });
  };

  updateLiveChatThemeThrottle = {};
  updateLiveChatTheme = () => {
    if (!this.liveChatElem || !this.liveChatIframeElem) this.initLiveChatElem();
    if (!this.liveChatElem || !this.liveChatIframeElem) return;
    if (this.updateLiveChatThemeThrottle.timeout) return;

    const update = function updateLiveChatThemeUpdate() {
      this.updateLiveChatThemeThrottle.updateTime = performance.now();
      if (!this.ambientlight.isOnVideoPage) return;

      const toDark = this.shouldBeDarkTheme();
      injectedScript.postMessage('set-live-chat-theme', toDark);
    }.bind(this);

    if (this.updateLiveChatThemeThrottle.updateTime > performance.now() - 500) {
      this.updateLiveChatThemeThrottle.timeout = setTimeout(() => {
        update();
        this.updateLiveChatThemeThrottle.timeout = undefined;
      }, 500);
    } else {
      update();
    }
  };
}
__exports["default"] = Theming;
return __exports;
})();

// ==================== module: stats (third_party/youtube-ambilight/src/libs/stats.js) ====================
__modules["stats"] = (() => {
const __exports = {};
const { Canvas, SafeOffscreenCanvas, on, requestIdleCallback } = __require('generic');


class Stats {
  frametimesHistoryMax = 120;
  barDetectionDurationsMax = 5;

  constructor(ambientlight) {
    this.ambientlight = ambientlight;
    this.settings = ambientlight.settings;
  }

  initElems() {
    if (this.FPSListElem) return;

    this.FPSListElem = document.createElement('div');
    this.FPSListElem.classList.add('ambientlight__fps-list');

    this.ambientlightFTElem = document.createElement('div');
    this.ambientlightFTElem.classList.add('ambientlight__ambientlight-ft');
    this.ambientlightFTElem.style.display = 'none';

    this.ambientlightFTLegendElem = document.createElement('div');
    this.ambientlightFTLegendElem.classList.add(
      'ambientlight__ambientlight-ft-legend'
    );
    const ambientlightFTLegendElemNode = document.createTextNode('');
    this.ambientlightFTLegendElem.appendChild(ambientlightFTLegendElemNode);
    this.ambientlightFTElem.append(this.ambientlightFTLegendElem);

    this.ambientlightFTAxisLegendsElem = document.createElement('div');
    this.ambientlightFTAxisLegendsElem.classList.add(
      'ambientlight__ambientlight-ft-axis-legends'
    );

    this.ambientlightFTAxisLegendTopElem = document.createElement('div');
    this.ambientlightFTAxisLegendTopElem.classList.add(
      'ambientlight__ambientlight-ft-axis-legend',
      'ambientlight__ambientlight-ft-axis-legend--top'
    );
    const ambientlightFTAxisLegendTopElemNode = document.createTextNode('');
    this.ambientlightFTAxisLegendTopElem.appendChild(
      ambientlightFTAxisLegendTopElemNode
    );
    this.ambientlightFTAxisLegendsElem.append(
      this.ambientlightFTAxisLegendTopElem
    );

    this.ambientlightFTAxisLegendBottomElem = document.createElement('div');
    this.ambientlightFTAxisLegendBottomElem.classList.add(
      'ambientlight__ambientlight-ft-axis-legend',
      'ambientlight__ambientlight-ft-axis-legend--bottom'
    );
    const ambientlightFTAxisLegendBottomElemNode = document.createTextNode('');
    this.ambientlightFTAxisLegendBottomElem.appendChild(
      ambientlightFTAxisLegendBottomElemNode
    );
    this.ambientlightFTAxisLegendsElem.append(
      this.ambientlightFTAxisLegendBottomElem
    );

    this.ambientlightFTElem.append(this.ambientlightFTAxisLegendsElem);

    this.FPSListElem.append(this.ambientlightFTElem);

    const appendFPSItem = (className) => {
      const elem = document.createElement('div');
      elem.classList.add(className);
      const textNode = document.createTextNode('');
      elem.appendChild(textNode);
      this.FPSListElem.append(elem);
      return elem;
    };

    this.displayFPSElem = appendFPSItem('ambientlight__display-fps');
    this.videoFPSElem = appendFPSItem('ambientlight__video-fps');
    this.videoDroppedFramesElem = appendFPSItem(
      'ambientlight__video-dropped-frames'
    );
    this.videoSyncedElem = appendFPSItem('ambientlight__video-synced');
    this.ambientlightFPSElem = appendFPSItem('ambientlight__ambientlight-fps');
    this.ambientlightDroppedFramesElem = appendFPSItem(
      'ambientlight__ambientlight-dropped-frames'
    );

    this.videoResolutionElem = appendFPSItem('ambientlight__video-resolution');
    this.videoSyncedResolutionElem = appendFPSItem(
      'ambientlight__video-synced-resolution'
    );
    if (!this.ambientlight.shouldDrawDirectlyFromVideoElem())
      this.videoBufferResolutionElem = appendFPSItem(
        'ambientlight__video-buffer-resolution'
      );
    this.projectorBufferResolutionElem = appendFPSItem(
      'ambientlight__projector-buffer-resolution'
    );
    this.projectorResolutionElem = appendFPSItem(
      'ambientlight__projector-resolution'
    );

    this.barDetectionFPSElem = appendFPSItem(
      'ambientlight__ambientlight-bar-detection-fps'
    );
    this.barDetectionDurationElem = appendFPSItem(
      'ambientlight__ambientlight-bar-detection-duration'
    );
    this.barDetectionHorizontalResultElem = appendFPSItem(
      'ambientlight__ambientlight-bar-detection-horizontal-result'
    );
    this.barDetectionVerticalResultElem = appendFPSItem(
      'ambientlight__ambientlight-bar-detection-vertical-result'
    );
    this.barDetectionGraphElem = appendFPSItem(
      'ambientlight__ambientlight-bar-detection-graph'
    );
    this.barDetectionGraphElem.style.height = '256px';
    this.barDetectionGraphElem.style.display = 'none';
  }

  hide(onlyDisabled = false) {
    if (!onlyDisabled || !this.settings.showResolutions) {
      this.videoResolutionElem.childNodes[0].nodeValue = '';
      this.videoSyncedResolutionElem.childNodes[0].nodeValue = '';
      if (this.videoBufferResolutionElem)
        this.videoBufferResolutionElem.childNodes[0].nodeValue = '';
      this.projectorBufferResolutionElem.childNodes[0].nodeValue = '';
      this.projectorResolutionElem.childNodes[0].nodeValue = '';
    }

    if (!onlyDisabled || !this.settings.showFPS) {
      this.videoFPSElem.childNodes[0].nodeValue = '';
      this.videoDroppedFramesElem.childNodes[0].nodeValue = '';
      this.videoSyncedElem.childNodes[0].nodeValue = '';
      this.ambientlightFPSElem.childNodes[0].nodeValue = '';
      this.ambientlightDroppedFramesElem.childNodes[0].nodeValue = '';
    }

    if (
      !onlyDisabled ||
      !this.settings.showBarDetectionStats ||
      !this.settings.detectHorizontalBarSizeEnabled
    ) {
      this.barDetectionHorizontalResultElem.childNodes[0].nodeValue = '';
    }

    if (
      !onlyDisabled ||
      !this.settings.showBarDetectionStats ||
      !this.settings.detectVerticalBarSizeEnabled
    ) {
      this.barDetectionVerticalResultElem.childNodes[0].nodeValue = '';
    }

    if (
      !onlyDisabled ||
      !this.settings.showBarDetectionStats ||
      (!this.settings.detectHorizontalBarSizeEnabled &&
        !this.settings.detectVerticalBarSizeEnabled)
    ) {
      this.barDetectionDurations = [];
      this.barDetectionDurationElem.childNodes[0].nodeValue = '';
      this.barDetectionFPSElem.childNodes[0].nodeValue = '';

      if (this.barDetectionCanvas?.parentNode) {
        if (this.barDetectionCtx) {
          this.barDetectionCtx.clearRect(
            0,
            0,
            this.barDetectionCanvas.width,
            this.barDetectionCanvas.height
          );
          this.barDetectionCanvas.width = 1;
          this.barDetectionCanvas.height = 1;
        }

        if (this.barDetectionBufferCtx) {
          this.barDetectionBufferCtx.clearRect(
            0,
            0,
            this.barDetectionBufferCanvas.width,
            this.barDetectionBufferCanvas.height
          );
          this.barDetectionBufferCanvas.width = 1;
          this.barDetectionBufferCanvas.height = 1;
        }

        this.barDetectionGraphElem.removeChild(this.barDetectionCanvas);
        this.barDetectionGraphElem.style.display = 'none';
      }
    }

    if (
      !onlyDisabled ||
      !this.settings.showFPS ||
      !this.settings.showFrametimes
    ) {
      this.displayFPSElem.childNodes[0].nodeValue = '';
    }

    if (!onlyDisabled || !this.settings.showFrametimes) {
      this.ambientlightFTLegendElem.childNodes[0].nodeValue = '';

      if (this.frameTimesCanvas?.parentNode) {
        if (this.frameTimesCtx)
          this.frameTimesCtx.clearRect(
            0,
            0,
            this.frameTimesCanvas.width,
            this.frameTimesCanvas.height
          );
        this.ambientlightFTElem.removeChild(this.frameTimesCanvas);
        this.ambientlightFTElem.style.display = 'none';
      }
    }

    if (
      this.FPSListElem?.isConnected &&
      (!onlyDisabled ||
        (!this.settings.showBarDetectionStats &&
          !this.settings.showResolutions &&
          !this.settings.showFPS &&
          !this.settings.showFrametimes))
    ) {
      this.FPSListElem.remove();
    }
  }

  videoFrameTimes = [];
  frameTimes = [];

  update() {
    if (this.ambientlight.isHidden) return;

    if (this.settings.showResolutions) {
      const videoResolution = `VIDEO: ${
        this.ambientlight.videoElem?.videoWidth ?? '?'
      }x${this.ambientlight.videoElem?.videoHeight ?? '?'}`;
      const videoSyncedResolution = this.settings.videoOverlayEnabled
        ? `VIDEO SYNCED: ${
            this.ambientlight.videoOverlay?.elem?.width ?? '?'
          }x${this.ambientlight.videoOverlay?.elem?.height ?? '?'}`
        : '';
      const projector = this.ambientlight.projector;
      const projectorBufferResolution = this.settings.webGL
        ? `AMBIENT BUFFER: ${projector?.elem?.width ?? '?'}x${
            projector?.elem?.height ?? '?'
          } 
         [ load: ${(projector?.loadTime ?? 0).toFixed(1)}ms
          | draw: ${(projector?.drawTime ?? 0).toFixed(1)}ms]`
        : '';
      const projectorResolution = `AMBIENT: ${
        this.settings.webGL
          ? `${projector?.blurCanvas?.width ?? '?'}x${
              projector?.blurCanvas?.height ?? '?'
            } 
          [ clear: ${(projector?.blurClearTime ?? 0).toFixed(1)}ms
          | draw: ${(projector?.blurDrawTime ?? 0).toFixed(1)}ms]`
          : projector?.projectors?.length
          ? `${projector?.projectors[0]?.elem?.width ?? '?'}x${
              projector?.projectors[0]?.elem?.height ?? '?'
            }`
          : `?x?`
      }`;

      this.videoResolutionElem.childNodes[0].nodeValue = videoResolution;
      this.videoSyncedResolutionElem.childNodes[0].nodeValue =
        videoSyncedResolution;
      this.projectorBufferResolutionElem.childNodes[0].nodeValue =
        projectorBufferResolution;
      this.projectorResolutionElem.childNodes[0].nodeValue =
        projectorResolution;

      if (this.videoBufferResolutionElem) {
        const projectorBuffer = this.ambientlight.projectorBuffer;
        const videoBufferResolution = `
          VIDEO BUFFER: ${projectorBuffer?.elem?.width ?? '?'}x${
          projectorBuffer?.elem?.height ?? '?'
        }${
          projectorBuffer?.ctx?.loadTime === undefined
            ? ''
            : `
          [ load: ${(projectorBuffer?.ctx?.loadTime ?? 0).toFixed(1)}ms
          | draw: ${(projectorBuffer?.ctx?.drawTime ?? 0).toFixed(1)}ms]`
        }`;
        this.videoBufferResolutionElem.childNodes[0].nodeValue =
          videoBufferResolution;
      }
    }

    if (this.settings.showFPS) {
      // Video FPS
      const videoFrameRate = this.ambientlight.videoFrameRate;
      const videoFPSText = `VIDEO: ${videoFrameRate.toFixed(2)} ${
        videoFrameRate ? `(${(1000 / videoFrameRate).toFixed(1)}ms)` : ''
      }`;

      // Video dropped frames
      const videoDroppedFrameCount =
        this.ambientlight.getVideoDroppedFrameCount();
      const videoDroppedFramesText = `VIDEO DROPPED: ${videoDroppedFrameCount}`;
      const videoDroppedFramesColor =
        videoDroppedFrameCount > 0 ? '#ff3' : '#7f7';

      // Video synced
      let videoSyncedText = '';
      let videoSyncedColor = '#f55';
      if (this.settings.videoOverlayEnabled) {
        const videoOverlay = this.ambientlight.videoOverlay;
        videoSyncedText = `VIDEO SYNCED: ${
          videoOverlay?.isHidden ? 'NO' : 'YES'
        }`;
        videoSyncedColor = videoOverlay?.isHidden ? '#f55' : '#7f7';
      }

      // Ambientlight FPS
      const ambientlightFrameRate = this.ambientlight.ambientlightFrameRate;
      const framerateLimit = this.ambientlight.getRealFramerateLimit();
      const ambientlightFPSText = `AMBIENT: ${ambientlightFrameRate.toFixed(
        2
      )} ${
        ambientlightFrameRate
          ? `(${(1000 / ambientlightFrameRate).toFixed(1)}ms)${
              framerateLimit ? ` LIMITED TO: ${framerateLimit.toFixed(2)}` : ''
            }`
          : ''
      }`;
      const ambientlightFrameRateTarget = framerateLimit
        ? Math.min(videoFrameRate, framerateLimit)
        : videoFrameRate;
      const ambientlightFPSColor =
        ambientlightFrameRate < ambientlightFrameRateTarget * 0.9
          ? '#f55'
          : ambientlightFrameRate < ambientlightFrameRateTarget - 0.2
          ? '#ff3'
          : '#7f7';

      // Ambientlight dropped frames
      const ambientlightDroppedFramesText = `AMBIENT DROPPED: ${this.ambientlight.ambientlightVideoDroppedFrameCount}`;
      const ambientlightDroppedFramesColor =
        this.ambientlight.ambientlightVideoDroppedFrameCount > 0
          ? '#ff3'
          : '#7f7';

      // Render all stats

      this.videoFPSElem.childNodes[0].nodeValue = videoFPSText;

      this.videoDroppedFramesElem.childNodes[0].nodeValue =
        videoDroppedFramesText;
      this.videoDroppedFramesElem.style.color = videoDroppedFramesColor;

      this.videoSyncedElem.childNodes[0].nodeValue = videoSyncedText;
      this.videoSyncedElem.style.color = videoSyncedColor;

      this.ambientlightFPSElem.childNodes[0].nodeValue = ambientlightFPSText;
      this.ambientlightFPSElem.style.color = ambientlightFPSColor;

      this.ambientlightDroppedFramesElem.childNodes[0].nodeValue =
        ambientlightDroppedFramesText;
      this.ambientlightDroppedFramesElem.style.color =
        ambientlightDroppedFramesColor;
    }

    if (this.settings.showFrametimes && this.settings.showFPS) {
      // Display FPS
      const displayFrameRate = Math.max(24, this.ambientlight.displayFrameRate);
      const videoFrameRate = this.ambientlight.videoFrameRate;
      const displayFPSText = `DISPLAY: ${displayFrameRate.toFixed(2)} ${
        displayFrameRate ? `(${(1000 / displayFrameRate).toFixed(1)}ms)` : ''
      }`;
      const displayFPSColor =
        displayFrameRate < videoFrameRate - 1
          ? '#f55'
          : displayFrameRate < videoFrameRate - 0.2
          ? '#ff3'
          : '#7f7';

      this.displayFPSElem.childNodes[0].nodeValue = displayFPSText;
      this.displayFPSElem.style.color = displayFPSColor;
    } else if (this.displayFPSElem.childNodes[0].nodeValue !== '') {
      this.displayFPSElem.childNodes[0].nodeValue = '';
    }

    this.updateFrameTimes();
    this.updateBarDetectionDurations();

    if (
      (this.settings.showBarDetectionStats ||
        this.settings.showFPS ||
        this.settings.showResolutions ||
        this.settings.showFrametimes) &&
      this.FPSListElem?.isConnected === false
    ) {
      this.ambientlight.videoPlayerElem?.prepend(this.FPSListElem);
    }
  }

  // Mimic received video frame stats
  receiveAnimationFrametimes = (compose, presentedFrames) => {
    this.receiveVideoFrametimes(compose, {
      presentedFrames,
      presentationTime: compose,
      processingDuration:
        this.previousPresentedFrames === presentedFrames
          ? 0
          : 0.125 / Math.max(24, this.ambientlight.displayFrameRate),
      expectedDisplayTime:
        compose + 1000 / Math.max(24, this.ambientlight.displayFrameRate),
    });
  };

  // Flow of the browsers rendering pipeline (with durations & timestamps)
  //
  // Media playback engine: ━━► decode [processingDuration] ━━► present to compositor [presentationTime] ━┳ (can be before or after compose)
  // Compositor:                                      ━━► compose [timestamp] ━┻━ handle animation/videoFrameCallbacks ━━► do other things ━━► gather received painted frames ━━► display [expectedDisplayTime]
  // Main thread:      ━━► requestVideoFrameCallback to compositor ━┻ (can before or after compose)     ┻━► receiveVideoFrameCallback [receive] ━━► present rendered canvasses to compositor ━┻ (can be before or after display)

  receiveVideoFrametimes = (compose, info) => {
    if (!this.settings.showFrametimes) return;

    const now = performance.now();
    if (this.previousPresentedFrames) {
      const skippedFrames =
        info.presentedFrames - this.previousPresentedFrames - 1;
      // const videoFrameDuration = 1000 / Math.max(1, this.ambientlight.videoFrameRate)
      for (let i = 0; i < skippedFrames; i++) {
        // const offset = (videoFrameDuration * i)
        this.videoFrameTimes.push({
          // decode: (info.presentationTime - (info.processingDuration * 1000)) - offset,
          // present: info.presentationTime - offset,
          // display: info.expectedDisplayTime - offset,
          // compose: compose - offset,
          // receive: now - offset
        });
      }
    }
    this.videoFrameTimes.push({
      decode: info.presentationTime - info.processingDuration * 1000,
      present: info.presentationTime,
      compose,
      receive: now,
      display: info.expectedDisplayTime,
    });
    this.previousPresentedFrames = info.presentedFrames;
  };

  addVideoFrametimes = (frameTimes, compose) => {
    frameTimes.video = this.videoFrameTimes[
      this.videoFrameTimes.length - 1
    ] || {
      compose,
      receive: performance.now(),
    };
  };

  addAmbientFrametimes = (frameTimes) => {
    if (!this.settings.showFrametimes) return;

    frameTimes.frameEnd = performance.now();
    const droppedVideoFrameTimes = this.videoFrameTimes.splice(
      0,
      this.videoFrameTimes.indexOf(frameTimes.video) + 1
    ); // Remove all historic video frametimes
    droppedVideoFrameTimes.pop(); // Remove the current video frametime
    for (const video of droppedVideoFrameTimes) {
      this.frameTimes.push({
        video,
      });
    }
    this.frameTimes.push(frameTimes);

    requestIdleCallback(
      function addAmbientDisplayFrametime() {
        frameTimes.display = performance.now();
      }.bind(this),
      { timeout: 1 }
    );
    requestIdleCallback(
      function addAmbientDisplayComplete() {
        frameTimes.complete = performance.now();
      }.bind(this)
    );
  };

  updateFrameTimes = () => {
    if (!this.settings.showFrametimes || !this.frameTimes.length) {
      if (this.frameTimesCanvas?.parentNode) {
        if (this.frameTimesCtx)
          this.frameTimesCtx.clearRect(
            0,
            0,
            this.frameTimesCanvas.width,
            this.frameTimesCanvas.height
          );
        this.ambientlightFTElem.removeChild(this.frameTimesCanvas);
        this.ambientlightFTLegendElem.childNodes[0].nodeValue = '';
        this.ambientlightFTElem.style.display = 'none';
      }
      return;
    }

    // Ambient light FrameTimes
    let frameTimes = this.frameTimes;
    this.frameTimes = this.frameTimes.slice(-this.frametimesHistoryMax);
    frameTimes.pop();
    frameTimes = frameTimes.slice(-this.frametimesHistoryMax);

    // for (const ft of frameTimes) {
    //   if (!ft.video) {
    //     // console.log(JSON.parse(JSON.stringify(ft)))
    //     ft.video = {
    //       decode: ft.frameStart,
    //       present: ft.frameStart,
    //       compose: ft.frameStart,
    //       receive: ft.frameStart,
    //       display: ft.drawEnd
    //     }
    //   }
    //   if (!ft.display)
    //     ft.display = ft.video.receive
    //   if (!ft.complete)
    //     ft.complete = ft.video.receive
    // }

    const videoProcessingRange = this.getRange(
      frameTimes
        .filter((ft) => ft.video?.present && ft.video?.decode)
        .map((ft) => ft.video.present - ft.video.decode)
        .filter((x) => x != 0)
    );
    const ambientProcessingRange = this.getRange(
      frameTimes
        .filter((ft) => ft.display && ft.video?.receive)
        .map((ft) => ft.display - ft.video.receive)
        .filter((x) => x != 0)
    );
    const compositorProcessingRange = this.getRange(
      frameTimes
        .filter((ft) => ft.complete && ft.display)
        .map((ft) => ft.complete - ft.display)
        .filter((x) => x != 0)
    );
    const ambientlightBudgetRange = this.getRange(
      frameTimes
        .filter((ft) => ft.video?.display && ft.video?.receive)
        .map((ft) => ft.video.display - ft.video.receive)
        .filter((x) => x != 0)
    );
    const delayedFrames = frameTimes.filter(
      (ft) => ft.drawEnd && ft.video?.display && ft.drawEnd > ft.video.display
    ).length;
    const skippedFrames = frameTimes.filter(
      (ft) => !ft.video?.decode || !ft.drawEnd
    ).length;

    const legend = `               VERTICAL BARS             MIN        MAX
BLUE         | Video decoding:    ${videoProcessingRange[0]}ms ${
      videoProcessingRange[1]
    }ms
GREEN/YELLOW | Ambient rendering: ${ambientProcessingRange[0]}ms ${
      ambientProcessingRange[1]
    }ms
GRAY         | Compositing:       ${compositorProcessingRange[0]}ms ${
      compositorProcessingRange[1]
    }ms
ORANGE       | Compositing delay 
RED          | Skipped video frames

               DOTTED LINES
WHITE        | when the next video frame will be displayed
GRAY         | when the next video frame will decoded
GREEN        | when the video frame will be displayed

STATS
Frames on time: ${(frameTimes.length - delayedFrames - skippedFrames)
      .toString()
      .padStart(3, ' ')} | Delayed: ${delayedFrames
      .toString()
      .padStart(3, ' ')} | Skipped: ${skippedFrames.toString().padStart(3, ' ')}
Ambient rendering budget: ${ambientlightBudgetRange[0]}ms to ${
      ambientlightBudgetRange[1]
    }ms`;
    this.ambientlightFTLegendElem.childNodes[0].nodeValue = legend;

    const xSize = 3;
    const width = frameTimes.length * xSize;
    const height = 270;

    if (!this.frameTimesCanvas) {
      this.frameTimesCanvas = new Canvas(width, height);
      this.frameTimesCanvas.setAttribute('title', 'Click to toggle legend');
      on(
        this.frameTimesCanvas,
        'click',
        (e) => {
          e.preventDefault();
          this.ambientlightFTElem.toggleAttribute('legend');
        },
        { capture: true }
      );
      on(
        this.frameTimesCanvas,
        'mousedown',
        (e) => {
          e.preventDefault();
        },
        { capture: true }
      ); // Prevent pause
      this.ambientlightFTElem.appendChild(this.frameTimesCanvas);
      this.ambientlightFTElem.style.display = '';

      this.frameTimesCtx = this.frameTimesCanvas.getContext('2d', {
        alpha: true,
      });
    } else if (
      this.frameTimesCanvas.width !== width ||
      this.frameTimesCanvas.height !== height
    ) {
      this.frameTimesCanvas.width = width;
      this.frameTimesCanvas.height = height;
    } else {
      this.frameTimesCtx.clearRect(0, 0, width, height);
    }
    if (!this.frameTimesCanvas?.parentNode) {
      this.ambientlightFTElem.appendChild(this.frameTimesCanvas);
      this.ambientlightFTElem.style.display = '';
    }

    // Flow of the browsers rendering pipeline (with durations & timestamps)
    //
    // Media playback engine: ━━► video.decode ━━► video.present ━┳ (can be before or after compose)
    // Compositor:                            ━━► video.compose ━┻━ (handle animation/videoFrameCallbacks) ━━► do other things ━━► (gather received painted frames) ━━► video.display
    // Main thread:    ━━► requestVideoFrameCallback ━┻ (can before or after compose)   ┻━► receive ━━► drawStart ━━► drawEnd ━━► display (present rendered canvasses to compositor) ━┻ complete (can be before or after display)

    // console.log(frameTimes)
    const displayFrameDuration =
      1000 / Math.max(24, this.ambientlight.displayFrameRate);
    const offsettedFrameTimes = frameTimes.map((ft, i) => {
      // const offset = startOffset + (i * averageFrameTimesInterval); // To display frame variations
      const offset =
        ft.video?.display ?? ft.video?.compose + displayFrameDuration; // To display frame rendering durations
      return {
        video: ft.video
          ? {
              decode: ft.video?.decode - offset,
              present: ft.video?.present - offset,
              compose: ft.video?.compose - offset,
              receive: ft.video?.receive - offset,
              display: ft.video?.display - offset,
            }
          : undefined,
        drawStart: ft.drawStart - offset,
        drawEnd: ft.drawEnd - offset,
        display: ft.display - offset,
        complete: ft.complete - offset,
        nextCompose:
          i < frameTimes.length - 1
            ? frameTimes[i + 1].video?.compose - offset
            : undefined,
        nextDisplay:
          i < frameTimes.length - 1
            ? frameTimes[i + 1].video?.display - offset
            : undefined,
      };
    });
    // console.log('oft', offsettedFrameTimes)

    const frameDurations = offsettedFrameTimes.map((ft) => ({
      decodeToPresent: [ft.video?.decode, ft.video?.present - ft.video?.decode], // Media playback engine thread
      composeToReceive: [
        ft.video?.compose,
        ft.video?.receive - ft.video?.compose,
      ], // Compositor thread
      presentToCompose: [
        ft.video?.present,
        Math.max(0, ft.video?.compose - ft.video?.present),
      ], // Delayed video frame caused by desynchyronized compositor
      receiveToDrawStart: [ft.video?.receive, ft.drawStart - ft.video?.receive],
      drawStartTodrawEnd: [ft.drawStart, ft.drawEnd - ft.drawStart],
      drawEndToDisplay: [ft.drawEnd, ft.display - ft.drawEnd], // Current task on the main thread
      // displayToComplete: [ft.display, ft.complete - ft.display], // All tasks on main thread
      videoDisplay: ft.video?.display, // All tasks on main thread
      isDrawnBeforeVideoDisplay:
        !isFinite(ft.video?.display) || ft.drawEnd <= ft.video?.display,
      nextCompose: ft.nextCompose,
      isDrawnBeforeNextCompose:
        !isFinite(ft.nextCompose) || ft.drawEnd <= ft.nextCompose,
      nextDisplay: ft.nextDisplay,
      isDrawnBeforeNextDisplay:
        !isFinite(ft.nextDisplay) || ft.drawEnd <= ft.nextDisplay,
      isDrawn: isFinite(ft.drawEnd),
    }));
    // console.log('fd', frameDurations)

    // console.log(displayFrameDuration)

    let averageMinTimes = offsettedFrameTimes
      .map((ft) =>
        Math.min(
          ...[ft.video?.decode, ft.video?.compose].filter((t) => isFinite(t))
        )
      )
      .filter((t) => isFinite(t))
      .sort((a, b) => a - b);
    const minPercentile90Length = Math.floor(averageMinTimes.length * 0.9);
    const averageMinTimesPercentile90 = averageMinTimes.slice(
      averageMinTimes.length - minPercentile90Length,
      minPercentile90Length
    );
    const min =
      Math.round(
        Math.min(...averageMinTimesPercentile90) / displayFrameDuration
      ) * displayFrameDuration;

    let averageMaxTimes = offsettedFrameTimes
      .map((ft) =>
        Math.max(
          ...[
            ft.video?.display,
            ft.drawEnd,
            ft.nextCompose,
            ft.nextDisplay,
          ].filter((t) => isFinite(t))
        )
      )
      .filter((t) => isFinite(t))
      .sort((a, b) => a - b);
    const maxPercentile90Length = Math.floor(averageMaxTimes.length * 0.9);
    const averageMaxTimesPercentile90 = averageMaxTimes.slice(
      0,
      maxPercentile90Length
    );
    const max =
      Math.round(
        Math.max(...averageMaxTimesPercentile90) / displayFrameDuration
      ) * displayFrameDuration;

    this.ambientlightFTAxisLegendTopElem.childNodes[0].nodeValue = `${max.toFixed(
      1
    )}ms`;
    this.ambientlightFTAxisLegendBottomElem.childNodes[0].nodeValue = `${min.toFixed(
      1
    )}ms`;

    const range = max - min + displayFrameDuration;
    const yScale = height / range;
    const yLine = 1 / yScale;
    const framerateLimit = this.ambientlight.getRealFramerateLimit();
    const frameRects = frameDurations.map((fd) => [
      ...(framerateLimit || fd.isDrawn
        ? []
        : [['#800', xSize, min - displayFrameDuration / 2, range]]),
      ['#06f', xSize, ...fd.decodeToPresent],
      ['#666', 1, ...fd.composeToReceive],
      ['#f80', 1, ...fd.presentToCompose],
      // [
      //   fd.isDrawnBeforeVideoDisplay ? '#0f0' : '#ff0',
      //   1,
      //   ...fd.displayToComplete,
      // ],
      ['#a0b', 1, ...fd.drawEndToDisplay],
      [
        fd.isDrawnBeforeVideoDisplay ? '#0b0' : '#db0',
        xSize,
        ...fd.receiveToDrawStart,
      ],
      [
        fd.isDrawnBeforeVideoDisplay ? '#0f0' : '#ff0',
        xSize,
        ...fd.drawStartTodrawEnd,
      ],

      [fd.isDrawnBeforeNextCompose ? '#666' : '#666', 1, fd.nextCompose, yLine],
      [fd.isDrawnBeforeNextDisplay ? '#fff' : '#fff', 1, fd.nextDisplay, yLine],
      [
        fd.isDrawnBeforeVideoDisplay ? '#0f0' : '#0f0',
        1,
        fd.videoDisplay,
        yLine,
      ],
      ...(framerateLimit && !fd.isDrawn
        ? [['#000000bb', xSize, min - displayFrameDuration / 2, range]]
        : []),
    ]);
    // console.log(frameRects)

    const offset = min - displayFrameDuration / 2;
    let rects = [];
    for (let i = 0; i < frameRects.length; i++) {
      const frameRectLines = frameRects[i];
      const x = i * xSize;
      if (frameRectLines !== undefined) {
        for (const [color, xFrameSize, y, ySize] of frameRectLines) {
          if (isNaN(y) || isNaN(ySize) || ySize === 0) continue;
          rects.push([
            color,
            x + Math.round(xSize / 2 - xFrameSize / 2),
            Math.round((y - offset) * yScale),
            xFrameSize,
            Math.max(1, Math.round(ySize * yScale)),
          ]);
        }
      } else if (!framerateLimit) {
        rects.push(['#f00', x, 0, xSize, height]);
      }
    }
    // console.log('rects', rects);

    for (const rect of rects) {
      this.frameTimesCtx.fillStyle = rect[0];
      this.frameTimesCtx.fillRect(rect[1], rect[2], rect[3], rect[4]);
    }
  };

  getRange = (list) => {
    list = list.filter((value) => value !== undefined);
    if (!list.length) return ['?', '?'].map((value) => value.padStart(8, ' '));

    const sortedList = list.sort((a, b) => a - b);
    return [sortedList[0], sortedList[sortedList.length - 1]].map((value) =>
      (value === undefined ? '?' : value.toFixed(1)).padStart(8, ' ')
    );
  };

  barDetectionDurations = [];
  addBarDetectionDuration = (duration) => {
    if (!this.settings.showBarDetectionStats) return;

    this.barDetectionDurations.push(duration);
  };

  updateBarDetectionDurations = () => {
    if (
      !this.settings.showBarDetectionStats ||
      (!this.settings.detectHorizontalBarSizeEnabled &&
        !this.settings.detectVerticalBarSizeEnabled)
    ) {
      if (this.barDetectionDurationElem?.parentNode) {
        this.barDetectionDurationElem.childNodes[0].nodeValue = '';
        this.barDetectionDurationElem.style.color = '';
      }

      if (this.barDetectionHorizontalResultElem?.parentNode) {
        this.barDetectionHorizontalResultElem.childNodes[0].nodeValue = '';
        this.barDetectionHorizontalResultElem.style.color = '';
      }

      if (this.barDetectionVerticalResultElem?.parentNode) {
        this.barDetectionVerticalResultElem.childNodes[0].nodeValue = '';
        this.barDetectionVerticalResultElem.style.color = '';
      }

      if (this.barDetectionFPSElem?.parentNode) {
        this.barDetectionFPSElem.childNodes[0].nodeValue = '';
        this.barDetectionFPSElem.style.color = '';
      }

      if (this.barDetectionCanvas?.parentNode) {
        if (this.barDetectionCtx) {
          this.barDetectionCtx.clearRect(
            0,
            0,
            this.barDetectionCanvas.width,
            this.barDetectionCanvas.height
          );
          this.barDetectionCanvas.width = 1;
          this.barDetectionCanvas.height = 1;
        }

        if (this.barDetectionBufferCtx) {
          this.barDetectionBufferCtx.clearRect(
            0,
            0,
            this.barDetectionBufferCanvas.width,
            this.barDetectionBufferCanvas.height
          );
          this.barDetectionBufferCanvas.width = 1;
          this.barDetectionBufferCanvas.height = 1;
        }

        this.barDetectionGraphElem.removeChild(this.barDetectionCanvas);
        this.barDetectionGraphElem.style.display = 'none';
      }

      return;
    }

    const durations = this.barDetectionDurations.slice(
      -this.barDetectionDurationsMax
    );
    this.barDetectionDurations = durations;

    const duration = durations.length
      ? Math.round(
          durations.reduce((total, duration) => total + duration, 0) /
            durations.length
        ).toFixed(1)
      : undefined;

    this.barDetectionDurationElem.childNodes[0].nodeValue = duration
      ? ` SEARCH DURATION: ${duration}ms`
      : '';
    this.barDetectionDurationElem.style.color = '#fff';
  };

  updateBarDetectionInfo = (throttle, lastChange) => {
    if (!this.settings.showBarDetectionStats) return;

    const barDetectionFPS = throttle
      ? `${Math.round(1000 / throttle).toFixed(2)} (${(throttle / 1000).toFixed(
          1
        )}s)`
      : 'VIDEO FPS';

    const barDetectionLastChange = lastChange
      ? `${((performance.now() - lastChange) / 1000).toFixed(1)}s ago`
      : '';

    this.barDetectionFPSElem.childNodes[0].nodeValue = `BAR DETECTION: ${barDetectionFPS} / ${barDetectionLastChange}`;
    this.barDetectionFPSElem.style.color = '#fff';
  };

  updateBarDetectionImage = (image) => {
    if (!image) return;
    if (!this.settings.showBarDetectionStats) return;

    const width = 512; // image.width ?? 1
    const height = 512; // image.height ?? 1

    if (!this.barDetectionCanvas) {
      this.barDetectionCanvas = new Canvas(width, height);
      this.barDetectionCtx = this.barDetectionCanvas.getContext('2d', {
        alpha: true,
      });

      this.barDetectionCanvas.setAttribute(
        'title',
        `LINES \nBlue:        Detected bar\nGreen:     Detected edge \nOrange:  Diverging edge \nGray:       Ignored edge \nRed:        Scanline`
      );
      on(
        this.barDetectionCanvas,
        'click',
        (e) => {
          e.preventDefault();
          this.barDetectionGraphElem.toggleAttribute('legend');
        },
        { capture: true }
      );
      on(
        this.barDetectionCanvas,
        'mousedown',
        (e) => {
          e.preventDefault();
        },
        { capture: true }
      ); // Prevent pause
      this.barDetectionGraphElem.appendChild(this.barDetectionCanvas);
      this.barDetectionGraphElem.style.display = '';

      this.barDetectionBufferCanvas = new SafeOffscreenCanvas(width, height);
      this.barDetectionBufferCtx = this.barDetectionBufferCanvas.getContext(
        '2d',
        { alpha: true }
      );
    } else if (
      this.barDetectionCanvas.width !== width ||
      this.barDetectionCanvas.height !== height
    ) {
      this.barDetectionCanvas.width = width;
      this.barDetectionCanvas.height = height;
      this.barDetectionBufferCanvas.width = width;
      this.barDetectionBufferCanvas.height = height;
    } else {
      // this.barDetectionBufferCtx.clearRect(0, 0, width, height) // Causes short flickering to black
    }
    if (!this.barDetectionCanvas?.parentNode) {
      this.barDetectionGraphElem.appendChild(this.barDetectionCanvas);
      this.barDetectionGraphElem.style.display = '';
    }

    this.barDetectionBufferCtx.drawImage(
      image,
      0,
      0,
      this.barDetectionBufferCanvas.width,
      this.barDetectionBufferCanvas.height
    );
  };

  updateBarDetectionResult = (
    barsFound,
    horizontalBarSizeInfo,
    verticalBarSizeInfo,
    horizontalPercentage,
    verticalPercentage
  ) => {
    if (!this.settings.showBarDetectionStats || !this.barDetectionCtx) return;

    this.barDetectionHorizontalResultElem.childNodes[0].nodeValue = `${[
      this.settings.detectHorizontalBarSizeEnabled
        ? ` HORIZONTAL: ${
            horizontalBarSizeInfo.percentage !== undefined
              ? `${horizontalBarSizeInfo.percentage
                  .toFixed(2)
                  .padStart(5, ' ')}`
              : '  #.##'
          }%  ➜ ${horizontalPercentage.toFixed(2).padStart(5, ' ')}%`
        : '',
      this.settings.detectHorizontalBarSizeEnabled
        ? ` COLOR (rgb):       ${horizontalBarSizeInfo.color
            ?.map((c) => Math.round(c).toString().padStart(3, ' '))
            ?.join(' ')}`
        : '',
    ]
      .filter((s) => s)
      .join('\n')}`;
    this.barDetectionHorizontalResultElem.style.color =
      horizontalBarSizeInfo.percentage !== undefined
        ? barsFound
          ? '#0f0'
          : '#f80'
        : '#fff';

    this.barDetectionVerticalResultElem.childNodes[0].nodeValue = `${[
      this.settings.detectVerticalBarSizeEnabled
        ? ` VERTICAL:     ${
            verticalBarSizeInfo.percentage !== undefined
              ? `${verticalBarSizeInfo.percentage.toFixed(2).padStart(5, ' ')}`
              : '  #.##'
          }%  ➜ ${verticalPercentage.toFixed(2).padStart(5, ' ')}%`
        : '',
      this.settings.detectVerticalBarSizeEnabled
        ? ` COLOR (rgb):       ${verticalBarSizeInfo.color
            ?.map((c) => Math.round(c).toString().padStart(3, ' '))
            ?.join(' ')}`
        : '',
    ]
      .filter((s) => s)
      .join('\n')}`;
    this.barDetectionVerticalResultElem.style.color =
      verticalBarSizeInfo.percentage !== undefined
        ? barsFound
          ? '#0f0'
          : '#f80'
        : '#fff';

    const width = this.barDetectionCanvas.width;
    const height = this.barDetectionCanvas.height;

    this.barDetectionCtx.clearRect(
      0,
      0,
      this.barDetectionCanvas.width,
      this.barDetectionCanvas.height
    );
    this.barDetectionCtx.drawImage(this.barDetectionBufferCanvas, 0, 0);
    this.barDetectionCtx.strokeStyle = '#00000077';

    const rects = [];
    const fillRects = [];

    if (horizontalBarSizeInfo.percentage !== undefined) {
      const xIndex = Math.floor(
        height * (horizontalBarSizeInfo.percentage / 100)
      );
      rects.push(['#0af', 0, xIndex, width, 1]);
      rects.push(['#0af', 0, height - xIndex - 1, width, 1]);
    }

    if (verticalBarSizeInfo.percentage !== undefined) {
      const yIndex = Math.floor(width * (verticalBarSizeInfo.percentage / 100));
      rects.push(['#0af', yIndex, 0, 1, height]);
      rects.push(['#0af', width - yIndex - 1, 0, 1, height]);
    }

    const certaintySize = 32;
    const getEdgeSizes = (yIndex, certainty) => {
      const length = Math.floor(yIndex - 1);
      return {
        length: length < 3 ? 0 : length,
        radius: Math.floor(certaintySize * certainty),
        thickness: length < 3 ? 1 : 2,
      };
    };
    const getEdgeColor = (deviates, percentage) =>
      deviates ? '#555' : percentage === undefined ? '#f80' : '#0c0';

    if (!this.dotsPattern) {
      const dotsCanvas = new SafeOffscreenCanvas(2, 2);
      const dotsCtx = dotsCanvas.getContext('2d', { alpha: true });
      dotsCtx.fillStyle = 'rgba(255, 50, 50, 255)';
      dotsCtx.fillRect(0, 0, 1, 1);
      dotsCtx.fillRect(1, 1, 1, 1);
      dotsCtx.fillStyle = 'rgba(0, 0, 255, 100)';
      dotsCtx.fillRect(0, 1, 1, 1);
      dotsCtx.fillRect(1, 0, 1, 1);
      this.dotsPattern = dotsCanvas.transferToImageBitmap();
      this.barDetectionDotsPattern = this.barDetectionCtx.createPattern(
        this.dotsPattern,
        'repeat'
      );
    }

    if (horizontalBarSizeInfo.topEdges && horizontalBarSizeInfo.bottomEdges) {
      for (const {
        xIndex,
        yIndex,
        deviates,
        deviatesTop,
        certainty,
      } of horizontalBarSizeInfo.topEdges) {
        const { length, radius, thickness } = getEdgeSizes(yIndex, certainty);
        fillRects.push([this.barDetectionDotsPattern, xIndex, 0, 1, length]);
        rects.push([
          getEdgeColor(
            deviates || deviatesTop,
            horizontalBarSizeInfo.percentage
          ),
          xIndex - radius,
          length,
          1 + radius * 2,
          thickness,
        ]);
      }
      for (const {
        xIndex,
        yIndex,
        deviates,
        deviatesBottom,
        certainty,
      } of horizontalBarSizeInfo.bottomEdges) {
        const { length, radius, thickness } = getEdgeSizes(yIndex, certainty);
        fillRects.push([
          this.barDetectionDotsPattern,
          xIndex,
          height - length,
          1,
          length,
        ]);
        rects.push([
          getEdgeColor(
            deviates || deviatesBottom,
            horizontalBarSizeInfo.percentage
          ),
          xIndex - radius,
          height - length - thickness,
          1 + radius * 2,
          thickness,
        ]);
      }
    }

    if (verticalBarSizeInfo.topEdges && verticalBarSizeInfo.bottomEdges) {
      for (const {
        xIndex,
        yIndex,
        deviates,
        deviatesTop,
        certainty,
      } of verticalBarSizeInfo.topEdges) {
        const { length, radius, thickness } = getEdgeSizes(yIndex, certainty);
        fillRects.push([this.barDetectionDotsPattern, 0, xIndex, length, 1]);
        rects.push([
          getEdgeColor(deviates || deviatesTop, verticalBarSizeInfo.percentage),
          length,
          xIndex - radius,
          thickness,
          1 + radius * 2,
        ]);
      }
      for (const {
        xIndex,
        yIndex,
        deviates,
        deviatesBottom,
        certainty,
      } of verticalBarSizeInfo.bottomEdges) {
        const { length, radius, thickness } = getEdgeSizes(yIndex, certainty);
        fillRects.push([
          this.barDetectionDotsPattern,
          width - length,
          xIndex,
          length,
          1,
        ]);
        rects.push([
          getEdgeColor(
            deviates || deviatesBottom,
            verticalBarSizeInfo.percentage
          ),
          width - length - thickness,
          xIndex - radius,
          thickness,
          1 + radius * 2,
        ]);
      }
    }

    for (const rect of fillRects) {
      this.barDetectionCtx.fillStyle = rect[0];
      this.barDetectionCtx.fillRect(rect[1], rect[2], rect[3], rect[4]);
    }
    for (const rect of rects) {
      this.barDetectionCtx.strokeRect(
        rect[1] - 0.5,
        rect[2] - 0.5,
        rect[3] + 1,
        rect[4] + 1
      );
    }
    for (const rect of rects) {
      this.barDetectionCtx.fillStyle = rect[0];

      this.barDetectionCtx.fillRect(rect[1], rect[2], rect[3], rect[4]);
    }
  };
}
__exports["default"] = Stats;
return __exports;
})();

// ==================== module: settings (src/content/youtube/ambilight/vendor-modules/settings.adapter.js) ====================
__modules["settings"] = (() => {
const __exports = {};
const { default: SettingsConfig, prepareSettingsConfigOnce } = __require('settings-config');
const { storage } = __require('storage');
const { supportsWebGL } = __require('generic');
/**
 * FocusTube local replacement for youtube-ambilight's `settings` module.
 *
 * The upstream settings.js (2190 lines) both (a) supplies the engine with its
 * ~75 tuning values and (b) renders an in-player settings menu. FocusTube
 * keeps its own minimal UX (popup: on/off + Subtle/Normal/Vibrant), so this
 * adapter implements ONLY the headless settings surface the vendored engine
 * reads — every member below was extracted mechanically from the upstream
 * sources (`rg -o "settings\.[a-zA-Z_][a-zA-Z0-9_.]*"`) and defaults come
 * verbatim from the upstream settings-config.js.
 *
 * FocusTube mapping:
 *   extensionEnabled:false          -> engine disabled (master switch)
 *   ambientLightEnabled:false       -> settings.enabled = false
 *   ambientLightIntensity           -> blur2/spread/brightness/saturation
 *                                      presets around the upstream defaults
 *   engine "enabled" toggle (G key is disabled; only programmatic) is
 *   persisted back to FocusTube's ambientLightEnabled so the popup stays
 *   in sync.
 *
 * The upstream in-player hotkeys (G/B/V/H) are intentionally NOT wired:
 * FocusTube ships its own vim keys and they must not collide.
 */




const FRAMESYNC_DECODEDFRAMES = 0;
const FRAMESYNC_DISPLAYFRAMES = 1;
const FRAMESYNC_VIDEOFRAMES = 2;

const DEBANDING_BLEND_MODE_LCD = 0;
const DEBANDING_BLEND_MODE_OLED = 1;

// Build the upstream default values object straight from settings-config so
// the engine behaves exactly like a fresh youtube-ambilight install.
prepareSettingsConfigOnce();
const DEFAULTS = {};
for (const entry of SettingsConfig) {
  if (entry && entry.name && entry.default !== undefined) {
    DEFAULTS[entry.name] = entry.default;
  }
}
// Entries without a `default` field but read by the engine:
DEFAULTS['videoScale.DETACHED'] = 100;
DEFAULTS['videoScale.DISABLED'] = 100;
DEFAULTS['videoScale.POPUP'] = 100;

// FocusTube intensity presets (upstream value ranges: blur2 0-100,
// spread 0-400, brightness/saturation 0-200). "normal" equals the upstream
// factory defaults exactly.
const INTENSITY_PRESETS = {
  subtle: { blur2: 22, spread: 12, brightness: 90, saturation: 95 },
  normal: { blur2: 30, spread: 17, brightness: 100, saturation: 100 },
  vibrant: { blur2: 45, spread: 30, brightness: 110, saturation: 115 },
};

class Settings {
  // Mirror of upstream Settings.getStoredSettingsCached() used by the host.
  static async getStoredSettingsCached() {
    return { ...DEFAULTS };
  }

  constructor(ambientlight, settingsMenuBtnParent, videoPlayerElem) {
    // settingsMenuBtnParent / videoPlayerElem are only needed by the upstream
    // menu UI which FocusTube intentionally does not render.
    return (async function SettingsConstructor() {
      this.ambientlight = ambientlight;

      // ----- upstream factory defaults -----
      for (const [name, value] of Object.entries(DEFAULTS)) {
        this[name] = value;
      }

      // Engine capability adjustments (mirrors upstream logic):
      if (!supportsWebGL()) this.webGL = false;
      if (!HTMLVideoElement.prototype.requestVideoFrameCallback) {
        this.frameSync = FRAMESYNC_DECODEDFRAMES;
      }
      try {
        if ((await storage.get('ytalWebGLDisabled')) === true) {
          this.webGL = false;
        }
      } catch (_) {
        /* storage unavailable — keep defaults */
      }

      // ----- FocusTube settings mapping -----
      this.focusTube = {};
      try {
        if (typeof loadSettings === 'function') {
          this.focusTube = (await loadSettings()) || {};
        }
      } catch (_) {
        this.focusTube = {};
      }
      this.applyFocusTubeSettings(this.focusTube, { initial: true });

      return this;
    }.bind(this))();
  }

  /**
   * Recompute the engine values from a FocusTube settings object.
   * Called on construction and on every live settings broadcast.
   */
  applyFocusTubeSettings(focusTubeSettings, { initial = false } = {}) {
    const ft = focusTubeSettings || {};
    this.focusTube = ft;

    const masterOn = ft.extensionEnabled !== false;
    const featureOn = ft.ambientLightEnabled !== false;
    const enabled = masterOn && featureOn;

    const intensityName = ['subtle', 'normal', 'vibrant'].includes(
      ft.ambientLightIntensity
    )
      ? ft.ambientLightIntensity
      : 'normal';
    const preset = INTENSITY_PRESETS[intensityName];

    const changed = {
      enabled: this.enabled !== enabled,
      intensity:
        !initial &&
        (this.blur2 !== preset.blur2 ||
          this.spread !== preset.spread ||
          this.brightness !== preset.brightness ||
          this.saturation !== preset.saturation),
    };

    this.enabled = enabled;
    this.blur2 = preset.blur2;
    this.spread = preset.spread;
    this.brightness = preset.brightness;
    this.saturation = preset.saturation;

    return changed;
  }

  /** Notify the engine that external (FocusTube popup) settings changed. */
  async commitExternalChange({ initial = false } = {}) {
    const ambientlight = this.ambientlight;
    if (!ambientlight) return;

    if (initial) return; // constructor flow enables the engine itself

    ambientlight.updateStyles();
    // Flag the projector stack for recreation (levels depend on spread/edge);
    // resizeCanvasses() consumes this flag on the next frame.
    ambientlight.canvassesInvalidated = true;
    ambientlight.sizesChanged = true;
    ambientlight.buffersCleared = true;
    await ambientlight.optionalFrame();
  }

  // ------------------------------------------------------------------
  // Upstream API used by the engine (verified call sites)
  // ------------------------------------------------------------------

  onLoaded() {
    /* upstream opens the settings UI here — nothing to do headless */
  }

  onCloseMenu = () => {};

  async set(key, value, save = false) {
    this[key] = value;
    if (save && key === 'enabled' && typeof saveSetting === 'function') {
      // Persist the engine's own toggle back into FocusTube settings so the
      // popup checkbox stays in sync.
      try {
        await saveSetting('ambientLightEnabled', value === true);
      } catch (_) {
        /* non-fatal */
      }
    }
  }

  async saveStorageEntry(key, value) {
    // Upstream persists webGLCrash / webGLCrashVersion via storage.local.
    try {
      if (value === undefined) {
        await storage.set(key, undefined);
      } else {
        await storage.set(key, value);
      }
    } catch (_) {
      /* non-fatal */
    }
  }

  setWarning(text) {
    if (!text) {
      this._lastWarning = '';
      return;
    }
    // Throttle identical warnings (upstream renders a dismissible toast).
    if (this._lastWarning === text) return;
    this._lastWarning = text;
    console.warn(`[YTAL] ${text}`);
  }

  handleWebGLCrash() {
    // Upstream marks the crash date and falls back to the Canvas2D renderer.
    this.webGL = false;
    try {
      storage.set('ytalWebGLDisabled', true);
    } catch (_) {
      /* non-fatal */
    }
    console.warn(
      '[YTAL] WebGL renderer crashed — falling back to the Canvas2D renderer.'
    );
  }

  updateWebGLCrashDescription() {}

  updateAverageVideoFramesDifferenceInfo() {}

  updateVisibility() {}

  async updateHdr() {
    /* HDR filter tweaks only apply to the WebGL renderer UI — no-op headless */
  }

  getKeys() {
    // Upstream in-player hotkeys intentionally disabled inside FocusTube.
    return {};
  }

  clickUI() {}

  displayBezelForSetting() {}
}
__exports["default"] = Settings;
__exports["FRAMESYNC_DECODEDFRAMES"] = FRAMESYNC_DECODEDFRAMES;
__exports["FRAMESYNC_DISPLAYFRAMES"] = FRAMESYNC_DISPLAYFRAMES;
__exports["FRAMESYNC_VIDEOFRAMES"] = FRAMESYNC_VIDEOFRAMES;
__exports["DEBANDING_BLEND_MODE_LCD"] = DEBANDING_BLEND_MODE_LCD;
__exports["DEBANDING_BLEND_MODE_OLED"] = DEBANDING_BLEND_MODE_OLED;
return __exports;
})();

// ==================== module: ambientlight (third_party/youtube-ambilight/src/libs/ambientlight.js) ====================
__modules["ambientlight"] = (() => {
const __exports = {};
const { on, off, raf, ctxOptions, Canvas, SafeOffscreenCanvas, setTimeout, wrapErrorHandler, readyStateToString, networkStateToString, mediaErrorToString, requestIdleCallback, isWatchPageUrl, watchSelectors, isEmbedPageUrl, isNetworkError, VIEW_DISABLED, VIEW_DETACHED, VIEW_SMALL, VIEW_THEATER, VIEW_FULLSCREEN, VIEW_POPUP, setStyleProperty, setWarning } = __require('generic');
const { default: SentryReporter, parseSettingsToSentry } = __require('errors/sentry-reporter');
const { default: BarDetection } = __require('bar-detection');
const { default: Settings, DEBANDING_BLEND_MODE_LCD, DEBANDING_BLEND_MODE_OLED, FRAMESYNC_DECODEDFRAMES, FRAMESYNC_DISPLAYFRAMES, FRAMESYNC_VIDEOFRAMES } = __require('settings');
const { default: Projector2d } = __require('projector-2d');
const { default: ProjectorWebGL } = __require('projector-webgl');
const { WebGLOffscreenCanvas } = __require('canvas-webgl');
const { cancelGetAverageVideoFramesDifference, getAverageVideoFramesDifference } = __require('static-image-detection');
const { default: Theming } = __require('theming');
const { default: Stats } = __require('stats');
const { getBrowser } = __require('utils');
const { injectedScript } = __require('messaging/injected');
const { getNodeTreeString, getPageElems } = __require('errors/dom');














const baseUrl = chrome.runtime.getURL('') || ''; // document.currentScript?.getAttribute('data-base-url') || ''

class Ambientlight {
  innerStrength = 2;
  lastUpdateSizesChanged = 0;
  averageVideoFramesDifference = 1;

  videoOffset = {};
  srcVideoOffset = {};
  videoScale = 100;

  isHidden = true;
  isOnVideoPage = true;
  showedCompareWarning = false;
  getImageDataAllowed = true;
  catchedErrors = [];

  atTop = true;
  p = null;
  view = undefined;
  immersiveTheater = false;
  isFullscreen = false;
  isFillingFullscreen = false;
  isVideoHiddenOnWatchPage = false;
  isVrVideo = false;
  isHdr = false;
  isControlledByAnotherExtension = false;

  lastUpdateStatsTime = 0;
  updateStatsInterval = 1000;
  frameCountHistory = 4000;
  videoFrameCount = 0;
  displayFrameRate = 0;
  videoFrameRate = 0;
  ambientlightFrameCount = 0;
  ambientlightFrameRate = 0;
  ambientlightVideoDroppedFrameCount = 0;
  previousFrameTime = 0;
  previousDrawTime = 0;
  clearTime = 0;

  constructor(videoElem, ytdAppElem, ytdWatchElem, mastheadElem) {
    return async function AmbientlightConstructor() {
      if (ytdAppElem) ytdAppElem.dataset.ytalElem = 'ytd-app';
      this.ytdAppElem = ytdAppElem; // Not available in embeds
      if (ytdWatchElem) ytdWatchElem.dataset.ytalElem = 'ytd-watch';
      this.ytdWatchElem = ytdWatchElem; // Not available in embeds
      if (mastheadElem) mastheadElem.dataset.ytalElem = 'masthead';
      this.mastheadElem = mastheadElem; // Not available in embeds

      this.detectChromiumBug1142112Workaround();
      this.detectChromiumBugDirectVideoOverlayWorkaround();
      this.detectMozillaBug1606251Workaround();
      this.detectMozillaBugSlowCanvas2DReadPixelsWorkaround();
      this.detectChromiumBug1092080Workaround();

      this.initElems(videoElem);
      await this.initSettings();
      this.applyChromiumBugDirectVideoOverlayWorkaround();
      await this.waitForPageload();

      this.theming = new Theming(this);
      this.stats = new Stats(this);
      this.barDetection = new BarDetection(this);
      this.detectChromiumBug1123708Workaround();
      this.detectChromiumBugVideoJitterWorkaround();

      if (document.visibilityState === 'hidden') {
        await new Promise((resolve) => raf(resolve)); // Prevents lost WebGLContext on pageload in a background tab
      }
      await this.initAmbientlightElems();
      this.initBuffersWrapper();
      await this.initProjectorBuffers();
      this.recreateProjectors();
      this.stats.initElems();

      this.initStyles();
      this.updateStyles();

      this.checkGetImageDataAllowed();
      await this.initListeners();

      new Promise((resolve) =>
        wrapErrorHandler(() => {
          this.initializedTime = performance.now();
          this.settings.onLoaded();
          resolve();
        })()
      );

      if (this.settings.enabled) {
        await wrapErrorHandler(async () => {
          await this.enable(true);
        })();
      }

      return this;
    }.bind(this)();
  }

  get playerSmallContainerElem() {
    return document.querySelector(
      watchSelectors
        .map((selector) => `${selector} #player-container-inner`)
        .join(', ')
    );
  }

  get playerTheaterContainerElem() {
    return document.querySelector(
      watchSelectors
        .map((selector) => `${selector} #full-bleed-container`)
        .join(', ')
    );
  }

  get playerTheaterContainerElemFromVideo() {
    return this.videoElem?.closest('#full-bleed-container');
  }

  get ytdWatchElemFromVideo() {
    return this.videoElem?.closest(watchSelectors.join(', '));
  }

  get thumbnailOverlayElem() {
    if (!this._thumbnailOverlayElem)
      this._thumbnailOverlayElem = document.querySelector(
        watchSelectors
          .map((selector) => `${selector} .ytp-cued-thumbnail-overlay`)
          .join(', ')
      );
    return this._thumbnailOverlayElem;
  }

  initElems(videoElem) {
    this.videoPlayerElem = videoElem.closest('.html5-video-player');
    if (!this.videoPlayerElem) {
      const error = new Error(
        'Cannot find videoPlayerElem: .html5-video-player'
      );
      error.details = getPageElems();
      error.details.videoIsInDocument = document.contains(videoElem);
      error.details.videoIsInBody = document.body.contains(videoElem);
      error.details.videoTree = getNodeTreeString(videoElem);
      setWarning(`Failed to load.\n${error.message}`);
      throw error;
    }
    this.videoPlayerElem.dataset.ytalElem = 'video-player';

    // ytdPlayerElem is optional and only used on non-embed pages in small view to set the border radius
    this.ytdPlayerElem = videoElem.closest('ytd-player');

    // videoContainerElem is optional and only used in the videoOverlayEnabled setting
    this.videoContainerElem = videoElem.closest('.html5-video-container');

    this.settingsMenuBtnParent = this.videoPlayerElem.querySelector(
      '.ytp-right-controls, .ytp-chrome-controls > *:last-child'
    );
    if (!this.settingsMenuBtnParent) {
      const error = new Error(
        'Cannot find settingsMenuBtnParent: .ytp-right-controls, .ytp-chrome-controls > *:last-child'
      );
      error.details = getPageElems();
      setWarning(`Failed to load.\n${error.message}`);
      throw error;
    }

    this.initVideoElem(videoElem, false);
  }

  initVideoElem(videoElem, initListeners = true) {
    this.cancelScheduledRequestVideoFrame();

    videoElem.dataset.ytalElem = 'video';
    this.videoElem = videoElem;
    this.applyChromiumBugDirectVideoOverlayWorkaround();
    if (initListeners) this.initVideoListeners();
  }

  // FireFox workaround: WebGLParent::RecvReadPixels is slow when reading from a HtmlCanvasElement/OffscreenCanvas (performance scales linear with the amount of pixels to be read)
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1719154
  detectMozillaBugSlowCanvas2DReadPixelsWorkaround() {
    const match = navigator.userAgent.match(/Firefox\/((?:\.|[0-9])+)/);
    const version = match?.length > 1 ? parseFloat(match[1]) : null;
    if (version && (version < 123 || version > 124)) {
      this.enableMozillaBugReadPixelsWorkaround = true;
    }
  }
  shouldDrawDirectlyFromVideoElem = () =>
    this.enableMozillaBugReadPixelsWorkaround &&
    this.projector.webGLVersion === 2;

  // FireFox workaround: Force to rerender the outer blur of the canvasses
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1606251
  detectMozillaBug1606251Workaround() {
    const match = navigator.userAgent.match(/Firefox\/((?:\.|[0-9])+)/);
    const version = match?.length > 1 ? parseFloat(match[1]) : null;
    if (version && version < 74) {
      this.enableMozillaBug1606251Workaround = true;
    }
  }

  // Chromium workaround: YouTube drops the video quality because the video is dropping frames
  // for about ~2 seconds when requestVideoFrameCallback is used and the video
  // has been scrolled from onscreen to offscreen
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1142112
  detectChromiumBug1142112Workaround() {
    const match = navigator.userAgent.match(/Chrome\/((?:\.|[0-9])+)/);
    const version = match?.length > 1 ? parseFloat(match[1]) : null;
    if (version && HTMLVideoElement.prototype.requestVideoFrameCallback) {
      this.enableChromiumBug1142112Workaround = true;
    }
  }

  applyChromiumBug1142112Workaround() {
    if (!this.enableChromiumBug1142112Workaround) return;

    injectedScript.postMessage('apply-chromium-bug-1142112-workaround');
  }

  // Chromium workaround: Force to render the blur originating from the canvasses past the browser window
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1123708
  detectChromiumBug1123708Workaround() {
    if (this.settings.webGL) return;

    const match = navigator.userAgent.match(/Chrome\/((?:\.|[0-9])+)/);
    const version = match?.length > 1 ? parseFloat(match[1]) : null;
    if (version && version >= 85) {
      this.enableChromiumBug1123708Workaround = true;
    }
  }

  // Chromium workaround: drawImage randomly disables antialiasing in the videoOverlay and/or projectors
  // Additional 0.05ms performance impact per clearRect()
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1092080
  detectChromiumBug1092080Workaround() {
    const match = navigator.userAgent.match(/Chrome\/((?:\.|[0-9])+)/);
    const version = match?.length > 1 ? parseFloat(match[1]) : null;
    if (version && version >= 82 && version < 88) {
      this.enableChromiumBug1092080Workaround = true;
    }
  }

  // Fixes video stuttering when display framerate > ambient framerate
  detectChromiumBugVideoJitterWorkaround() {
    if (!this.settings.webGL) return; // This has to much impact on the performance of the Canvas2D renderer

    const match = navigator.userAgent.match(/Chrome\/((?:\.|[0-9])+)/);
    const version = match?.length > 1 ? parseFloat(match[1]) : null;
    if (version) {
      this.enableChromiumBugVideoJitterWorkaround = true;
      this.settings.updateVisibility();
    }
  }

  // Disable the direct composition video overlay that can cause artifacts on Windows
  // https://github.com/WesselKroos/youtube-ambilight/blob/master/TROUBLESHOOT.md#3-nvidia-rtx-video-super-resolution-vsr--nvidia-rtx-video-hdr-does-not-work
  detectChromiumBugDirectVideoOverlayWorkaround() {
    const match = navigator.userAgent.match(/Windows/);
    if (match?.length > 0) {
      this.enableChromiumBugDirectVideoOverlayWorkaround = true;
    }
  }

  applyChromiumBugDirectVideoOverlayWorkaround() {
    if (!this.videoElem || !this.settings) return;

    this.videoElem.classList.toggle(
      'ambientlight__chromium-bug-direct-video-overlay-workaround',
      this.enableChromiumBugDirectVideoOverlayWorkaround &&
        this.settings.chromiumDirectVideoOverlayWorkaround
    );
  }

  applyChromiumBugVideoJitterWorkaround() {
    try {
      if (!this.enableChromiumBugVideoJitterWorkaround) return;
      if (!this.settings.chromiumBugVideoJitterWorkaround) {
        if (this.chromiumBugVideoJitterWorkaround) {
          const { elem, observer } = this.chromiumBugVideoJitterWorkaround;
          observer.disconnect();
          if (elem.parentElement) elem.parentElement.removeChild(elem);
          this.chromiumBugVideoJitterWorkaround = undefined;
        }
        return;
      }
      if (this.chromiumBugVideoJitterWorkaround) return;

      const elem = document.createElement('div');
      elem.classList.add('ambientlight__chromium-bug-video-jitter-workaround');

      const update = wrapErrorHandler(
        function chromiumBugVideoJitterWorkaroundUpdate(isPlaying) {
          if (isPlaying === undefined) {
            isPlaying = this.videoPlayerElem.classList.contains('playing-mode');
          }

          const enable =
            this.averageVideoFramesDifference >=
              this.averageVideoFramesDifference1SecondThreshold &&
            isPlaying &&
            !this.isHidden &&
            !this.videoIsHidden &&
            !(this.settings.spread === 0 && this.settings.blur2 === 0);

          if (enable && elem.parentElement !== this.containerElem) {
            this.containerElem.appendChild(elem);
          } else if (!enable && elem.parentElement) {
            elem.parentElement.removeChild(elem);
          }
        }.bind(this),
        true
      );

      const observer = new MutationObserver(
        wrapErrorHandler(
          function chromiumBugVideoJitterWorkaroundMutation(mutations) {
            if (!this.chromiumBugVideoJitterWorkaround) return;

            for (const mutation of mutations) {
              const wasPlaying = mutation.oldValue
                .split(' ')
                .includes('playing-mode');
              const isPlaying =
                mutation.target.classList.contains('playing-mode');
              if (wasPlaying === isPlaying) continue;

              update(isPlaying);
            }
          }.bind(this),
          true
        )
      );
      observer.observe(this.videoPlayerElem, {
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true,
      });

      this.chromiumBugVideoJitterWorkaround = {
        elem,
        observer,
        update,
      };

      update(this.videoPlayerElem.classList.contains('playing-mode'));
    } catch (ex) {
      console.warn(
        'applyChromiumBugVideoJitterWorkaround error. Continuing ambientlight initialization...'
      );
      SentryReporter.captureException(ex);
      this.enableChromiumBugVideoJitterWorkaround = false; // Prevent retries
    }
  }

  waitForPageload = async () => {
    if (
      (this.settings.enabled && !this.settings.prioritizePageLoadSpeed) ||
      !this.videoElem ||
      !isWatchPageUrl()
    )
      return;

    if (this.videoElem.readyState < 3) {
      await new Promise((resolve) => {
        if (!(this.videoElem.readyState < 3)) {
          resolve();
          return;
        }

        const handleCanPlay = () => {
          off(this.videoElem, 'canplay', handleCanPlay);
          resolve();
        };
        on(this.videoElem, 'canplay', handleCanPlay);
      });

      await new Promise((resolve) =>
        requestIdleCallback(resolve, { timeout: 1000 })
      ); // Buffering/rendering budget for low-end devices
    } else {
      await new Promise((resolve) =>
        requestIdleCallback(resolve, { timeout: 2000 })
      ); // Buffering/rendering budget for low-end devices
    }

    if (document.visibilityState === 'hidden') {
      await new Promise((resolve) => raf(resolve));
    }
  };

  initStyles() {
    this.styleElem = document.createElement('style');
    this.styleElem.appendChild(document.createTextNode(''));
    document.head.appendChild(this.styleElem);
  }

  lastVideoElemSrc = '';
  initVideoIfSrcChanged = async () => {
    if (this.lastVideoElemSrc === this.videoElem.src) {
      return false;
    }

    this.lastVideoElemSrc = this.videoElem.src;
    await this.start();

    return true;
  };

  initAverageVideoFramesDifferenceListeners() {
    if (!this.ytdWatchElem) return;

    try {
      on(
        this.ytdWatchElem,
        'yt-page-data-will-update',
        () => {
          if (this.averageVideoFramesDifference === 1) return;

          this.resetAverageVideoFramesDifference();
        },
        undefined,
        true
      );
      on(
        document,
        'yt-page-data-updated',
        () => {
          if (!this.settings.enabled || !this.isOnVideoPage) return;

          this.calculateAverageVideoFramesDifference();
        },
        undefined,
        true
      );
    } catch (ex) {
      SentryReporter.captureException(ex);
    }
  }

  resetAverageVideoFramesDifference = () => {
    cancelGetAverageVideoFramesDifference();
    this.averageVideoFramesDifference = 1;
    this.settings.updateAverageVideoFramesDifferenceInfo();

    if (this.chromiumBugVideoJitterWorkaround?.update)
      this.chromiumBugVideoJitterWorkaround.update();
  };

  calculateAverageVideoFramesDifference = async () => {
    if (!this.settings.energySaver || !this.videoPlayerElem) return;

    try {
      const format = await injectedScript.postAndReceiveMessage(
        'player-storyboard-format'
      );
      if (!format) return;

      const difference = await getAverageVideoFramesDifference(format);
      if (difference === undefined) return;

      this.averageVideoFramesDifference = difference;
      this.settings.updateAverageVideoFramesDifferenceInfo();

      if (this.chromiumBugVideoJitterWorkaround?.update)
        this.chromiumBugVideoJitterWorkaround.update();
    } catch (ex) {
      if (
        !['InvalidStateError', 'SecurityError'].includes(ex?.name) &&
        !isNetworkError(ex)
      ) {
        SentryReporter.captureException(ex);
      }
    }
  };

  initVideoListeners() {
    ////// PLAYER FLOW
    //
    // LEGEND
    //
    // [  Start
    // ]  End
    // *  When drawImage is called
    //
    // FLOWS
    //
    // Start (paused):                                                                      [ *loadeddata -> canplay ]
    // Start (playing):                            [ play    ->                               *loadeddata -> canplay -> *playing ]
    // Start (from previous video):  [ emptied 2x -> play    ->                               *loadeddata -> canplay -> *playing ]
    // Video src change (paused):    [    emptied ->                               *seeked ->  loadeddata -> canplay ]
    // Video src change (playing):   [    emptied -> play                                     *loadeddata -> canplay -> *playing ]
    // Quality change (paused):      [    emptied ->            seeking ->         *seeked ->  loadeddata -> canplay ]
    // Quality change (playing):     [    emptied -> play    -> seeking ->         *seeked ->  loadeddata -> canplay -> *playing ]
    // Seek (paused):                                         [ seeking ->         *seeked ->                canplay ]
    // Seek (playing):                             [ pause   -> seeking -> play -> *seeked ->                canplay -> *playing ]
    // Play:                                                             [ play ->                                      *playing ]
    // Load more data (playing):                   [ waiting ->                                              canplay -> *playing ]
    // End video:  [ pause -> ended ]
    //
    //////

    this.videoListeners = this.videoListeners || {
      seeked: async () => {
        if (!this.settings.enabled || !this.isOnVideoPage) return;

        // Prevent WebGL flicker reduction from mixing old frames
        if (this.projectorBuffer?.ctx?.clearPreviousRect) {
          this.projectorBuffer.ctx.clearPreviousRect();
        }

        // When the video is paused this is the first event. Else [loadeddata] is first
        if (await this.initVideoIfSrcChanged()) return;

        this.previousPresentedFrames = 0;
        this.videoFrameCounts = [];
        this.videoPresentedFrames = 0;
        this.displayFrameCounts = [];
        this.ambientlightFrameCounts = [];
        this.lastUpdateStatsTime = performance.now();

        this.barDetection.cancel();

        // Prevent any old frames from being drawn
        this.buffersCleared = true;

        // Prevent WebGL frameFading/frameBlending from mixing old frames
        if (
          this.settings.webGL &&
          (this.settings.frameFading || this.settings.frameBlending)
        ) {
          this.projector.drawTextureSize = {
            width: 0,
            height: 0,
          };
        }

        await this.optionalFrame();
      },
      loadstart: () => {
        this.settings.setWarning(undefined, undefined, undefined, 'encrypted');
      },
      encrypted: () => {
        this.settings.setWarning(
          'Unable to display an ambient light because YouTube has applied DRM protection to this video',
          true,
          true,
          'encrypted'
        );
      },
      loadeddata: async () => {
        if (!this.settings.enabled || !this.isOnVideoPage) return;

        this.sizesChanged = true;
        this.buffersCleared = true;

        // Prevent WebGL flicker reduction from mixing old frames
        if (this.projectorBuffer?.ctx?.clearPreviousRect) {
          this.projectorBuffer.ctx.clearPreviousRect();
        }

        // Whent the video is playing this is the first event. Else [seeked] is first
        this.checkGetImageDataAllowed(); // Re-check after crossOrigin attribute has been applied
        await this.updateHdr();
        await this.initVideoIfSrcChanged();
      },
      playing: async () => {
        if (!this.settings.enabled || !this.isOnVideoPage) return;
        if (this.videoElem.paused) return; // When paused handled by [seeked]

        await this.optionalFrame();
      },
      ended: () => {
        if (!this.settings.enabled || !this.isOnVideoPage) return;
        if (this.clearTime < performance.now() - 500) this.clear();
        this.stats.hide();
        this.scheduledNextFrame = false;
        this.resetVideoParentElemStyle(); // Prevent visible video element above player because of the modified style attribute
      },
      emptied: () => {
        if (!this.settings.enabled || !this.isOnVideoPage) return;
        if (this.clearTime < performance.now() - 500) this.clear();
        this.scheduledNextFrame = false;
      },
      error: (ex) => {
        const videoElem = ex?.target;
        const error = videoElem?.error;
        console.log(`Restoring the ambient light after a video error...
Video error: ${mediaErrorToString(error?.code)} ${
          error?.message ? `(${error?.message})` : ''
        }
Video network state: ${networkStateToString(videoElem?.networkState)}
Video ready state: ${readyStateToString(videoElem?.readyState)}`);
        if (this.clearTime < performance.now() - 500) this.clear();
        this.cancelScheduledRequestVideoFrame();
        if (this.handleVideoErrorTimeout) return;

        this.handleVideoErrorTimeout = setTimeout(this.handleVideoError, 1000);
      },
      click: this.settings.onCloseMenu,
      enterpictureinpicture: async () => {
        this.videoIsPictureInPicture = true;
        await this.optionalFrame();
      },
      leavepictureinpicture: async () => {
        this.videoIsPictureInPicture = false;
        await this.optionalFrame();
      },
    };
    for (const name in this.videoListeners) {
      off(this.videoElem, name, this.videoListeners[name]);
      on(this.videoElem, name, this.videoListeners[name]);
    }

    if (this.ytdWatchElem) {
      this.playerListeners = this.playerListeners || {
        'yt-autonav-pause-player-ended': this.videoListeners.ended,
      };
      for (const name in this.playerListeners) {
        off(this.ytdWatchElem, name, this.playerListeners[name]);
        on(this.ytdWatchElem, name, this.playerListeners[name]);
      }
    }

    if (this.videoObserver) {
      this.videoObserver.disconnect();
    }
    this.videoIsHidden = false; // IntersectionObserver is always executed at least once when the observation starts
    if (!this.videoObserver) {
      this.videoObserver = new IntersectionObserver(
        wrapErrorHandler((entries, observer) => {
          if (!window.ambientlight) return;
          if (window.ambientlight !== this) {
            observer.disconnect(); // Disconnect, because ambientlight crashed on initialization and created a new instance
            return;
          }

          for (const entry of entries) {
            if (this.videoElem !== entry.target) {
              this.videoObserver.unobserve(entry.target); // video is detached and a new one was created
              continue;
            }
            this.videoIsHidden = entry.intersectionRatio === 0;
            this.videoVisibilityChangeTime = performance.now();
            // this.videoElem.getVideoPlaybackQuality(); // Correct dropped frames
          }

          if (this.chromiumBugVideoJitterWorkaround?.update)
            this.chromiumBugVideoJitterWorkaround.update();
        }, true),
        {
          rootMargin: '-70px 0px 0px 0px', // masthead height (56px) + additional pixel to be safe
          threshold: 0.0001, // Because sometimes a pixel in not visible on screen but the intersectionRatio is already 0
        }
      );
    }
    this.videoObserver.observe(this.videoElem);

    this.applyChromiumBug1142112Workaround();
    this.applyChromiumBugVideoJitterWorkaround();
  }

  handleVideoError = () => {
    this.handleVideoErrorTimeout = undefined;
    this.initVideoListeners();
    if (!this.videoElem.paused) {
      this.videoListeners.playing();
    }
  };

  // Removes "yt:crop=16:9" & "yt-stretch=16:9" from the videoData.keywords array
  // to prevent the video element from being scaled by YouTube in theater view
  ytScalingBaseKeywords = ['yt:crop=', 'yt:stretch='];
  updateKeywordsToPreventTheaterScaling = () => {
    try {
      let keywords =
        document.head.querySelector('meta[name="keywords"]')?.content ?? '';
      if (
        !this.ytScalingBaseKeywords.some((baseKeyword) =>
          keywords.includes(baseKeyword)
        )
      )
        return;

      keywords = keywords.split(', ');
      if (this.settings.enabled) {
        keywords = keywords.filter(
          (keyword) =>
            !this.ytScalingBaseKeywords.some((baseKeyword) =>
              keyword.startsWith(baseKeyword)
            )
        );
      }
      keywords = keywords.join(',');
      injectedScript.postMessage(
        'video-player-update-video-data-keywords',
        keywords
      );
    } catch (ex) {
      SentryReporter.captureException(ex);
    }
  };

  updateVideoPlayerSize = async () => {
    if (this.videoPlayerSetSizePromise) {
      await this.videoPlayerSetSizePromise;
      return;
    }

    await injectedScript.postAndReceiveMessage('video-player-set-size');
  };

  async initListeners() {
    this.initVideoListeners();

    if (this.settings.webGL) {
      this.projector.handleRestored = async () => {
        this.buffersCleared = true;
        this.sizesChanged = true;

        this.cancelScheduledRequestVideoFrame();
        // eslint-disable-next-line no-self-assign
        this.videoElem.currentTime = this.videoElem.currentTime; // Triggers video draw call

        await this.optionalFrame();
      };
    }

    on(
      document,
      'visibilitychange',
      this.handleDocumentVisibilityChange,
      false
    );
    on(
      document,
      'fullscreenchange',
      async function fullscreenchange() {
        await this.updateSizes();
      }.bind(this),
      false
    );

    on(document, 'keydown', this.handleKeyDown);

    if (this.topElem) {
      this.topElemObserver = new IntersectionObserver(
        wrapErrorHandler(async (entries) => {
          let atTop = true;
          for (const entry of entries) {
            atTop = entry.intersectionRatio !== 0;
          }
          if (this.atTop === atTop) return;

          this.atTop = atTop;
          await this.updateAtTop();

          // When the video is filled and paused in fullscreen the ambientlight is out of sync with the video
          if (this.isFillingFullscreen && !this.atTop) {
            this.buffersCleared = true;
            await this.optionalFrame();
          }
        }, true),
        {
          threshold: 0.0001, // Because sometimes a pixel in not visible on screen but the intersectionRatio is already 0
        }
      );
      this.topElemObserver.observe(this.topElem);
      this.atTop = window.scrollY === 0;
      await this.updateAtTop();
    }

    if (this.settings.webGL)
      on(window, 'resize', this.projector.handleWindowResize, false);

    const resizeTooSmall = (pRect, rect) =>
      Math.abs(rect.x - (pRect?.x || 0)) <= 2 &&
      Math.abs(rect.y - (pRect?.y || 0)) <= 2 &&
      Math.abs(rect.width - (pRect?.width || 0)) <= 2 &&
      Math.abs(rect.height - (pRect?.height || 0)) <= 2;
    // Only triggers when the html width changes because the height is 0
    let previousHtmlRect;
    this.htmlResizeObserver = new ResizeObserver(
      wrapErrorHandler(
        function htmlResize(e) {
          if (!this.settings.enabled || !this.isOnVideoPage) return;

          const rect = e[0].contentRect;
          if (resizeTooSmall(previousHtmlRect, rect)) return;

          previousHtmlRect = rect;
          this.resize(); // Because the video position could be shifted
        }.bind(this),
        true
      )
    );
    this.htmlResizeObserver.observe(document.documentElement);

    // Makes sure the player size is recalculated after the scrollbar has been hidden
    // and the styles are recalculated.
    // YouTube does this incorrect by calculating it before the styles are recalculated.
    let previousVideoPlayerRect;
    this.videoPlayerResizeObserver = new ResizeObserver(
      wrapErrorHandler(
        function videoPlayerResize(e) {
          if (!this.settings.enabled || !this.isOnVideoPage) {
            previousVideoPlayerRect = undefined;
            return;
          }

          const rect = e[0].contentRect;
          if (resizeTooSmall(previousVideoPlayerRect, rect)) return;

          // if(!this.isFullscreen) {
          //   try {
          //     await new Promise(resolve => raf(resolve)) // Wait for all layout style recalculations
          //     this.videoPlayerElem.setSize()
          //     this.videoPlayerElem.setInternalSize()
          //     await new Promise(resolve => raf(resolve)) // Wait for all layout style recalculations
          //     this.sizesChanged = true
          //   } catch(ex) {
          //     console.warn('Failed to resize the video player')
          //   }
          // }
          if (!this.settings.enabled) return;

          previousVideoPlayerRect = rect;
          this.resize(
            this.videoPlayerResizeToFullscreen
              ? 0
              : this.videoPlayerResizeFromFullscreen
              ? 0
              : 0
          );
          this.videoPlayerResizeFromFullscreen = false;
          this.videoPlayerResizeToFullscreen = false;
        }.bind(this),
        true
      )
    );
    this.videoPlayerResizeObserver.observe(this.videoPlayerElem);

    // // Deprecated: Moved to videoPlayerResizeObserver
    // this.videoContainerResizeObserver = new ResizeObserver(wrapErrorHandler(function videoContainerResize() {
    //   this.resize()
    // }.bind(this), true))
    // this.videoContainerResizeObserver.observe(this.videoContainerElem)

    let previousVideoRect;
    this.videoResizeObserver = new ResizeObserver(
      wrapErrorHandler(
        function videoResize(e) {
          if (!this.settings.enabled || !this.isOnVideoPage) {
            previousVideoRect = undefined;
            return;
          }

          const rect = e[0].contentRect;
          if (resizeTooSmall(previousVideoRect, rect)) {
            return;
          }

          previousVideoRect = rect;
          this.resize();
        }.bind(this),
        true
      )
    );
    this.videoResizeObserver.observe(this.videoElem);

    injectedScript.addMessageListener('sizes-changed', () => {
      this.sizesChanged = true;
    });

    // Fix YouTube bug: focus on video element without scrolling to the top
    on(this.videoElem, 'focus', this.handleVideoFocus, true);

    this.theming.initListeners();

    this.initAverageVideoFramesDifferenceListeners();

    const videoPlayerObserver = new MutationObserver(
      wrapErrorHandler(
        async function videoPlayerMutation() {
          const viewChanged = await this.updateView();
          const videoHiddenChanged = this.updateIsVideoHiddenOnWatchPage();
          if (!viewChanged && !videoHiddenChanged) return;

          if (videoHiddenChanged && this.isVideoHiddenOnWatchPage) {
            if (this.clearTime < performance.now() - 500) this.clear();
            this.resetVideoParentElemStyle();
            return;
          }

          if (
            viewChanged ||
            (videoHiddenChanged && !this.isVideoHiddenOnWatchPage)
          ) {
            await this.optionalFrame();
          }
        }.bind(this),
        true
      )
    );
    this.updateIsVideoHiddenOnWatchPage();

    videoPlayerObserver.observe(this.videoPlayerElem, {
      attributes: true,
      attributeFilter: ['class'],
    });
    if (this.thumbnailOverlayElem) {
      videoPlayerObserver.observe(this.thumbnailOverlayElem, {
        attributes: true,
        attributeFilter: ['style'],
      });
    }

    // When the video moves between the small and theater views
    const playerContainersObserver = new MutationObserver(
      wrapErrorHandler(
        async function playerContainerMutation() {
          await this.updateView();
          await this.optionalFrame();
        }.bind(this),
        true
      )
    );
    const playerContainersObserverOptions = {
      childList: true,
    };

    const playerTheaterContainerElem = this.playerTheaterContainerElem;
    if (playerTheaterContainerElem) {
      playerContainersObserver.observe(
        playerTheaterContainerElem,
        playerContainersObserverOptions
      );
    }
    const playerSmallContainerElem = this.playerSmallContainerElem;
    if (playerSmallContainerElem) {
      playerContainersObserver.observe(
        playerSmallContainerElem,
        playerContainersObserverOptions
      );
    }

    await this.updateView();
  }

  updateIsVideoHiddenOnWatchPage = () => {
    const classList = this.videoPlayerElem.classList;
    const hidden =
      classList.contains('ended-mode') ||
      (classList.contains('unstarted-mode') &&
        !(this.thumbnailOverlayElem?.style?.display !== '')); // Auto-play disabled and Thumbnail poster overlays the video
    if (this.isVideoHiddenOnWatchPage === hidden) return false;

    this.isVideoHiddenOnWatchPage = hidden;
    this.sizesInvalidated = true;
    return true;
  };

  delayResizes = true;
  resizeDurationThreshold = 300;
  resizeDurations = [
    this.resizeDurationThreshold,
    this.resizeDurationThreshold,
    this.resizeDurationThreshold,
    this.resizeDurationThreshold,
  ];

  resizeAfterFrames = 0;
  resize = wrapErrorHandler(async (afterFrames = 0) => {
    if (!this.settings.enabled || !this.isOnVideoPage || this.pendingStart) {
      this.resizeAfterFrames = 0;
      if (this.scheduledResize) cancelAnimationFrame(this.scheduledResize);
      this.scheduledResize = undefined;
      return;
    }

    this.delayResizes =
      this.delayResizes ||
      this.videoPlayerResizeFromFullscreen ||
      this.videoPlayerResizeToFullscreen;
    this.resizeAfterFrames = this.delayResizes
      ? Math.max(this.resizeAfterFrames, afterFrames)
      : 0;

    if (this.scheduledResize) return;

    if (this.resizeAfterFrames === 0) {
      this.sizesInvalidated = true;
      const start = performance.now();
      await this.optionalFrame();
      requestIdleCallback(() => this.measureResizeDuration(start), {
        timeout: 1000,
      });
    }

    // Do not resize untill the next animation frame
    this.scheduledResize = raf(() => {
      this.scheduledResize = undefined;
      if (this.resizeAfterFrames === 0) return;

      this.resizeAfterFrames--;
      this.resize();
    });
  });

  measureResizeDuration = (start) => {
    const duration = Math.min(1000, performance.now() - start);
    this.resizeDurations.push(duration);
    if (this.resizeDurations.length > 4) this.resizeDurations.splice(0, 1);
    const averageDuration =
      this.resizeDurations.reduce((a, b) => a + b) /
      this.resizeDurations.length;
    this.delayResizes = averageDuration >= this.resizeDurationThreshold;
  };

  handleDocumentVisibilityChange = async () => {
    if (this.handlePageVisibilityTimeout) {
      clearTimeout(this.handlePageVisibilityTimeout);
      this.handlePageVisibilityTimeout = undefined;
    }

    if (!this.settings.enabled || !this.isOnVideoPage) return;

    const isPageHidden = document.visibilityState === 'hidden';
    if (this.isPageHidden === isPageHidden) return;
    this.isPageHidden = isPageHidden;

    if (isPageHidden) {
      this.pageHiddenTime = performance.now();
      this.checkIfNeedToHideVideoOverlay();
      this.buffersCleared = true;
      this.sizesChanged = true;

      this.handlePageVisibilityTimeout = setTimeout(
        function handlePageVisibility() {
          this.handlePageVisibilityTimeout = undefined;
          this.pageHiddenClearTime = performance.now();

          // const lintExt = this.ctx.getExtension('GMAN_debug_helper');
          // if(lintExt) lintExt.disable() // weblg-lint throws incorrect errors after the WebGL context has been lost once

          // Set canvas sizes & textures to 1x1 to clear GPU memory
          this.clear();
        }.bind(this),
        3000
      );
    } else {
      this.pageShownTime = performance.now();
      await this.theming.updateTheme();
      await this.optionalFrame();
    }
  };

  handleKeyDown = async (e) => {
    if (!this.isOnVideoPage) return;
    if (document.activeElement) {
      const el = document.activeElement;
      const tag = el.tagName;
      const inputs = ['INPUT', 'SELECT', 'TEXTAREA'];
      if (
        inputs.indexOf(tag) !== -1 ||
        (el.getAttribute('contenteditable') != null &&
          el.getAttribute('contenteditable') !== 'false')
      ) {
        return;
      }
    }
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;

    await this.onKeyPressed(e.key?.toUpperCase());
  };

  handleVideoFocus = () => {
    if (!this.settings.enabled || !this.isOnVideoPage || !this.ytdAppElem)
      return;

    const startTop =
      this.view === VIEW_FULLSCREEN
        ? this.ytdAppElem.scrollTop
        : window.scrollY;
    raf(
      function handleVideoFocusRaf() {
        const endTop = VIEW_FULLSCREEN
          ? this.ytdAppElem.scrollTop
          : window.scrollY;
        if (startTop === endTop) return;

        if (this.view === VIEW_FULLSCREEN) {
          this.ytdAppElem.scrollTop = startTop;
        } else {
          window.scrollTo(window.scrollX, startTop);
        }
      }.bind(this)
    );
  };

  onKeyPressed = async (key) => {
    if (key === ' ') return;

    const keys = this.settings.getKeys();
    if (key === keys.detectHorizontalBarSizeEnabled)
      this.settings.clickUI('detectHorizontalBarSizeEnabled');
    if (key === keys.detectVerticalBarSizeEnabled)
      this.settings.clickUI('detectVerticalBarSizeEnabled');
    if (key === keys.detectVideoFillScaleEnabled)
      this.settings.clickUI('detectVideoFillScaleEnabled');
    if (key === keys.enabled) await this.toggleEnabled();
  };

  async toggleEnabled(enabled) {
    if (this.pendingStart) return;
    enabled = enabled !== undefined ? enabled : !this.settings.enabled;
    if (enabled) {
      await this.enable();
    } else {
      await this.disable();
    }
    this.settings.displayBezelForSetting('enabled');
  }

  async checkGetImageDataAllowed() {
    const isSameOriginVideo =
      !!this.videoElem.src &&
      this.videoElem.src.indexOf(location.origin) !== -1;
    const getImageDataAllowed =
      !window.chrome ||
      isSameOriginVideo ||
      (!isSameOriginVideo && this.videoElem.crossOrigin);

    // Try to apply the workaround once
    if (
      this.videoElem.src &&
      !getImageDataAllowed &&
      !this.crossOriginApplied
    ) {
      console.warn(
        `Detected cross origin video. Applying workaround... ${this.videoElem.src}, ${this.videoElem.crossOrigin}`
      );
      this.crossOriginApplied = true;

      try {
        const currentTime = this.videoElem.currentTime;
        this.videoElem.crossOrigin = 'use-credentials';

        // Refresh auto quality setting range above 480p
        await injectedScript.postAndReceiveMessage(
          'video-player-reload-video-by-id'
        );

        this.videoElem.currentTime = currentTime;
      } catch {
        console.warn(
          `Detected cross origin video. Failed to apply workaround...  ${this.videoElem.src}, ${this.videoElem.crossOrigin}`
        );
      }
    }

    if (this.getImageDataAllowed === getImageDataAllowed) return;

    this.getImageDataAllowed = getImageDataAllowed;
    this.settings.updateVisibility();
  }

  async initAmbientlightElems() {
    this.elem = document.createElement('div');
    this.elem.classList.add('ambientlight');

    this.containerElem = document.createElement('div');
    this.containerElem.classList.add('ambientlight__container');
    this.containerElem.style.position = 'absolute';
    this.elem.prepend(this.containerElem);

    if (this.mastheadElem) {
      this.topElem = document.createElement('div');
      this.topElem.classList.add('ambientlight__top');
      this.elem.prepend(this.topElem);
    }

    this.clearfixElem = document.createElement('div');
    this.clearfixElem.classList.add('ambientlight__clearfix');
    this.elem.prepend(this.clearfixElem);

    this.videoShadowElem = document.createElement('div');
    this.videoShadowElem.classList.add('ambientlight__video-shadow');
    this.containerElem.prepend(this.videoShadowElem);

    this.filterElem = document.createElement('div');
    this.filterElem.classList.add('ambientlight__filter');
    this.containerElem.prepend(this.filterElem);

    if (this.enableChromiumBug1123708Workaround) {
      this.chromiumBug1123708WorkaroundElem = new Canvas(1, 1, true);
      this.chromiumBug1123708WorkaroundElem.classList.add(
        'ambientlight__chromium-bug-1123708-workaround'
      );
      this.filterElem.prepend(this.chromiumBug1123708WorkaroundElem);
    }

    this.clipElem = document.createElement('div');
    this.clipElem.classList.add('ambientlight__clip');
    this.filterElem.prepend(this.clipElem);

    this.projectorsElem = document.createElement('div');
    this.projectorsElem.classList.add('ambientlight__projectors');
    this.clipElem.prepend(this.projectorsElem);

    this.projectorListElem = document.createElement('div');
    this.projectorListElem.classList.add('ambientlight__projector-list');
    this.projectorsElem.prepend(this.projectorListElem);

    this.appendElemToContentElem();

    await this.initProjector();
  }

  getContentElem = () =>
    this.ytdAppElem
      ? this.ytdAppElem.querySelector('#content.ytd-app')
      : this.videoPlayerElem; // In embed view

  getFullscreenContentElem() {
    let elem = this.getContentElem();
    if (document.fullscreenElement) {
      if (!document.fullscreenElement.contains(elem)) {
        elem = document.fullscreenElement;
      }
    }
    return elem;
  }

  appendElemToContentElem() {
    const contentElem = this.getContentElem();
    if (this.elem.parentElement === contentElem) return;

    contentElem.prepend(this.elem);
  }

  appendElemToFullscreenElem() {
    const fullscreenContentElem = this.getFullscreenContentElem();

    if (this.elem.parentElement === fullscreenContentElem) return;

    fullscreenContentElem.prepend(this.elem);
  }

  initProjector = async () => {
    if (this.settings.webGL) {
      try {
        this.projector = await new ProjectorWebGL(
          this,
          this.projectorListElem,
          this.initProjectorListeners,
          this.settings
        );
      } catch (ex) {
        this.projector = undefined;
        if (!this.settings.webGLCrashDate) {
          SentryReporter.captureException(ex);
        } else {
          console.log(ex);
          if (ex?.details) console.log(ex.details);
        }
        this.settings.handleWebGLCrash();
      }
    }

    if (!this.projector) {
      this.projector = new Projector2d(
        this,
        this.projectorListElem,
        this.initProjectorListeners,
        this.settings
      );
    }
    this.initProjectorListeners();
  };

  initProjectorListeners = () => {
    // Dont draw ambientlight when its not in viewport
    this.isAmbientlightHiddenOnWatchPage = false;
    if (this.ambientlightObserver) {
      this.ambientlightObserver.disconnect();
    }
    if (!this.ambientlightObserver) {
      this.ambientlightObserver = new IntersectionObserver(
        wrapErrorHandler(async (entries) => {
          for (const entry of entries) {
            this.isAmbientlightHiddenOnWatchPage =
              entry.intersectionRatio === 0;
            if (this.isAmbientlightHiddenOnWatchPage) continue;

            await this.optionalFrame();
          }
        }, true),
        {
          threshold: 0.0001, // Because sometimes a pixel in not visible on screen but the intersectionRatio is already 0
        }
      );
    }
    this.ambientlightObserver.observe(this.projector.boundaryElem);
  };

  initBuffersWrapper() {
    this.buffersWrapperElem = document.createElement('div');
    this.buffersWrapperElem.classList.add('ambientlight__buffers-wrapper');
    this.containerElem.appendChild(this.buffersWrapperElem);
  }

  async initProjectorBuffers() {
    let projectorsBufferElem;
    let projectorsBufferCtx;
    if (this.settings.webGL) {
      try {
        projectorsBufferElem = new WebGLOffscreenCanvas(
          1,
          1,
          this,
          this.settings
        );
        projectorsBufferCtx = await projectorsBufferElem.getContext(
          '2d',
          ctxOptions
        );

        if (this.settings.webGLCrashDate) {
          this.settings.webGLCrashDate = undefined;
          this.settings.webGLCrashVersion = undefined;
          this.settings.saveStorageEntry('webGLCrash', undefined);
          this.settings.saveStorageEntry('webGLCrashVersion', undefined);
          this.settings.updateWebGLCrashDescription();
        }
      } catch (ex) {
        projectorsBufferCtx = undefined;
        if (!this.settings.webGLCrashDate) {
          SentryReporter.captureException(ex);
        } else {
          console.log(ex);
          if (ex?.details) console.log(ex.details);
        }
        this.settings.handleWebGLCrash();
      }
    }
    if (!projectorsBufferCtx) {
      projectorsBufferElem = new SafeOffscreenCanvas(1, 1, true);
      projectorsBufferCtx = projectorsBufferElem.getContext('2d', ctxOptions);
    }

    if (projectorsBufferElem.tagName === 'CANVAS') {
      this.buffersWrapperElem.appendChild(projectorsBufferElem);
    }
    this.nonHdrProjectorBuffer = {
      elem: projectorsBufferElem,
      ctx: projectorsBufferCtx,
    };
    this.projectorBuffer = this.nonHdrProjectorBuffer;
  }

  initWebGLHdrProjectorBuffer() {
    if (this.hdrProjectorBuffer) return;

    const hdrProjectorsBufferElem = new SafeOffscreenCanvas(1, 1, true);
    const hdrProjectorsBufferCtx = hdrProjectorsBufferElem.getContext(
      '2d',
      ctxOptions
    );

    if (hdrProjectorsBufferElem.tagName === 'CANVAS') {
      this.buffersWrapperElem.appendChild(hdrProjectorsBufferElem);
    }
    this.hdrProjectorBuffer = {
      elem: hdrProjectorsBufferElem,
      ctx: hdrProjectorsBufferCtx,
    };
  }

  async initSettings() {
    this.settings = await new Settings(
      this,
      this.settingsMenuBtnParent,
      this.videoPlayerElem
    );
    parseSettingsToSentry(this.settings);
  }

  initVideoOverlay() {
    const videoOverlayElem = new Canvas(1, 1);
    videoOverlayElem.classList.add('ambientlight__video-overlay');
    this.videoOverlay = {
      elem: videoOverlayElem,
      ctx: videoOverlayElem.getContext('2d', {
        ...ctxOptions,
        alpha: true,
      }),
      isHiddenChangeTimestamp: 0,
    };
  }

  initFrameBlending() {
    const previousProjectorsBufferElem = new Canvas(
      this.projectorBuffer.elem.width,
      this.projectorBuffer.elem.height,
      true
    );
    if (previousProjectorsBufferElem.tagName === 'CANVAS') {
      this.buffersWrapperElem.appendChild(previousProjectorsBufferElem);
    }
    this.previousProjectorBuffer = {
      elem: previousProjectorsBufferElem,
      ctx: previousProjectorsBufferElem.getContext('2d', ctxOptions),
    };

    const blendedProjectorsBufferElem = new Canvas(
      this.projectorBuffer.elem.width,
      this.projectorBuffer.elem.height,
      true
    );
    if (blendedProjectorsBufferElem.tagName === 'CANVAS') {
      this.buffersWrapperElem.appendChild(blendedProjectorsBufferElem);
    }
    this.blendedProjectorBuffer = {
      elem: blendedProjectorsBufferElem,
      ctx: blendedProjectorsBufferElem.getContext('2d', ctxOptions),
    };
  }

  initVideoOverlayWithFrameBlending() {
    const videoOverlayBufferElem = new Canvas(
      this.srcVideoOffset.width,
      this.srcVideoOffset.height,
      true
    );
    if (videoOverlayBufferElem.tagName === 'CANVAS') {
      this.buffersWrapperElem.appendChild(videoOverlayBufferElem);
    }
    this.videoOverlayBuffer = {
      elem: videoOverlayBufferElem,
      ctx: videoOverlayBufferElem.getContext('2d', ctxOptions),
    };

    const previousVideoOverlayBufferElem = new Canvas(
      this.srcVideoOffset.width,
      this.srcVideoOffset.height,
      true
    );
    if (previousVideoOverlayBufferElem.tagName === 'CANVAS') {
      this.buffersWrapperElem.appendChild(previousVideoOverlayBufferElem);
    }
    this.previousVideoOverlayBuffer = {
      elem: previousVideoOverlayBufferElem,
      ctx: previousVideoOverlayBufferElem.getContext('2d', ctxOptions),
    };
  }

  async resetSettingsIfNeeded() {
    const videoPath = location.search;
    if (!this.prevVideoPath || videoPath !== this.prevVideoPath) {
      if (this.settings.horizontalBarsClipPercentageReset) {
        const horizontalBarChanged = this.setHorizontalBars(0);
        const verticalBarChanged = this.setVerticalBars(0);
        if (horizontalBarChanged || verticalBarChanged) {
          this.sizesChanged = true;
          await this.optionalFrame();
        }
      }
    }
    this.prevVideoPath = videoPath;
    await this.settings.updateHdr();
  }

  setHorizontalBars(percentage) {
    if (this.settings.horizontalBarsClipPercentage === percentage) return false;

    this.settings.set('horizontalBarsClipPercentage', percentage, true);
    return true;
  }

  setVerticalBars(percentage) {
    if (this.settings.verticalBarsClipPercentage === percentage) return false;

    this.settings.set('verticalBarsClipPercentage', percentage, true);
    return true;
  }

  recreateProjectors() {
    this.levels = Math.max(
      2,
      Math.round(this.settings.spread / this.settings.edge) +
        this.innerStrength +
        1
    );
    if (this.projector.recreate) {
      this.projector.recreate(this.levels);
    }
  }

  clear() {
    this.clearTime = performance.now();
    this.barDetection.clear();

    // Clear canvasses
    const canvasses = [];
    if (this.projector) {
      canvasses.push({ ctx: this.projector });
    }
    if (this.projectorBuffer) {
      canvasses.push(this.projectorBuffer);
    }
    if (this.previousProjectorBuffer) {
      canvasses.push(this.previousProjectorBuffer);
      canvasses.push(this.blendedProjectorBuffer);
    }
    if (this.videoOverlay) {
      canvasses.push(this.videoOverlay);
      if (this.videoOverlayBuffer) {
        canvasses.push(this.videoOverlayBuffer);
        canvasses.push(this.previousVideoOverlayBuffer);
      }
    }
    for (const canvas of canvasses) {
      if (canvas.ctx?.clearRect) {
        if (!canvas.ctx.isContextLost || !canvas.ctx.isContextLost()) {
          if (canvas.elem) {
            canvas.ctx.clearRect(0, 0, canvas.elem.width, canvas.elem.height);
          } else {
            canvas.ctx.clearRect();
          }
        }
      } else if (canvas.elem) {
        canvas.elem.width = 1;
      }
    }

    this.buffersCleared = true;
    this.sizesChanged = true;
    this.checkIfNeedToHideVideoOverlay();
    this.scheduleNextFrame();
  }

  updateVideoScale() {
    let videoScale = this.isVrVideo
      ? 100
      : this.settings[`videoScale.${this.view}`] ?? 100;

    if (
      this.settings.detectVideoFillScaleEnabled &&
      this.videoElem?.offsetWidth &&
      this.videoElem?.offsetHeight &&
      this.videoPlayerElem?.offsetWidth &&
      this.videoPlayerElem?.offsetHeight
    ) {
      const barScaleX = this.isVrVideo
        ? 1
        : (100 - this.settings.verticalBarsClipPercentage * 2) / 100;
      const barScaleY = this.isVrVideo
        ? 1
        : (100 - this.settings.horizontalBarsClipPercentage * 2) / 100;
      const barScaledVideoWidth = this.videoElem.offsetWidth * barScaleX;
      const barScaledVideoHeight = this.videoElem.offsetHeight * barScaleY;

      const containerWidth =
        this.videoPlayerElem.offsetWidth * (videoScale / 100);
      const containerHeight =
        this.videoPlayerElem.offsetHeight * (videoScale / 100);

      const filledVideoScaleX = containerWidth / barScaledVideoWidth;
      const filledVideoScaleY = containerHeight / barScaledVideoHeight;
      const filledVideoScale =
        Math.round(Math.min(filledVideoScaleX, filledVideoScaleY) * 10000) /
        100;

      if (
        !isNaN(filledVideoScale) &&
        !(filledVideoScale > 100 && filledVideoScale < 100.5)
      ) {
        videoScale = filledVideoScale;
      }
    }

    this.videoScale = videoScale;

    // Video scale
    setStyleProperty(
      document.body,
      '--ytal-html5-video-player-overflow',
      this.videoScale > 100 ? 'visible' : ''
    );
  }

  getView = () => {
    if (!this.settings.enabled) return VIEW_DISABLED;

    if (!document.contains(this.videoPlayerElem)) return VIEW_DETACHED;

    if (
      document.fullscreenElement ||
      this.videoPlayerElem.classList.contains('ytp-fullscreen')
    )
      return VIEW_FULLSCREEN;

    if (this.videoPlayerElem.classList.contains('ytp-player-minimized'))
      return VIEW_POPUP;

    if (
      this.ytdWatchElemFromVideo
        ? this.ytdWatchElemFromVideo.getAttribute('theater') != null
        : this.playerTheaterContainerElemFromVideo
    ) {
      return VIEW_THEATER;
    }

    return VIEW_SMALL;
  };

  initVR = () => {
    if (getBrowser() === 'Firefox') {
      this.settings.setWarning(
        'Ambient light does not support VR videos',
        false,
        false
      );
    } else {
      this.vrVideoElem = this.videoPlayerElem.querySelector('.webgl canvas');
      this.vrVideoElem.dataset.ytalElem = 'vr-video';
      this.nextVrFrameListener = injectedScript.addMessageListener(
        'next-vr-frame',
        this.drawVR
      );
      injectedScript.postMessage('init-vr-video');
    }

    this.settings.updateVisibility();
  };

  disposeVR = () => {
    if (this.nextVrFrameListener) {
      injectedScript.removeMessageListener(this.nextVrFrameListener);
      this.nextVrFrameListener = undefined;
    }
    injectedScript.postMessage('dispose-vr-video');

    this.vrVideoElem = undefined;
    if (getBrowser() === 'Firefox') {
      this.settings.setWarning();
    }

    this.settings.updateVisibility();
  };

  drawVR = () => {
    this.nextFrame();
  };

  updateView = async (skipUpdateImmersiveMode = false) => {
    const isVrVideo = this.videoPlayerElem?.classList?.contains(
      'ytp-webgl-spherical'
    );
    if (isVrVideo != this.isVrVideo) {
      this.isVrVideo = isVrVideo;
      this.sizesChanged = true;
    }
    if (!isVrVideo && this.vrVideoElem) this.disposeVR();

    const wasControlledByAnotherExtension = this.isControlledByAnotherExtension;
    this.isControlledByAnotherExtension =
      document.body.classList.contains('efyt-mini-player') ||
      this.videoElem?.classList.contains('stefanvdvideotop'); // Enhancer for YouTube
    if (
      wasControlledByAnotherExtension !== this.isControlledByAnotherExtension
    ) {
      this.sizesChanged = true;
    }

    const view = this.getView();
    if (this.view === view) return false;

    this.view = view;

    // let videoPlayerSizeUpdated = false;
    if (!skipUpdateImmersiveMode) await this.updateImmersiveMode();

    const isFullscreen = view == VIEW_FULLSCREEN;
    const fullscreenChanged = isFullscreen !== this.isFullscreen;
    this.isFullscreen = isFullscreen;

    this.updateFixedStyle();
    this.settings.updateVisibility();

    if (fullscreenChanged && this.settings.enabled && this.isOnVideoPage) {
      this.videoPlayerResizeFromFullscreen = !this.isFullscreen;
      this.videoPlayerResizeToFullscreen = this.isFullscreen;
    }

    const fullscreenElemChanged =
      document.fullscreenElement !== this.fullscreenElem;
    this.fullscreenElem = document.fullscreenElement;
    if (fullscreenChanged || fullscreenElemChanged) {
      if (this.isFullscreen) {
        this.appendElemToFullscreenElem();
      } else {
        this.appendElemToContentElem();
      }
    }

    // Todo: Set the settings for the specific view
    // if(prevView !== this.view) {
    //   console.log('VIEW CHANGED: ', this.view)
    //   this.getAllSettings()
    // }

    // if (videoPlayerSizeUpdated) {
    //   console.log('videoPlayerSizeUpdated');
    if (!skipUpdateImmersiveMode) {
      raf(() => this.updateVideoPlayerSize()); // Always force youtube to recalculate the size because it caches the size per view without invalidation based on ambient light enabled/disabled
    }
    // }

    return true;
  };

  isInEnabledView = () => {
    const enableInViews = this.settings.enableInViews;
    const enabledInView =
      {
        [VIEW_SMALL]: enableInViews <= 2,
        [VIEW_THEATER]:
          enableInViews === 0 || (enableInViews >= 2 && enableInViews <= 4),
        [VIEW_FULLSCREEN]: enableInViews === 0 || enableInViews >= 4,
      }[this.view] || false;

    if (isEmbedPageUrl()) {
      return (
        this.settings.enableInEmbed &&
        (this.view !== VIEW_FULLSCREEN || enabledInView)
      );
    }

    const enabledInPictureInPicture =
      this.settings.enableInPictureInPicture || !this.videoIsPictureInPicture;

    return enabledInView && enabledInPictureInPicture;
  };

  async updateSizes() {
    await this.updateView();
    this.updateVideoScale();

    const noClipOrScale =
      this.isVrVideo ||
      (this.settings.horizontalBarsClipPercentage == 0 &&
        this.settings.verticalBarsClipPercentage == 0 &&
        this.videoScale == 100);

    const videoParentElem = this.videoElem.parentElement;

    const notVisible =
      !this.settings.enabled ||
      (this.isVrVideo && !this.settings.enableInVRVideos) ||
      !videoParentElem ||
      !this.videoPlayerElem ||
      !this.isInEnabledView();
    if (notVisible || noClipOrScale) {
      this.resetVideoParentElemStyle();
    }
    this.lastUpdateSizesChanged = performance.now();
    if (notVisible) {
      await this.hide();
      return false;
    }

    this.barsClip = [
      this.isVrVideo ? 0 : this.settings.verticalBarsClipPercentage,
      this.isVrVideo ? 0 : this.settings.horizontalBarsClipPercentage,
    ].map((percentage) => percentage / 100);
    this.clippedVideoScale = this.barsClip.map((clip) => 1 - clip * 2);
    this.shouldStyleVideoParentElem =
      this.isOnVideoPage &&
      !this.isVideoHiddenOnWatchPage &&
      !this.videoElem.ended &&
      !noClipOrScale &&
      !this.isControlledByAnotherExtension;
    if (this.shouldStyleVideoParentElem) {
      const top = Math.max(0, parseInt(this.videoElem.style.top) || 0);
      const left = Math.max(0, parseInt(this.videoElem.style.left) || 0);
      const width = Math.max(0, parseInt(this.videoElem.style.width) || 0);
      videoParentElem.style.width = `${width}px`;
      videoParentElem.style.height = this.videoElem.style.height || '100%';
      videoParentElem.style.marginBottom = `${-this.videoElem.offsetHeight}px`;
      videoParentElem.style.overflow = 'hidden';
      videoParentElem.style.transform = `
        translate(${left}px, ${top}px)
        scale(${this.videoScale / 100}) 
        scale(${this.clippedVideoScale[0]}, ${this.clippedVideoScale[1]})
      `;
      const videoClipScale = this.clippedVideoScale.map(
        (scale) => Math.round(1000 * (1 / scale)) / 1000
      );
      setStyleProperty(
        videoParentElem,
        '--video-transform',
        `translate(${-left}px, ${-top}px) scale(${videoClipScale[0]}, ${
          videoClipScale[1]
        })`
      );
    } else {
      this.resetVideoParentElemStyle();
    }

    if (this.isVrVideo !== !!this.vrVideoElem) {
      if (this.isVrVideo) {
        this.initVR();
      } else {
        this.disposeVR();
      }
    }

    this.videoOffset = this.getElemRect(
      this.isVrVideo ? this.vrVideoElem : this.videoElem
    );
    this.isFillingFullscreen =
      this.isFullscreen &&
      Math.abs(this.videoOffset.width - window.innerWidth) < 10 &&
      Math.abs(this.videoOffset.height - window.innerHeight) < 10 &&
      noClipOrScale;

    if (
      this.videoOffset.top === undefined ||
      !this.videoOffset.width ||
      !this.videoOffset.height ||
      !this.videoElem.videoWidth ||
      !this.videoElem.videoHeight
    )
      return false; //Not ready

    const unscaledWidth = Math.round(
      this.videoOffset.width / (this.videoScale / 100)
    );
    const unscaledHeight = Math.round(
      this.videoOffset.height / (this.videoScale / 100)
    );
    const unscaledLeft = Math.round(
      this.videoOffset.left +
        window.scrollX -
        (unscaledWidth - this.videoOffset.width) / 2
    );
    const scrollYCorrection =
      this.ytdWatchElem?.tagName === 'YTD-WATCH-FIXIE' &&
      this.view === VIEW_SMALL
        ? window.scrollY
        : 0;
    const unscaledTop = Math.round(
      this.videoOffset.top -
        scrollYCorrection -
        (unscaledHeight - this.videoOffset.height) / 2
    );

    this.projectorsElem.style.left = `${unscaledLeft}px`;
    this.projectorsElem.style.top = `${unscaledTop - 1}px`;
    this.projectorsElem.style.width = `${unscaledWidth}px`;
    this.projectorsElem.style.height = `${unscaledHeight}px`;
    this.projectorsElem.style.transform = `
      scale(${this.videoScale / 100}) 
      scale(${this.clippedVideoScale[0]}, ${this.clippedVideoScale[1]})
    `;
    if (this.settings.webGL) this.projector.cropped = false;

    if (
      this.settings.videoShadowOpacity != 0 &&
      this.settings.videoShadowSize != 0
    ) {
      this.videoShadowElem.style.display = 'block';
      this.videoShadowElem.style.left = `${unscaledLeft}px`;
      this.videoShadowElem.style.top = `${unscaledTop}px`;
      this.videoShadowElem.style.width = `${
        unscaledWidth * this.clippedVideoScale[0]
      }px`;
      this.videoShadowElem.style.height = `${
        unscaledHeight * this.clippedVideoScale[1]
      }px`;
      this.videoShadowElem.style.transform = `
        translate3d(0,0,0)
        translate(${unscaledWidth * this.barsClip[0]}px, ${
        unscaledHeight * this.barsClip[1]
      }px)
        scale(${this.videoScale / 100})
      `;
      this.videoShadowElem.style.borderRadius = this.ytdPlayerElem
        ? getComputedStyle(this.ytdPlayerElem).borderRadius ?? ''
        : '';
    } else {
      this.videoShadowElem.style.display = '';
    }

    const contrast =
      this.settings.contrast +
      (this.isHdr ? this.settings.hdrContrast - 100 : 0);
    const brightness =
      this.settings.brightness +
      (this.isHdr ? this.settings.hdrBrightness - 100 : 0);
    const saturation =
      this.settings.saturation +
      (this.isHdr ? this.settings.hdrSaturation - 100 : 0);
    this.filterElem.style.filter = `
      ${
        !this.settings.webGL && blur != 0
          ? `blur(${Math.round(
              this.videoOffset.height * 0.0025 * this.settings.blur2
            )}px)`
          : ''
      }
      ${contrast != 100 ? `contrast(${contrast}%)` : ''}
      ${brightness != 100 ? `brightness(${brightness}%)` : ''}
      ${saturation != 100 ? `saturate(${saturation}%)` : ''}
    `.trim();

    this.srcVideoOffset = {
      top: this.videoOffset.top,
      width: this.vrVideoElem?.width ?? this.videoElem.videoWidth,
      height: this.vrVideoElem?.height ?? this.videoElem.videoHeight,
    };
    this.vrVideoSrcOffset = {
      width: this.videoElem.videoWidth,
      height: this.videoElem.videoHeight,
    };

    let pScale;
    if (this.settings.webGL) {
      const relativeBlur =
        (this.settings.resolution / 100) *
        (this.isHdr ? 0 : this.settings.blur2);
      let pMinSize =
        (this.settings.resolution / 100) *
        (this.isHdr ? 2 : 1) *
        (this.settings.detectHorizontalBarSizeEnabled ||
        this.settings.detectVerticalBarSizeEnabled
          ? 256
          : relativeBlur >= 20
          ? 128
          : relativeBlur >= 10
          ? 192
          : 256);
      if (this.settings.spread > 200) pMinSize = pMinSize / 2;

      pScale = Math.min(
        0.5,
        Math.max(
          pMinSize / this.srcVideoOffset.width,
          pMinSize / this.srcVideoOffset.height
        ),
        Math.min(
          1024 / this.srcVideoOffset.width,
          1024 / this.srcVideoOffset.height
        )
      );
    } else {
      // A size of 512 videoWidth/videoHeight is required to prevent pixel flickering because CanvasContext2D uses no mipmaps
      // A CanvasContext2D size of > 256 is required to enable GPU acceleration in Chrome
      const pMinSize = Math.max(
        257,
        Math.min(512, this.srcVideoOffset.width, this.srcVideoOffset.height)
      );
      pScale = Math.max(
        pMinSize / this.srcVideoOffset.width,
        pMinSize / this.srcVideoOffset.height
      );
    }
    const p = {
      w: Math.ceil(this.srcVideoOffset.width * pScale),
      h: Math.ceil(this.srcVideoOffset.height * pScale),
    };
    if (this.p?.w !== p.w || this.p?.h !== p.h) {
      // console.log(`projector: ${this.srcVideoOffset.height} * ${pScale} = ${p.h}`)
      this.p = p;
    }
    this.projector.resize(this.p.w, this.p.h);

    if (this.projector.webGLVersion === 1) {
      const pbSize = Math.min(
        512,
        Math.max(this.srcVideoOffset.width, this.srcVideoOffset.height)
      );
      const pbSizePowerOf2 = Math.pow(
        2,
        1 + Math.ceil(Math.log(pbSize / 2) / Math.log(2))
      ); // projectorBuffer size must always be a power of 2 for WebGL1 mipmap generation in projector
      this.projectorBuffer.elem.width = pbSizePowerOf2;
      this.projectorBuffer.elem.height = pbSizePowerOf2;
    } else if (this.projector.webGLVersion === 2) {
      const projectorBufferWidth = this.p.w * 2;
      const projectorBufferHeight = this.p.h * 2;
      if (
        this.projectorBuffer.elem.width !== projectorBufferWidth ||
        this.projectorBuffer.elem.height !== projectorBufferHeight
      ) {
        // console.log(`projectorBuffer: ${this.p.h} * 2 = ${projectorBufferHeight}`)
        this.projectorBuffer.elem.width = projectorBufferWidth;
        this.projectorBuffer.elem.height = projectorBufferHeight;
      }
    } else {
      this.projectorBuffer.elem.width = this.p.w;
      this.projectorBuffer.elem.height = this.p.h;
    }

    const frameBlending = this.settings.frameBlending;
    if (frameBlending) {
      if (!this.previousProjectorBuffer || !this.blendedProjectorBuffer) {
        this.initFrameBlending();
      }
      this.previousProjectorBuffer.elem.width = this.projectorBuffer.elem.width;
      this.previousProjectorBuffer.elem.height =
        this.projectorBuffer.elem.height;
      this.blendedProjectorBuffer.elem.width = this.projectorBuffer.elem.width;
      this.blendedProjectorBuffer.elem.height =
        this.projectorBuffer.elem.height;
    }
    const videoOverlayEnabled = this.settings.videoOverlayEnabled;
    const videoOverlay = this.videoOverlay;
    if (videoOverlayEnabled && !videoOverlay) {
      this.initVideoOverlay();
    }
    if (
      videoOverlayEnabled &&
      frameBlending &&
      !this.previousVideoOverlayBuffer
    ) {
      this.initVideoOverlayWithFrameBlending();
    }
    if (videoOverlayEnabled) this.checkIfNeedToHideVideoOverlay();

    if (videoOverlayEnabled && videoOverlay && !videoOverlay.elem.parentNode) {
      if (this.videoElem) {
        this.videoElem.after(videoOverlay.elem);
      } else {
        if (!this.videoContainerElemMissingThrown) {
          SentryReporter.captureException(
            new Error(
              'VideoOverlayEnabled but the .html5-video-container element does not exist'
            )
          );
          this.videoContainerElemMissingThrown = true;
        }
        this.videoContainerElemMissingWarning = true;
        this.settings.setWarning(
          'Unable to sync the video with the ambient light. The html5-video-container element does not exist on the page. This is likely due to a update of the YouTube design. This will probably soon be fixed in a new version.'
        );
      }
    } else if (
      !videoOverlayEnabled &&
      videoOverlay &&
      videoOverlay.elem.parentNode
    ) {
      videoOverlay.elem.parentNode.removeChild(videoOverlay.elem);
    } else if (this.videoContainerElemMissingWarning) {
      this.settings.setWarning('');
      this.videoContainerElemMissingWarning = false;
    }

    const videoElemStyle = this.videoElem.getAttribute('style') || '';
    if (this.videoDebandingElem) {
      if (this.videoDebandingElem.getAttribute('style') !== videoElemStyle) {
        this.videoDebandingElem.setAttribute('style', videoElemStyle);
      }
      if (!this.videoDebandingElem.isConnected) {
        this.videoContainerElem.appendChild(this.videoDebandingElem);
      }
    }

    if (videoOverlayEnabled && videoOverlay) {
      if (videoOverlay.elem.getAttribute('style') !== videoElemStyle) {
        videoOverlay.elem.setAttribute('style', videoElemStyle);
      }
      let videoOverlayWidth = this.srcVideoOffset.width;
      let videoOverlayHeight = this.srcVideoOffset.height;
      if (this.videoElem.style.width && this.videoElem.style.height) {
        try {
          videoOverlayWidth = Math.min(
            this.srcVideoOffset.width,
            Math.round(
              parseInt(this.videoElem.style.width) * window.devicePixelRatio
            ) || this.videoElem.clientWidth
          );
          videoOverlayHeight = Math.min(
            this.srcVideoOffset.height,
            Math.round(
              parseInt(this.videoElem.style.height) * window.devicePixelRatio
            ) || this.videoElem.clientHeight
          );
        } catch {}

        this.videoOverlay.elem.width = videoOverlayWidth;
        this.videoOverlay.elem.height = videoOverlayHeight;
      }

      if (frameBlending) {
        this.videoOverlayBuffer.elem.width = videoOverlayWidth;
        this.videoOverlayBuffer.elem.height = videoOverlayHeight;

        this.previousVideoOverlayBuffer.elem.width = videoOverlayWidth;
        this.previousVideoOverlayBuffer.elem.height = videoOverlayHeight;
      }
    }

    this.resizeCanvasses();
    this.stats.initElems();

    this.sizesChanged = false;
    this.buffersCleared = true;
    return true;
  }

  resetVideoParentElemStyle() {
    this.shouldStyleVideoParentElem = false;
    const videoParentElem = this.videoElem.parentElement;
    if (videoParentElem) {
      videoParentElem.style.transform = '';
      videoParentElem.style.overflow = '';
      videoParentElem.style.height = '';
      videoParentElem.style.marginBottom = '';
      setStyleProperty(videoParentElem, '--video-transform', '');
    }
  }

  updateFixedStyle() {
    const fixedLayout =
      this.ytdWatchElem?.tagName === 'YTD-WATCH-FIXIE' &&
      this.view === VIEW_SMALL;
    const enable = this.settings.fixedPosition || fixedLayout;
    document.body.toggleAttribute('data-ambientlight-fixed', enable);
  }

  updateStyles() {
    this.updateFixedStyle();

    // Page background
    let pageBackgroundGreyness = this.settings.pageBackgroundGreyness;
    pageBackgroundGreyness = pageBackgroundGreyness
      ? `${pageBackgroundGreyness}%`
      : '';
    setStyleProperty(
      document.body,
      '--ytal-page-background-greyness',
      pageBackgroundGreyness
    );

    // Fill transparency
    let fillOpacity = this.settings.surroundingContentFillOpacity;
    fillOpacity = fillOpacity !== 10 ? (fillOpacity + 100) / 200 : '';
    setStyleProperty(document.body, '--ytal-fill-opacity', fillOpacity);

    if (this.mastheadElem) {
      // Header transparency
      let headerFillOpacity = this.settings.headerFillOpacity;
      headerFillOpacity =
        headerFillOpacity !== 100 ? (headerFillOpacity + 100) / 200 : '';
      setStyleProperty(
        this.mastheadElem,
        '--ytal-fill-opacity',
        headerFillOpacity
      );
      this.mastheadElem.classList.toggle(
        'ytal-header-transparent',
        headerFillOpacity !== ''
      );
    }

    // Images transparency
    let imageOpacity = this.settings.surroundingContentImagesOpacity;
    imageOpacity = imageOpacity !== 100 ? imageOpacity / 100 : '';
    setStyleProperty(document.body, '--ytal-image-opacity', imageOpacity);

    if (this.mastheadElem) {
      // Header transparency
      let headerImageOpacity = this.settings.headerImagesOpacity;
      headerImageOpacity = imageOpacity !== 100 ? headerImageOpacity / 100 : '';
      setStyleProperty(
        this.mastheadElem,
        '--ytal-image-opacity',
        headerImageOpacity
      );
    }

    // Shadows
    const textAndBtnOnly = this.settings.surroundingContentTextAndBtnOnly;
    const getFilterShadow = (color, size, opacity) =>
      size && opacity
        ? opacity > 0.5
          ? `
          drop-shadow(0 0 ${size}px rgba(${color},${opacity})) 
          drop-shadow(0 0 ${size}px rgba(${color},${opacity}))
        `
          : `drop-shadow(0 0 ${size}px rgba(${color},${opacity * 2}))`
        : '';
    const getTextShadow = (color, size, opacity) =>
      size && opacity
        ? `
        rgba(${color},${opacity}) 0 0 ${size * 2}px,
        rgba(${color},${opacity}) 0 0 ${size * 2}px
      `
        : '';

    if (this.mastheadElem) {
      // Header shadow
      const headerShadowSize = this.settings.headerShadowSize / 5;
      const headerShadowOpacity = this.settings.headerShadowOpacity / 100;
      this.mastheadElem.classList.toggle(
        'ytal-header-shadow',
        headerShadowSize && headerShadowOpacity
      );

      const getHeaderFilterShadow = (color) =>
        getFilterShadow(color, headerShadowSize, headerShadowOpacity);
      const getHeaderTextShadow = (color) =>
        getTextShadow(color, headerShadowSize, headerShadowOpacity);

      // Header !textAndBtnOnly
      setStyleProperty(
        this.mastheadElem,
        `--ytal-filter-shadow`,
        !textAndBtnOnly ? getHeaderFilterShadow('0,0,0') : ''
      );
      setStyleProperty(
        this.mastheadElem,
        `--ytal-filter-shadow-inverted`,
        !textAndBtnOnly ? getHeaderFilterShadow('255,255,255') : ''
      );

      // Header textAndBtnOnly
      setStyleProperty(
        this.mastheadElem,
        `--ytal-button-shadow`,
        textAndBtnOnly ? getHeaderFilterShadow('0,0,0') : ''
      );
      setStyleProperty(
        this.mastheadElem,
        `--ytal-button-shadow-inverted`,
        textAndBtnOnly ? getHeaderFilterShadow('255,255,255') : ''
      );

      setStyleProperty(
        this.mastheadElem,
        '--ytal-text-shadow',
        textAndBtnOnly ? getHeaderTextShadow('0,0,0') : ''
      );
      setStyleProperty(
        this.mastheadElem,
        '--ytal-text-shadow-inverted',
        textAndBtnOnly ? getHeaderTextShadow('255,255,255') : ''
      );
      this.mastheadElem.toggleAttribute(
        'data-ambientlight-text-shadow',
        textAndBtnOnly
      );
    }

    // Content shadow
    const contentShadowSize = this.settings.surroundingContentShadowSize / 5;
    const contentShadowOpacity =
      this.settings.surroundingContentShadowOpacity / 100;
    const getContentFilterShadow = (color) =>
      getFilterShadow(color, contentShadowSize, contentShadowOpacity);
    const getContentTextShadow = (color) =>
      getTextShadow(color, contentShadowSize, contentShadowOpacity);

    // Content !textAndBtnOnly
    setStyleProperty(
      document.body,
      `--ytal-filter-shadow`,
      !textAndBtnOnly ? getContentFilterShadow('0,0,0') : ''
    );
    setStyleProperty(
      document.body,
      `--ytal-filter-shadow-inverted`,
      !textAndBtnOnly ? getContentFilterShadow('255,255,255') : ''
    );

    // Content textAndBtnOnly
    setStyleProperty(
      document.body,
      `--ytal-button-shadow`,
      textAndBtnOnly ? getContentFilterShadow('0,0,0') : ''
    );
    setStyleProperty(
      document.body,
      `--ytal-button-shadow-inverted`,
      textAndBtnOnly ? getContentFilterShadow('255,255,255') : ''
    );

    setStyleProperty(
      document.body,
      '--ytal-text-shadow',
      textAndBtnOnly ? getContentTextShadow('0,0,0') : ''
    );
    setStyleProperty(
      document.body,
      '--ytal-text-shadow-inverted',
      textAndBtnOnly ? getContentTextShadow('255,255,255') : ''
    );
    document.body.toggleAttribute(
      'data-ambientlight-text-shadow',
      textAndBtnOnly
    );

    // Video shadow
    const videoShadowSize =
      parseFloat(this.settings.videoShadowSize, 10) / 2 +
      Math.pow(this.settings.videoShadowSize / 5, 1.77); // Chrome limit: 250px | Firefox limit: 100px
    const videoShadowOpacity = this.settings.videoShadowOpacity / 100;

    setStyleProperty(
      document.body,
      '--ytal-video-shadow-background',
      videoShadowSize && videoShadowOpacity
        ? `rgba(0,0,0,${videoShadowOpacity})`
        : ''
    );
    setStyleProperty(
      document.body,
      '--ytal-video-shadow-box-shadow',
      videoShadowSize && videoShadowOpacity
        ? `
          rgba(0,0,0,${videoShadowOpacity}) 0 0 ${videoShadowSize}px,
          rgba(0,0,0,${videoShadowOpacity}) 0 0 ${videoShadowSize}px
        `
        : ''
    );

    // Video Debanding
    const videoDebandingStrength = parseFloat(
      this.settings.videoDebandingStrength
    );
    if (videoDebandingStrength) {
      if (!this.videoDebandingElem) {
        this.videoDebandingElem = document.createElement('div');
        this.videoDebandingElem.classList.add('ambientlight__video-debanding');
      }
      this.videoDebandingElem.setAttribute(
        'style',
        this.videoElem.getAttribute('style') || ''
      );
      if (!this.videoDebandingElem.isConnected) {
        this.videoContainerElem.appendChild(this.videoDebandingElem);
      }
    } else if (this.videoDebandingElem) {
      this.videoDebandingElem.remove();
      this.videoDebandingElem = undefined;
    }

    const videoNoiseImageIndex =
      videoDebandingStrength > 75 ? 3 : videoDebandingStrength > 50 ? 2 : 1;
    const videoNoiseOpacity =
      videoDebandingStrength /
      (videoDebandingStrength > 75
        ? 100
        : videoDebandingStrength > 50
        ? 75
        : 50);

    setStyleProperty(
      document.body,
      '--ytal-video-debanding-background',
      videoDebandingStrength
        ? `url('${baseUrl}images/noise-${videoNoiseImageIndex}.png')`
        : ''
    );
    setStyleProperty(
      document.body,
      '--ytal-video-debanding-opacity',
      videoDebandingStrength ? videoNoiseOpacity : ''
    );

    // Debanding
    const debandingStrength = parseFloat(this.settings.debandingStrength);
    const noiseImageIndex =
      debandingStrength > 75 ? 3 : debandingStrength > 50 ? 2 : 1;
    const noiseOpacity =
      debandingStrength /
      (debandingStrength > 75 ? 100 : debandingStrength > 50 ? 75 : 50);

    setStyleProperty(
      document.body,
      '--ytal-debanding-content',
      debandingStrength ? `''` : ''
    );
    setStyleProperty(
      document.body,
      '--ytal-debanding-background',
      debandingStrength
        ? `url('${baseUrl}images/noise-${noiseImageIndex}.png')`
        : ''
    );
    setStyleProperty(
      document.body,
      '--ytal-debanding-opacity',
      debandingStrength ? noiseOpacity : ''
    );
    setStyleProperty(
      document.body,
      '--ytal-debanding-blend-mode',
      {
        [DEBANDING_BLEND_MODE_LCD]: '',
        [DEBANDING_BLEND_MODE_OLED]: 'overlay',
      }[this.settings.debandingBlendMode]
    );
  }

  resizeCanvasses() {
    if (this.canvassesInvalidated) {
      this.recreateProjectors();
      this.canvassesInvalidated = false;
    }

    const projectorSize = {
      w: Math.round(this.p.w * this.clippedVideoScale[0]),
      h: Math.round(this.p.h * this.clippedVideoScale[1]),
    };
    const ratio =
      this.p.w > this.p.h
        ? {
            x: this.p.w / projectorSize.w,
            y:
              (this.p.w / projectorSize.w) *
              (projectorSize.w / projectorSize.h),
          }
        : {
            x:
              (this.p.h / projectorSize.h) *
              (projectorSize.h / projectorSize.w),
            y: this.p.h / projectorSize.h,
          };
    const lastScale = {
      x: 1,
      y: 1,
    };

    //To prevent 0x0 sized canvas elements causing a GPU memory leak
    const minScale = {
      x: 1 / projectorSize.w,
      y: 1 / projectorSize.h,
    };

    const scaleStep = this.settings.edge / 100;
    const scales = [];
    for (let i = 0; i < this.levels; i++) {
      const pos = i - this.innerStrength;
      let scaleX = 1;
      let scaleY = 1;

      if (pos > 0) {
        scaleX = 1 + scaleStep * ratio.x * pos;
        scaleY = 1 + scaleStep * ratio.y * pos;
      }

      if (pos < 0) {
        scaleX = 1 - scaleStep * ratio.x * -pos;
        scaleY = 1 - scaleStep * ratio.y * -pos;
        if (scaleX < 0) scaleX = 0;
        if (scaleY < 0) scaleY = 0;
      }
      lastScale.x = scaleX;
      lastScale.y = scaleY;

      scales.push({
        x: Math.max(minScale.x, scaleX),
        y: Math.max(minScale.y, scaleY),
      });
    }

    this.projector.rescale(
      scales,
      lastScale,
      projectorSize,
      this.barsClip,
      this.settings
    );
  }

  updatedSizesChanged = false;
  updateSizesChanged(checkPosition) {
    if (this.updatedSizesChanged) {
      return;
    }

    this.sizesChanged =
      this.sizesChanged || this.getSizesChanged(checkPosition);
    this.lastUpdateSizesChanged = performance.now();
    this.sizesInvalidated = false;

    this.updatedSizesChanged = true;
    raf(() => {
      this.updatedSizesChanged = false;
    });
  }

  getSizesChanged(checkPosition = true) {
    //Resized
    if (this.previousEnabled !== this.settings.enabled) {
      this.previousEnabled = this.settings.enabled;
      return true;
    }

    //Auto quality moved up or down
    if (
      this.srcVideoOffset.width !==
        (this.vrVideoElem?.width ?? this.videoElem.videoWidth) ||
      this.srcVideoOffset.height !==
        (this.vrVideoElem?.height ?? this.videoElem.videoHeight)
    ) {
      return true;
    }
    if (
      this.isVrVideo &&
      (this.vrVideoSrcOffset?.width !== this.videoElem.videoWidth ||
        this.vrVideoSrcOffset?.height !== this.videoElem.videoHeight)
    ) {
      return true;
    }

    if (
      this.settings.videoOverlayEnabled &&
      this.videoOverlay &&
      this.videoElem.getAttribute('style') !==
        this.videoOverlay.elem.getAttribute('style')
    ) {
      return true;
    }

    const noClipOrScale =
      this.isVrVideo ||
      (this.settings.horizontalBarsClipPercentage == 0 &&
        this.settings.verticalBarsClipPercentage == 0 &&
        this.videoScale == 100);
    if (!noClipOrScale) {
      const videoParentElem = this.videoElem.parentElement;
      if (videoParentElem) {
        const videoTransform =
          videoParentElem.style.getPropertyValue('--video-transform');
        const left = Math.max(0, parseInt(this.videoElem.style.left) || 0);
        const top = Math.max(0, parseInt(this.videoElem.style.top) || 0);
        const scaleX =
          Math.round(1000 * (1 / this.clippedVideoScale[0])) / 1000;
        const scaleY =
          Math.round(1000 * (1 / this.clippedVideoScale[1])) / 1000;
        if (
          videoTransform.indexOf(`translate(${-left}px, ${-top}px)`) === -1 ||
          videoTransform.indexOf(`scale(${scaleX}, ${scaleY})`) === -1
        ) {
          return true;
        }
      }
    }

    if (checkPosition) {
      const projectorsElemRect = this.getElemRect(this.projectorsElem);
      const videoElemRect = this.getElemRect(
        this.vrVideoElem || this.videoElem
      );
      const topExtraOffset =
        !this.isVrVideo && this.settings.horizontalBarsClipPercentage
          ? videoElemRect.height *
            (this.settings.horizontalBarsClipPercentage / 100)
          : 0;
      const leftExtraOffset =
        !this.isVrVideo && this.settings.verticalBarsClipPercentage
          ? videoElemRect.width *
            (this.settings.verticalBarsClipPercentage / 100)
          : 0;
      const expectedProjectorsRect = {
        width: videoElemRect.width - leftExtraOffset * 2,
        height: videoElemRect.height - topExtraOffset * 2,
        top: videoElemRect.top + topExtraOffset,
        left: videoElemRect.left + leftExtraOffset,
      };
      if (
        Math.abs(projectorsElemRect.height - expectedProjectorsRect.height) >
          1 ||
        Math.abs(projectorsElemRect.width - expectedProjectorsRect.width) > 1 ||
        Math.abs(projectorsElemRect.top - expectedProjectorsRect.top) > 2 ||
        Math.abs(projectorsElemRect.left - expectedProjectorsRect.left) > 2
      ) {
        return true;
      }
    }

    return false;
  }

  getElemRect(elem) {
    const scrollableRect = (
      this.clearfixElem.offsetParent ||
      (this.isFullscreen
        ? document.fullscreenElement || document.body
        : document.body)
    ).getBoundingClientRect();
    const elemRect = elem.getBoundingClientRect();

    return {
      top: elemRect.top - scrollableRect.top,
      left: elemRect.left - scrollableRect.left,
      width: elemRect.width,
      height: elemRect.height,
    };
  }

  scheduleNextFrame() {
    if (this.scheduledNextFrame || !this.canScheduleNextFrame()) return;

    this.scheduleRequestVideoFrame();
    if (
      this.settings.frameSync == FRAMESYNC_VIDEOFRAMES &&
      this.requestVideoFrameCallbackId &&
      !this.videoIsHidden &&
      !this.settings.frameBlending &&
      !this.settings.frameFading &&
      !this.settings.showFrametimes
    )
      return;

    this.scheduledNextFrame = true;
    if (!this.videoIsHidden) {
      requestAnimationFrame(this.onNextFrameWrapped);
    } else {
      const realFramerateLimit = this.getRealFramerateLimit();
      const frameRate = Math.min(
        Math.max(this.videoFrameRate || 30),
        realFramerateLimit
      );
      setTimeout(this.scheduleNextFrameDelayed, frameRate);
    }
  }

  onNextFrame = async function onNextFrame(compose) {
    if (!this.scheduledNextFrame) return;

    this.scheduledNextFrame = false;
    if (this.videoElem.ended) return;

    this.displayFrameTime = compose;
    this.displayFrameCount++;

    if (
      this.settings.showFrametimes &&
      this.settings.frameSync !== FRAMESYNC_VIDEOFRAMES
    ) {
      const presentedFrames = this.getVideoFrameCount();
      if (
        this.settings.frameSync === FRAMESYNC_DISPLAYFRAMES ||
        this.settings.frameBlending ||
        this.previousPresentedFrames !== presentedFrames
      ) {
        this.stats.receiveAnimationFrametimes(compose, presentedFrames);
      }
      this.previousPresentedFrames = presentedFrames;
    }

    if (this.settings.framerateLimit || this.limitFramerateToSaveEnergy()) {
      await this.onNextLimitedFrame(compose);
    } else {
      await this.nextFrame(compose);
      this.nextFrameTime = undefined;
    }
  }.bind(this);
  onNextFrameWrapped = wrapErrorHandler(this.onNextFrame);
  scheduleNextFrameDelayed = () =>
    requestAnimationFrame(this.onNextFrameWrapped);

  onNextLimitedFrame = async (compose) => {
    const time = performance.now();
    if (
      this.nextFrameTime &&
      !this.buffersCleared &&
      !this.sizesChanged &&
      !this.sizesInvalidated
    ) {
      if (
        this.settings.frameSync === FRAMESYNC_VIDEOFRAMES &&
        !this.videoIsHidden
      ) {
        if (this.nextFrameTime > time && this.videoFrameCallbackReceived) {
          this.videoFrameCallbackReceived = false;
        }
        if (!this.videoFrameCallbackReceived) {
          this.scheduleNextFrame();
          return;
        }
      } else if (this.nextFrameTime > time) {
        this.scheduleNextFrame();
        return;
      }
    }

    const ambientlightFrameCount = this.ambientlightFrameCount;
    await this.nextFrame(compose);
    if (this.ambientlightFrameCount <= ambientlightFrameCount) {
      return;
    }

    const realFramerateLimit = this.getRealFramerateLimit();
    this.nextFrameTime = Math.max(
      (this.nextFrameTime || time) + 1000 / realFramerateLimit,
      time
    );
  };

  averageVideoFramesDifference5SecondsThreshold = 0.002;
  averageVideoFramesDifference1SecondThreshold = 0.0175;

  getRealFramerateLimit = () => {
    if (this.limitFramerateToSaveEnergy()) {
      if (
        this.averageVideoFramesDifference <
        this.averageVideoFramesDifference5SecondsThreshold
      )
        return 0.2; // 5 seconds
      if (
        this.averageVideoFramesDifference <
        this.averageVideoFramesDifference1SecondThreshold
      )
        return 1; // 1 seconds
    }

    const frameFading = this.settings.frameFading
      ? Math.round(Math.pow(this.settings.frameFading, 2))
      : 0;
    const frameFadingMax =
      15 * Math.pow(ProjectorWebGL.subProjectorDimensionMax, 2) - 1;
    const realFramerateLimit =
      this.settings.webGL && frameFading > frameFadingMax
        ? Math.max(
            1,
            (frameFadingMax / (frameFading || 1)) * this.settings.framerateLimit
          )
        : this.settings.framerateLimit;
    return realFramerateLimit;
  };

  limitFramerateToSaveEnergy = () =>
    this.averageVideoFramesDifference <
      this.averageVideoFramesDifference1SecondThreshold &&
    !this.sizesInvalidated &&
    !this.buffersCleared &&
    this.videoElem.currentTime > 5 &&
    this.videoElem.currentTime < this.videoElem.duration - 5;

  canScheduleNextFrame = () =>
    !(
      !this.settings.enabled ||
      !this.isOnVideoPage ||
      (this.isVrVideo && this.vrVideoElem) ||
      this.pendingStart ||
      this.videoElem.ended ||
      this.videoElem.paused ||
      this.videoElem.seeking ||
      this.isVideoHiddenOnWatchPage ||
      this.isAmbientlightHiddenOnWatchPage
    );

  optionalFrame = async (fromSettingChange = false) => {
    if (
      !this.initializedTime ||
      !this.settings.enabled ||
      !this.isOnVideoPage ||
      this.pendingStart ||
      this.resizeAfterFrames > 0 ||
      this.videoElem.ended ||
      (!this.videoElem.paused &&
        !this.videoElem.seeking &&
        this.scheduledNextFrame) ||
      (!fromSettingChange && this.isVrVideo && this.vrVideoElem)
    )
      return;

    await this.nextFrame();
  };

  nextFrame = async (compose) => {
    try {
      const frameTimes = this.settings.showFrametimes
        ? {
            frameStart: performance.now(),
          }
        : {};

      this.delayedUpdateSizesChanged = false;
      if (this.p && this.sizesInvalidated) {
        this.updateSizesChanged();
      }
      if (!this.p || this.sizesChanged) {
        //If was detected hidden by updateSizes, this.p won't be initialized yet
        if (!(await this.updateSizes())) return;
      } else {
        this.delayedUpdateSizesChanged = true;
      }

      let results = {};
      if (this.settings.showFrametimes) {
        this.stats.addVideoFrametimes(frameTimes, compose);
        frameTimes.drawStart = performance.now();
      }

      if (!this.settings.webGL || this.getImageDataAllowed) {
        results = (await this.drawAmbientlight(compose)) || {};
      }

      if (this.settings.showFrametimes) frameTimes.drawEnd = performance.now();

      this.scheduleNextFrame();

      if (results?.detectBarSize) {
        await this.scheduleBarSizeDetection();
      }

      if (
        this.settings.frameSync === FRAMESYNC_DISPLAYFRAMES ||
        results?.hasNewFrame ||
        this.settings.frameBlending
      ) {
        this.stats.addAmbientFrametimes(frameTimes);
      }

      if (
        this.afterNextFrameIdleCallback ||
        (!this.settings.videoOverlayEnabled &&
          !(
            this.delayedUpdateSizesChanged &&
            performance.now() - this.lastUpdateSizesChanged > 2000
          ) &&
          !(
            performance.now() - this.lastUpdateStatsTime >
            this.updateStatsInterval
          ))
      )
        return;

      this.afterNextFrameIdleCallback = requestIdleCallback(
        this.afterNextFrame,
        { timeout: 1000 / 30 }
      );
    } catch (ex) {
      this.setDrawWarning(ex);
      if (this.catchedErrors[ex.name]) {
        console.error(ex);
        return;
      }

      this.catchedErrors[ex.name] = true;
      if (
        [
          'SecurityError',
          'NS_ERROR_NOT_AVAILABLE',
          'NS_ERROR_OUT_OF_MEMORY',
        ].includes(ex.name)
      ) {
        console.warn('Failed to display the ambient light');
        console.error(ex);
        return;
      }

      throw ex;
    }
  };

  setDrawWarning = (ex) => {
    const message =
      ex.name === 'SecurityError'
        ? 'A refresh could help, but it is most likely that your browser does not allow the ambient light to read the video pixels of this specific YouTube video. You can probably watch other YouTube videos without this problem.'
        : `A refresh of the page might help. If not, there could be a specific problem with this YouTube video. Or searching the error message below might help.\n\nError: ${ex.name}\nReason: ${ex.message}`;

    this.settings.setWarning(
      `Failed to display the ambient light\n\n${message}`
    );
  };

  afterNextFrame = async function afterNextFrame() {
    try {
      this.afterNextFrameIdleCallback = undefined;

      if (this.settings.videoOverlayEnabled) {
        this.detectFrameRates();
        this.checkIfNeedToHideVideoOverlay();
      }

      if (
        this.delayedUpdateSizesChanged &&
        performance.now() - this.lastUpdateSizesChanged > 2000
      ) {
        this.updateSizesChanged(true);
        if (this.sizesChanged) {
          await this.optionalFrame();
        }
      }
      if (
        performance.now() - this.lastUpdateStatsTime >
        this.updateStatsInterval
      ) {
        this.lastUpdateStatsTime = performance.now();
        requestIdleCallback(
          function afterNextFrameUpdateStats() {
            if (!this.settings.videoOverlayEnabled) {
              this.detectFrameRates();
            }
            this.stats.update();
          }.bind(this),
          { timeout: 100 }
        );
      }
    } catch (ex) {
      // Prevent recursive error reporting
      if (this.scheduledNextFrame) {
        cancelAnimationFrame(this.scheduledNextFrame);
        this.scheduledNextFrame = undefined;
      }

      throw ex;
    }
  }.bind(this);

  // Todo:
  // - Fix frame drops on 60hz monitors with a 50hz video playing?:
  //     Was caused by faulty NVidia 3050TI driver
  //     and chromium video callback being sometimes 1 frame delayed
  //     and requestVideoFrameCallback being executed at the end of the draw flow
  // - Do more complex logic at a later time
  detectFrameRate(list, count, currentFrameRate, currentFrameTime, update) {
    const time = currentFrameTime || performance.now();

    // Add new item
    let fps = 0;
    if (list.length) {
      if (count < list[0].count) {
        // Clear list with invalid values
        list.splice(0, list.length);
      } else {
        const previous = list[0];
        fps = Math.max(
          0,
          (count - previous.count) / ((time - previous.time) / 1000)
        );
      }
    }
    list.push({
      count,
      time,
      fps,
    });

    if (!update) return currentFrameRate;
    if (list.length < 2) return 0;

    // Remove old items
    const thresholdTime = time - this.frameCountHistory;
    const thresholdIndex = list.findIndex((i) => i.time >= thresholdTime);
    if (thresholdIndex > 0) list.splice(0, thresholdIndex - 1);

    // Calculate fps
    const aligableList = list.filter((i) => i.fps);
    if (!aligableList.length) return 0;

    aligableList.sort((a, b) => a.fps - b.fps);
    if (aligableList.length > 10) {
      const bound = Math.floor(aligableList.length / 16);
      aligableList.splice(0, bound);
      aligableList.splice(aligableList.length - bound, bound);
    }

    const difference = Math.min(
      5,
      aligableList[aligableList.length - 1].fps - aligableList[0].fps
    );
    const deleteCount = Math.min(
      aligableList.length - 2,
      Math.max(0, Math.floor(aligableList.length * (difference / 5) - 2))
    );
    if (deleteCount) {
      aligableList.sort((a, b) => a.time - b.time);
      aligableList.splice(0, deleteCount);
    }

    const average =
      aligableList.reduce((sum, i) => sum + i.fps, 0) / aligableList.length;

    return average;
  }

  detectFrameRates() {
    const update =
      performance.now() > (this.previousUpdate || 0) + this.updateStatsInterval;
    if (update) this.previousUpdate = performance.now();
    this.detectDisplayFrameRate(update);
    this.detectAmbientlightFrameRate(update);
    this.detectVideoFrameRate(update);

    if (this.chromiumBugVideoJitterWorkaround?.update)
      this.chromiumBugVideoJitterWorkaround.update();
  }

  videoFrameCounts = [];
  detectVideoFrameRate(update) {
    this.videoFrameRate = this.detectFrameRate(
      this.videoFrameCounts,
      this.getVideoFrameCount(),
      this.videoFrameRate,
      this.videoFrameTime,
      update
    );
    this.videoFrameTime = undefined;
  }

  displayFrameCounts = [];
  displayFrameCount = 0;
  detectDisplayFrameRate = (update) => {
    this.displayFrameRate = this.detectFrameRate(
      this.displayFrameCounts,
      this.displayFrameCount,
      this.displayFrameRate,
      this.displayFrameTime,
      update
    );
    this.displayFrameTime = undefined;
  };

  ambientlightFrameCounts = [];
  detectAmbientlightFrameRate(update) {
    this.ambientlightFrameRate = this.detectFrameRate(
      this.ambientlightFrameCounts,
      this.ambientlightFrameCount,
      this.ambientlightFrameRate,
      this.ambientlightFrameTime,
      update
    );
    this.ambientlightFrameTime = undefined;
  }

  getVideoDroppedFrameCount() {
    if (!this.videoElem) return 0;

    return this.videoElem.getVideoPlaybackQuality()?.droppedVideoFrames || 0;
  }

  getVideoFrameCount() {
    if (!this.videoElem) return 0;

    const videoPresentedFrames =
      this.settings.frameSync === FRAMESYNC_VIDEOFRAMES &&
      this.videoPresentedFrames
        ? this.videoPresentedFrames
        : 0;

    const totalVideoFrames =
      this.videoElem.getVideoPlaybackQuality()?.totalVideoFrames || 0;
    return Math.max(videoPresentedFrames, totalVideoFrames);
  }

  shouldShow = () =>
    this.settings.enabled &&
    this.isOnVideoPage &&
    !(this.isVrVideo && !this.settings.enableInVRVideos) &&
    this.isInEnabledView();

  async drawAmbientlight(compose) {
    const shouldShow = this.shouldShow();
    if (!shouldShow) {
      if (!this.isHidden) await this.hide();
      return;
    }

    const drawTime = performance.now();
    if (this.isHidden) this.show();

    if (
      (this.atTop &&
        this.isFillingFullscreen &&
        !this.settings.detectHorizontalBarSizeEnabled &&
        !this.settings.detectVerticalBarSizeEnabled &&
        !this.settings.frameBlending &&
        !this.settings.videoOverlayEnabled) ||
      this.isControlledByAnotherExtension ||
      this.isVideoHiddenOnWatchPage ||
      // this.isAmbientlightHiddenOnWatchPage || // Disabled because: When in fullscreen isFillingFullscreen goes to false the observer needs a frame to render the shown ambientlight element. So instead handle this in the canScheduleNextFrame check
      this.videoElem.ended ||
      this.videoElem.readyState === 0 || // HAVE_NOTHING
      this.videoElem.readyState === 1 // HAVE_METADATA
      // The video contains metadata about the resolution so videoWidth and videoHeight are set.
      // But the video could have no framedata yet. On Firefox this can result in a failed draw call
      // to WebGL into a texture with a 0x0 resolution.
      // And then the next videoframes will also fail because they are drawn into a 0x0 texture.
      // This can result in any of the following WebGL warnings:
      // - [.WebGL-0000772807FD7100] GL_INVALID_OPERATION: Texture format does not support mipmap generation.
      // - tex(Sub)Image[23]D: Resource has no data (yet?). Uploading zeros.
      // - texSubImage: source cannot be null.
      // - generateMipmap: The texture's base level must be complete.
      // - drawArraysInstanced: TEXTURE_2D at unit 1 is incomplete: The dimensions of level_base are not all positive.
    )
      return;

    let newVideoFrameCount = this.getVideoFrameCount();

    let hasNewFrame = false;
    if (this.settings.frameSync == FRAMESYNC_VIDEOFRAMES) {
      if (this.videoIsHidden) {
        hasNewFrame =
          this.previousFrameTime <
          drawTime - 1000 / Math.max(24, this.videoFrameRate); // Force video.webkitDecodedFrameCount to update on Chromium by always executing drawImage
      } else {
        if (
          this.videoFrameCallbackReceived &&
          this.videoFrameCount == newVideoFrameCount
        ) {
          newVideoFrameCount++;
        }
        hasNewFrame = this.videoFrameCallbackReceived;
        this.videoFrameCallbackReceived = false;

        // Fallback for when requestVideoFrameCallback stopped working
        if (!hasNewFrame) {
          hasNewFrame = this.videoFrameCount < newVideoFrameCount;
        }
      }
    } else if (this.settings.frameSync == FRAMESYNC_DECODEDFRAMES) {
      hasNewFrame = this.videoFrameCount < newVideoFrameCount;
    } else if (this.settings.frameSync == FRAMESYNC_DISPLAYFRAMES) {
      hasNewFrame = true;
    }
    hasNewFrame = hasNewFrame || this.buffersCleared || this.isVrVideo;

    const droppedFrames =
      this.videoFrameCount > 120 &&
      this.videoFrameCount < newVideoFrameCount - 1;
    if (droppedFrames && !this.buffersCleared) {
      this.ambientlightVideoDroppedFrameCount +=
        newVideoFrameCount - (this.videoFrameCount + 1);
    }
    if (
      newVideoFrameCount > this.videoFrameCount ||
      newVideoFrameCount < this.videoFrameCount - 60
    ) {
      this.videoFrameCount = newVideoFrameCount;
    }

    const detectBarSize =
      hasNewFrame &&
      (this.settings.detectHorizontalBarSizeEnabled ||
        this.settings.detectVerticalBarSizeEnabled) &&
      !this.isVrVideo;

    const dontDrawAmbientlight =
      (this.atTop && this.isFillingFullscreen) ||
      (this.settings.spread === 0 && this.settings.blur2 === 0);

    const dontDrawBuffer = dontDrawAmbientlight && !detectBarSize;

    if (this.settings.frameBlending && this.settings.frameBlendingSmoothness) {
      if (!this.previousProjectorBuffer) {
        this.initFrameBlending();
      }
      if (
        this.settings.videoOverlayEnabled &&
        !this.previousVideoOverlayBuffer
      ) {
        this.initVideoOverlayWithFrameBlending();
      }

      // Prevents unnessecary frames from being drawn.
      // But when frameBlending is enabled also draw:
      // - when there is a new frame (hasNewFrame) or...
      // - when the current frame is not yet fully drawn (!previousDrawFullAlpha)
      if (hasNewFrame || this.buffersCleared || !this.previousDrawFullAlpha) {
        if (hasNewFrame || this.buffersCleared) {
          if (this.settings.videoOverlayEnabled) {
            this.previousVideoOverlayBuffer.ctx.drawImage(
              this.videoOverlayBuffer.elem,
              0,
              0
            );
            this.videoOverlayBuffer.ctx.drawImage(
              this.vrVideoElem ?? this.videoElem,
              0,
              0,
              this.videoOverlayBuffer.elem.width,
              this.videoOverlayBuffer.elem.height
            );
            if (this.buffersCleared) {
              this.previousVideoOverlayBuffer.ctx.drawImage(
                this.videoOverlayBuffer.elem,
                0,
                0
              );
            }
          }

          if (!dontDrawBuffer) {
            if (!this.buffersCleared) {
              this.previousProjectorBuffer.ctx.drawImage(
                this.projectorBuffer.elem,
                0,
                0
              );
            }
            // Prevent adjusted barsClipPx from leaking previous frame into the frame
            this.projectorBuffer.ctx.clearRect(
              0,
              0,
              this.projectorBuffer.elem.width,
              this.projectorBuffer.elem.height
            );

            this.projectorBuffer.ctx.drawImage(
              this.vrVideoElem ?? this.videoElem,
              0,
              0,
              this.projectorBuffer.elem.width,
              this.projectorBuffer.elem.height
            );
            if (this.buffersCleared) {
              this.previousProjectorBuffer.ctx.drawImage(
                this.projectorBuffer.elem,
                0,
                0
              );
            }
          }
        }

        let alpha = 1;
        const ambientlightFrameDuration = 1000 / this.ambientlightFrameRate;
        if (hasNewFrame) {
          this.frameBlendingFrameTimeStart =
            drawTime - ambientlightFrameDuration / 2;
        }
        if (this.displayFrameRate >= this.videoFrameRate * 1.33) {
          if (hasNewFrame && !this.previousDrawFullAlpha) {
            alpha = 0; // Show previous frame fully to prevent seams
          } else {
            const videoFrameDuration = 1000 / this.videoFrameRate;
            const frameToDrawDuration =
              drawTime - this.frameBlendingFrameTimeStart;
            const frameToDrawDurationThresshold =
              (frameToDrawDuration + ambientlightFrameDuration / 2) /
              (this.settings.frameBlendingSmoothness / 100);
            if (frameToDrawDurationThresshold < videoFrameDuration) {
              alpha = Math.min(
                1,
                frameToDrawDuration /
                  (1000 /
                    (this.videoFrameRate /
                      (this.settings.frameBlendingSmoothness / 100) || 1))
              );
            }
          }
        }
        if (alpha === 1) {
          this.previousDrawFullAlpha = true;
        } else {
          this.previousDrawFullAlpha = false;
        }

        if (
          this.settings.videoOverlayEnabled &&
          this.videoOverlay &&
          !this.videoOverlay.isHidden
        ) {
          if (alpha !== 1) {
            if (this.videoOverlay.ctx.globalAlpha !== 1) {
              this.videoOverlay.ctx.globalAlpha = 1;
            }
            this.videoOverlay.ctx.drawImage(
              this.previousVideoOverlayBuffer.elem,
              0,
              0
            );
          }
          if (alpha > 0.005) {
            this.videoOverlay.ctx.globalAlpha = alpha;
            this.videoOverlay.ctx.drawImage(this.videoOverlayBuffer.elem, 0, 0);
          }
          this.videoOverlay.ctx.globalAlpha = 1;
        }

        if (!dontDrawAmbientlight) {
          //this.blendedProjectorBuffer can contain an old frame and be impossible to drawImage onto
          //this.previousProjectorBuffer can also contain an old frame

          if (alpha !== 1) {
            if (this.blendedProjectorBuffer.ctx.globalAlpha !== 1)
              this.blendedProjectorBuffer.ctx.globalAlpha = 1;
            this.blendedProjectorBuffer.ctx.drawImage(
              this.previousProjectorBuffer.elem,
              0,
              0
            );
          }
          if (alpha > 0.005) {
            this.blendedProjectorBuffer.ctx.globalAlpha = alpha;
            this.blendedProjectorBuffer.ctx.drawImage(
              this.projectorBuffer.elem,
              0,
              0
            );
          }
          this.blendedProjectorBuffer.ctx.globalAlpha = 1;

          this.projector.draw(this.blendedProjectorBuffer.elem);
        }
      }
    } else {
      if (!hasNewFrame && !this.settings.frameFading) return;

      if (
        this.settings.videoOverlayEnabled &&
        this.videoOverlay &&
        !this.videoOverlay.isHidden
      ) {
        if (this.enableChromiumBug1092080Workaround) {
          this.videoOverlay.ctx.clearRect(
            0,
            0,
            this.videoOverlay.elem.width,
            this.videoOverlay.elem.height
          );
        }
        this.videoOverlay.ctx.drawImage(
          this.vrVideoElem ?? this.videoElem,
          0,
          0,
          this.videoOverlay.elem.width,
          this.videoOverlay.elem.height
        );
      }

      const shouldDrawDirectlyFromVideoElem =
        this.shouldDrawDirectlyFromVideoElem();
      if (!dontDrawBuffer) {
        if (!shouldDrawDirectlyFromVideoElem) {
          // console.log('draw', hasNewFrame, dontDrawAmbientlight, this.projectorBuffer.elem.width, this.projectorBuffer.elem.height)
          this.projectorBuffer.ctx.drawImage(
            this.vrVideoElem ?? this.videoElem,
            0,
            0,
            this.projectorBuffer.elem.width,
            this.projectorBuffer.elem.height
          );
        }

        if (!dontDrawAmbientlight) {
          if (!shouldDrawDirectlyFromVideoElem) {
            this.projector.draw(this.projectorBuffer.elem);
          } else {
            this.projector.draw(this.vrVideoElem ?? this.videoElem);
          }
        }
      }
    }

    this.buffersCleared = false;
    if (!dontDrawBuffer || this.settings.videoOverlayEnabled) {
      this.ambientlightFrameCount++;
      this.ambientlightFrameTime = compose;
    }
    this.previousDrawTime = drawTime;
    if (hasNewFrame) {
      this.previousFrameTime = drawTime;
    }

    if (this.enableMozillaBug1606251Workaround) {
      this.containerElem.style.transform = `translateZ(${
        this.ambientlightFrameCount % 10
      }px)`;
    }

    return { hasNewFrame, detectBarSize };
  }

  scheduleBarSizeDetection = async () => {
    try {
      this.checkGetImageDataAllowed();
      if (!this.getImageDataAllowed) return;

      await this.barDetection.detect(
        this.shouldDrawDirectlyFromVideoElem() ||
          ((this.projectorBuffer.elem.height < 256 ||
            this.projectorBuffer.elem.width < 256) &&
            this.projectorBuffer.elem.height < this.videoElem.videoHeight)
          ? this.videoElem
          : this.projectorBuffer.elem,
        this.settings.detectColoredHorizontalBarSizeEnabled,
        this.settings.detectHorizontalBarSizeOffsetPercentage,
        this.settings.detectHorizontalBarSizeEnabled,
        this.settings.horizontalBarsClipPercentage,
        this.settings.detectVerticalBarSizeEnabled,
        this.settings.verticalBarsClipPercentage,
        this.p ? this.p.h / this.p.w : 1,
        !this.settings.frameBlending,
        this.settings.barSizeDetectionAverageHistorySize || 1,
        this.settings.barSizeDetectionAllowedElementsPercentage || 20,
        this.settings.barSizeDetectionAllowedUnevenBarsPercentage || 20,
        wrapErrorHandler(this.scheduleBarSizeDetectionCallback)
      );
    } catch (ex) {
      if (!this.showedDetectBarSizeWarning) {
        this.showedDetectBarSizeWarning = true;
        throw ex;
      }
    }
  };

  scheduleBarSizeDetectionCallback = async (
    horizontalPercentage,
    verticalPercentage
  ) => {
    const horizontalBarChanged =
      this.settings.detectHorizontalBarSizeEnabled &&
      horizontalPercentage !== undefined &&
      this.setHorizontalBars(horizontalPercentage);
    const verticalBarChanged =
      this.settings.detectVerticalBarSizeEnabled &&
      verticalPercentage !== undefined &&
      this.setVerticalBars(verticalPercentage);
    if (!horizontalBarChanged && !verticalBarChanged) return;

    this.sizesChanged = true;
    await this.optionalFrame();
  };

  checkIfNeedToHideVideoOverlay() {
    if (!this.videoOverlay) return;

    if (!this.hideVideoOverlayCache) {
      this.hideVideoOverlayCache = {
        prevAmbientlightVideoDroppedFrameCount:
          this.ambientlightVideoDroppedFrameCount,
        framesInfo: [],
        isHiddenChangeTimestamp: 0,
      };
    }

    let {
      prevAmbientlightVideoDroppedFrameCount,
      framesInfo,
      isHiddenChangeTimestamp,
    } = this.hideVideoOverlayCache;

    const newFramesDropped = Math.max(
      0,
      this.ambientlightVideoDroppedFrameCount -
        prevAmbientlightVideoDroppedFrameCount
    );
    this.hideVideoOverlayCache.prevAmbientlightVideoDroppedFrameCount =
      this.ambientlightVideoDroppedFrameCount;
    framesInfo.push({
      time: performance.now(),
      framesDropped: newFramesDropped,
    });
    const frameDropTimeLimit = performance.now() - 2000;
    framesInfo = framesInfo.filter((info) => info.time > frameDropTimeLimit);
    this.hideVideoOverlayCache.framesInfo = framesInfo;

    let hide =
      this.videoElem.paused ||
      this.videoElem.seeking ||
      this.videoIsHidden ||
      (this.isFillingFullscreen && this.atTop && !this.settings.frameBlending);
    const syncThreshold = this.settings.videoOverlaySyncThreshold;
    if (!hide && syncThreshold !== 100) {
      if (framesInfo.length < 5) {
        hide = true;
      } else {
        const droppedFramesCount = framesInfo.reduce(
          (sum, info) => sum + info.framesDropped,
          0
        );
        const droppedFramesThreshold =
          this.videoFrameRate * 2 * (syncThreshold / 100);
        hide = droppedFramesCount > droppedFramesThreshold;
      }
    }

    if (hide) {
      if (!this.videoOverlay.isHidden) {
        this.videoOverlay.elem.classList.add(
          'ambientlight__video-overlay--hide'
        );
        this.videoOverlay.isHidden = true;
        this.hideVideoOverlayCache.isHiddenChangeTimestamp = performance.now();
        this.stats.update();
      }
    } else if (
      syncThreshold == 100 ||
      isHiddenChangeTimestamp + 2000 < performance.now()
    ) {
      if (this.videoOverlay.isHidden) {
        this.videoOverlay.elem.classList.remove(
          'ambientlight__video-overlay--hide'
        );
        this.videoOverlay.isHidden = false;
        this.hideVideoOverlayCache.isHiddenChangeTimestamp = performance.now();
        this.stats.update();
      }
    }
  }

  async enable(initial = false) {
    if (!initial) {
      this.settings.set('enabled', true, true);
    }

    await this.start(initial);
  }

  // async disableYouTubeAmbientMode() {
  //   try {
  //     if(
  //       !ytcfg?.data_?.WEB_PLAYER_CONTEXT_CONFIGS.WEB_PLAYER_CONTEXT_CONFIG_ID_KEVLAR_WATCH?.cinematicSettingsAvailable ||
  //       !ytcfg?.data_?.EXPERIMENT_FLAGS?.kevlar_watch_cinematics
  //     ) return

  //     const ambientModeIcon = 'path[d="M21 7v10H3V7h18m1-1H2v12h20V6zM11.5 2v3h1V2h-1zm1 17h-1v3h1v-3zM3.79 3 6 5.21l.71-.71L4.5 2.29 3.79 3zm2.92 16.5L6 18.79 3.79 21l.71.71 2.21-2.21zM19.5 2.29 17.29 4.5l.71.71L20.21 3l-.71-.71zm0 19.42.71-.71L18 18.79l-.71.71 2.21 2.21z"]'
  //     let ambientModeCheckbox = document.querySelector(`.ytp-menuitem ${ambientModeIcon}`)?.closest('.ytp-menuitem')

  //     if(ambientModeCheckbox) {
  //       const enabled = ambientModeCheckbox.getAttribute('aria-checked') === 'true'
  //       if(enabled) {
  //         ambientModeCheckbox.click()
  //       }
  //       return
  //     }

  //     const settingsBtn = document.querySelector('.ytp-settings-button')
  //     const settingsPopupId = settingsBtn?.getAttribute('aria-controls')
  //     const settingsPopup = document.querySelector(`.ytp-popup[id="${settingsPopupId}"]`)
  //     settingsPopup.classList.add('disable-youtube-ambient-mode-workaround')
  //     await new Promise(resolve => raf(resolve)) // Await rendering
  //     const wasActiveElement = document.activeElement
  //     settingsBtn?.click() // Open settings

  //     try {
  //       await new Promise(resolve => raf(resolve)) // Await rendering
  //       await waitForDomElement(() => document.querySelector(`.ytp-menuitem ${ambientModeIcon}`), document.querySelector('.html5-video-player'), 1000)
  //       ambientModeCheckbox = document.querySelector(`.ytp-menuitem ${ambientModeIcon}`)?.closest('.ytp-menuitem')
  //       if(ambientModeCheckbox) {
  //         const enabled = ambientModeCheckbox.getAttribute('aria-checked') === 'true'
  //         if(enabled) {
  //           ambientModeCheckbox.click()
  //         }
  //       }
  //     } catch(ex) {
  //       console.log(`Skipped disabling YouTube\'s own Ambient Mode: ${ex?.message}`)
  //     }

  //     settingsBtn?.click() // Close settings
  //     await new Promise(resolve => raf(resolve)) // Await rendering

  //     if(document.activeElement == settingsBtn && wasActiveElement !== settingsBtn) {
  //       if(wasActiveElement) {
  //         wasActiveElement.focus()
  //       } else {
  //         settingsBtn.blur()
  //       }
  //     }

  //     await new Promise(resolve => setTimeout(resolve, 500)) // Await close animation
  //     await new Promise(resolve => raf(resolve)) // Await rendering
  //     settingsPopup.classList.remove('disable-youtube-ambient-mode-workaround')
  //   } catch(ex) {
  //     console.log(`Failed to automatically disable YouTube\'s own Ambient Mode: ${ex?.message}`)
  //   }
  // }

  async disable() {
    if (this.pendingStart) return;
    this.settings.set('enabled', false, true);

    this.updateKeywordsToPreventTheaterScaling();

    await this.hide();
  }

  start = async (initial = false) => {
    if (!this.isOnVideoPage || !this.settings.enabled || this.pendingStart)
      return;

    await this.updateHdr();
    this.showedCompareWarning = false;
    this.showedDetectBarSizeWarning = false;
    this.nextFrameTime = undefined;
    this.ambientlightVideoDroppedFrameCount = 0;
    this.buffersCleared = true; // Prevent old frame from preventing the new frame from being drawn
    this.barDetection.reset();

    this.checkGetImageDataAllowed();
    await this.resetSettingsIfNeeded();
    this.updateKeywordsToPreventTheaterScaling();
    await this.updateView(true);

    this.pendingStart = true;
    if (initial) {
      if (document.visibilityState === 'hidden') {
        await new Promise((resolve) => raf(resolve));
      }
    }
    this.pendingStart = undefined;

    if (this.shouldShow()) await this.show();

    // Continue only if still enabled after await
    if (!this.settings.enabled || !this.isOnVideoPage) return;

    this.calculateAverageVideoFramesDifference();

    // Prevent incorrect stats from showing
    this.lastUpdateStatsTime = performance.now() + this.updateStatsInterval;
    await this.nextFrame();
    // this.disableYouTubeAmbientMode()
  };

  updateHdr = wrapErrorHandler(
    async function updateHdr() {
      if (!this.settings.webGL || !(this.videoElem?.readyState > 1)) return;

      try {
        let isHdr;
        if (typeof VideoFrame !== 'undefined') {
          // Not yet supported in Firefox (Stable): https://bugzilla.mozilla.org/show_bug.cgi?id=1749539
          const videoFrame = new VideoFrame(this.videoElem, { timestamp: 0 });
          isHdr = videoFrame?.colorSpace?.primaries === 'bt2020'; // https://w3c.github.io/webcodecs/#videocolorspace
          videoFrame.close();
        } else {
          isHdr = await injectedScript.postAndReceiveMessage('is-hdr-video');
        }

        if (this.isHdr === isHdr) return;

        this.isHdr = isHdr;
        if (isHdr) {
          this.initWebGLHdrProjectorBuffer();
          this.projectorBuffer = this.hdrProjectorBuffer;
        } else if (this.hdrProjectorBuffer) {
          this.projectorBuffer = this.nonHdrProjectorBuffer;
        }
        this.sizesChanged = true;
      } catch (ex) {
        if (ex?.name === 'InvalidStateError') return;

        console.warn(
          `Failed to detect video color space:\n${
            ex.message
          }\n${''}(ReadyState: ${readyStateToString(
            this.videoElem?.readyState
          )})`
        );
      }
    }.bind(this),
    true
  );

  cancelScheduledRequestVideoFrame = () => {
    if (!this.requestVideoFrameCallbackId) return;

    if (this.videoElem?.cancelVideoFrameCallback) {
      try {
        this.videoElem.cancelVideoFrameCallback(
          this.requestVideoFrameCallbackId
        );
      } catch {
        console.warn(
          `Failed to cancel current requested videoFrameCallback: ${this.requestVideoFrameCallbackId}`
        );
      }
    }
    this.requestVideoFrameCallbackId = undefined;
  };

  scheduleRequestVideoFrame = () => {
    if (
      // this.videoFrameCallbackReceived || // Doesn't matter because this can be true now but not when the new video frame is received
      this.requestVideoFrameCallbackId ||
      this.settings.frameSync != FRAMESYNC_VIDEOFRAMES ||
      this.videoIsHidden || // Partial solution for https://bugs.chromium.org/p/chromium/issues/detail?id=1142112#c9
      !this.canScheduleNextFrame()
    )
      return;

    this.requestVideoFrameCallbackId = this.videoElem.requestVideoFrameCallback(
      this.onVideoFrame
    );
  };

  onVideoFrame = wrapErrorHandler(
    async function onVideoFrame(compose, info) {
      if (!this.requestVideoFrameCallbackId) {
        console.warn(
          `Old rvfc fired. Ignoring a possible duplicate. ${this.requestVideoFrameCallbackId} | ${compose} | ${info}`
        );
        return;
      }
      this.videoElem.requestVideoFrameCallback(function prescheduledVFC() {}); // Requesting as soon as possible to prevent skipped video frames on displays with a matching framerate

      this.stats.receiveVideoFrametimes(compose, info);
      this.requestVideoFrameCallbackId = undefined;
      this.videoFrameCallbackReceived = true;
      this.videoPresentedFrames = info?.presentedFrames || 0;
      this.videoFrameTime = compose;

      if (this.scheduledNextFrame) return;
      this.scheduledNextFrame = true;

      await this.onNextFrame();
    }.bind(this),
    true
  );

  async hide() {
    if (this.isHidden) return;
    this.isHidden = true;

    if (this.chromiumBugVideoJitterWorkaround?.update)
      this.chromiumBugVideoJitterWorkaround.update();

    const toDark = this.theming.shouldBeDarkTheme(false);
    await injectedScript.postAndReceiveMessage('hide', {
      toDark,
      // Todo: Set to the correct pageBackgroundGreyness setting value
      ytdAppElemBackground: toDark ? '#000' : '#fff',
    });

    await this.theming.updateTheme(); // Update livechat theme

    if (this.isVrVideo) this.disposeVR();

    if (this.videoOverlay?.elem?.isConnected) {
      this.videoOverlay.elem.remove();
    }
    if (this.videoDebandingElem?.isConnected) {
      this.videoDebandingElem.remove();
    }

    this.resetVideoParentElemStyle();
    this.clear();
    this.stats.hide();

    this.updateLayoutPerformanceImprovements();
    await this.updateSizes();
  }

  updateLayoutPerformanceImprovements = wrapErrorHandler(() => {
    const html = document.documentElement;
    const liveChatHtml =
      this.theming.liveChatIframe?.contentDocument?.documentElement;
    const enabled =
      this.settings.enabled &&
      !this.isHidden &&
      this.settings.layoutPerformanceImprovements;
    if (enabled) {
      html.setAttribute(
        'data-ambientlight-layout-performance-improvements',
        true
      );
      if (liveChatHtml)
        liveChatHtml.setAttribute(
          'data-ambientlight-layout-performance-improvements',
          true
        );
    } else {
      html.removeAttribute('data-ambientlight-layout-performance-improvements');
      if (liveChatHtml)
        liveChatHtml.removeAttribute(
          'data-ambientlight-layout-performance-improvements'
        );
    }
  }, true);

  async show() {
    if (!this.isHidden) return;
    this.isHidden = false;
    // await new Promise((resolve) => raf(resolve));

    // // Pre-style to prevent black/white flashes
    // if (this.ytdAppElem)
    //   setStyleProperty(this.ytdAppElem, 'background',
    //     this.theming.shouldBeDarkTheme(true) ? '#000' : '#fff',
    //     'important');
    // if (this.playerTheaterContainerElem) {
    //   setStyleProperty(this.playerTheaterContainerElem, 'background',
    //     'none',
    //     'important');
    // }

    // const html = document.documentElement;
    // if (this.settings.hideScrollbar)
    //   html.setAttribute('data-ambientlight-hide-scrollbar', true);
    // if (this.settings.relatedScrollbar)
    //   html.setAttribute('data-ambientlight-related-scrollbar', true);

    const toDark = this.theming.shouldBeDarkTheme(true);
    await injectedScript.postAndReceiveMessage('show', {
      // Todo: Set to the correct pageBackgroundGreyness setting value
      toDark,
      ytdAppElemBackground: toDark ? '#000' : '#fff',
      hideScrollbar: this.settings.hideScrollbar,
      relatedScrollbar: this.settings.relatedScrollbar,
      immersiveMode: this.shouldEnableImmersiveMode(),
    });

    // this.handleDocumentVisibilityChange(); // In case the visibility had changed while being disabled
    // await this.updateVideoPlayerSize(true);
    // await this.updateSizes();

    wrapErrorHandler(
      async function afterShow() {
        // await new Promise((resolve) => raf(resolve));
        // // // eslint-disable-next-line no-unused-vars
        // // const _1 = this.videoElem.clientWidth;

        // const html = document.documentElement;
        // html.setAttribute('data-ambientlight-enabled', true);

        if (this.settings.layoutPerformanceImprovements)
          this.updateLayoutPerformanceImprovements();

        // Todo: Prevent switching to the incorrect theme
        const updateDocument = this.handleDocumentVisibilityChange(); // In case the visibility had changed while being disabled
        // const updateVideoPlayer = this.updateVideoPlayerSize(true); // In case the theater player height changed
        await this.theming.updateTheme(); // Update livechat theme

        await updateDocument;
        // await updateVideoPlayer;

        // Reset
        // if (this.playerTheaterContainerElem)
        //   this.playerTheaterContainerElem.style.background = '';
        // if (this.ytdAppElem) this.ytdAppElem.style.background = '';

        // // eslint-disable-next-line no-unused-vars
        // const _2 = this.videoElem.clientWidth;
        // await new Promise((resolve) => raf(resolve));

        // Recalculate the player menu width to remove the elements on the second row
        try {
          await new Promise((resolve) => raf(resolve));
          const menu = document.querySelector(
            'ytd-menu-renderer[has-flexible-items]'
          );
          if (menu?.onStamperFinished) {
            menu.onStamperFinished();
          }
        } catch {}

        if (this.chromiumBugVideoJitterWorkaround?.update)
          this.chromiumBugVideoJitterWorkaround.update();
      }.bind(this)
    )();
  }

  updateAtTop = async () => {
    if (this.mastheadElem)
      this.mastheadElem.classList.toggle('at-top', this.atTop);

    if (this.settings.webGL) await this.projector.handleAtTopChange(this.atTop);
  };

  shouldEnableImmersiveMode = () =>
    this.settings.immersiveTheaterView && this.view === VIEW_THEATER;

  async updateImmersiveMode() {
    const html = document.documentElement;
    const enabled = html.getAttribute('data-ambientlight-immersive') != null;
    const enable = this.shouldEnableImmersiveMode();

    if (enabled === enable) return;

    await injectedScript.postAndReceiveMessage('update-immersive-mode', enable);
  }
}
__exports["default"] = Ambientlight;
return __exports;
})();

// ==================== module: host (src/content/youtube/ambilight/vendor-modules/host.js) ====================
__modules["host"] = (() => {
const __exports = {};
const { on, off, wrapErrorHandler, isWatchPageUrl, setErrorHandler, watchSelectors, isEmbedPageUrl, setWarning } = __require('generic');
const { getNodeTreeString, getOtherUnknownAppElems, getPageElems, getSelectorTreeString } = __require('errors/dom');
const { default: Ambientlight } = __require('ambientlight');
const { default: Settings } = __require('settings');
const { contentScript } = __require('messaging/content');
const { injectedScript } = __require('messaging/injected');
const { extensionId } = __require('messaging/utils');
const { setStyleProperty } = __require('generic');
/**
 * FocusTube host for the vendored youtube-ambilight engine.
 *
 * This adapts the upstream content-main.js bootstrap to FocusTube:
 *  - the SentryReporter / ErrorEvents / crashOptions plumbing is replaced by
 *    console logging (FocusTube is telemetry-free),
 *  - FocusTube popup settings (extensionEnabled / ambientLightEnabled /
 *    ambientLightIntensity) drive the engine through the settings adapter and
 *    keep syncing live via onSettingsChanged,
 *  - a fallback in-isolated-world bridge applies the page-side `show`/`hide`
 *    effects (html[data-ambientlight-enabled], masthead pre-styling) in case
 *    the MAIN-world injected.js bundle cannot run, so the glow still renders.
 * Everything else (video detection, detached-video recovery, page-transition
 * handling) mirrors upstream content-main.js.
 */









setErrorHandler((ex) => console.warn('[YTAL]', ex));

// ---------------------------------------------------------------------------
// FocusTube fallback bridge for the page-side effects (isolated world).
// The verbatim injected.js bundle (MAIN world) handles these messages with
// full access to the YouTube player API. This fallback mirrors the DOM-only
// subset so the ambient light still renders when the MAIN-world script is
// unavailable. All effects are idempotent, so having both handlers active is
// safe.
// ---------------------------------------------------------------------------

const getElem = (() => {
  const elems = {};
  return (name) => {
    if (!elems[name]?.isConnected) {
      if (elems[name] && !elems[name].isConnected) {
        elems[name].dataset.ytalElem = name;
      }
      elems[name] = document.querySelector(`[data-ytal-elem="${name}"]`);
      if (elems[name]) {
        delete elems[name].dataset.ytalElem;
      }
    }
    return elems[name];
  };
})();

function fallbackVideoPlayerSetSize() {
  // setSize()/setInternalSize() are YouTube page APIs only reachable from the
  // MAIN world; the verbatim injected.js handles this. Isolated world: skip.
  contentScript.postMessage('sizes-changed');
}

function fallbackUpdateTheme(toDark) {
  try {
    document.documentElement.toggleAttribute('dark', toDark);
    const ytdAppElem = getElem('ytd-app');
    if (ytdAppElem?.setMastheadTheme) ytdAppElem.setMastheadTheme();
  } catch (_) {
    /* page API unavailable in isolated world */
  }
}

function fallbackUpdateImmersiveMode(enable, skipVideoPlayerSetSize = false) {
  try {
    const html = document.documentElement;
    const enabled = html.getAttribute('data-ambientlight-immersive') != null;
    if (enabled === enable) return;

    const scroll = { x: window.scrollX, y: window.scrollY };
    html.toggleAttribute('data-ambientlight-immersive', enable);
    const shift = enable ? 29 : -29;
    if (scroll.y > 50 && scroll.y < 100) {
      window.scrollTo(scroll.x, (scroll.y += shift));
    }

    const ytdApp = getElem('ytd-app');
    if (ytdApp?.mastheadHeight) {
      ytdApp.mastheadHeight += shift;
      ytdApp.updateMastheadCssHeight?.();
    }

    if (!skipVideoPlayerSetSize && enabled !== enable) {
      fallbackVideoPlayerSetSize();
    }
  } catch (_) {
    /* page API unavailable in isolated world */
  }
}

contentScript.addMessageListener('update-theme', function onUpdateTheme(
  toDark
) {
  fallbackUpdateTheme(toDark);
  contentScript.postMessage('update-theme');
});

contentScript.addMessageListener(
  'update-immersive-mode',
  function onUpdateImmersiveMode(enable) {
    fallbackUpdateImmersiveMode(enable);
    contentScript.postMessage('update-immersive-mode');
  }
);

contentScript.addMessageListener('show', function show({
  ytdAppElemBackground,
  toDark,
  hideScrollbar,
  relatedScrollbar,
  immersiveMode,
} = {}) {
  try {
    const mastheadElem = getElem('masthead');
    if (mastheadElem) mastheadElem.classList.add('no-animation');

    const ytdAppElem = getElem('ytd-app');
    if (ytdAppElem && ytdAppElemBackground)
      setStyleProperty(
        ytdAppElem,
        'background',
        ytdAppElemBackground,
        'important'
      );

    const html = document.documentElement;
    if (hideScrollbar)
      html.toggleAttribute('data-ambientlight-hide-scrollbar', true);
    if (relatedScrollbar)
      html.toggleAttribute('data-ambientlight-related-scrollbar', true);
    if (immersiveMode) fallbackUpdateImmersiveMode(true, true);

    fallbackUpdateTheme(toDark);

    html.toggleAttribute('data-ambientlight-enabled', true);

    fallbackVideoPlayerSetSize();

    if (ytdAppElem) ytdAppElem.style.background = '';
    if (mastheadElem) mastheadElem.classList.remove('no-animation');
  } catch (_) {
    /* keep the engine running even if a page element is missing */
  }
  contentScript.postMessage('show');
});

contentScript.addMessageListener('hide', function hide({ toDark } = {}) {
  try {
    const mastheadElem = getElem('masthead');
    if (mastheadElem) mastheadElem.classList.add('no-animation');

    const html = document.documentElement;
    html.toggleAttribute('data-ambientlight-enabled', false);
    html.toggleAttribute('data-ambientlight-hide-scrollbar', false);
    html.toggleAttribute('data-ambientlight-related-scrollbar', false);

    fallbackUpdateImmersiveMode(false, true);
    fallbackUpdateTheme(toDark);

    fallbackVideoPlayerSetSize();

    if (mastheadElem) mastheadElem.classList.remove('no-animation');
  } catch (_) {
    /* ignore */
  }
  contentScript.postMessage('hide');
});

contentScript.addMessageListener(
  'is-hdr-video',
  function isHdrVideoFallback() {
    // getVideoData() is a YouTube page API — main world only. Report "not HDR"
    // so the engine continues with the SDR pipeline (matches HDR default off).
    contentScript.postMessage('is-hdr-video', false);
  }
);

contentScript.addMessageListener(
  'player-storyboard-format',
  function playerStoryboardFormatFallback() {
    contentScript.postMessage('player-storyboard-format', undefined);
  }
);

contentScript.addMessageListener(
  'video-player-set-size',
  function onVideoPlayerSetSizeFallback() {
    fallbackVideoPlayerSetSize();
    contentScript.postMessage('video-player-set-size');
  }
);

contentScript.addMessageListener(
  'video-player-reload-video-by-id',
  function videoPlayerReloadVideoByIdFallback() {
    contentScript.postMessage('video-player-reload-video-by-id');
  }
);

contentScript.addMessageListener(
  'video-player-update-video-data-keywords',
  function videoPlayerUpdateVideoDataKeywordsFallback() {
    // updateVideoData() is a page API — the verbatim MAIN-world script handles
    // this when available; nothing safe to do from the isolated world.
  }
);

contentScript.addMessageListener(
  'apply-chromium-bug-1142112-workaround',
  function applyChromiumBugWorkaroundFallback() {
    // Requires page-world property access — verbatim injected.js covers it.
  }
);

// ---------------------------------------------------------------------------
// Engine bootstrap (upstream content-main.js flow)
// ---------------------------------------------------------------------------

const logErrorEventWithPageTrees = (message, details = {}) => {
  if (!isWatchPageUrl()) return;
  console.warn(`[YTAL] ${message}`, details);
};

const detectDetachedVideo = () => {
  const observer = new MutationObserver(
    wrapErrorHandler(function detectDetachedVideo() {
      if (!isWatchPageUrl()) return;

      const videoElem = ambientlight.videoElem;
      const ytdAppElem = ambientlight.ytdAppElem ?? document.body;

      const isDetached =
        !videoElem ||
        !ytdAppElem?.contains(videoElem) ||
        !document.contains(ytdAppElem);
      if (!isDetached) return;

      if (!document.querySelector('video')) return;

      const newVideoElem =
        document.body !== ytdAppElem
          ? document.querySelector(
              watchSelectors
                .map(
                  (selector) =>
                    `ytd-app #content.ytd-app ${selector} video.html5-main-video`
                )
                .join(', ')
            )
          : ytdAppElem.querySelector('video.html5-main-video');
      if (!newVideoElem) {
        logErrorEventWithPageTrees('detectDetachedVideo');
        return;
      }

      if (document.body !== ytdAppElem) {
        const newYtdAppElem = newVideoElem.closest('ytd-app');
        if (newYtdAppElem !== ytdAppElem) {
          logErrorEventWithPageTrees('detectDetachedYtdApp');
          return;
          // Migrating to a new ytd-app element is not supported,
          // because it will also require moving or re-creating the
          // settings menu, canvasses and other elements
        }
      }

      if (videoElem !== newVideoElem) {
        ambientlight.initVideoElem(newVideoElem);
      }

      ambientlight.start();
    }, true)
  );

  observer.observe(document, {
    attributes: false,
    attributeOldValue: false,
    characterData: false,
    characterDataOldValue: false,
    childList: true,
    subtree: true,
  });
};

const tryInitAmbientlight = async () => {
  if (window.ambientlight) return true;
  if (!isWatchPageUrl()) return;
  if (!document.querySelector('video')) return;

  const settingsMenuBtnParentSelector = [
    '.html5-video-player .ytp-right-controls',
    '.html5-video-player .ytp-chrome-controls > *:last-child',
  ].join(', ');
  const hasSettingsMenuBtnParent = !!document.querySelector(
    settingsMenuBtnParentSelector
  );
  if (!hasSettingsMenuBtnParent) {
    logErrorEventWithPageTrees(
      `initialize - not found yet: ${settingsMenuBtnParentSelector}`
    );
    return;
  }

  if (isEmbedPageUrl()) {
    // FocusTube does not inject on embed pages — upstream supports them via a
    // dedicated all_frames content script that FocusTube does not register.
    return;
  }

  const videoElem = document.querySelector(
    watchSelectors
      .map(
        (selector) =>
          `ytd-app #content.ytd-app ${selector} .html5-video-player .html5-video-container video.html5-main-video`
      )
      .join(', ')
  );
  if (!videoElem) {
    logErrorEventWithPageTrees(
      'initialize - not found yet: ytd-app ytd-watch-... .html5-video-player .html5-video-container video.html5-main-video'
    );
    return;
  }

  const ytdAppElem = document.querySelector('ytd-app');
  if (!ytdAppElem) {
    logErrorEventWithPageTrees('initialize - not found yet: ytd-app');
    return;
  }

  const contentElem = document.querySelector('#content.ytd-app');
  if (!contentElem) {
    logErrorEventWithPageTrees('initialize - not found yet: #content.ytd-app');
    return;
  }

  const ytdWatchElem = document.querySelector(
    watchSelectors.map((selector) => `ytd-app ${selector}`).join(', ')
  );
  if (!ytdWatchElem) {
    logErrorEventWithPageTrees(
      `initialize - not found yet: ytd-app ytd-watch-...`
    );
    return;
  }

  const mastheadElem = document.querySelector('ytd-app #masthead-container');
  if (!mastheadElem) {
    logErrorEventWithPageTrees(
      'initialize - not found yet: #masthead-container'
    );
    return;
  }
  window.ambientlight = await new Ambientlight(
    videoElem,
    ytdAppElem,
    ytdWatchElem,
    mastheadElem
  );

  detectDetachedVideo();
  detectPageTransitions(ytdAppElem);
  if (!window.ambientlight.isOnVideoPage) {
    detectWatchPageVideo(ytdAppElem);
  }

  return true;
};

const getWatchPageViewObserver = (function initGetWatchPageViewObserver() {
  let observer;
  return function getWatchPageViewObserver() {
    if (!observer) {
      observer = new MutationObserver(
        wrapErrorHandler(function watchPageViewObserved() {
          startIfWatchPageHasVideo();
        }, true)
      );
    }
    return observer;
  };
})();
const detectWatchPageVideo = (ytdAppElem) => {
  getWatchPageViewObserver().observe(ytdAppElem, {
    childList: true,
    subtree: true,
  });
};
const startIfWatchPageHasVideo = () => {
  if (!isWatchPageUrl() || window.ambientlight.isOnVideoPage) {
    getWatchPageViewObserver().disconnect();
    return;
  }

  const videoElem = document.querySelector(
    watchSelectors
      .map((selector) => `ytd-app ${selector} video.html5-main-video`)
      .join(', ')
  );
  if (!videoElem) return;

  getWatchPageViewObserver().disconnect();
  window.ambientlight.isOnVideoPage = true;
  window.ambientlight.start();
};

const detectPageTransitions = (ytdAppElem) => {
  on(
    document,
    'yt-navigate-finish',
    async function onYtNavigateFinish() {
      getWatchPageViewObserver().disconnect();
      if (isWatchPageUrl()) {
        startIfWatchPageHasVideo();
        if (!window.ambientlight.isOnVideoPage) {
          detectWatchPageVideo(ytdAppElem);
        }
      } else {
        if (window.ambientlight.isOnVideoPage) {
          window.ambientlight.isOnVideoPage = false;
          await window.ambientlight.hide();
        }
      }
    },
    undefined,
    true
  );
};

const loadAmbientlight = async () => {
  // Mobile player
  if (document.querySelector('#player-control-container')) return;

  // Validate YouTube desktop web app
  let observerTarget = document.querySelector('ytd-app');
  if (!observerTarget) {
    const otherAppElems = getOtherUnknownAppElems();
    if (otherAppElems.length) {
      const selectorTree = getSelectorTreeString(
        otherAppElems.map((elem) => elem.tagName).join(',')
      );
      console.warn(
        `[YTAL] Found *-app elements but no ytd-app: ${selectorTree}`
      );
    }
    return;
  }

  if (await tryInitAmbientlight()) return;
  // Not on the watch page yet

  // Listen to DOM changes
  let initializing = false;
  let tryAgain = true;
  const observer = new MutationObserver(
    wrapErrorHandler(async function ytdAppObserved(mutationsList, observer) {
      if (initializing) {
        tryAgain = true;
        return;
      }

      if (window.ambientlight) {
        observer.disconnect();
        return;
      }

      initializing = true;
      try {
        if (await tryInitAmbientlight()) {
          // Initialized
          observer.disconnect();
        } else {
          while (tryAgain && !window.ambientlight) {
            tryAgain = false;
            if (await tryInitAmbientlight()) {
              // Initialized
              observer.disconnect();
              tryAgain = false;
            }
          }
          initializing = false;
        }
      } catch (ex) {
        // Disconnect to prevent infinite loops
        observer.disconnect();
        throw ex;
      }
    }, true)
  );
  observer.observe(observerTarget, {
    childList: true,
    subtree: true,
  });
};

const onLoad = wrapErrorHandler(async function onLoadCallback() {
  if (window.ambientlight !== undefined) return;

  // FocusTube master switch: with the extension disabled the engine never
  // boots (same contract as every other FocusTube controller).
  try {
    if (typeof loadSettings === 'function') {
      const ft = await loadSettings();
      if (ft && ft.extensionEnabled === false) return;
    }
  } catch (_) {
    /* fall through — engine treats unknown state as enabled */
  }

  window.ambientlight = false;
  await loadAmbientlight();
});

// ---------------------------------------------------------------------------
// Live FocusTube settings sync (popup toggles)
// ---------------------------------------------------------------------------

function watchFocusTubeSettings() {
  if (typeof onSettingsChanged !== 'function') return;
  onSettingsChanged(async () => {
    const ambientlight = window.ambientlight;
    if (!ambientlight || !ambientlight.settings) return;

    let ft;
    try {
      ft = typeof loadSettings === 'function' ? await loadSettings() : null;
    } catch (_) {
      return;
    }
    if (!ft) return;

    const changed = ambientlight.settings.applyFocusTubeSettings(ft);
    if (!(changed.enabled || changed.intensity)) return;

    if (changed.enabled) {
      if (ambientlight.settings.enabled) {
        await ambientlight.enable();
      } else {
        await ambientlight.disable();
      }
    }
    if (changed.intensity) {
      await ambientlight.settings.commitExternalChange();
    }
  });
}

(function setup() {
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onLoad, { once: true });
    } else {
      onLoad();
    }
    watchFocusTubeSettings();
  } catch (ex) {
    console.warn('[YTAL] setup failed:', ex);
  }
})();

return __exports;
})();
})();