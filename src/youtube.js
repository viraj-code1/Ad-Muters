(() => {
    // YouTube Ad Muter Logic (Refactored)

    const YT_SELECTORS = {
        player: '#movie_player',
        adModule: '.ytp-ad-module',
        adShowing: '.ad-showing',
        video: 'video.html5-main-video',
        skipButton: '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .videoAdUiSkipButton, .ytp-skip-ad-button',
        overlay: '.ytp-ad-overlay-close-button',
        adSlot: '.ytp-ad-module'
    };

    const CONSTANTS = {
        AD_SPEED: 16.0,
        NORMAL_SPEED: 1.0,
        SPEED_THRESHOLD: 2.0,
        CHECK_INTERVAL: 1000,
        THROTTLE_MS: 50,
        INIT_RETRY: 1000
    };

    // State
    let state = {
        enabled: true,
        autoSkip: true,
        observer: null,
        interval: null
    };

    async function init() {
        // Initial Settings Load
        const result = await new Promise(resolve => {
            chrome.storage.local.get(['youtube', 'autoskip'], resolve);
        });

        state.enabled = result.youtube !== false; // Default true
        state.autoSkip = result.autoskip !== false; // Default true

        Utils.log(`YouTube Muter Initialized. Enabled: ${state.enabled}, AutoSkip: ${state.autoSkip}`);

        if (state.enabled) {
            startObserving();
        }

        // Dynamic Settings Listener
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'local') return;

            if (changes.youtube) {
                state.enabled = changes.youtube.newValue !== false;
                Utils.log(`YouTube Enabled Changed: ${state.enabled}`);
                toggleSystem();
            }

            if (changes.autoskip) {
                state.autoSkip = changes.autoskip.newValue !== false;
                Utils.log(`AutoSkip Changed: ${state.autoSkip}`);
            }
        });
    }

    function toggleSystem() {
        if (state.enabled) {
            startObserving();
        } else {
            stopObserving();
        }
    }

    function stopObserving() {
        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }
        if (state.interval) {
            clearInterval(state.interval);
            state.interval = null;
        }
        Utils.log("Monitoring stopped.");
    }

    function startObserving() {
        // Clean up previous instances first
        stopObserving();

        const player = document.querySelector(YT_SELECTORS.player);

        if (!player) {
            // Player not ready, retry shortly
            setTimeout(startObserving, CONSTANTS.INIT_RETRY);
            return;
        }

        // Mutation Observer
        let lastRun = 0;
        state.observer = new MutationObserver((mutations) => {
            const now = Date.now();
            if (now - lastRun > CONSTANTS.THROTTLE_MS) { // Max run every 50ms
                checkForAds();
                lastRun = now;
            }
        });

        state.observer.observe(player, {
            attributes: true,
            attributeFilter: ['class'],
            childList: true,
            subtree: true
        });

        // Backup Interval
        state.interval = setInterval(checkForAds, CONSTANTS.CHECK_INTERVAL);

        Utils.log("Monitoring started.");
    }

    function checkForAds() {
        if (!state.enabled) return;

        const player = document.querySelector(YT_SELECTORS.player);
        const video = document.querySelector(YT_SELECTORS.video);

        if (!player || !video) return;

        const isAdShowing = player.classList.contains('ad-showing') ||
            (document.querySelector(YT_SELECTORS.adModule)?.children.length > 0);

        if (isAdShowing) {
            handleAdStart(video);
        } else {
            handleAdEnd(video);
        }
    }

    function handleAdStart(video) {
        if (!video.muted) {
            Utils.log("Ad detected! Muting...");
            Utils.mute(video);
        }

        // Ad Speedup (16x) - Only log if we are actually changing it
        if (video.playbackRate < CONSTANTS.AD_SPEED) {
            // Utils.log("Speeding up ad to 16x..."); // Reduced log spam
            video.playbackRate = CONSTANTS.AD_SPEED;
        }

        if (state.autoSkip) {
            attemptSkip();
        }
    }

    function handleAdEnd(video) {
        if (video.muted) {
            Utils.log("Ad ended. Unmuting...");
            Utils.unmute(video);
        }

        // Restore Playback Speed
        if (video.playbackRate > CONSTANTS.SPEED_THRESHOLD) {
            // Utils.log("Restoring playback speed to 1x."); // Reduced log spam
            video.playbackRate = CONSTANTS.NORMAL_SPEED;
        }
    }

    function attemptSkip() {
        // Strategy 1: CSS Selectors
        let skipButtons = Array.from(document.querySelectorAll(YT_SELECTORS.skipButton));

        // Strategy 2: Text Content Fallback (generic robust check)
        if (skipButtons.length === 0) {
            const allButtons = document.querySelectorAll('button, div[role="button"]');
            for (const btn of allButtons) {
                if (btn.innerText && (btn.innerText.includes('Skip') || btn.innerText.includes('Skip Ad'))) {
                    skipButtons.push(btn);
                }
            }
        }

        const closeOverlay = document.querySelectorAll(YT_SELECTORS.overlay);

        // Click Skip Buttons
        if (skipButtons.length > 0) {
            for (const btn of skipButtons) {
                if (btn && (btn.offsetParent !== null || btn.style.display !== 'none')) { // Robust visibility check
                    Utils.log("Skip button found. Clicking...");
                    triggerClick(btn);
                    return; // Click one is usually enough
                } else {
                    Utils.log("Skip button found but hidden.");
                }
            }
        }

        // Close Overlays
        for (const btn of closeOverlay) {
            if (btn && btn.offsetParent !== null) {
                triggerClick(btn);
            }
        }
    }

    function triggerClick(element) {
        if (!element) return;

        element.click();

        const mouseEvents = ['mousedown', 'mouseup', 'click'];
        mouseEvents.forEach(eventType => {
            const event = new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(event);
        });
        Utils.log("Skip action triggered.");
    }

    // Start
    init();
})();
