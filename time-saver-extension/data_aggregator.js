/* event-tab-date()-random() : { 
    'created / activated / updated / removed': {
      id: id()
      url: url()
      info: info()
    }
 }  */

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
// Read storage once, keep only tab events, sort chronologically
export async function load_events() {
  const all = await chrome.storage.local.get(null);
  const events = [];

  for (const [key, record] of Object.entries(all)) {
    const m = /^event-tab-(\d+)-[a-f0-9]{4}$/i.exec(key);
    if (!m) continue;

    const name = Object.keys(record)[0];          // created / activated / updated / removed
    events.push({ time: Number(m[1]), name, ...record[name] });  // -> { time, name, id, url, info }
  }  
  return events.sort((a, b) => a.time - b.time);
}



/* aggregate per id : 
    {
        id1 : [time_stamp: created, time_stamp: activated, ...],
        id2 : [time_stamp: created, time_stamp: closed, ...],
    }
*/
export async function per_id(events) {
  events ??= await load_events();

  const out = {};

  for (const event of events) {
    const time = Number(event._time);
    const [name, data] = Object.entries(event)
      .filter(([key]) => key !== "_time")[0] ?? [];

    if (!data || data.id == null) continue;

    (out[data.id] ??= []).push({ time, name });
  }

  return out;
}

/* aggregate per event : 
    {   
        activated: [time_stamp1, time_stamp2, ...],
        created: [time_stamp1, ...]
    }
*/
export async function per_event(events) {
  events ??= await load_events();
  const out = {};
  for (const { time, name } of events) (out[name] ??= []).push(time);
  return out;
}


/* aggregate per url in chronological order: 
    [url1, url2, ...]
*/
export async function per_url(events) {
  events ??= await load_events();
  const urls = new Set();
  for (const { url } of events) if (url) urls.add(url);
  return [...urls];
}
