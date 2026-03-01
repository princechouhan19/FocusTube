/**
 * Offscreen Script for Recording
 * Handles MediaRecorder for tab capture
 */

let recorder;
let data = [];

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.action === "startRecording") {
    startRecording(message.streamId, message.tabTitle);
  } else if (message.action === "stopRecording") {
    stopRecording();
  }
});

async function startRecording(streamId, tabTitle) {
  if (recorder && recorder.state === "recording") {
    return;
  }

  try {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });

    // Use webm; standard for Chrome
    recorder = new MediaRecorder(media, {
      mimeType: "video/webm;codecs=vp9,opus",
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        data.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(data, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `FocusTube-Recording-${timestamp}.webm`;

      chrome.downloads.download(
        {
          url: url,
          filename: filename,
          saveAs: false,
        },
        () => {
          // Cleanup
          URL.revokeObjectURL(url);
          data = [];
          media.getTracks().forEach((t) => t.stop());
          chrome.runtime.sendMessage({ action: "recordingStopped" });

          // Finalize offscreen document shutdown
          setTimeout(() => {
            // Offscreen document will close itself or be closed by background
          }, 100);
        },
      );
    };

    recorder.start();
    console.log("[FocusTube] Recording started in offscreen document");
  } catch (err) {
    console.error("[FocusTube] Failed to start recording:", err);
    chrome.runtime.sendMessage({
      action: "recordingStopped",
      error: err.message,
    });
  }
}

function stopRecording() {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
  }
}
