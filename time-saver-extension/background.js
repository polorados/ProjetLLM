// Service worker : reçoit les événements, les met en tampon, puis les écrit dans IndexedDB.
import { addEvents, purgeOlderThan } from './db.js';

const BUFFER_KEY = 'buffer';
const MAX_BUFFER = 50;          // flush anticipé si le tampon atteint cette taille
const RETENTION_DAYS = 7;       // durée de conservation des événements bruts
const SENSITIVE = ['bank', 'banque', 'paypal', 'impots.gouv', 'ameli', 'doctolib', 'mail.google', 'outlook'];

const isSensitive = (domain) => SENSITIVE.some((s) => domain.includes(s));

function domainOf(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname : null;
  } catch { return null; }
}

async function hasConsent() {
  const { consent } = await chrome.storage.local.get('consent');
  return consent === true;
}

// File d'attente : évite les accès concurrents (lecture/écriture) au tampon
let queue = Promise.resolve();
const enqueue = (fn) => (queue = queue.then(fn).catch((e) => console.error(e)));

async function flushNow() {
  const { [BUFFER_KEY]: buffer = [] } = await chrome.storage.session.get(BUFFER_KEY);
  if (!buffer.length) return;
  await addEvents(buffer);                           // persistance dans IndexedDB
  await chrome.storage.session.set({ [BUFFER_KEY]: [] }); // vidage seulement si l'écriture a réussi
}

function pushEvent(evt) {
  return enqueue(async () => {
    if (!(await hasConsent())) return;
    if (!evt.domain || isSensitive(evt.domain)) return;
    const { [BUFFER_KEY]: buffer = [] } = await chrome.storage.session.get(BUFFER_KEY);
    buffer.push({ ts: Date.now(), ...evt });
    await chrome.storage.session.set({ [BUFFER_KEY]: buffer });
    if (buffer.length >= MAX_BUFFER) await flushNow();
  });
}

// --- Événements venant des content scripts ---
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'EVENT' || !sender.tab || sender.tab.incognito) return;
  const domain = domainOf(sender.tab.url);
  pushEvent({ type: msg.event.type, domain, details: msg.event.details || {} });
});

// --- Changement d'onglet ---
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.incognito) return;
    pushEvent({ type: 'tab_switch', domain: domainOf(tab.url), details: {} });
  } catch { /* onglet déjà fermé */ }
});

// --- Navigation (inclut les changements d'URL des SPA) ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url || tab.incognito) return;
  pushEvent({ type: 'navigation', domain: domainOf(changeInfo.url), details: {} });
});

// --- Alarmes : flush régulier + purge ---
function setupAlarms() {
  chrome.alarms.create('flush', { periodInMinutes: 1 });
  chrome.alarms.create('purge', { periodInMinutes: 60 });
}
chrome.runtime.onInstalled.addListener(setupAlarms);
chrome.runtime.onStartup.addListener(setupAlarms);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flush') enqueue(flushNow);
  if (alarm.name === 'purge') enqueue(() => purgeOlderThan(Date.now() - RETENTION_DAYS * 86400000));
});
