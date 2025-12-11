// Amazon Prime Ad Muter Logic

const AP_SELECTORS = {
    // Prime Video is also complex. 
    // Selectors for ad UI elements:
    adMarker: '.adMarker',
    skipButton: '.atvwebplayersdk-ad-skip-button, .adSkipButton',
    timeLeft: '.atvwebplayersdk-ad-time-left',
    video: 'video'
};

async function initPrimeMuter() {
    const isEnabled = await Utils.isExtensionEnabled();

    chrome.storage.local.get(['prime'], (result) => {
        if (result.prime !== false) {
            Utils.log("Prime Muter Initialized");
            startObservingAP();
        } else {
            Utils.log("Prime Muter Disabled via Settings");
        }
    });
}

function startObservingAP() {
    setInterval(checkForAdsAP, 1000);
}

function checkForAdsAP() {
    const video = document.querySelector('video');
    if (!video) return;

    // Check for ad-specific UI elements
    const skipBtn = document.querySelector(AP_SELECTORS.skipButton);
    const timeLeft = document.querySelector(AP_SELECTORS.timeLeft);

    // Sometimes Prime changes the class names but keeps structure.
    // We can look for text "Skip" or "Ad" in elements overlapping the video.

    const isAdShowing = !!skipBtn || !!timeLeft;

    if (isAdShowing) {
        if (!video.muted) {
            Utils.log("Prime Ad detected! Muting...");
            Utils.mute(video);
        }

        // Auto-skip logic
        if (skipBtn) {
            Utils.log("Prime Skip button found. Clicking...");
            skipBtn.click();
        }
    } else {
        if (video.muted) {
            Utils.log("Prime Ad ended. Unmuting...");
            Utils.unmute(video);
        }
    }
}

initPrimeMuter();
