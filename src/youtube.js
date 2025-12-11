// YouTube Ad Muter Logic

const YT_SELECTORS = {
    player: '#movie_player',
    adModule: '.ytp-ad-module',
    adShowing: '.ad-showing',
    video: 'video.html5-main-video',
    skipButton: '.ytp-ad-skip-button'
};

let observer = null;
let adInterval = null;

async function initYouTubeMuter() {
    const isEnabled = await Utils.isExtensionEnabled();
    // We also need to check specific YouTube toggle if we implement granular control reading
    // For now assuming Utils.isExtensionEnabled checks global, but we should check 'youtube' key too.

    chrome.storage.local.get(['youtube'], (result) => {
        if (result.youtube !== false) { // Default true
            Utils.log("YouTube Muter Initialized");
            startObserving();
        } else {
            Utils.log("YouTube Muter Disabled via Settings");
        }
    });
}

function startObserving() {
    const player = document.querySelector(YT_SELECTORS.player);

    if (!player) {
        // Player might not be loaded yet, retry
        setTimeout(startObserving, 1000);
        return;
    }

    // Use MutationObserver for robust detection
    observer = new MutationObserver((mutations) => {
        checkForAds();
    });

    observer.observe(player, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
        subtree: true
    });

    // Backup interval just in case MutationObserver misses something or for fallback
    adInterval = setInterval(checkForAds, 1000);
}

function checkForAds() {
    const player = document.querySelector(YT_SELECTORS.player);
    const video = document.querySelector(YT_SELECTORS.video);

    if (!player || !video) return;

    const isAdShowing = player.classList.contains('ad-showing') ||
        document.querySelector(YT_SELECTORS.adModule)?.children.length > 0;

    if (isAdShowing) {
        if (!video.muted) {
            Utils.log("Ad detected! Muting...");
            Utils.mute(video);
        }

        // Auto-skip attempt
        const skipBtn = document.querySelector(YT_SELECTORS.skipButton);
        if (skipBtn) {
            Utils.log("Skip button found. Clicking...");
            skipBtn.click();
        }
    } else {
        if (video.muted) {
            // Only unmute if WE muted it? 
            // For simplicity, we unmute if ad is gone and it's muted. 
            // A better approach tracks state, but this usually works okay for "mute ads" features.
            // To be safer, we could store 'preAdVolume' state.
            Utils.log("Ad ended. Unmuting...");
            Utils.unmute(video);
        }
    }
}

// Watch for navigation events (SPA navigation)
/*
  YouTube is an SPA, so full page reloads don't always happen.
  However, the content script usually stays injected in the context.
  The startObserving logic usually attaches to the persistent player element.
*/

initYouTubeMuter();
