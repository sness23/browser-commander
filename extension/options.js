async function load() {
  const { clientId, settings } = await chrome.storage.local.get({ clientId: '', settings: { serverUrl:'', token:'', label:'' } });
  document.getElementById('serverUrl').value = settings.serverUrl || 'ws://127.0.0.1:8080/ws';
  document.getElementById('label').value = settings.label || '';
  document.getElementById('token').value = settings.token || '';
  document.getElementById('clientId').value = clientId || '';
}
async function save() {
  const serverUrl = document.getElementById('serverUrl').value.trim();
  const label = document.getElementById('label').value.trim();
  const token = document.getElementById('token').value.trim();
  await chrome.storage.local.set({ settings: { serverUrl, label, token } });
  document.getElementById('status').textContent = 'Saved. The offscreen connection will reconnect automatically.';
  setTimeout(() => document.getElementById('status').textContent = '', 2500);
}
document.getElementById('save').addEventListener('click', save);
load();
