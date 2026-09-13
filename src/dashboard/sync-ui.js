/**
 * Cross-Browser Data Sync UI
 *
 * Page-side companion to the background file-sync engine. The File System
 * Access API requires a document context (and a user gesture) to show the
 * picker, so the handle is chosen HERE and persisted in IndexedDB, where the
 * background service worker picks it up for its periodic read → merge →
 * write cycles.
 *
 * v1.16.0 — MONTHLY ARCHIVE MODE. The primary flow now picks a FOLDER; the
 * engine keeps one JSON file per calendar month inside it
 * (focustube-September-2025.json) and rotates automatically at month end,
 * so no single file ever grows unbounded and every month stays as a small
 * archive. Picking a folder also imports every focustube-*.json already in
 * it, restoring prior months into this browser. Browsers without directory
 * picking keep the classic single-file flow; browsers without the File
 * System Access API (e.g. Firefox) keep Export / Import as the manual
 * fallback — exports now use the same monthly naming scheme.
 */

(() => {
  // Must match the constants in src/background/background.js.
  const SYNC_DB_NAME = "focustube-file-sync";
  const SYNC_DB_VERSION = 1;
  const SYNC_STORE = "handles";
  const SYNC_HANDLE_KEY = "dataFile";
  const SYNC_DIR_KEY = "dataDir";

  const SYNC_MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  // Guard rails for the one-time history import after a folder is picked.
  const HISTORY_IMPORT_MAX_FILES = 60;
  const HISTORY_IMPORT_MAX_BYTES = 8 * 1024 * 1024;
  const MONTH_FILE_RE = /^focustube-.+\.json$/i;

  const badge = document.getElementById("sync-status-badge");
  const detail = document.getElementById("sync-detail");
  const pickBtn = document.getElementById("sync-pick-btn");
  const nowBtn = document.getElementById("sync-now-btn");
  const disconnectBtn = document.getElementById("sync-disconnect-btn");
  const exportBtn = document.getElementById("sync-export-btn");
  const importInput = document.getElementById("sync-import-input");

  const supportsFSA =
    typeof window.showSaveFilePicker === "function" &&
    typeof indexedDB !== "undefined";
  const supportsDir =
    typeof window.showDirectoryPicker === "function" &&
    typeof indexedDB !== "undefined";

  if (!supportsFSA && !supportsDir) {
    if (pickBtn) pickBtn.style.display = "none";
  }

  // Brave exposes a non-standard navigator.brave for detection. Brave ships
  // with the File System Access API disabled by default (it can be turned
  // on via brave://flags), so those users get the flag tip below.
  let braveDetected = false;
  try {
    if (navigator.brave && typeof navigator.brave.isBrave === "function") {
      Promise.resolve(navigator.brave.isBrave())
        .then((v) => {
          if (v) {
            braveDetected = true;
            refreshStatus(); // re-render with the Brave-specific hint
          }
        })
        .catch(() => {});
    }
  } catch (_) {}

  function manualSyncHelp() {
    let s =
      "This browser blocks direct file access, so sync manually: click “Export data file” on a connected browser, then “Import data file” here.";
    if (braveDetected) {
      s +=
        " Tip: Brave can sync directly — open brave://flags, enable “File System Access API”, relaunch, then reload this page.";
    }
    return s;
  }

  function openSyncDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SYNC_STORE)) {
          db.createObjectStore(SYNC_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbOp(mode, fn) {
    const db = await openSyncDB();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_STORE, mode);
        const req = fn(tx.objectStore(SYNC_STORE));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  const getStored = (key) =>
    idbOp("readonly", (s) => s.get(key)).catch(() => null);
  const putStored = (key, handle) =>
    idbOp("readwrite", (s) => s.put(handle, key));

  function monthFileName(now = new Date()) {
    return `focustube-${SYNC_MONTH_NAMES[now.getMonth()]}-${now.getFullYear()}.json`;
  }

  function monthKey(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  /** Page-side mirror of the background's month scoping for exports. */
  function filterPayloadDaysToMonth(payload, mKey) {
    if (!payload || typeof payload !== "object") return payload;
    const prefix = `${mKey}-`;
    const filterMap = (map) => {
      const out = {};
      for (const [day, value] of Object.entries(map || {})) {
        if (String(day).startsWith(prefix)) out[day] = value;
      }
      return out;
    };
    return {
      ...payload,
      analyticsDaily: filterMap(payload.analyticsDaily),
      timeUsage: filterMap(payload.timeUsage),
      topicStats: filterMap(payload.topicStats),
    };
  }

  async function send(action, extra = {}) {
    try {
      return await chrome.runtime.sendMessage({ action, ...extra });
    } catch (err) {
      console.warn("[FocusTube Sync] message failed:", err?.message);
      return null;
    }
  }

  function timeAgo(ts) {
    if (!ts) return "never";
    const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
  }

  function renderStatus(status) {
    if (!badge || !detail) return;
    badge.className = "sync-badge";

    if (!status || typeof status !== "object") {
      badge.classList.add("off");
      badge.textContent = "Not set up";
      detail.textContent = supportsDir
        ? "Choose a folder to start monthly syncing."
        : supportsFSA
        ? "Choose a data file to start syncing."
        : manualSyncHelp();
      return;
    }

    // The storage.onChanged payload lacks `hasFile` (only the message API
    // adds it), so fall back to the persisted `connected` flag.
    const hasFile = status.hasFile !== undefined ? status.hasFile : !!status.connected;
    const pendingDetail = status.pendingChanges
      ? ` ${timeAgo(status.pendingSince)} of local changes are waiting safely on this device.`
      : "";
    const monthly = status.syncMode === "monthly";

    if (hasFile && status.needsPermission) {
      badge.classList.add("warn");
      badge.textContent = "Reconnect needed";
      const target = monthly
        ? `the sync folder "${status.folderName || "FocusTube"}"`
        : `"${status.fileName}"`;
      detail.textContent = `Access to ${target} was revoked by the browser. Click "Choose data ${
        monthly ? "folder" : "file"
      }…" and pick the same ${
        monthly ? "folder" : "file"
      } again.`;
      if (status.pendingChanges) detail.textContent += pendingDetail;
      return;
    }

    if (hasFile && status.lastResult === "unknown") {
      badge.classList.add("on");
      badge.textContent = "Connected";
      detail.textContent = monthly
        ? `Monthly files in "${status.folderName || "your folder"}": current file ${status.fileName}. The background service worker couldn't be reached just now — it will sync within a minute.`
        : `Shared file: ${status.fileName}. The background service worker couldn't be reached just now — it will sync within a minute. If this message persists, reload the extension.`;
      return;
    }

    if (hasFile && status.lastResult === "error") {
      badge.classList.add("warn");
      badge.textContent = "Sync error";
      detail.textContent = `Last sync failed: ${status.lastError || "unknown error"} (file: ${status.fileName}). Make sure it isn't open in another program.`;
      return;
    }

    if (hasFile) {
      badge.classList.add("on");
      const kb = status.fileBytes
        ? `${Math.max(1, Math.round(status.fileBytes / 1024))} KB`
        : "";
      badge.textContent = `Syncing · ${timeAgo(status.lastSyncAt)}${kb ? ` · ${kb}` : ""}`;
      detail.textContent = monthly
        ? `Monthly archive: ${status.fileName} in "${status.folderName || "your folder"}". A fresh file starts automatically each month — earlier months stay on disk as small archives.${pendingDetail}`
        : `Shared file: ${status.fileName}. Last write ${timeAgo(
            status.lastWriteAt || status.lastSyncAt,
          )}${kb ? ` (${kb})` : ""}. Every browser using this same file shows the same dashboard and limits.${pendingDetail}`;
      return;
    }

    badge.classList.add("off");
    badge.textContent = status.pendingChanges ? "Saved locally" : "Not set up";
    detail.textContent =
      supportsDir || supportsFSA
        ? status.pendingChanges
          ? `Your data is safely saved in this browser.${pendingDetail} Choose a data ${
              supportsDir ? "folder" : "file"
            } to sync it whenever you are ready.`
          : supportsDir
          ? "Choose a folder to start monthly syncing."
          : "Choose a data file to start syncing."
        : manualSyncHelp();
  }

  async function refreshStatus() {
    let resp = null;
    try {
      resp = await send("syncGetStatus");
    } catch (_) {
      resp = null;
    }

    let status = resp?.status;
    if (!status || typeof status !== "object") {
      // Messaging failed (SW asleep, stale context, or an older background
      // without the sync handlers). Fall back to local facts so a stored
      // handle is never reported as "not set up".
      const [fileHandle, dirHandle] = await Promise.all([
        getStored(SYNC_HANDLE_KEY),
        getStored(SYNC_DIR_KEY),
      ]);
      status = dirHandle
        ? {
            hasFile: true,
            connected: true,
            syncMode: "monthly",
            folderName: dirHandle.name || "",
            fileName: monthFileName(),
            lastResult: "unknown",
            lastSyncAt: 0,
          }
        : fileHandle
        ? {
            hasFile: true,
            connected: true,
            syncMode: "file",
            fileName: fileHandle.name || "focustube-data.json",
            lastResult: "unknown",
            lastSyncAt: 0,
          }
        : null;
    }
    renderStatus(status);
    return status;
  }

  // Live status updates while the page is open.
  try {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.syncStatus) {
        // newValue is undefined when the key is cleared (e.g. settings reset).
        renderStatus(changes.syncStatus.newValue || null);
      }
    });
  } catch (_) {
    /* chrome.storage unavailable (e.g. stale context) — status refreshes on action */
  }

  /**
   * One-time history import after a folder is picked: every focustube-*.json
   * already in the folder (previous months, or the current month written by
   * another browser) is merged into local storage. The merge is max-based
   * and idempotent, so re-reading the current month file is harmless.
   */
  async function importFolderHistory(dirHandle) {
    let imported = 0;
    let skipped = 0;
    try {
      for await (const entry of dirHandle.values()) {
        if (imported + skipped >= HISTORY_IMPORT_MAX_FILES) break;
        if (entry.kind !== "file" || !MONTH_FILE_RE.test(entry.name)) continue;
        try {
          const file = await entry.getFile();
          if (file.size > HISTORY_IMPORT_MAX_BYTES) {
            skipped += 1;
            continue;
          }
          const text = await file.text();
          if (!text.trim()) {
            skipped += 1;
            continue;
          }
          const payload = JSON.parse(text);
          if (!payload || typeof payload !== "object") {
            skipped += 1;
            continue;
          }
          const resp = await send("syncApplyImportedPayload", { payload });
          if (resp?.success) imported += 1;
          else skipped += 1;
        } catch (_) {
          skipped += 1;
        }
      }
    } catch (_) {
      /* entry iteration unsupported — history import stays best-effort */
    }
    return { imported, skipped };
  }

  async function requestHandlePermission(handle) {
    try {
      if (typeof handle.queryPermission === "function") {
        const perm = await handle.queryPermission({ mode: "readwrite" });
        if (perm === "granted") return true;
      }
      if (typeof handle.requestPermission === "function") {
        const granted = await handle.requestPermission({ mode: "readwrite" });
        return granted === "granted";
      }
    } catch (_) {
      /* fall through */
    }
    return false;
  }

  async function finishConnection(reason) {
    let resp = null;
    try {
      resp = await send("syncNow", { reason });
    } catch (_) {}
    try {
      await refreshStatus();
    } catch (_) {}
    if (resp?.result?.success) {
      window.location.reload(); // show the freshly merged data
    }
  }

  if (pickBtn) {
    pickBtn.addEventListener("click", async () => {
      // Reconnect path (monthly folder): a stored directory handle just
      // needs permission re-granted.
      const dir = await getStored(SYNC_DIR_KEY);
      if (dir && dir.queryPermission) {
        const perm = await requestHandlePermission(dir).catch(() => false);
        if (perm) {
          await finishConnection("reconnected");
          return;
        }
        // Permission denied or prompt unavailable → fall through to a fresh pick.
      }

      // Reconnect path (legacy single file).
      const existing = await getStored(SYNC_HANDLE_KEY);
      if (existing && existing.queryPermission) {
        const perm = await requestHandlePermission(existing).catch(() => false);
        if (perm) {
          await finishConnection("reconnected");
          return;
        }
      }

      if (!supportsDir && !supportsFSA) return;

      // Preferred: MONTHLY FOLDER mode (v1.16.0).
      if (supportsDir) {
        try {
          const dirHandle = await window.showDirectoryPicker({
            id: "focustube-sync",
            mode: "readwrite",
            startIn: "documents",
          });
          await putStored(SYNC_DIR_KEY, dirHandle);
          // Drop any legacy single-file handle — the folder replaces it.
          if (existing) {
            try {
              await idbOp("readwrite", (s) => s.delete(SYNC_HANDLE_KEY));
            } catch (_) {}
          }

          if (detail) {
            detail.textContent = `Checking "${dirHandle.name}" for previous monthly files…`;
          }
          const { imported } = await importFolderHistory(dirHandle);
          if (detail && imported > 0) {
            detail.textContent = `Restored ${imported} monthly file${imported === 1 ? "" : "s"} into this browser. Syncing…`;
          }
          await finishConnection("picked");
        } catch (err) {
          if (err?.name !== "AbortError" && detail) {
            detail.textContent = `Could not use that folder: ${err?.message || err}`;
          }
        }
        return;
      }

      // Fallback: classic single-file mode.
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "focustube-data.json",
          types: [
            {
              description: "FocusTube sync data",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        await putStored(SYNC_HANDLE_KEY, handle);
        // The file is stored from this point — a transient messaging
        // failure here is NOT "could not use that file"; the periodic
        // background sync will pick it up.
        await finishConnection("picked");
      } catch (err) {
        if (err?.name !== "AbortError" && detail) {
          detail.textContent = `Could not use that file: ${err?.message || err}`;
        }
      }
    });
  }

  if (nowBtn) {
    nowBtn.addEventListener("click", async () => {
      nowBtn.disabled = true;
      const resp = await send("syncNow", { reason: "manual" });
      nowBtn.disabled = false;
      await refreshStatus();
      if (resp?.result?.success) {
        window.location.reload();
      }
    });
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", async () => {
      await send("syncDisconnect");
      await refreshStatus();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      const resp = await send("syncGetPayload");
      if (!resp?.success || !resp.payload) {
        detail.textContent = "Export failed — could not read local data.";
        return;
      }
      // v1.16.0 — monthly naming: focustube-<Month>-<Year>.json containing
      // that month's daily data (config rides along). Small, self-contained
      // archive files instead of one file that grows forever.
      const name = monthFileName();
      const payload = filterPayloadDaysToMonth(resp.payload, monthKey());
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      detail.textContent = `Downloaded “${name}” to your Downloads folder. On the other browser's FocusTube dashboard, click “Import data file” and select it (repeat for other months' files if you want their history too).`;
    });
  }

  if (importInput) {
    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      try {
        const text = (await file.text()) || "";

        // Empty files are the most common failure: either a sync file that
        // was created but never written to (e.g. sync not running yet), or
        // a new filename typed into the picker. Give an actionable reason.
        if (!text.trim()) {
          detail.textContent =
            `“${file.name}” is empty. On a browser where you have data, click “Sync now” (or “Export data file”) first, then import the file it writes.`;
          return;
        }

        let payload;
        try {
          payload = JSON.parse(text);
        } catch (_) {
          detail.textContent =
            `“${file.name}” is not valid JSON. Use a focustube-<Month>-<Year>.json file produced by “Export data file” (or by a successful sync).`;
          return;
        }

        const looksLikeFocusTube =
          payload &&
          typeof payload === "object" &&
          ("lifetime" in payload ||
            "analyticsDaily" in payload ||
            "timeUsage" in payload ||
            "timeLimits" in payload ||
            "blockedSites" in payload);
        if (!looksLikeFocusTube) {
          detail.textContent =
            `“${file.name}” is valid JSON but not FocusTube data (expected stats/limits fields).`;
          return;
        }

        const resp = await send("syncApplyImportedPayload", { payload });
        if (resp?.success) {
          detail.textContent = "Imported — refreshing dashboard…";
          setTimeout(() => window.location.reload(), 700);
        } else {
          detail.textContent =
            "Import failed — the data could not be merged. Export again from the source browser and retry.";
        }
      } catch (err) {
        detail.textContent = `Import failed: ${err?.message || err}`;
      } finally {
        importInput.value = "";
      }
    });
  }

  refreshStatus();
})();
