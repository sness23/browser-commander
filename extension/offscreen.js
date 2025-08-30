// offscreen.js - maintains persistent WebSocket connection and executes commands
let ws = null;
let hbTimer = null;
let reconnectTimer = null;

const HEARTBEAT_MS = 15000;
const RECONNECT_MS = 3000;

async function getState() {
  try {
    // Request state from background script since offscreen may not have storage access
    const response = await chrome.runtime.sendMessage({ kind: 'getState' });
    if (response && response.clientId) {
      return response;
    }
  } catch (error) {
    console.warn('Failed to get state from background:', error);
  }
  
  // Fallback with defaults if all else fails
  return {
    clientId: crypto.randomUUID(),
    settings: { serverUrl: 'ws://127.0.0.1:8080/ws', token: '', label: 'Unknown Client' },
    mru: []
  };
}

async function connect() {
  clearTimeout(reconnectTimer);
  const { clientId, settings, mru } = await getState();
  const serverUrl = settings.serverUrl || 'ws://127.0.0.1:8080/ws';
  try {
    ws = new WebSocket(serverUrl);
  } catch (e) {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    const hello = {
      kind: 'hello',
      clientId,
      label: settings.label || '',
      token: settings.token || '',
      platform: navigator.platform,
      version: '0.1.0',
      ts: Date.now(),
      mru
    };
    ws.send(JSON.stringify(hello));
    hbTimer = setInterval(() => {
      try { ws?.send(JSON.stringify({ kind: 'hb', ts: Date.now() })); } catch {}
    }, HEARTBEAT_MS);
  };

  ws.onmessage = async (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.kind === 'openUrl') {
        const target = msg.newTab
          ? await chrome.tabs.create({ url: msg.url, active: !!msg.foreground })
          : await focusOrUpdateActive(msg.url, !!msg.foreground);
        respond({ kind: 'ack', cmd: msg.kind, ok: true, tabId: target?.id || null });
      } else if (msg.kind === 'listTabs') {
        const tabs = await chrome.tabs.query({});
        respond({ kind: 'tabs', tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title, windowId: t.windowId })) });
      } else if (msg.kind === 'focusTab') {
        const ok = await focusByHint(msg);
        respond({ kind: 'ack', cmd: msg.kind, ok });
      } else if (msg.kind === 'closeTab') {
        const ok = await closeByHint(msg);
        respond({ kind: 'ack', cmd: msg.kind, ok });
      } else if (msg.kind === 'runScript') {
        const ok = await runSafeScript(msg);
        respond({ kind: 'ack', cmd: msg.kind, ok });
      } else if (msg.kind === 'requestMRU') {
        // Get MRU from background script instead of direct storage access
        try {
          const response = await chrome.runtime.sendMessage({ kind: 'getMRU' });
          respond({ kind: 'mru', mru: response.mru || [], ts: Date.now() });
        } catch (error) {
          console.warn('Failed to get MRU from background:', error);
          respond({ kind: 'mru', mru: [], ts: Date.now() });
        }
      }
    } catch (e) {
      console.warn('bad message', e);
    }
  };

  ws.onclose = () => {
    clearInterval(hbTimer);
    scheduleReconnect();
  };
  ws.onerror = () => {
    try { ws.close(); } catch {}
  };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, RECONNECT_MS);
}

function respond(obj) {
  try { ws?.send(JSON.stringify(obj)); } catch {}
}

async function focusOrUpdateActive(url, foreground) {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active) {
    await chrome.tabs.update(active.id, { url });
    if (foreground) { await chrome.windows.update(active.windowId, { focused: true }); }
    return active;
  } else {
    return chrome.tabs.create({ url, active: !!foreground });
  }
}

async function focusByHint({ tabId, urlContains }) {
  if (tabId) {
    const t = await chrome.tabs.get(tabId).catch(() => null);
    if (!t) return false;
    await chrome.tabs.update(t.id, { active: true });
    await chrome.windows.update(t.windowId, { focused: true });
    return true;
  }
  const tabs = await chrome.tabs.query({});
  const found = tabs.find(t => (t.url || '').includes(urlContains || ''));
  if (!found) return false;
  await chrome.tabs.update(found.id, { active: true });
  await chrome.windows.update(found.windowId, { focused: true });
  return true;
}

async function closeByHint({ tabId, urlContains }) {
  if (tabId) { await chrome.tabs.remove(tabId); return true; }
  const tabs = await chrome.tabs.query({});
  const found = tabs.find(t => (t.url || '').includes(urlContains || ''));
  if (!found) return false;
  await chrome.tabs.remove(found.id);
  return true;
}

async function runSafeScript({ code, match }) {
  // Restrict execution to tabs that match the provided pattern.
  if (!match) return false;
  
  // Validate input parameters
  if (typeof code !== 'string' || code.trim().length === 0) {
    console.warn('runSafeScript: Invalid or empty code');
    return false;
  }
  
  if (typeof match !== 'string' || match.trim().length === 0) {
    console.warn('runSafeScript: Invalid or empty match pattern');
    return false;
  }
  
  // Additional safety: limit code length to prevent abuse
  if (code.length > 10000) {
    console.warn('runSafeScript: Code too long, rejecting');
    return false;
  }
  
  try {
    const targets = await chrome.tabs.query({ url: match });
    if (!targets.length) return false;
    const [{ id }] = targets;
    await chrome.scripting.executeScript({ target: { tabId: id }, func: new Function(code) });
    return true;
  } catch (error) {
    console.warn('runSafeScript: Error executing script', error);
    return false;
  }
}

// Receive MRU updates from background and forward to server
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.kind === 'mru') {
    respond({ kind: 'mru', mru: msg.mru, ts: Date.now() });
  }
});

connect();
