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

/* event-tab-date()-random() : { 
    'created / activated / updated / removed': {
      id: id()
      url: url()
      info: info()
    }
 }  */ 
let events: TabEvent[] = [];

export async function loadTabEvents(): Promise<TabEvent[]> {
    const all = await chrome.storage.local.get(null);
    const keys: string[] = [];

    events = [];

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
            name,
            id: data.id,
            url: typeof data.url === "string" ? data.url : null,
            info: data.info == null ? null : {
                title: typeof rawInfo.title === "string" ? rawInfo.title : null,
                status: typeof rawInfo.status === "number" ? rawInfo.status : null,
            },
        });

        keys.push(key);
    }

    await chrome.storage.local.remove(keys);

    return events.sort((a, b) => a.time - b.time);
}



/* aggregate per id : 
    {
        id1 : [time_stamp: created, time_stamp: activated, ...],
        id2 : [time_stamp: created, time_stamp: closed, ...],
    }
*/
export async function per_id(): Promise<PerIdResult> {
  await loadTabEvents();

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
export async function per_event(): Promise<PerEventResult> {
  await loadTabEvents();

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
export async function per_url(): Promise<PerUrlResult> {
  await loadTabEvents();

  const urls = new Set<string>();
  for (const { url } of events) {
    if (url) urls.add(url);
  }

  return [...urls];
}