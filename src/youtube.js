(() => {
    // YouTube Ad Muter Logic (Refactored)

    const YT_SELECTORS = {
        player: '#movie_player',
        adModule: '.ytp-ad-module',
        adShowing: '.ad-showing',
        video: 'video.html5-main-video',
        skipButton: '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .videoAdUiSkipButton, .ytp-skip-ad-button, #ytp-skip-ad-button',
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

        // Strategy 2: Text Content Fallback
        if (skipButtons.length === 0) {
            const allButtons = document.querySelectorAll('button, div[role="button"]');
            for (const btn of allButtons) {
                if (btn.innerText && (btn.innerText.includes('Skip') || btn.innerText.includes('Skip Ad'))) {
                    skipButtons.push(btn);
                }
            }
        }

        if (skipButtons.length > 0) {
            for (const btn of skipButtons) {
                // Debug Log Button State
                const styles = window.getComputedStyle(btn);
                Utils.log(`[Debug] Found Button: Class="${btn.className}", ID="${btn.id}", Text="${btn.innerText}"`);
                Utils.log(`[Debug] State: Visible=${btn.offsetParent !== null}, Disabled=${btn.disabled}, PointerEvents=${styles.pointerEvents}, Opacity=${styles.opacity}, Z-Index=${styles.zIndex}`);

                if (btn && (btn.offsetParent !== null || btn.style.display !== 'none')) {
                    Utils.log("Skip button deemed clickable. Triggering...");
                    triggerClick(btn);
                    return;
                } else {
                    Utils.log("Skip button found but considered hidden/inactive.");
                }
            }
        } else {
            Utils.log("No skip buttons found."); // spammy
        }

        // Close Overlays
        const closeOverlay = document.querySelectorAll(YT_SELECTORS.overlay);
        for (const btn of closeOverlay) {
            if (btn && btn.offsetParent !== null) {
                triggerClick(btn);
            }
        }
    }

    function triggerClick(element) {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;

        Utils.log(`[Debug] Triggering Skip at ${Math.round(clientX)},${Math.round(clientY)}`);

        // 1. Native Click on Element
        try { element.click(); } catch (e) { }

        // 2. Click Parent (often the listener is on the container)
        if (element.parentElement) {
            try { element.parentElement.click(); } catch (e) { }
        }

        // 3. Simulated Events (Pointer/Mouse)
        const eventTypes = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];

        eventTypes.forEach(eventType => {
            const options = {
                bubbles: true,
                cancelable: true,
                composed: true, // Crucial for Shadow DOM
                view: window,
                detail: 1,
                screenX: clientX,
                screenY: clientY,
                clientX: clientX,
                clientY: clientY,
                ctrlKey: false,
                altKey: false,
                shiftKey: false,
                metaKey: false,
                button: 0,
                buttons: 1
            };

            let event;
            if (eventType.startsWith('pointer')) {
                event = new PointerEvent(eventType, options);
            } else {
                event = new MouseEvent(eventType, options);
            }

            element.dispatchEvent(event);
        });

        Utils.log(`[Debug] Events dispatched.`);

        // 4. "Nuclear Option": Force video to end if UI fail
        // We only do this if we are SURE it's a skip button (which we are, to get here)
        const video = document.querySelector('video');
        if (video && !isNaN(video.duration) && video.duration > 0) {
            Utils.log(`[Nuclear] Forcing Ad End: currentTime=${video.currentTime} -> ${video.duration}`);
            video.currentTime = video.duration + 1;
        }

        // 5. Verification
        setTimeout(() => {
            // Check if the button is still valid, visible, and attached
            if (element && element.offsetParent !== null && document.contains(element)) {
                Utils.log("[Result] Skip Failed? Button still visible.");
            } else {
                Utils.log("[Result] Skip Successful! Button disappeared.");
            }
        }, 500);
    }

    // Start
    init();
})();
