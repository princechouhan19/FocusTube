/**
 * Cross-Browser Data Sync UI
 *
 * Page-side companion to the background file-sync engine. The File System
 * Access API requires a document context (and a user gesture) to show the
 * file picker, so the handle is chosen HERE and persisted in IndexedDB,
 * where the background service worker picks it up for its periodic
 * read → merge → write cycles.
 *
 * Browsers without the File System Access API (e.g. Firefox) keep the
 * Export / Import buttons as a manual fallback that produces and consumes
 * the exact same JSON format.
 */

(() => {
  // Must match the constants in src/background/background.js.
  const SYNC_DB_NAME = "focustube-file-sync";
  const SYNC_DB_VERSION = 1;
  const SYNC_STORE = "handles";
  const SYNC_HANDLE_KEY = "dataFile";

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

  if (!supportsFSA) {
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

  const getStoredHandle = () =>
    idbOp("readonly", (s) => s.get(SYNC_HANDLE_KEY)).catch(() => null);
  const putStoredHandle = (handle) =>
    idbOp("readwrite", (s) => s.put(handle, SYNC_HANDLE_KEY));

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
      detail.textContent = supportsFSA
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

    if (hasFile && status.needsPermission) {
      badge.classList.add("warn");
      badge.textContent = "Reconnect needed";
      detail.textContent = `Access to "${status.fileName}" was revoked by the browser. Click "Choose data file…" and pick the same file again.`;
      if (status.pendingChanges) detail.textContent += pendingDetail;
      return;
    }

    if (hasFile && status.lastResult === "unknown") {
      badge.classList.add("on");
      badge.textContent = "Connected";
      detail.textContent = `Shared file: ${status.fileName}. The background service worker couldn't be reached just now — it will sync within a minute. If this message persists, reload the extension.`;
      return;
    }

    if (hasFile && status.lastResult === "error") {
      badge.classList.add("warn");
      badge.textContent = "Sync error";
      detail.textContent = `Last sync failed: ${status.lastError || "unknown error"} (file: ${status.fileName}). Make sure the file isn't open in another program.`;
      return;
    }

    if (hasFile) {
      badge.classList.add("on");
      const kb = status.fileBytes
        ? `${Math.max(1, Math.round(status.fileBytes / 1024))} KB`
        : "";
      badge.textContent = `Syncing · ${timeAgo(status.lastSyncAt)}${kb ? ` · ${kb}` : ""}`;
      detail.textContent = `Shared file: ${status.fileName}. Last write ${timeAgo(
        status.lastWriteAt || status.lastSyncAt,
      )}${kb ? ` (${kb})` : ""}. Every browser using this same file shows the same dashboard and limits.${pendingDetail}`;
      return;
    }

    badge.classList.add("off");
    badge.textContent = status.pendingChanges ? "Saved locally" : "Not set up";
    detail.textContent = supportsFSA
      ? status.pendingChanges
        ? `Your data is safely saved in this browser.${pendingDetail} Choose a data file to sync it whenever you are ready.`
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
      // file is never reported as "not set up".
      const handle = await getStoredHandle().catch(() => null);
      status = handle
        ? {
            hasFile: true,
            connected: true,
            fileName: handle.name || "focustube-data.json",
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

  if (pickBtn) {
    pickBtn.addEventListener("click", async () => {
      // Reconnect path: a stored handle just needs permission re-granted.
      const existing = await getStoredHandle();
      if (existing && existing.queryPermission) {
        try {
          const perm = await existing.queryPermission({ mode: "readwrite" });
          if (perm !== "granted") {
            const granted = await existing.requestPermission({
              mode: "readwrite",
            });
            if (granted === "granted") {
              await send("syncNow", { reason: "reconnected" });
              await refreshStatus();
              return;
            }
          } else {
            await send("syncNow", { reason: "reconnected" });
            await refreshStatus();
            return;
          }
        } catch (_) {
          /* fall through to a fresh pick */
        }
      }

      if (!supportsFSA) return;
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
        await putStoredHandle(handle);

        // The file is stored from this point — a transient messaging
        // failure here is NOT "could not use that file"; the periodic
        // background sync will pick it up.
        let resp = null;
        try {
          resp = await send("syncNow", { reason: "picked" });
        } catch (_) {}
        try {
          await refreshStatus();
        } catch (_) {}
        if (resp?.result?.success) {
          window.location.reload(); // show the freshly merged data
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
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
      const blob = new Blob([JSON.stringify(resp.payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "focustube-data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      detail.textContent =
        "Downloaded “focustube-data.json” to your Downloads folder. On the other browser's FocusTube dashboard, click “Import data file” and select it.";
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
            `“${file.name}” is not valid JSON. Use the focustube-data.json produced by “Export data file” (or by a successful sync).`;
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
