# Ad-Muters Extension

A simple Chrome Extension to automatically mute ads on YouTube, JioHotstar, and Amazon Prime Video.

## Features
- **Auto-Mute Ads**: Detects ads and mutes the video player.
- **Auto-Unmute**: Restores sound once the ad finishes.
- **Auto-Skip**: Attempts to auto-click "Skip Ad" buttons on YouTube and Prime Video.
- **Toggle Controls**: Enable/Disable functionality globally or per platform via the popup menu.

## Installation
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `Ad-Muters` directory (the root folder containing `manifest.json`).

## Usage
- The extension works automatically in the background.
- Click the extension icon in the toolbar to open settings.
- Toggle switches to enable/disable for specific sites.

## Supported Platforms
- YouTube
- JioHotstar
- Amazon Prime Video

## Development
- `src/` contains the logic for each platform.
- `popup/` contains the UI code.
- `manifest.json` defines the permissions and content scripts.
