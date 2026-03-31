/**
 * MonarchMoney Plus — content.js
 *
 * Features:
 * 1. Links — Extracts URLs from transaction Notes and injects clickable links.
 * 2. Net Worth Timeframe — Auto-selects a preferred date-range on the dashboard.
 *
 * Both features are gated by settings stored in chrome.storage.sync.
 */

// ---------------------------------------------------------------------------
// Settings (loaded from chrome.storage.sync, with defaults)
// ---------------------------------------------------------------------------

const SETTING_DEFAULTS = {
  linksEnabled: true,
  timeframeEnabled: true,
  timeframeValue: 'Year to date',
};

let settings = { ...SETTING_DEFAULTS };

/**
 * Load settings from chrome.storage.sync, then run the provided callback.
 */
function loadSettings(callback) {
  chrome.storage.sync.get(SETTING_DEFAULTS, (result) => {
    settings = result;
    console.log('[MM-🔓] Settings loaded:', settings);
    if (callback) callback();
  });
}

// React to live setting changes (from the popup) without requiring a reload
chrome.storage.onChanged.addListener((changes) => {
  for (const key of Object.keys(changes)) {
    settings[key] = changes[key].newValue;
  }
  console.log('[MM-🔓] Settings updated live:', settings);

  // If the timeframe feature was just enabled, kick it off immediately
  if (changes.timeframeEnabled?.newValue || changes.timeframeValue) {
    dropdownSelected = false;
    if (isDashboard() && settings.timeframeEnabled) {
      tryAutoSelectDropdown();
    }
  }
});

// ---------------------------------------------------------------------------
// Feature: Auto-select Net Worth Timeframe on the dashboard
// ---------------------------------------------------------------------------

let dropdownSelected = false;

/**
 * Returns true when the current page is the Monarch Money dashboard.
 */
function isDashboard() {
  return window.location.pathname === '/dashboard';
}

/**
 * Finds the react-select single-value element that shows the current
 * date-range selection (e.g. "3 months").
 * @returns {HTMLElement|null}
 */
function findSelectSingleValue() {
  return document.querySelector('.react-select__single-value');
}

/**
 * Clicks the react-select control to open the dropdown menu, then waits for
 * the menu to appear and clicks the target option.
 * @param {HTMLElement} singleValue - the .react-select__single-value element
 */
function selectTimeframe(singleValue) {
  const targetLabel = settings.timeframeValue;
  console.log('[MM-🔓] selectTimeframe called, target:', targetLabel);

  // Walk up from the single-value to get the correct control for THIS dropdown
  const control = singleValue.closest('.react-select__control');
  if (!control) return false;

  // The react-select container (one level above the control) is used to scope
  // option lookups so we don't accidentally hit another dropdown's menu.
  const container = control.parentElement;

  // Open the menu
  control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

  // Poll every 100ms (up to 2s) for the menu and options to render.
  let pollCount = 0;
  const maxPolls = 20;
  const pollInterval = setInterval(() => {
    pollCount++;

    const scopeRoot = container || document;
    const menu = scopeRoot.querySelector('.react-select__menu') ||
      document.querySelector('.react-select__menu');

    const searchRoot = menu || document;
    const options = searchRoot.querySelectorAll('[role="menuitem"]');

    if (options.length > 0) {
      clearInterval(pollInterval);
      for (const option of options) {
        if (option.textContent.trim() === targetLabel) {
          console.log('[MM-🔓] Found target option, clicking:', option.textContent.trim());
          option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          option.click();
          dropdownSelected = true;
          return;
        }
      }
      console.log('[MM-🔓] Target option not found. Labels:', [...options].map(o => o.textContent.trim()));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    } else if (pollCount >= maxPolls) {
      clearInterval(pollInterval);
      console.log('[MM-🔓] Gave up waiting for menu options, closing');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
  }, 100);

  return true;
}

/**
 * Attempts to auto-select the target dropdown value.
 * Retries up to maxAttempts times with retryDelayMs between attempts.
 */
function tryAutoSelectDropdown(attempt = 0, maxAttempts = 20, retryDelayMs = 500) {
  if (dropdownSelected) return;
  if (!isDashboard()) return;
  if (!settings.timeframeEnabled) return;

  const singleValue = findSelectSingleValue();

  if (singleValue) {
    const currentLabel = singleValue.textContent.trim();
    if (currentLabel === settings.timeframeValue) {
      // Already correct — nothing to do
      dropdownSelected = true;
      return;
    }

    // Check if the control is still disabled (happens on initial page load)
    const control = singleValue.closest('.react-select__control');
    const isDisabled = control && control.classList.contains('react-select__control--is-disabled');
    if (isDisabled) {
      if (attempt < maxAttempts) {
        setTimeout(() => tryAutoSelectDropdown(attempt + 1, maxAttempts, retryDelayMs), retryDelayMs);
      }
      return;
    }

    // Attempt the selection
    selectTimeframe(singleValue);
    return;
  }

  // Dropdown not rendered yet — retry
  if (attempt < maxAttempts) {
    setTimeout(() => tryAutoSelectDropdown(attempt + 1, maxAttempts, retryDelayMs), retryDelayMs);
  }
}

// ---------------------------------------------------------------------------
// SPA navigation detection
// ---------------------------------------------------------------------------

/**
 * Called whenever the SPA navigates to a new URL.
 */
function onSpaNavigate() {
  if (isDashboard() && settings.timeframeEnabled) {
    dropdownSelected = false;
    tryAutoSelectDropdown();
  }
}

// Patch pushState and replaceState
(function patchHistory() {
  const _push = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);

  history.pushState = function (...args) {
    _push(...args);
    onSpaNavigate();
  };

  history.replaceState = function (...args) {
    _replace(...args);
    onSpaNavigate();
  };
})();

window.addEventListener('popstate', onSpaNavigate);

// URL polling — reliable fallback for SPA navigation detection
let _lastPathname = window.location.pathname;
setInterval(() => {
  const current = window.location.pathname;
  if (current !== _lastPathname) {
    _lastPathname = current;
    onSpaNavigate();
  }
}, 500);

// ---------------------------------------------------------------------------
// Feature: Links in Notes
// ---------------------------------------------------------------------------

const LINKS_SECTION_ID = 'mm-links-section';
const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

let debounceTimer = null;

function extractUrls(text) {
  return text.match(URL_REGEX) || [];
}

function findNotesTextarea() {
  return document.querySelector('textarea[name="notes"], textarea[id^="notes-"]');
}

function findNotesOuterWrapper(textarea) {
  let el = textarea;
  for (let i = 0; i < 3; i++) {
    if (!el.parentElement) return null;
    el = el.parentElement;
  }
  return el;
}

function injectLinksSection(notesWrapper, urls) {
  const parent = notesWrapper.parentElement;
  if (!parent) return;

  const existing = document.getElementById(LINKS_SECTION_ID);
  if (existing) existing.remove();

  if (urls.length === 0) return;

  const section = document.createElement('div');
  section.id = LINKS_SECTION_ID;

  const label = document.createElement('div');
  label.id = 'mm-links-label';
  label.textContent = 'Links';
  section.appendChild(label);

  const linksContainer = document.createElement('div');
  linksContainer.id = 'mm-links-container';

  urls.forEach((url) => {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    linksContainer.appendChild(a);
  });

  section.appendChild(linksContainer);
  parent.insertBefore(section, notesWrapper);
}

/**
 * Main logic: find the Notes textarea, extract URLs, and inject/update links.
 */
function processNotes() {
  if (!settings.linksEnabled) {
    // Feature disabled — remove any lingering Links section
    const existing = document.getElementById(LINKS_SECTION_ID);
    if (existing) existing.remove();
    return;
  }

  const textarea = findNotesTextarea();

  if (!textarea) {
    const existing = document.getElementById(LINKS_SECTION_ID);
    if (existing) existing.remove();
    return;
  }

  const urls = extractUrls(textarea.value);
  const notesWrapper = findNotesOuterWrapper(textarea);

  if (!notesWrapper) return;

  injectLinksSection(notesWrapper, urls);

  if (!textarea.dataset.mmLinksAttached) {
    textarea.dataset.mmLinksAttached = 'true';
    textarea.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!settings.linksEnabled) return;
        const latestUrls = extractUrls(textarea.value);
        const wrapper = findNotesOuterWrapper(textarea);
        if (wrapper) injectLinksSection(wrapper, latestUrls);
      }, 300);
    });
  }
}

function onMutation() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(processNotes, 200);
}

// ---------------------------------------------------------------------------
// Initialization — load settings first, then start everything
// ---------------------------------------------------------------------------

loadSettings(() => {
  // Start the timeframe auto-select if on dashboard
  if (isDashboard() && settings.timeframeEnabled) {
    tryAutoSelectDropdown();
  }

  // Start the Links feature observer
  const observer = new MutationObserver(onMutation);
  observer.observe(document.body, { childList: true, subtree: true });
  processNotes();
});
