/**
 * MonarchMoney Plus — popup.js
 *
 * Manages settings persistence via chrome.storage.sync.
 * Settings are saved immediately on change.
 */

const DEFAULTS = {
  linksEnabled: true,
  timeframeEnabled: true,
  timeframeValue: 'Year to date',
};

const $links = document.getElementById('linksEnabled');
const $timeframe = document.getElementById('timeframeEnabled');
const $timeframeValue = document.getElementById('timeframeValue');
const $timeframeGroup = document.getElementById('timeframeSelectGroup');

/** Sync the disabled visual state of the timeframe dropdown sub-setting. */
function updateTimeframeGroupState() {
  if ($timeframe.checked) {
    $timeframeGroup.classList.remove('disabled');
  } else {
    $timeframeGroup.classList.add('disabled');
  }
}

/** Save the current UI state to chrome.storage.sync. */
function save() {
  const settings = {
    linksEnabled: $links.checked,
    timeframeEnabled: $timeframe.checked,
    timeframeValue: $timeframeValue.value,
  };
  chrome.storage.sync.set(settings);
}

// Load saved settings and populate UI
chrome.storage.sync.get(DEFAULTS, (settings) => {
  $links.checked = settings.linksEnabled;
  $timeframe.checked = settings.timeframeEnabled;
  $timeframeValue.value = settings.timeframeValue;
  updateTimeframeGroupState();
});

// Wire up change listeners
$links.addEventListener('change', save);
$timeframe.addEventListener('change', () => {
  updateTimeframeGroupState();
  save();
});
$timeframeValue.addEventListener('change', save);

// Display version number
const manifestData = chrome.runtime.getManifest();
document.getElementById('versionDisplay').textContent = `v${manifestData.version}`;
