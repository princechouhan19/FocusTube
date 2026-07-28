/**
 * Offscreen Script for Recording
 * Handles MediaRecorder for tab capture
 */

let recorder;
let mediaStream;
let data = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen") {
    return false;
  }

  if (message.action === "startRecording") {
    startRecording(message.streamId, message.tabTitle).then(sendResponse);
    return true;
  }

  if (message.action === "stopRecording") {
    stopRecording().then(sendResponse);
    return true;
  }

  return false;
});

async function startRecording(streamId, tabTitle) {
  if (recorder && recorder.state === "recording") {
    return { success: true, alreadyRecording: true };
  }

  try {
    console.log("[FocusTube] Offscreen: Starting recording with streamId:", streamId);
    
    // Use tabCapture streamId with getUserMedia (not getDisplayMedia)
    // getDisplayMedia doesn't support chromeMediaSource constraints
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSourceId: streamId,
          chromeMediaSource: "tab",
        },
      },
      video: {
        mandatory: {
          chromeMediaSourceId: streamId,
          chromeMediaSource: "tab",
        },
      },
    });

    console.log("[FocusTube] Offscreen: Media stream acquired, audio tracks:", mediaStream.getAudioTracks().length);
    console.log("[FocusTube] Offscreen: Media stream acquired, video tracks:", mediaStream.getVideoTracks().length);

    const mimeType = getSupportedMimeType();
    recorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);
    data = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        data.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (data.length === 0) {
        console.error("[FocusTube] No recording data captured");
        cleanupRecorder();
        chrome.runtime.sendMessage({ 
          action: "recordingStopped", 
          error: "No data recorded" 
        });
        return;
      }

      // Use the same mime type the recorder was initialized with, if any.
      const blobType =
        (recorder && recorder.mimeType) ||
        "video/webm;codecs=vp9,opus";
      const blob = new Blob(data, { type: blobType });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `FocusTube-Recording-${timestamp}.webm`;
      cleanupRecorder();

      console.log(`[FocusTube] Starting download: ${filename}, size: ${blob.size} bytes`);

      chrome.downloads.download(
        {
          url: url,
          filename: `Downloads/${filename}`,
          saveAs: true,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("[FocusTube] Download error:", chrome.runtime.lastError);
          } else {
            console.log(`[FocusTube] Recording saved successfully (ID: ${downloadId})`);
          }
          // Give Chrome a moment to copy the blob URL into the download
          // queue before we revoke it. 30s is generous and avoids
          // "NET_FAILED" download errors on large recordings.
          setTimeout(() => URL.revokeObjectURL(url), 30000);
          chrome.runtime.sendMessage({ action: "recordingStopped" }).catch(() => {});
        },
      );
    };

    recorder.onerror = (event) => {
      chrome.runtime.sendMessage({
        action: "recordingStopped",
        error: event.error?.message || "Recording failed",
      });
      cleanupRecorder();
    };

    // Pass a 1-second timeslice so we get periodic `dataavailable` events.
    // If the recorder crashes mid-recording or the tab is closed, we still
    // get partial data instead of losing everything.
    recorder.start(1000);
    console.log("[FocusTube] Recording started in offscreen document");
    return { success: true };
  } catch (err) {
    console.error("[FocusTube] Failed to start recording:", err);
    cleanupRecorder();
    chrome.runtime.sendMessage({
      action: "recordingStopped",
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

async function stopRecording() {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    return { success: true };
  }

  return { success: false, error: "No active recording" };
}

function cleanupRecorder() {
  data = [];
  recorder = null;

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}

function getSupportedMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264,opus",
    "video/webm",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}
