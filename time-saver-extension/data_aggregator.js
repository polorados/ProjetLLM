/* event-tab-date()-random() : { 
    'created / activated / updated / removed': {
      id: id()
      url: url()
      info: info()
    }
 }  */
// Read storage once, keep only tab events, sort chronologically
async function load_events() {
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
async function per_id(events) {
  events ??= await load_events();
  const out = {};
  for (const { time, name, data } of events) (out[data.id] ??= []).push({ time, name });
  return out;
}

/* aggregate per event : 
    {   
        activated: [time_stamp1, time_stamp2, ...],
        created: [time_stamp1, ...]
    }
*/
async function per_event(events) {
  events ??= await load_events();
  const out = {};
  for (const { time, name } of events) (out[name] ??= []).push(time);
  return out;
}


/* aggregate per url in chronological order: 
    [url1, url2, ...]
*/
async function per_url(events) {
  events ??= await load_events();
  const urls = new Set();
  for (const { url } of events) if (url) urls.add(url);
  return [...urls];
}

// Usage: load once, reuse for all three
const events = await load_events();
const [ids, evts, urls] = await Promise.all([per_id(events), per_event(events), per_url(events)]);
