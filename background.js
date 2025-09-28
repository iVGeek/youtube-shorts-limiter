// Background service worker for YouTube Shorts Limiter

// Set default settings on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['limitType', 'limitValue'], (data) => {
    if (!data.limitType) {
      chrome.storage.sync.set({
        limitType: 'count',
        limitValue: 10,
        shortsWatched: 0,
        timeSpent: 0,
        lastReset: new Date().toDateString()
      });
    }
  });
});

// Check for daily reset
chrome.alarms.create('dailyReset', { periodInMinutes: 60 }); // Check every hour

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    const today = new Date().toDateString();
    
    chrome.storage.sync.get(['lastReset'], (data) => {
      if (data.lastReset !== today) {
        // Reset stats for new day
        chrome.storage.sync.set({
          shortsWatched: 0,
          timeSpent: 0,
          lastReset: today
        });
      }
    });
  }
});
