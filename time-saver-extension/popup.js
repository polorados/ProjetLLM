import { countEvents, getAllEvents, clearAll } from './db.js';

const consentEl = document.getElementById('consent');
const countEl = document.getElementById('count');

async function refresh() {
  countEl.textContent = await countEvents();
}

(async () => {
  const { consent } = await chrome.storage.local.get('consent');
  consentEl.checked = consent === true;
  await refresh();
})();

consentEl.addEventListener('change', () => {
  chrome.storage.local.set({ consent: consentEl.checked });
});

document.getElementById('refresh').addEventListener('click', refresh);

document.getElementById('export').addEventListener('click', async () => {
  const events = await getAllEvents();
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('clear').addEventListener('click', async () => {
  if (!confirm('Supprimer définitivement toutes les données capturées ?')) return;
  await clearAll();
  await chrome.storage.session.remove('buffer');
  await refresh();
});
