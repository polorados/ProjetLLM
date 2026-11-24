import type {
  TabEvent,
  EventName,
  PerIdResult,
  PerEventResult,
  PerUrlResult,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEventName(value: string): value is EventName {
  return ["created", "activated", "updated", "closed"].includes(value);
}

// Read storage once, keep only tab events, sort chronologically
export function getUser(id:string, name:string) {
    return { id, name };
}


/*
Array{
  Dict{
   str:Dict{
    str:Dict{
      id:str,url:str,info:str
    }
   }
  }
}

*/

/* event-tab-date()-random() : { 
    'created / activated / updated / removed': {
      id: id()
      url: url()
      info: info()
    }
 }  */ 
export async function load_events(): Promise<TabEvent[]> {
    const all = await chrome.storage.local.get(null);
    const events: TabEvent[] = [];

    for (const [key, record] of Object.entries(all)) {
        const match = key.match(/^event-tab-(\d+)-[a-f0-9]{4}$/i);

        if (!match || !isRecord(record)) continue;

        const name = Object.keys(record)[0];
        if (!name || !isEventName(name)) continue;

        const data = record[name];

        if (!isRecord(data) || typeof data.id !== "number") continue;

        const rawInfo = isRecord(data.info) ? data.info : {};

        events.push({
            time: Number(match[1]),
            name: name,
            id: data.id,
            url: typeof data.url === "string" ? data.url : null,
            info: data.info == null ? null : {
                title: typeof rawInfo.title === "string" ? rawInfo.title : null,
                status: typeof rawInfo.status === "number" ? rawInfo.status : null,
            },
        });
    }

    return events.sort((a, b) => a.time - b.time);
}
/* aggregate per id : 
    {
        id1 : [time_stamp: created, time_stamp: activated, ...],
        id2 : [time_stamp: created, time_stamp: closed, ...],
    }
*/
/**
 * Agrège les événements par identifiant.
 * Si events est omis, utilise tous les événements enregistrés.
 *
 * @param {Array<{
 *   time: number,
 *   name: "created"|"activated"|"updated"|"closed",
 *   id: number,
 *   url: string|null,
 *   info: Object|null
 * }>} [events=[]] - Liste des événements à agréger.
 *
 * @returns {Object} Événements regroupés par identifiant.
 */
export async function per_id(
  events?: TabEvent[]
): Promise<PerIdResult> {
  events ??= await load_events();

  const out: PerIdResult = {};

  for (const event of events) {
    (out[event.id] ??= []).push({
      time: event.time,
      name: event.name,
    });
  }

  return out;
}

/* aggregate per event : 
    {   
        activated: [time_stamp1, time_stamp2, ...],
        created: [time_stamp1, ...]
    }
*/
/**
 * Agrège les événements par événement.
 * Si events est omis, utilise tous les événements enregistrés.
 *
 * @param {Array<{
 *   time: number,
 *   name: "created"|"activated"|"updated"|"closed",
 *   id: number,
 *   url: string|null,
 *   info: Object|null
 * }>} [events=[]] - Liste des événements à agréger.
 *
 * @returns {Object} Événements regroupés par événements.
 */
export async function per_event(
  events?: TabEvent[]
): Promise<PerEventResult> {
  events ??= await load_events();

  const out: PerEventResult = {
    created: [],
    activated: [],
    updated: [],
    closed: [],
  };

  for (const { time, name } of events) {
    out[name].push(time);
  }

  return out;
}


/* aggregate per url in chronological order: 
    [url1, url2, ...]
*/
/**
 * Agrège les événements par URL.
 * Si events est omis, utilise tous les événements enregistrés.
 *
 * @param {Array<{
 *   time: number,
 *   name: "created"|"activated"|"updated"|"closed",
 *   id: number,
 *   url: string|null,
 *   info: Object|null
 * }>} [events=[]] - Liste des événements à agréger.
 *
 * @returns {Object} Événements regroupés par URL.
 */
export async function per_url(
  events?: TabEvent[]
): Promise<PerUrlResult> {
  events ??= await load_events();

  const urls = new Set<string>();
  for (const { url } of events) {
    if (url) urls.add(url);
  }

  return [...urls];
}