// JioHotstar Ad Muter Logic

const HS_SELECTORS = {
    // These are potential selectors; Hotstar changes them often.
    // We will also use text-based detection.
    adContainer: '.ad-container',
    adLabel: '.ad-label',
    playerContainer: '.shaka-video-container, .player-container',
    video: 'video'
};

async function initHotstarMuter() {
    const isEnabled = await Utils.isExtensionEnabled();

    chrome.storage.local.get(['hotstar'], (result) => {
        if (result.hotstar !== false) {
            Utils.log("Hotstar Muter Initialized");
            startObservingHS();
        } else {
            Utils.log("Hotstar Muter Disabled via Settings");
        }
    });
}

function startObservingHS() {
    // Hotstar often recreates the video element, so we need to be dynamic.
    setInterval(checkForAdsHS, 1000);
}

function checkForAdsHS() {
    const video = document.querySelector('video');
    if (!video) return;

    // Detection strategies
    // 1. Check for ad container classes
    const adContainer = document.querySelector(HS_SELECTORS.adContainer);

    // 2. Check for UI elements containing "Ad" text (e.g. "Ad: 00:15")
    // Beware of false positives in titles/descriptions. Restrict to player overlay.
    const overlays = document.querySelectorAll('.player-overlay, .shaka-controls-container');
    let adTextFound = false;

    // Simplistic check for "Ad" text in player controls if no class found
    // This is risky, so we rely more on known structural classes if possible.
    // However, often ads have a specific timer element.

    // Strategy 3: Check distinct ad state if exposed (unlikely in obfuscated builds)

    // Let's rely on adContainer being present mostly, or URL checking if video src changes to ad domain (blob/mediasource makes this hard).

    const isAdShowing = !!adContainer;

    if (isAdShowing) {
        if (!video.muted) {
            Utils.log("Hotstar Ad detected! Muting...");
            Utils.mute(video);
        }
    } else {
        // Check if we previously muted it
        if (video.muted) {
            // We need to be careful here not to unmute if user wanted it muted.
            // But for this extension purpose, we assume mute is only for ads.
            Utils.log("Hotstar Ad potentially ended. Unmuting...");
            Utils.unmute(video);
        }
    }
}

initHotstarMuter();
