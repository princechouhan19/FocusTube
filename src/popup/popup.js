/**
 * Popup Script
 * Handles settings UI, navigation, and Chrome storage operations
 */

// Default settings
const DEFAULT_SETTINGS = {
  // Master Switch
  extensionEnabled: true,

  // Blocking Controls
  tempBlockUntil: 0,
  scheduleBlockEnabled: false,
  scheduleBlockStart: '09:00',
  scheduleBlockEnd: '17:00',

  // User Profile & API
  geminiApiKey: '',
  geminiModel: 'gemini-pro',
  profileName: 'Guest User',
  profileGoal: '',
  statsTimeSaved: 0,
  statsAdsBlocked: 0,

  // Video Page Features
  showSummaryButton: true,
  hideShorts: true,
  hideBannerAds: true,
  skipVideoAds: true,
  disableAutoplay: true,
  forceHighestQuality: true,
  useNativePlayer: false,

  // Enhanced UI Controls
  hideComments: false,
  hideInfoCards: false,
  autoTheaterMode: false
};

/**
 * Load settings from Chrome storage
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(null);
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to Chrome storage
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
    console.log('Settings saved:', settings);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Initialize popup UI
 */
const TOGGLES_LIST = [
  'skipVideoAds', 'hideBannerAds', 'hideShorts', 'hideComments', 'disableAutoplay',
  'hideSuggestions', 'hideTrending', 'hidePeopleAlsoWatched',
  'hideSidebar', 'hideNavShorts', 'hideNavExplore', 'hideNavGaming', 'hideNavTrending',
  'autoTheaterMode', 'hideInfoCards', 'hideEndScreens', 'hideLiveChat',
  'showSummaryButton', 'forceHighestQuality', 'useNativePlayer', 'autoPauseInactive',
  'hideNotifications', 'hideVoiceSearch', 'hideCreateButton',
  'hideNextVideo', 'hideMoreVideos', 'hideVideoMetrics', 'hideVideoDuration', 'hideMerch',
  'hideShareButtons', 'useTranscript'
];

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing popup...');

  // Load settings
  const settings = await loadSettings();

  // Initialize Views
  initNavigation();
  
  // Populate UI with current settings
  populateUI(settings);
  populateProfile(settings);
  renderBlockedKeywords(settings.blockedKeywords || []);

  // Add event listeners
  addEventListeners();
  addBlockingListeners();
  addProfileListeners();
  addKeywordBlocklistListeners();
});

/**
 * Navigation Logic
 */
function initNavigation() {
  const views = {
    home: document.getElementById('home-view'),
    settings: document.getElementById('settings-view'),
    profile: document.getElementById('profile-view')
  };

  const navBtns = {
    settings: document.getElementById('nav-settings'),
    profile: document.getElementById('nav-profile')
  };

  const backBtns = document.querySelectorAll('.back-btn');

  function switchView(viewName) {
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[viewName].classList.add('active');
  }

  navBtns.settings.addEventListener('click', () => switchView('settings'));
  navBtns.profile.addEventListener('click', () => switchView('profile'));

  backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (views[target.split('-')[0]]) {
         switchView(target.split('-')[0]);
      } else {
        // Fallback to home if target id format differs
        switchView('home');
      }
    });
  });
}

/**
 * Populate UI with settings
 */
function populateUI(settings) {
  // Master Switch
  const extEnabled = document.getElementById('extensionEnabled');
  extEnabled.checked = settings.extensionEnabled;
  updateStatusText(settings.extensionEnabled);

  // Blocking Schedule
  document.getElementById('schedule-start').value = settings.scheduleBlockStart;
  document.getElementById('schedule-end').value = settings.scheduleBlockEnd;
  document.getElementById('scheduleBlockEnabled').checked = settings.scheduleBlockEnabled;

  // Settings View Inputs
  document.getElementById('geminiApiKey').value = settings.geminiApiKey || '';
  document.getElementById('openaiApiKey').value = settings.openaiApiKey || '';
  document.getElementById('mistralApiKey').value = settings.mistralApiKey || '';
  document.getElementById('deepseekApiKey').value = settings.deepseekApiKey || '';
  document.getElementById('grokApiKey').value = settings.grokApiKey || '';
  const providerSel = document.getElementById('aiProvider');
  if (providerSel) providerSel.value = settings.aiProvider || 'gemini';
  const aiModel = document.getElementById('aiModel');
  if (aiModel) {
    const byProvider = settings.aiModelByProvider || {};
    const currentProvider = (providerSel && providerSel.value) || settings.aiProvider || 'gemini';
    aiModel.value = byProvider[currentProvider] || settings.aiModel || settings.geminiModel || 'gemini-pro';
  }
  document.getElementById('homePageRedirect').value = settings.homePageRedirect || 'none';
  const tl = document.getElementById('transcriptLang');
  if (tl) tl.value = settings.transcriptLang || 'en';
  
  // Toggles
  TOGGLES_LIST.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = settings[id];
  });
}

function updateStatusText(enabled) {
  const text = document.getElementById('status-text');
  if (enabled) {
    text.textContent = 'Active and protecting';
    text.style.color = 'var(--success-color)';
  } else {
    text.textContent = 'Extension disabled';
    text.style.color = 'var(--danger-color)';
  }
}

/**
 * Populate Profile Data
 */
function populateProfile(settings) {
  document.getElementById('profile-name-display').textContent = settings.profileName || 'Guest User';
  document.getElementById('profile-goal-display').textContent = settings.profileGoal || 'No goal set';
  
  document.getElementById('profileName').value = settings.profileName || '';
  document.getElementById('profileGoal').value = settings.profileGoal || '';

  document.getElementById('stats-time-saved').textContent = formatTime(settings.statsTimeSaved);
  document.getElementById('stats-ads-blocked').textContent = settings.statsAdsBlocked;
}

function formatTime(minutes) {
  if (!minutes) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Add General Event Listeners
 */
function addEventListeners() {
  // Master Switch
  document.getElementById('extensionEnabled').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await saveSettings({ extensionEnabled: enabled });
    updateStatusText(enabled);
    notifyContentScript();
  });

  // Schedule Inputs
  const scheduleInputs = ['schedule-start', 'schedule-end', 'scheduleBlockEnabled'];
  scheduleInputs.forEach(id => {
    document.getElementById(id).addEventListener('change', async () => {
      const settings = {
        scheduleBlockStart: document.getElementById('schedule-start').value,
        scheduleBlockEnd: document.getElementById('schedule-end').value,
        scheduleBlockEnabled: document.getElementById('scheduleBlockEnabled').checked
      };
      await saveSettings(settings);
      notifyContentScript();
    });
  });

  // Settings Toggles
  TOGGLES_LIST.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', async (e) => {
        await saveSettings({ [id]: e.target.checked });
        notifyContentScript();
      });
    }
  });

  // Home Page Redirect
  document.getElementById('homePageRedirect').addEventListener('change', async (e) => {
    await saveSettings({ homePageRedirect: e.target.value });
    notifyContentScript();
  });

  // API Key
  document.getElementById('saveApiKey').addEventListener('click', async () => {
    const key = document.getElementById('geminiApiKey').value;
    const providerNow = document.getElementById('aiProvider').value;
    const modelNow = document.getElementById('aiModel').value;
    const current = await loadSettings();
    const byProvider = Object.assign({}, current.aiModelByProvider || {});
    byProvider[providerNow] = modelNow;
    const settingsToSave = {
      geminiApiKey: key,
      openaiApiKey: document.getElementById('openaiApiKey').value,
      mistralApiKey: document.getElementById('mistralApiKey').value,
      deepseekApiKey: document.getElementById('deepseekApiKey').value,
      grokApiKey: document.getElementById('grokApiKey').value,
      aiProvider: providerNow,
      aiModel: modelNow,
      aiModelByProvider: byProvider
    };
    await saveSettings(settingsToSave);
    showFeedback('saveApiKey', 'Key Saved!');
    notifyContentScript();
  });

  const providerSel2 = document.getElementById('aiProvider');
  if (providerSel2) {
    providerSel2.addEventListener('change', async (e) => {
      const p = e.target.value;
      const s = await loadSettings();
      const byProvider = s.aiModelByProvider || {};
      const defaults = s.aiProviderDefaultModels || {
        gemini: 'gemini-pro',
        openai: 'gpt-4o-mini',
        mistral: 'mistral-small',
        deepseek: 'deepseek-chat',
        grok: 'grok-2-mini'
      };
      const modelVal = byProvider[p] || s.aiModel || (p === 'gemini' ? s.geminiModel : '') || defaults[p] || defaults.gemini;
      const aiModelInput = document.getElementById('aiModel');
      if (aiModelInput) aiModelInput.value = modelVal;
      await saveSettings({ aiProvider: p, aiModel: modelVal });
      notifyContentScript();
    });
  }
  const tlSel = document.getElementById('transcriptLang');
  if (tlSel) {
    tlSel.addEventListener('change', async (e) => {
      await saveSettings({ transcriptLang: e.target.value });
      notifyContentScript();
    });
  }
}

/**
 * Blocking Logic Listeners
 */
function addBlockingListeners() {
  const buttons = {
    'block-5min': 5,
    'block-15min': 15,
    'block-30min': 30,
    'block-1hr': 60
  };

  Object.entries(buttons).forEach(([id, minutes]) => {
    document.getElementById(id).addEventListener('click', () => setTempBlock(minutes));
  });

  document.getElementById('block-custom').addEventListener('click', () => {
    const mins = parseInt(document.getElementById('custom-block-duration').value);
    if (mins > 0) setTempBlock(mins);
  });
}

/**
 * Keyword Blocklist UI
 */
function renderBlockedKeywords(list) {
  const container = document.getElementById('blockedKeywordsList');
  if (!container) return;
  container.innerHTML = '';
  (list || []).forEach(k => {
    const wrapper = document.createElement('span');
    wrapper.className = 'yfp-tag';
    const text = document.createElement('span');
    text.textContent = k;
    const remove = document.createElement('button');
    remove.textContent = '✕';
    remove.dataset.keyword = k;
    remove.className = 'yfp-tag-remove';
    wrapper.appendChild(text);
    wrapper.appendChild(remove);
    container.appendChild(wrapper);
  });
}

async function addKeywordBlocklistListeners() {
  const addBtn = document.getElementById('addBlockedKeyword');
  const input = document.getElementById('blockedKeywordInput');
  const listEl = document.getElementById('blockedKeywordsList');

  if (addBtn && input) {
    addBtn.addEventListener('click', async () => {
      const val = (input.value || '').trim();
      if (!val) return;
      const current = (await loadSettings()).blockedKeywords || [];
      if (!current.includes(val)) {
        const next = [...current, val];
        await saveSettings({ blockedKeywords: next });
        renderBlockedKeywords(next);
        notifyContentScript();
      }
      input.value = '';
    });
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  }

  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.yfp-tag-remove');
      if (!btn) return;
      const kw = btn.dataset.keyword;
      const current = (await loadSettings()).blockedKeywords || [];
      const next = current.filter(k => k !== kw);
      await saveSettings({ blockedKeywords: next });
      renderBlockedKeywords(next);
      notifyContentScript();
    });
  }
}

async function setTempBlock(minutes) {
  const until = Date.now() + (minutes * 60 * 1000);
  await saveSettings({ tempBlockUntil: until });
  notifyContentScript();
  
  // Visual feedback
  const btn = document.activeElement;
  if (btn && btn.classList.contains('timer-btn')) {
    const originalText = btn.textContent;
    btn.textContent = 'Blocked!';
    btn.classList.add('active');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('active');
    }, 2000);
  }
}

/**
 * Profile Logic Listeners
 */
function addProfileListeners() {
  document.getElementById('saveProfile').addEventListener('click', async () => {
    const settings = {
      profileName: document.getElementById('profileName').value,
      profileGoal: document.getElementById('profileGoal').value
    };
    await saveSettings(settings);
    populateProfile(settings); // Update display immediately
    showFeedback('saveProfile', 'Profile Saved!');
  });
}

/**
 * Helper: Notify Content Script
 */
async function notifyContentScript() {
  const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { action: 'reloadSettings' }).catch(() => {});
  }
}

/**
 * Helper: Show Feedback Button Animation
 */
function showFeedback(buttonId, message) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  const originalText = button.textContent;
  button.textContent = '✓ ' + message;
  button.style.background = 'var(--success-color)';
  
  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = '';
  }, 2000);
}
