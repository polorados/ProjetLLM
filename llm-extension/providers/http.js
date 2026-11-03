// providers/http.js : POST JSON avec délai maximal et erreurs lisibles (commun à tous les fournisseurs).

// Chrome tue le service worker si une réponse met plus de 30 s à arriver : on abandonne avant, proprement.
export const REQUEST_TIMEOUT_MS = 25_000;

export async function postJson(url, headers, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const e = (await res.json())?.error;
      detail = [e?.type, e?.code, e?.message].filter(Boolean).join(' ').slice(0, 300);
    } catch { /* corps non JSON : on ignore */ }
    throw new Error(res.status === 401 ? 'clé API refusée (401)' : `API ${res.status} ${detail}`.trim());
  }
  return res.json();
}
