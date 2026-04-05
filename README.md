# Monarch Money: Unlocked
<img width="128" height="128" alt="icon128" src="https://github.com/user-attachments/assets/4a526c0f-79c3-4bb1-aa7f-5603773bbd2d" />

A Chrome Extension that enhances [Monarch Money](https://app.monarch.com) with clickable links in transaction Notes and automatic dashboard timeframe selection.

## 🌍 Download the Live Version Now!
https://chromewebstore.google.com/detail/monarchmoney-plus/doganjddfcohdonjmbnfmjjkloigcpji

## Features

### 🔗 Links in Notes

Monarch Money's transaction drawer has a **Notes** field that accepts free-form text, including URLs — but those URLs are plain text and not clickable.

When you open a transaction, the extension scans the Notes field for URLs and injects a **Links** section directly above Notes, displaying each URL as a clickable anchor tag that opens in a new tab.

- ✅ Updates live as you type in the Notes field
- ✅ Shows nothing if Notes contains no URLs
- ✅ Cleans up automatically when the transaction drawer is closed

### 📅 Auto-Select Dashboard Timeframe

The dashboard date-range dropdown defaults to a short window (e.g. "1 month"). This feature automatically selects your preferred timeframe every time you navigate to the dashboard.

- ✅ Works on hard refresh, SPA navigation, and browser back/forward
- ✅ Waits for the dropdown to become interactive before selecting
- ✅ Default: **Year to date** (configurable via the extension popup)

### ⚙️ Settings Popup

Click the extension icon in the Chrome toolbar to configure:

| Setting | Description | Default |
|---|---|---|
| **Links in Notes** | Enable/disable the clickable links feature | Enabled |
| **Auto-Select Timeframe** | Enable/disable the dashboard timeframe auto-select | Enabled |
| **Default Timeframe** | Choose from: 1 month, 3 months, 6 months, Year to date, 1 year, All time | Year to date |
| **Debug?** | Enable/disable console logging for troubleshooting | Disabled |

Settings are saved via `chrome.storage.sync` and take effect immediately — no page reload required.

## 🔒 Privacy

**This extension never collects, transmits, or stores any of your financial data.**

- It runs entirely inside your browser — no external servers, no network requests of its own.
- It only reads the page to locate the Notes `<textarea>` and the dashboard date-range dropdown.
- The only data it persists is your own settings preferences (toggle states and chosen timeframe), stored locally via `chrome.storage.sync`.
- It has no analytics, no tracking, and no third-party dependencies.

You can verify this yourself: the entire source is in `content.js` (page logic) and `popup.js` (settings), both plain JavaScript with no obfuscation.

## Demo

### Options

<img width="297" height="440" alt="Screenshot 2026-04-05 at 2 24 27 PM" src="https://github.com/user-attachments/assets/0af0f94d-6a86-4e3d-949a-c45fd0152dea" />

### Links from Notes

<img width="675" height="382" alt="Screenshot 2026-03-05 at 10 18 30 AM" src="https://github.com/user-attachments/assets/a282687a-62d1-4aa9-80d5-2c7b7ade0daa" />

## How It Works

```
Page loads on app.monarch.com
        │
        ▼
Load settings from chrome.storage.sync
        │
        ├── Links feature enabled?
        │       │
        │       └── Yes → MutationObserver watches direct <body> children
        │                       │
        │                       ├── TransactionDrawer added?
        │                       │       │
        │                       │       └── Wait for React to render textarea
        │                       │               │
        │                       │               ▼
        │                       │       URLs found? → Inject "Links" section
        │                       │                       (updates live as you type)
        │                       │
        │                       └── TransactionDrawer removed?
        │                               │
        │                               └── Remove "Links" section (cleanup)
        │
        └── Timeframe feature enabled?
                │
                └── Yes → On /dashboard, wait for dropdown to be enabled
                                │
                                ▼
                        Open menu → find target option → click it
```

## Installation

BEST: https://chromewebstore.google.com/detail/monarchmoney-plus/doganjddfcohdonjmbnfmjjkloigcpji

-- or --

1. Download or clone this repository to your machine.
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the `MM-Unlocked` folder.
6. The extension is now active — navigate to any Monarch Money page to use it.
7. (Optional) Click the extension icon to configure settings.

## Usage

### Links
1. Open [Monarch Money](https://app.monarch.com) and click on any transaction.
2. In the transaction drawer, find the **Notes** field.
3. If the Notes field contains one or more URLs (e.g. `https://example.com`), a **Links** section will automatically appear just above Notes.
4. Click any link to open it in a new tab.

> **Tip:** You can mix URLs with other text in Notes — the extension will extract only the URLs.

### Dashboard Timeframe
1. Navigate to the [Dashboard](https://app.monarch.com/dashboard).
2. The date-range dropdown will automatically switch to your preferred timeframe.
3. To change the default, click the extension icon and select a different option from the **Default Timeframe** dropdown.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (Manifest V3), scoped to `app.monarch.com` |
| `content.js` | Core logic — Links injection, timeframe auto-select, SPA navigation detection |
| `styles.css` | Dark-mode styles for the injected Links section |
| `popup.html` | Settings popup UI |
| `popup.css` | Dark-mode styles for the settings popup |
| `popup.js` | Settings persistence via `chrome.storage.sync` |

## Notes

- Monarch Money uses dynamically generated CSS class names that can change between app deploys. The Links feature avoids relying on these — instead, it navigates the DOM structurally (walking up from the `<textarea>`) to find the correct injection point.
- The transaction drawer is detected by watching for elements with a class name starting with `TransactionDrawer` being added/removed as direct children of `<body>`. Because React mounts the drawer shell before rendering its children, a short-lived inner observer waits for the `<textarea>` to appear inside the drawer, then immediately disconnects. This keeps the observer footprint minimal and avoids firing on every React re-render on the page.
- The timeframe feature uses `react-select` class names and `role="menuitem"` to interact with the dropdown. If Monarch significantly changes the dropdown component, a small update to the selectors in `content.js` may be needed.
- SPA navigation is detected via URL polling (every 500ms) as a reliable fallback, with `history.pushState`/`replaceState` patches as a fast-path.
