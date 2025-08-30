document.getElementById('openOptions').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
chrome.runtime.sendMessage({ kind: 'getInfo' }, (resp) => {
  document.getElementById('clientId').textContent = resp?.clientId || '(unset)';
});
