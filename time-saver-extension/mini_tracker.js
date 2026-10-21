// event-type-date()-random() : { 
//    time:time()
//    type: type,
//    name: name
//    data: ...
// }
function save(type, name, data) {
  console.log(type, name, data);
  chrome.storage.local.set({ 
    [`event-${type}-${Date.now()}-${Math.random()}`]: { 
      time: Date.now(), 
      type:type, 
      name:name, 
      data:data 
    } 
  });
}

// event-tab-date()-random() : { 
//    time:time()
//    type: 'tab',
//    name: 'tab created / activated / updated / remvoed'
//    data: {
//      id: id()
//      url: url()
//    }
// }
function track_tabs() {
  chrome.tabs.onCreated.addListener((tab)              => save('tab', 'tab created',  { id: tab.id,     url: tab.url }));
  chrome.tabs.onActivated.addListener((activeInfo)     => save('tab', 'tab activated',{ id: activeInfo.tabId, url: null }));
  chrome.tabs.onUpdated.addListener((tabId, info, tab) => save('tab', 'tab updated',  { id: tabId,      url: tab.url }));
  chrome.tabs.onRemoved.addListener((tabId)            => save('tab', 'tab closed',   { id: tabId,      url: null }));
}