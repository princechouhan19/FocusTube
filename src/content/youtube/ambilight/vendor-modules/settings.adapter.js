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
import SettingsConfig, {
  prepareSettingsConfigOnce,
} from './settings-config';
import { storage } from './storage';
import { supportsWebGL } from './generic';

export const FRAMESYNC_DECODEDFRAMES = 0;
export const FRAMESYNC_DISPLAYFRAMES = 1;
export const FRAMESYNC_VIDEOFRAMES = 2;

export const DEBANDING_BLEND_MODE_LCD = 0;
export const DEBANDING_BLEND_MODE_OLED = 1;

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

export default class Settings {
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
