// background.js (MV3 service worker)
const MRU_KEY = 'mru';
const SETTINGS_KEY = 'settings';
const DEFAULT_SERVER_URL = 'ws://127.0.0.1:8080/ws';

async function ensureClientId() {
  const { clientId } = await chrome.storage.local.get({ clientId: null });
  if (!clientId) {
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ clientId: id });
  }
}

async function ensureSettings() {
  const { settings } = await chrome.storage.local.get({ settings: null });
  if (!settings) {
    await chrome.storage.local.set({ settings: { serverUrl: DEFAULT_SERVER_URL, token: '', label: '' } });
  }
}

// Maintain MRU list
async function pushMRU(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const store = await chrome.storage.local.get({ [MRU_KEY]: [] });
    const mru = store[MRU_KEY] || [];
    const filtered = mru.filter(x => x.tabId !== tabId);
    filtered.unshift({
      tabId, windowId: tab.windowId, url: tab.url || '', title: tab.title || '', ts: Date.now()
    });
    const out = filtered.slice(0, 50);
    await chrome.storage.local.set({ [MRU_KEY]: out });
    // notify offscreen to forward
    chrome.runtime.sendMessage({ kind: 'mru', mru: out }).catch(() => {});
  } catch(e) {
    // tab may not exist
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => pushMRU(tabId));
chrome.windows.onFocusChanged.addListener(async (wid) => {
  if (wid === chrome.windows.WINDOW_ID_NONE) return;
  const [active] = await chrome.tabs.query({ active: true, windowId: wid });
  if (active?.id) pushMRU(active.id);
});

// Offscreen document management
async function ensureOffscreen() {
  try {
    const has = await chrome.offscreen.hasDocument?.();
    if (!has) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['BLOBS'],
        justification: 'Maintain persistent WebSocket to command server.'
      });
    }
  } catch (e) {
    // If hasDocument not supported, try create and ignore error if exists
    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['BLOBS'],
        justification: 'Maintain persistent WebSocket to command server.'
      });
    } catch (e2) {}
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureClientId();
  await ensureSettings();
  await ensureOffscreen();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureClientId();
  await ensureSettings();
  await ensureOffscreen();
});

// Simple command relay for popup to ask for info
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.kind === 'getInfo') {
      const { clientId, settings } = await chrome.storage.local.get({ clientId: '', settings: {} });
      sendResponse({ clientId, settings });
    }
  })();
  return true;
});
