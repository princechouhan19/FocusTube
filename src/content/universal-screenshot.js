(function () {
  "use strict";

  // State to prevent duplicate triggers
  let isCapturing = false;
  let shortcutsEnabled = true;
  let floatingToolbarEnabled = false;
  let isRecording = false;
  let toolbarElement = null;

  /**
   * Initialize the screenshot listener
   */
  function init() {
    console.log(
      "[FocusTube] Initializing universal script on:",
      window.location.href,
    );

    // Load initial settings
    chrome.storage.sync.get(
      ["shortcutsEnabled", "floatingToolbarEnabled"],
      (res) => {
        console.log("[FocusTube] Settings loaded:", res);
        if (res.hasOwnProperty("shortcutsEnabled")) {
          shortcutsEnabled = res.shortcutsEnabled;
        }
        if (res.hasOwnProperty("floatingToolbarEnabled")) {
          floatingToolbarEnabled = res.floatingToolbarEnabled;
          updateFloatingToolbar();
        }
      },
    );

    // Initial recording status
    chrome.runtime.sendMessage({ action: "getRecordingStatus" }, (res) => {
      if (res && res.isRecording) {
        isRecording = true;
        updateToolbarRecordingState();
      }
    });

    window.addEventListener("keydown", handleKeydown, true);

    // Also listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "captureVideoFrame") {
        captureVideoFrame().then(sendResponse);
        return true;
      }
      if (message.action === "reloadSettings") {
        chrome.storage.sync.get(
          ["shortcutsEnabled", "floatingToolbarEnabled"],
          (res) => {
            if (res.hasOwnProperty("shortcutsEnabled")) {
              shortcutsEnabled = res.shortcutsEnabled;
            }
            if (res.hasOwnProperty("floatingToolbarEnabled")) {
              floatingToolbarEnabled = res.floatingToolbarEnabled;
              updateFloatingToolbar();
            }
          },
        );
      }
      if (message.action === "recordingStopped") {
        isRecording = false;
        updateToolbarRecordingState();
      }
      if (message.action === "startRecording") {
        isRecording = true;
        updateToolbarRecordingState();
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (toolbarElement) {
        const target = document.fullscreenElement || document.body;
        target.appendChild(toolbarElement);
      }
    });

    console.log(
      "[FocusTube] Universal shortcut listener active (C/Ctrl+S fully guarded)",
    );
  }

  function updateFloatingToolbar() {
    if (floatingToolbarEnabled) {
      if (!toolbarElement) createFloatingToolbar();

      const target = document.fullscreenElement || document.body;
      if (target) {
        if (toolbarElement.parentElement !== target) {
          target.appendChild(toolbarElement);
          console.log(
            "[FocusTube] Floating toolbar attached to",
            target.tagName,
          );
        }
      } else {
        // Retry when body is ready
        setTimeout(updateFloatingToolbar, 500);
      }
    } else {
      if (toolbarElement) {
        toolbarElement.remove();
        toolbarElement = null;
      }
    }
  }

  function createFloatingToolbar() {
    if (toolbarElement) return;

    toolbarElement = document.createElement("div");
    toolbarElement.id = "focustube-floating-toolbar";

    Object.assign(toolbarElement.style, {
      position: "fixed",
      top: "100px",
      right: "20px",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      padding: "8px",
      borderRadius: "16px",
      backgroundColor: "rgba(15, 23, 42, 0.8)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
      transition: "transform 0.2s ease, opacity 0.3s ease",
      cursor: "grab",
      userSelect: "none",
      touchAction: "none",
      opacity: "0.5",
    });

    toolbarElement.onmouseenter = () => (toolbarElement.style.opacity = "1");
    toolbarElement.onmouseleave = () => {
      if (!isDragging) toolbarElement.style.opacity = "0.5";
    };

    const handle = document.createElement("div");
    handle.innerHTML = "⠿";
    Object.assign(handle.style, {
      textAlign: "center",
      color: "rgba(255,255,255,0.4)",
      fontSize: "12px",
      pointerEvents: "none",
    });
    toolbarElement.appendChild(handle);

    const createBtn = (id, icon, title, color) => {
      const btn = document.createElement("button");
      btn.id = id;
      btn.innerHTML = icon;
      btn.title = title;
      Object.assign(btn.style, {
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        border: "none",
        backgroundColor: color,
        color: "white",
        fontSize: "18px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      });
      btn.onmouseover = () => (btn.style.transform = "scale(1.1)");
      btn.onmouseout = () => (btn.style.transform = "scale(1)");
      return btn;
    };

    const ssBtn = createBtn(
      "ft-ss-btn",
      "📸",
      "Take Screenshot (Ctrl+S)",
      "#10b981",
    );
    const recBtn = createBtn(
      "ft-rec-btn",
      "🔴",
      "Toggle Recording (R)",
      "#ef4444",
    );

    ssBtn.onclick = (e) => {
      e.stopPropagation();
      triggerScreenshot();
    };

    recBtn.onclick = (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: "toggleRecording" }, (res) => {
        if (res && res.success) {
          isRecording = res.isRecording;
          updateToolbarRecordingState();
        }
      });
    };

    toolbarElement.appendChild(ssBtn);
    toolbarElement.appendChild(recBtn);

    // Dragging Logic
    let isDragging = false;
    let offsetTop, offsetRight;

    toolbarElement.onpointerdown = (e) => {
      isDragging = true;
      toolbarElement.style.cursor = "grabbing";
      offsetTop = e.clientY - toolbarElement.getBoundingClientRect().top;
      offsetRight =
        window.innerWidth -
        e.clientX -
        (window.innerWidth - toolbarElement.getBoundingClientRect().right);
      toolbarElement.setPointerCapture(e.pointerId);
    };

    toolbarElement.onpointermove = (e) => {
      if (!isDragging) return;

      const top = e.clientY - offsetTop;
      const right =
        window.innerWidth -
        e.clientX -
        (window.innerWidth -
          toolbarElement.getBoundingClientRect().right +
          offsetRight); // Complex but maintains relative position

      // Simple absolute positioning
      const x = window.innerWidth - e.clientX - 20; // 20 is half width approx
      const y = e.clientY - 20;

      toolbarElement.style.top = `${Math.max(10, Math.min(window.innerHeight - 100, e.clientY - offsetTop))}px`;
      toolbarElement.style.right = `${Math.max(10, Math.min(window.innerWidth - 60, window.innerWidth - e.clientX - 40))}px`;
    };

    toolbarElement.onpointerup = (e) => {
      isDragging = false;
      toolbarElement.style.cursor = "grab";
    };

    const target = document.fullscreenElement || document.body;
    if (target) {
      target.appendChild(toolbarElement);
      console.log("[FocusTube] Toolbar created and appended successfully");
    }

    // Secondary Observer to ensure it stays in the DOM
    const observer = new MutationObserver(() => {
      if (
        floatingToolbarEnabled &&
        toolbarElement &&
        !toolbarElement.parentElement
      ) {
        updateFloatingToolbar();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Safety check every 3s
    setInterval(updateFloatingToolbar, 3000);
  }

  function updateToolbarRecordingState() {
    const recBtn = document.getElementById("ft-rec-btn");
    if (!recBtn) return;

    if (isRecording) {
      recBtn.innerHTML = "⏹";
      recBtn.style.backgroundColor = "#4b5563";
      recBtn.title = "Stop Recording";
    } else {
      recBtn.innerHTML = "🔴";
      recBtn.style.backgroundColor = "#ef4444";
      recBtn.title = "Start Recording (R)";
    }
  }

  /**
   * Handle keydown events
   */
  function handleKeydown(event) {
    if (!shortcutsEnabled) return;

    // Skip if user is typing in an input
    const activeElement = document.activeElement;
    const isInput =
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable ||
        activeElement.getAttribute("role") === "textbox");

    if (isInput) return;

    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const isCtrlPressed = isMac ? event.metaKey : event.ctrlKey;
    const key = event.key.toLowerCase();

    // Screenshot: C or Ctrl+S
    if (key === "c" || (key === "s" && isCtrlPressed)) {
      console.log("[FocusTube] Shortcut detected, blocking default:", key);
      // Logic for capture
      if (
        key === "c" &&
        isCtrlPressed &&
        window.getSelection().toString().length > 0
      ) {
        return; // Allow normal copy
      }

      event.preventDefault();
      event.stopPropagation();
      console.log("[FocusTube] Shortcut triggered screenshot...");
      triggerScreenshot();
      return;
    }

    // Recording: R
    if (key === "r" && !isCtrlPressed && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage({ action: "toggleRecording" });
      return;
    }
  }

  /**
   * Trigger the screenshot process
   */
  function triggerScreenshot() {
    if (isCapturing) {
      console.warn("[FocusTube] Screenshot capture already in progress");
      return;
    }
    isCapturing = true;

    // Safety timeout: reset isCapturing after 10 seconds in case of failure
    const safetyTimeout = setTimeout(() => {
      if (isCapturing) {
        console.warn("[FocusTube] Screenshot safety timeout reached");
        isCapturing = false;
      }
    }, 10000);

    console.log("[FocusTube] Starting capture workflow...");
    showVisualFeedback("Capturing...");

    // 1. Try local frame capture
    captureVideoFrame()
      .then((response) => {
        if (response && response.success && response.dataUrl) {
          console.log(
            "[FocusTube] Frame captured locally, sending for download",
          );
          chrome.runtime.sendMessage(
            {
              action: "captureScreenshot",
              dataUrl: response.dataUrl,
            },
            (res) => {
              clearTimeout(safetyTimeout);
              isCapturing = false;
              handleResponse(res);
            },
          );
        } else {
          console.log(
            "[FocusTube] Local frame capture unavailable, requesting full viewport capture",
          );
          // 2. Fallback to background capture visible tab
          chrome.runtime.sendMessage({ action: "captureScreenshot" }, (res) => {
            clearTimeout(safetyTimeout);
            isCapturing = false;
            handleResponse(res);
          });
        }
      })
      .catch((err) => {
        console.error("[FocusTube] Local capture exception:", err);
        chrome.runtime.sendMessage({ action: "captureScreenshot" }, (res) => {
          clearTimeout(safetyTimeout);
          isCapturing = false;
          handleResponse(res);
        });
      });
  }

  /**
   * Internal handler for capture response
   */
  function handleResponse(response) {
    if (response && response.success) {
      showVisualFeedback("Screenshot Saved!", "success");
    } else {
      const errorMsg = response ? response.error : "Unknown error";
      console.error("[FocusTube] Screenshot failed:", errorMsg);
      showVisualFeedback("Capture Failed", "error");
    }
  }

  /**
   * Attempt to capture the current video frame using Canvas
   */
  async function captureVideoFrame() {
    try {
      // Find the best video element (search main document and shadow DOM)
      const findVideos = (root, list = []) => {
        const found = root.querySelectorAll("video");
        found.forEach((v) => list.push(v));

        const children = root.querySelectorAll("*");
        for (let child of children) {
          if (child.shadowRoot) findVideos(child.shadowRoot, list);
        }
        return list;
      };

      const videos = findVideos(document);
      let video = null;

      if (videos.length === 1) {
        video = videos[0];
      } else if (videos.length > 1) {
        // Find the most visible/largest video
        video = videos.sort((a, b) => {
          const areaA = a.offsetWidth * a.offsetHeight;
          const areaB = b.offsetWidth * b.offsetHeight;
          return areaB - areaA;
        })[0];
      }

      if (!video) {
        // If still no video found, check for iframes - we can't capture their frame via canvas
        // if cross-origin, but we can at least log what's happening
        const iframes = document.querySelectorAll("iframe");
        if (iframes.length > 0) {
          console.log(
            "[FocusTube] No video found in main document, but iframes exist. Fallback to viewport capture.",
          );
          return { success: false, reason: "iframes-only" };
        }
        console.log(
          "[FocusTube] No active video element found for frame capture",
        );
        return { success: false };
      }

      if (video.readyState < 2) {
        console.log("[FocusTube] Video element found but not ready");
        return { success: false };
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || video.offsetWidth;
      canvas.height = video.videoHeight || video.offsetHeight;

      const ctx = canvas.getContext("2d");
      // Set white background in case of transparency
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (e) {
        console.warn(
          "[FocusTube] Canvas tainted (security error), falling back",
        );
        return { success: false, error: "Tainted canvas" };
      }

      const dataUrl = canvas.toDataURL("image/png");
      return { success: true, dataUrl };
    } catch (error) {
      console.warn("[FocusTube] Video capture exception:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Show a temporary toast notification
   */
  function showVisualFeedback(message, type = "info") {
    const existing = document.getElementById("focustube-screenshot-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "focustube-screenshot-toast";

    Object.assign(toast.style, {
      position: "fixed",
      bottom: "30px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "12px 24px",
      borderRadius: "12px",
      backgroundColor:
        type === "success"
          ? "#10b981"
          : type === "error"
            ? "#ef4444"
            : "#1f2937",
      color: "white",
      fontSize: "14px",
      fontWeight: "600",
      zIndex: "2147483647",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      pointerEvents: "none",
      opacity: "0",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    });

    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.bottom = "40px";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.bottom = "30px";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Self-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
