/**
 * FocusTube Ambient Light page bridge — verbatim youtube-ambilight injected.js (MAIN world)
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

// ==================== module: @injected (third_party/youtube-ambilight/src/injected.js) ====================
__modules["@injected"] = (() => {
const __exports = {};
const { setErrorHandler, setStyleProperty } = __require('generic');
const { contentScript } = __require('messaging/content');



let reporting = false; // Prevent infinite loops
setErrorHandler((ex) => {
  if (reporting) return;

  try {
    reporting = true;
    contentScript.postMessage('error', {
      name: ex.name,
      message: ex.message,
      stack: ex.stack,
      details: ex.details,
    });
  } catch (reportEx) {
    console.warn('Failed to report error:', ex, 'innerError:', reportEx);
  } finally {
    reporting = false;
  }
});

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

function updateTheme(toDark) {
  document.documentElement.toggleAttribute('dark', toDark);

  const ytdAppElem = getElem('ytd-app');
  if (ytdAppElem?.setMastheadTheme) {
    ytdAppElem.setMastheadTheme();
  }
}

contentScript.addMessageListener(
  'update-theme',
  function onUpdateTheme(toDark) {
    updateTheme(toDark);
    contentScript.postMessage('update-theme');
  }
);

const updateImmersiveMode = function updateImmersiveMode(
  enable,
  skipVideoPlayerSetSize = false
) {
  const html = document.documentElement;
  const enabled = html.getAttribute('data-ambientlight-immersive') != null;
  if (enabled === enable) return;

  const scroll = {
    x: window.scrollX,
    y: window.scrollY,
  };

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

  if (!skipVideoPlayerSetSize && enabled !== enable) videoPlayerSetSize();
};

contentScript.addMessageListener(
  'update-immersive-mode',
  function onUpdateImmersiveMode(enable) {
    updateImmersiveMode(enable);
    contentScript.postMessage('update-immersive-mode');
  }
);

contentScript.addMessageListener(
  'set-live-chat-theme',
  function seLiveChatTheme(toDark) {
    const liveChatElem = getElem('live-chat');
    if (!liveChatElem) return;

    liveChatElem.postToContentWindow({
      'yt-live-chat-set-dark-theme': toDark,
    });
  }
);

contentScript.addMessageListener('is-hdr-video', function isHdrVideo() {
  const videoPlayerElem = getElem('video-player');
  const isHdr = videoPlayerElem?.getVideoData?.()?.isHdr ?? false;
  contentScript.postMessage('is-hdr-video', isHdr);
});

contentScript.addMessageListener(
  'player-storyboard-format',
  function playerStoryboardSpec() {
    const player = getElem('video-player');
    const format = player?.getStoryboardFormat?.();
    contentScript.postMessage('player-storyboard-format', format);
  }
);

function videoPlayerSetSize() {
  const videoPlayerElem = getElem('video-player');
  if (videoPlayerElem) {
    try {
      videoPlayerElem.setSize();
      videoPlayerElem.setInternalSize();
    } catch (ex) {
      console.warn(
        `Failed to resize the video player${
          ex?.message ? `: ${ex?.message}` : ''
        }`
      );
    }
  }
  contentScript.postMessage('sizes-changed');
}

contentScript.addMessageListener(
  'video-player-set-size',
  function onVideoPlayerSetSize() {
    videoPlayerSetSize();
    contentScript.postMessage('video-player-set-size');
  }
);

let vrVideoCtx;
let vrVideoCtxDrawArrays;
const drawVR = (...args) => {
  const result = vrVideoCtxDrawArrays.bind(vrVideoCtx)(...args);
  contentScript.postMessage('next-vr-frame');
  return result;
};

contentScript.addMessageListener('init-vr-video', function initVrVideo() {
  const vrVideoElem = getElem('vr-video');
  vrVideoCtx = vrVideoElem.getContext('webgl');
  if (vrVideoCtx) {
    if (vrVideoCtx.drawArrays !== drawVR) {
      vrVideoCtxDrawArrays = vrVideoCtx.drawArrays;
      vrVideoCtx.drawArrays = drawVR;
    }
  }
});

contentScript.addMessageListener('dispose-vr-video', function disposeVrVideo() {
  if (!vrVideoCtx) return;

  vrVideoCtx.drawArrays = vrVideoCtxDrawArrays;
  vrVideoCtx = undefined;
});

contentScript.addMessageListener(
  'show',
  function show({
    ytdAppElemBackground,
    toDark,
    hideScrollbar,
    relatedScrollbar,
    immersiveMode,
  }) {
    const mastheadElem = getElem('masthead');
    if (mastheadElem) mastheadElem.classList.add('no-animation');

    const ytdAppElem = getElem('ytd-app');
    // const playerTheaterContainerElem = getElem(
    //   watchSelectors
    //     .map((selector) => `${selector} #full-bleed-container`)
    //     .join(', ')
    // );

    // Temporary backgrounds
    // if (playerTheaterContainerElem) {
    //   setStyleProperty(
    //     playerTheaterContainerElem,
    //     'background',
    //     'none',
    //     'important'
    //   );
    // }
    if (ytdAppElem)
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
    if (immersiveMode) updateImmersiveMode(true, true);

    updateTheme(toDark);

    // await new Promise((resolve) => raf(resolve));
    // // eslint-disable-next-line no-unused-vars
    // const _1 = videoElem.clientWidth;
    html.toggleAttribute('data-ambientlight-enabled', true);

    videoPlayerSetSize();

    // Restore default backgrounds
    // if (playerTheaterContainerElem)
    //   playerTheaterContainerElem.style.background = '';
    if (ytdAppElem) ytdAppElem.style.background = '';

    if (mastheadElem) mastheadElem.classList.remove('no-animation');
    contentScript.postMessage('show');
  }
);

contentScript.addMessageListener('hide', function hide({ toDark }) {
  const mastheadElem = getElem('masthead');
  if (mastheadElem) mastheadElem.classList.add('no-animation');

  const html = document.documentElement;
  html.toggleAttribute('data-ambientlight-enabled', false);

  html.toggleAttribute('data-ambientlight-hide-scrollbar', false);
  html.toggleAttribute('data-ambientlight-related-scrollbar', false);

  updateImmersiveMode(false, true);

  updateTheme(toDark);

  videoPlayerSetSize();

  if (mastheadElem) mastheadElem.classList.remove('no-animation');
  contentScript.postMessage('hide');
});

contentScript.addMessageListener(
  'video-player-update-video-data-keywords',
  function videoPlayerUpdateVideoDataKeywords(keywords) {
    const videoPlayerElem = getElem('video-player');
    if (!videoPlayerElem) return;

    videoPlayerElem.updateVideoData({ keywords });
  }
);

contentScript.addMessageListener(
  'video-player-reload-video-by-id',
  function videoPlayerReloadVideoById() {
    const videoPlayerElem = getElem('video-player');
    if (videoPlayerElem) {
      const id = videoPlayerElem.getVideoData()?.video_id;
      if (id) videoPlayerElem.loadVideoById(id); // Refreshes auto quality setting range above 480p
    }
    contentScript.postMessage('video-player-reload-video-by-id');
  }
);

let videoObserver;
let videoObserverElem;
contentScript.addMessageListener(
  'apply-chromium-bug-1142112-workaround',
  function applyChromiumBug1142112Workaround() {
    try {
      const videoElem = getElem('video');
      if (videoObserverElem === videoElem) return;

      if (videoObserver) {
        videoObserver.disconnect();
        videoObserver = undefined;
      }
      videoObserverElem = videoElem;
      if (!videoElem || videoElem.ambientlightGetVideoPlaybackQuality) return;

      let videoIsHidden = false; // IntersectionObserver is always executed at least once when the observation starts
      let videoVisibilityChangeTime;
      videoObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (videoObserverElem !== entry.target) continue;
            videoIsHidden = entry.intersectionRatio === 0;
            videoVisibilityChangeTime = performance.now();
          }
        },
        {
          rootMargin: '-70px 0px 0px 0px', // masthead height (56px) + additional pixel to be safe
          threshold: 0.0001, // Because sometimes a pixel in not visible on screen but the intersectionRatio is already 0
        }
      );
      videoObserver.observe(videoElem);

      Object.defineProperty(videoElem, 'ambientlightGetVideoPlaybackQuality', {
        value: videoElem.getVideoPlaybackQuality,
      });

      let previousDroppedVideoFrames = 0;
      let droppedVideoFramesCorrection = 0;
      let previousTime = performance.now();

      videoElem.getVideoPlaybackQuality = function () {
        // Use scoped properties instead of this from here on
        const original = videoElem.ambientlightGetVideoPlaybackQuality();
        let droppedVideoFrames = original.droppedVideoFrames;
        if (droppedVideoFrames < previousDroppedVideoFrames) {
          previousDroppedVideoFrames = 0;
          droppedVideoFramesCorrection = 0;
        }
        // Ignore dropped frames for 2 seconds due to requestVideoFrameCallback dropping frames when the video is offscreen
        if (videoIsHidden || videoVisibilityChangeTime > previousTime - 2000) {
          droppedVideoFramesCorrection +=
            droppedVideoFrames - previousDroppedVideoFrames;
        }
        previousDroppedVideoFrames = droppedVideoFrames;
        droppedVideoFrames = Math.max(
          0,
          droppedVideoFrames - droppedVideoFramesCorrection
        );
        previousTime = performance.now();
        return {
          corruptedVideoFrames: original.corruptedVideoFrames,
          creationTime: original.creationTime,
          droppedVideoFrames,
          totalVideoFrames: original.totalVideoFrames,
        };
      };
    } catch (ex) {
      console.warn(
        'Failed to apply getVideoPlaybackQuality workaround. Continuing ambientlight initialization...'
      );
      throw ex;
    }
  }.bind(this)
);

return __exports;
})();
})();