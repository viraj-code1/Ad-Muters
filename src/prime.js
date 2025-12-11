// Amazon Prime Ad Muter Logic

const AP_SELECTORS = {
    // Prime Video is also complex. 
    // Selectors for ad UI elements:
    adMarker: '.adMarker',
    skipButton: '.atvwebplayersdk-ad-skip-button, .adSkipButton, .f1o51m5e-atv-interactive-ads-container',
    timeLeft: '.atvwebplayersdk-ad-time-left',
    video: 'video'
};

async function initPrimeMuter() {
    const isEnabled = await Utils.isExtensionEnabled();

    chrome.storage.local.get(['prime', 'autoskip'], (result) => {
        if (result.prime !== false) {
            Utils.log("Prime Muter Initialized");
            startObservingAP(result.autoskip !== false);
        } else {
            Utils.log("Prime Muter Disabled via Settings");
        }
    });
}

function startObservingAP(autoSkipEnabled) {
    setInterval(() => checkForAdsAP(autoSkipEnabled), 800);
}

function checkForAdsAP(autoSkipEnabled = true) {
    const video = document.querySelector('video');
    if (!video) return;

    // Check for ad-specific UI elements
    const skipBtn = document.querySelector(AP_SELECTORS.skipButton);
    const timeLeft = document.querySelector(AP_SELECTORS.timeLeft);

    // sometimes "Skip" text query is useful
    // const skipByText = Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'Skip');

    const isAdShowing = !!skipBtn || !!timeLeft;

    if (isAdShowing) {
        if (!video.muted) {
            Utils.log("Prime Ad detected! Muting...");
            Utils.mute(video);
        }

        // Auto-skip logic
        if (autoSkipEnabled && skipBtn) {
            Utils.log("Prime Skip button found. Clicking...");
            skipBtn.click();
            Utils.log("Prime ad skipped.");
        }
    } else {
        if (video.muted) {
            Utils.log("Prime Ad ended. Unmuting...");
            Utils.unmute(video);
        }
    }
}

initPrimeMuter();
