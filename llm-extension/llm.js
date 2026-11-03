// llm.js : boucle de tool calling et planification, indépendantes du fournisseur.
// Tout ce qui est spécifique à OpenAI ou Anthropic est dans providers/.

import { getSettings, RECO_KEY, LLM_META_KEY } from './settings.js';
import { SYSTEM_PROMPT } from './prompt.js';
import { TOOL_DEFS, createToolRunner, defaultGetInstalled } from './tools.js';
import * as openai from './providers/openai.js';
import * as anthropic from './providers/anthropic.js';

export const PROVIDERS = { openai, anthropic };
export const PROVIDER = 'openai';          // fournisseur utilisé ; ajoute son adresse dans host_permissions du manifest
const MAX_STEPS = 8;                       // garde-fou : nombre maximum d'allers-retours avec le LLM
const FIRST_MESSAGE = 'Analyse mes usages agrégés et recommande ce qui m’est utile. Commence par get_user_patterns.';

// Recherche web « côté fournisseur », limitée aux mêmes sites que le catalogue.
// Désactivée par défaut : valide d'abord la boucle sans elle (elle ajoute de la latence et un coût), puis passe à true.
export const WEB_SEARCH = {
  enabled: false,
  maxUses: 2,
  allowedDomains: ['chromewebstore.google.com', 'developer.chrome.com', 'support.google.com'],
};

export const ANALYSIS_ALARM = 'llm-analysis';
const ANALYSIS_PERIOD_MIN = 24 * 60;       // une analyse par jour
const MIN_INTERVAL_MS = 12 * 3600 * 1000;  // jamais plus d'un appel toutes les 12 h (sauf force)

// ---------------------------------------------------------------------------
// Analyse : ne lance jamais d'exception, renvoie un statut (comme syncCatalog)
// ---------------------------------------------------------------------------

export async function runAnalysis({ force = false, deps = {}, provider = PROVIDER } = {}) {
  const settings = await getSettings();
  if (!settings.consent) return { status: 'skipped', reason: 'consentement manquant' };
  if (!settings.apiKey) return { status: 'skipped', reason: 'clé API manquante' };
  if (!Object.values(settings.share).some(Boolean)) return { status: 'skipped', reason: 'aucune catégorie partagée' };

  const meta = (await chrome.storage.local.get(LLM_META_KEY))[LLM_META_KEY] || {};
  if (!force && meta.lastRunAt && Date.now() - meta.lastRunAt < MIN_INTERVAL_MS) return { status: 'skipped', reason: 'analyse trop récente' };

  const startedAt = Date.now();
  // On note la tentative AVANT l'appel : même si ça échoue, on ne boucle pas en dépensant de l'argent
  await chrome.storage.local.set({ [LLM_META_KEY]: { ...meta, lastRunAt: startedAt } });

  const runner = createToolRunner(deps);
  const getInstalled = deps.getInstalled ?? defaultGetInstalled;
  const usage = { input_tokens: 0, output_tokens: 0, steps: 0 };

  try {
    const session = PROVIDERS[provider].createSession({
      apiKey: settings.apiKey, system: SYSTEM_PROMPT, toolDefs: TOOL_DEFS, firstMessage: FIRST_MESSAGE, webSearch: WEB_SEARCH,
    });

    for (let step = 0; step < MAX_STEPS; step++) {
      const turn = await session.next();
      usage.steps++;
      usage.input_tokens += turn.usage.input_tokens;
      usage.output_tokens += turn.usage.output_tokens;

      if (turn.pause) continue;                    // le serveur a mis un tour long en pause : on le laisse reprendre
      if (!turn.toolCalls.length) break;           // le LLM n'a demandé aucun outil : fini (ou bloqué)

      const results = [];
      for (const call of turn.toolCalls) {
        const out = await runner.run(call.name, call.input);
        results.push({ id: call.id, text: out.text, isError: out.isError });
      }
      session.addToolResults(results);
      if (runner.state.recommendations) break;     // submit_recommendations a été appelé : terminé
    }

    if (!runner.state.recommendations) throw new Error('le modèle n’a pas rendu de recommandations');

    // Filtre LOCAL : on retire ce que l'utilisateur a déjà installé, sans avoir transmis cette liste au LLM
    let installedIds = new Set();
    try { installedIds = new Set((await getInstalled()).map((e) => e.id)); } catch { /* permission absente : on ne filtre pas */ }
    const recommendations = runner.state.recommendations.filter((r) => !(r.extension_id && installedIds.has(r.extension_id)));

    const result = {
      generatedAt: new Date().toISOString(),
      recommendations,
      notes: runner.state.notes,
      proposed: runner.state.proposals.length,
    };
    await chrome.storage.local.set({
      [RECO_KEY]: result,
      [LLM_META_KEY]: { lastRunAt: startedAt, lastError: null, usage },
    });
    return { status: 'ok', ...result, usage };
  } catch (e) {
    let error = e.name === 'AbortError' ? 'délai dépassé' : String(e.message ?? e);
    error = error.split(settings.apiKey).join('[clé]'); // sécurité : la clé ne doit jamais finir dans un message stocké
    console.warn('[llm] analyse échouée :', error);
    try { await chrome.storage.local.set({ [LLM_META_KEY]: { lastRunAt: startedAt, lastError: error, usage } }); } catch { /* ignore */ }
    return { status: 'error', error };
  }
}

// Programme l'analyse périodique (comme setupCatalogAlarm pour le catalogue)
export function setupAnalysisAlarm() {
  chrome.alarms.create(ANALYSIS_ALARM, { delayInMinutes: 5, periodInMinutes: ANALYSIS_PERIOD_MIN });
}
