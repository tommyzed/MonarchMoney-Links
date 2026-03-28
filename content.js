/**
 * MonarchMoney Links — content.js
 *
 * Watches for the Notes textarea in the Monarch Money transaction drawer.
 * When URLs are found in the notes text, injects a clickable "Links" section
 * directly above the Notes field.
 *
 * Also auto-selects "Year to date" in the dashboard date-range dropdown on
 * page load.
 */

// ---------------------------------------------------------------------------
// Feature: Auto-select "Year to date" on the dashboard
// ---------------------------------------------------------------------------

const DROPDOWN_TARGET_LABEL = 'Year to date';
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
 * the menu to appear and clicks the "Year to date" option.
 * @param {HTMLElement} singleValue - the .react-select__single-value element
 */
function selectYearToDate(singleValue) {
  console.log('[MM-Links] selectYearToDate called');

  // Walk up from the single-value to get the correct control for THIS dropdown
  const control = singleValue.closest('.react-select__control');
  console.log('[MM-Links] .react-select__control found:', control);
  if (!control) return false;

  // The react-select container (one level above the control) is used to scope
  // option lookups so we don't accidentally hit another dropdown's menu.
  const container = control.parentElement;
  console.log('[MM-Links] Scoped container:', container);

  // Open the menu
  control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  console.log('[MM-Links] Fired mousedown on control to open menu');

  // Poll every 100ms (up to 2s) for the menu and options to render.
  // React Select may render the menu in a portal outside the container,
  // so we check both scoped and global locations.
  let pollCount = 0;
  const maxPolls = 20;
  const pollInterval = setInterval(() => {
    pollCount++;

    // Check the scoped container first, then fall back to document-wide
    const scopeRoot = container || document;
    const menu = scopeRoot.querySelector('.react-select__menu') ||
      document.querySelector('.react-select__menu');
    console.log(`[MM-Links] Poll ${pollCount}: menu=`, menu);

    if (menu) {
      console.log('[MM-Links] Menu innerHTML:', menu.innerHTML.substring(0, 800));
    }

    // Broad option search scoped to the menu if found, else document-wide
    const searchRoot = menu || document;
    const options = searchRoot.querySelectorAll('[role="menuitem"]');
    console.log(`[MM-Links] Poll ${pollCount}: options found =`, options.length, [...options].map(o => o.textContent.trim()));

    if (options.length > 0) {
      clearInterval(pollInterval);
      for (const option of options) {
        if (option.textContent.trim() === DROPDOWN_TARGET_LABEL) {
          console.log('[MM-Links] Found target option, clicking:', option);
          option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          option.click();
          dropdownSelected = true;
          return;
        }
      }
      console.log('[MM-Links] Target option not found. Labels found:', [...options].map(o => JSON.stringify(o.textContent.trim())));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    } else if (pollCount >= maxPolls) {
      clearInterval(pollInterval);
      console.log('[MM-Links] Gave up waiting for menu options, closing');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
  }, 100);

  return true;
}

/**
 * Attempts to auto-select the target dropdown value.
 * Retries up to maxAttempts times with retryDelayMs between attempts,
 * stopping as soon as the dropdown is already showing the right value
 * or the selection succeeds.
 */
function tryAutoSelectDropdown(attempt = 0, maxAttempts = 20, retryDelayMs = 500) {
  console.log(`[MM-Links] tryAutoSelectDropdown attempt=${attempt}, isDashboard=${isDashboard()}, dropdownSelected=${dropdownSelected}`);
  if (dropdownSelected) return;
  if (!isDashboard()) return;

  const singleValue = findSelectSingleValue();

  if (singleValue) {
    const currentLabel = singleValue.textContent.trim();
    console.log('[MM-Links] Current dropdown label:', JSON.stringify(currentLabel));
    if (currentLabel === DROPDOWN_TARGET_LABEL) {
      // Already correct — nothing to do
      console.log('[MM-Links] Already set to target, done.');
      dropdownSelected = true;
      return;
    }

    // Check if the control is still disabled (happens on initial page load)
    // NOTE: scope to THIS dropdown's control via .closest(), not querySelector
    const control = singleValue.closest('.react-select__control');
    const isDisabled = control && control.classList.contains('react-select__control--is-disabled');
    console.log('[MM-Links] Control disabled?', isDisabled);
    if (isDisabled) {
      // Retry later once it becomes enabled
      if (attempt < maxAttempts) {
        setTimeout(
          () => tryAutoSelectDropdown(attempt + 1, maxAttempts, retryDelayMs),
          retryDelayMs
        );
      }
      return;
    }

    // Attempt the selection, passing singleValue so we click the right control
    selectYearToDate(singleValue);
    return;
  }

  console.log('[MM-Links] Single value element not found yet, will retry if possible');
  // Dropdown not rendered yet — retry
  if (attempt < maxAttempts) {
    setTimeout(
      () => tryAutoSelectDropdown(attempt + 1, maxAttempts, retryDelayMs),
      retryDelayMs
    );
  }
}

// Kick off the auto-select when the script first runs (hard refresh / direct load)
if (isDashboard()) {
  tryAutoSelectDropdown();
}

// ---------------------------------------------------------------------------
// SPA navigation detection
// Monarch Money is a React SPA — pushState/replaceState handle route changes
// without page reloads, so we patch them to re-trigger the auto-select.
// ---------------------------------------------------------------------------

/**
 * Called whenever the SPA navigates to a new URL.
 */
function onSpaNavigate() {
  if (isDashboard()) {
    // Reset the guard so the auto-select runs again on this navigation
    dropdownSelected = false;
    console.log('[MM-Links] Navigated to dashboard, triggering dropdown auto-select');
    tryAutoSelectDropdown();
  }
}

// Patch pushState and replaceState (fast-path; may not fire in all React Router setups)
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

// Also handle browser back/forward navigation
window.addEventListener('popstate', onSpaNavigate);

// URL polling — the most reliable way to detect SPA navigation.
// Runs every 500ms and fires onSpaNavigate whenever the pathname changes.
let _lastPathname = window.location.pathname;
setInterval(() => {
  const current = window.location.pathname;
  if (current !== _lastPathname) {
    console.log(`[MM-Links] URL changed: ${_lastPathname} → ${current}`);
    _lastPathname = current;
    onSpaNavigate();
  }
}, 500);

const LINKS_SECTION_ID = 'mm-links-section';

// Regex to extract http/https URLs from arbitrary text
const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

let debounceTimer = null;

/**
 * Extracts all URLs from a string.
 * @param {string} text
 * @returns {string[]}
 */
function extractUrls(text) {
  return text.match(URL_REGEX) || [];
}

/**
 * Finds the Notes textarea in the DOM.
 * Identified by name="notes" or id starting with "notes-".
 * @returns {HTMLTextAreaElement|null}
 */
function findNotesTextarea() {
  return document.querySelector('textarea[name="notes"], textarea[id^="notes-"]');
}

/**
 * Finds the top-level container that wraps both the Notes label row and
 * the textarea — the element we want to inject our Links section before.
 *
 * The HTML structure (from the provided snippet) is:
 *   div.fqbkQv          ← outermost wrapper  ← we insert before this
 *     div.dbFSTN
 *       div.jvxoqg      ← label row ("Notes")
 *     div.jEeSYR        ← textarea wrapper
 *       textarea
 *
 * We walk up from the textarea until we find a parent whose parent is NOT
 * one of the inner wrappers (i.e., a sibling of the label-row container).
 * In practice we want to go up 3 levels from the textarea.
 *
 * @param {HTMLTextAreaElement} textarea
 * @returns {HTMLElement|null}
 */
function findNotesOuterWrapper(textarea) {
  // Go up: textarea → div.jEeSYR → div.dbFSTN-or-fqbkQv → div.fqbkQv
  let el = textarea;
  for (let i = 0; i < 3; i++) {
    if (!el.parentElement) return null;
    el = el.parentElement;
  }
  return el;
}

/**
 * Builds and injects (or updates) the Links section before the Notes wrapper.
 * @param {HTMLElement} notesWrapper - the outer Notes wrapper element
 * @param {string[]} urls - array of URLs to display
 */
function injectLinksSection(notesWrapper, urls) {
  const parent = notesWrapper.parentElement;
  if (!parent) return;

  // Remove any existing Links section
  const existing = document.getElementById(LINKS_SECTION_ID);
  if (existing) existing.remove();

  if (urls.length === 0) return;

  // Build the Links section
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

  // Insert right before the Notes outer wrapper
  parent.insertBefore(section, notesWrapper);
}

/**
 * Main logic: find the Notes textarea, extract URLs, and inject/update links.
 */
function processNotes() {
  const textarea = findNotesTextarea();

  if (!textarea) {
    // No textarea visible — remove any lingering Links section
    const existing = document.getElementById(LINKS_SECTION_ID);
    if (existing) existing.remove();
    return;
  }

  const urls = extractUrls(textarea.value);
  const notesWrapper = findNotesOuterWrapper(textarea);

  if (!notesWrapper) return;

  injectLinksSection(notesWrapper, urls);

  // Also listen for live edits in the textarea (debounced)
  if (!textarea.dataset.mmLinksAttached) {
    textarea.dataset.mmLinksAttached = 'true';
    textarea.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const latestUrls = extractUrls(textarea.value);
        const wrapper = findNotesOuterWrapper(textarea);
        if (wrapper) injectLinksSection(wrapper, latestUrls);
      }, 300);
    });
  }
}

/**
 * Debounced wrapper around processNotes, called by the MutationObserver.
 */
function onMutation() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(processNotes, 200);
}

// Observe the entire document body for DOM changes (SPA navigation,
// drawer open/close, dynamic re-renders, etc.)
const observer = new MutationObserver(onMutation);
observer.observe(document.body, { childList: true, subtree: true });

// Run once on initial load in case the drawer is already open
processNotes();
