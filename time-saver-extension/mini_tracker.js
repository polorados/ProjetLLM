// event-type-date()-random() : { 
//    name: data
// }
function save(type, name, data) {
  console.log(type, name, data);
  chrome.storage.local.set({ 
    [`event-${type}-${Math.floor(Date.now())}-${crypto.randomUUID().slice(0, 4)}`]:
    { 
      [name]:data, 
    } 
  });
}

/* event-tab-date()-random() : { 
    'created / activated / updated / removed': {
      id: id()
      url: url()
      info: info()
    }
 }  */
function track_tabs() {
  chrome.tabs.onCreated.addListener((tab)              => save('tab', 'created',  { id: tab.id,           url: tab.url, info: null }));
  chrome.tabs.onActivated.addListener((activeInfo)     => save('tab', 'activated',{ id: activeInfo.tabId, url: null,    info: null }));
  chrome.tabs.onUpdated.addListener((tabId, info, tab) => save('tab', 'updated',  { id: tabId,            url: tab.url, info: info }));
  chrome.tabs.onRemoved.addListener((tabId)            => save('tab', 'closed',   { id: tabId,            url: null,    info: null }));
}

track_tabs()