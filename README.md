# MonarchMoney Links
<img width="128" height="128" alt="icon128" src="https://github.com/user-attachments/assets/00d0b292-b442-4952-b51f-57987b3ec40f" />

A Chrome Extension that makes URLs in [Monarch Money](https://app.monarch.com) transaction Notes clickable.

## The Problem

Monarch Money's transaction drawer has a **Notes** field that accepts free-form text, including URLs — but those URLs are plain text and not clickable.

## What This Extension Does

When you open a transaction, the extension scans the Notes field for URLs and injects a **Links** section directly above Notes, displaying each URL as a clickable anchor tag that opens in a new tab.

- ✅ Only activates on `app.monarch.com` pages
- ✅ Handles Monarch's SPA navigation (works as you switch between transactions)
- ✅ Updates live as you type in the Notes field
- ✅ Shows nothing if Notes contains no URLs

## Demo
<img width="675" height="382" alt="Screenshot 2026-03-05 at 10 18 30 AM" src="https://github.com/user-attachments/assets/a282687a-62d1-4aa9-80d5-2c7b7ade0daa" />

## How It Works

```
Page loads on app.monarch.com
        │
        ▼
MutationObserver watches the DOM
        │
        ▼
Notes <textarea> detected?
    ├── No  → Remove any existing Links section
    └── Yes → Extract URLs from textarea value
                    │
                    ▼
            URLs found?
            ├── No  → Remove any existing Links section
            └── Yes → Inject "Links" section above Notes
                            │
                            ▼
                    Attach input listener
                    (links update as you type)
```

## Installation

1. Download or clone this repository to your machine.
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the `MonarchMoney-Links` folder.
6. The extension is now active — navigate to any Monarch Money transaction page to use it.

## Usage

1. Open [Monarch Money](https://app.monarch.com) and click on any transaction.
2. In the transaction drawer, find the **Notes** field.
3. If the Notes field contains one or more URLs (e.g. `https://example.com`), a **Links** section will automatically appear just above Notes.
4. Click any link to open it in a new tab.

> **Tip:** You can mix URLs with other text in Notes — the extension will extract only the URLs.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (Manifest V3), scoped to `app.monarch.com` |
| `content.js` | Core logic — MutationObserver, URL extraction, DOM injection |
| `styles.css` | Dark-mode styles for the injected Links section |

## Notes

Monarch Money uses dynamically generated CSS class names that can change between app deploys. The extension avoids relying on these class names — instead, it navigates the DOM structurally (walking up from the `<textarea>`) to find the correct injection point, making it resilient to style changes.

If Monarch significantly restructures the transaction drawer HTML, a small update to the DOM traversal in `content.js` may be needed.
