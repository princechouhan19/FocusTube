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
import { appendErrorStack, wrapErrorHandler } from './generic';

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

export const storage = new Storage();

export const defaultCrashOptions = {
  video: false,
  technical: true,
  crash: true,
};
