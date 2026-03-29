# MonarchMoney Plus
<img width="128" height="128" alt="icon128" src="https://github.com/user-attachments/assets/9ddab607-953a-40e1-b3de-08eb9fa9f92e" />

A Chrome Extension that enhances [Monarch Money](https://app.monarch.com) with clickable links in transaction Notes and automatic dashboard timeframe selection.

## Features

### 🔗 Links in Notes

Monarch Money's transaction drawer has a **Notes** field that accepts free-form text, including URLs — but those URLs are plain text and not clickable.

When you open a transaction, the extension scans the Notes field for URLs and injects a **Links** section directly above Notes, displaying each URL as a clickable anchor tag that opens in a new tab.

- ✅ Updates live as you type in the Notes field
- ✅ Shows nothing if Notes contains no URLs

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

Settings are saved via `chrome.storage.sync` and take effect immediately — no page reload required.

## Demo
Settings:

<img width="282" height="280" alt="Screenshot 2026-03-29 at 1 25 15 PM" src="https://github.com/user-attachments/assets/39cc50ff-3160-42bf-b36c-d4eb4e9da024" />

Links:

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
        │       └── Yes → MutationObserver watches for Notes <textarea>
        │                       │
        │                       ▼
        │               URLs found? → Inject "Links" section above Notes
        │                               (updates live as you type)
        │
        └── Timeframe feature enabled?
                │
                └── Yes → On /dashboard, wait for dropdown to be enabled
                                │
                                ▼
                        Open menu → find target option → click it
```

## Installation

1. Download or clone this repository to your machine.
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the `MonarchMoney-Links` folder.
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
- The timeframe feature uses `react-select` class names and `role="menuitem"` to interact with the dropdown. If Monarch significantly changes the dropdown component, a small update to the selectors in `content.js` may be needed.
- SPA navigation is detected via URL polling (every 500ms) as a reliable fallback, with `history.pushState`/`replaceState` patches as a fast-path.
