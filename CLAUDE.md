# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome/Brave/Firefox browser extension that adds loop controls to YouTube videos. The extension allows users to set custom start and end times for video loops without triggering additional network requests - it uses JavaScript's `video.currentTime` property to seek within already-buffered content.

## Architecture

The extension follows a simple content script architecture:

### Core Components

- **YouTubeLooper Class** (`content.js`): Single main class that handles all functionality
  - Uses MutationObserver to detect when YouTube videos load (handles YouTube's SPA navigation)
  - Creates custom range slider UI with dual thumbs for start/end time selection
  - Implements automatic loop triggering when custom ranges are set
  - Uses `requestAnimationFrame` for performance-optimized UI updates during dragging

### Dynamic Step Sizing System

The extension uses an adaptive precision system based on video length:
- ≤2 minutes: 0.5 second steps
- ≤10 minutes: 1 second steps  
- ≤30 minutes: 2 second steps
- ≤1 hour: 5 second steps
- >1 hour: 10 second steps

### UI Positioning Strategy

The extension tries multiple DOM insertion points in order of preference:
1. Before `#title` element (preferred)
2. First child of `ytd-watch-metadata`
3. Before `#primary-inner`
4. After video player (fallback)

This multi-fallback approach handles YouTube's inconsistent DOM structure across different page states.

### Auto-Loop Behavior

- Loop automatically starts when either slider is moved away from default full-video range (0 to max)
- Loop stops when both sliders are reset to full range
- No manual toggle button - behavior is entirely based on slider positions

## Development

This is a pure vanilla JavaScript extension with no build process. All files are directly loaded by the browser:

- `manifest.json`: Extension configuration (Manifest V3)
- `content.js`: All JavaScript functionality
- `styles.css`: CSS with light/dark mode support via CSS custom properties

### Installation for Development

1. Navigate to `chrome://extensions/` in Chrome/Brave
2. Enable "Developer mode"  
3. Click "Load unpacked" and select this folder
4. Extension auto-reloads when files are modified

### Key Implementation Details

- **Performance**: Uses `requestAnimationFrame` to throttle UI updates during slider dragging
- **Theming**: CSS custom properties switch automatically based on `prefers-color-scheme`
- **YouTube Integration**: MutationObserver handles YouTube's dynamic content loading and SPA navigation
- **Time Display**: Shows precise times below each slider handle for immediate visual feedback