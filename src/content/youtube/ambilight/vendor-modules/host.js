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
import {
  on,
  off,
  wrapErrorHandler,
  isWatchPageUrl,
  setErrorHandler,
  watchSelectors,
  isEmbedPageUrl,
  setWarning,
} from './generic';
import {
  getNodeTreeString,
  getOtherUnknownAppElems,
  getPageElems,
  getSelectorTreeString,
} from './errors/dom';
import Ambientlight from './ambientlight';
import Settings from './settings';
import { contentScript } from './messaging/content';
import { injectedScript } from './messaging/injected';
import { extensionId } from './messaging/utils';
import { setStyleProperty } from './generic';

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
