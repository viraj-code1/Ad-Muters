document.addEventListener('DOMContentLoaded', () => {
    const toggles = {
        'enabled': document.getElementById('toggle-all'),
        'youtube': document.getElementById('toggle-youtube'),
        'hotstar': document.getElementById('toggle-hotstar'),
        'prime': document.getElementById('toggle-prime')
    };

    const statusMsg = document.getElementById('status-msg');

    // Load saved settings
    chrome.storage.local.get(Object.keys(toggles), (result) => {
        for (const [key, element] of Object.entries(toggles)) {
            // Default to true if not set
            element.checked = result[key] !== false;
        }
    });

    // Save settings on change
    for (const [key, element] of Object.entries(toggles)) {
        element.addEventListener('change', () => {
            const setting = {};
            setting[key] = element.checked;
            chrome.storage.local.set(setting, () => {
                statusMsg.textContent = 'Settings saved.';
                setTimeout(() => {
                    statusMsg.textContent = '';
                }, 1500);
            });
        });
    }
});
