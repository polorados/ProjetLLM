// Petite couche IndexedDB (sans bibliothèque). Utilisée par le service worker et le popup.
const DB_NAME = 'behavior-db';
const STORE = 'events';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('ts', 'ts');
      store.createIndex('domain', 'domain');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Exécute fn(store) dans une transaction et renvoie le résultat de la requête retournée
async function run(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req ? req.result : undefined); };
    t.onerror = t.onabort = () => { db.close(); reject(t.error); };
  });
}

export function addEvents(events) {
  return run('readwrite', (store) => { events.forEach((e) => store.add(e)); });
}

export function countEvents() {
  return run('readonly', (store) => store.count());
}

export function getAllEvents() {
  return run('readonly', (store) => store.getAll());
}

export function clearAll() {
  return run('readwrite', (store) => store.clear());
}

// Supprime les événements plus anciens que le timestamp donné
export function purgeOlderThan(ts) {
  return run('readwrite', (store) => {
    const cursorReq = store.index('ts').openCursor(IDBKeyRange.upperBound(ts));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
  });
}
