// Shared utility functions

const Utils = {
  log: (msg) => {
    console.log(`[Ad-Muter] ${msg}`);
  },
  
  mute: (videoElement) => {
    if (videoElement && !videoElement.muted) {
      Utils.log("Muting video...");
      videoElement.muted = true;
    }
  },
  
  unmute: (videoElement) => {
    if (videoElement && videoElement.muted) {
      Utils.log("Unmuting video...");
      videoElement.muted = false;
    }
  },
  
  isExtensionEnabled: async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['enabled'], (result) => {
        resolve(result.enabled !== false); // Default to true
      });
    });
  }
};
