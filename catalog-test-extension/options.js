// options.js : relie la page options.html à settings.js (lire le formulaire, enregistrer, exporter, supprimer).

import { SHARE_CATEGORIES, getSettings, saveSettings, exportUserData, deleteUserData } from './settings.js';

const $ = (id) => document.getElementById(id);
const consent = $('consent');
const apiKey = $('apiKey');
const showKey = $('showKey');
const shareSet = $('shareSet');
const status = $('status');

// Une case à cocher par catégorie de SHARE_CATEGORIES (une seule liste à maintenir, dans settings.js)
const shareInputs = {};
for (const [key, label] of Object.entries(SHARE_CATEGORIES)) {
  const wrap = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  wrap.append(input, ' ', label); // append(texte) n'interprète pas le HTML : pas de risque d'injection
  $('share').append(wrap);
  shareInputs[key] = input;
}

let statusTimer;
function flash(message) {
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.textContent = ''; }, 3000);
}

// Les cases de partage ne sont utilisables que si le consentement est donné
function updateEnabled() {
  shareSet.disabled = !consent.checked;
}

// Affiche des réglages dans le formulaire
function render(settings) {
  consent.checked = settings.consent;
  apiKey.value = settings.apiKey;
  for (const [key, input] of Object.entries(shareInputs)) input.checked = settings.share[key];
  updateEnabled();
}

// Lit le formulaire
function readForm() {
  const share = {};
  for (const [key, input] of Object.entries(shareInputs)) share[key] = input.checked;
  return { consent: consent.checked, apiKey: apiKey.value, share };
}

consent.addEventListener('change', updateEnabled);
showKey.addEventListener('change', () => { apiKey.type = showKey.checked ? 'text' : 'password'; });

$('save').addEventListener('click', async () => {
  render(await saveSettings(readForm())); // on réaffiche la version nettoyée (clé « trimée », etc.)
  flash('Réglages enregistrés');
});

$('export').addEventListener('click', async () => {
  const data = await exportUserData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mes-donnees-catalogue.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('delete').addEventListener('click', async () => {
  if (!confirm('Supprimer définitivement tes réglages (clé API comprise) et les données collectées ?')) return;
  await deleteUserData();
  render(await getSettings()); // revient aux valeurs par défaut
  flash('Données supprimées');
});

render(await getSettings());