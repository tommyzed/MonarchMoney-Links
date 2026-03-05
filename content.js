/**
 * MonarchMoney Links — content.js
 *
 * Watches for the Notes textarea in the Monarch Money transaction drawer.
 * When URLs are found in the notes text, injects a clickable "Links" section
 * directly above the Notes field.
 */

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
