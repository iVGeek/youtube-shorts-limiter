// DOM elements
const progressFill = document.getElementById('progressFill');
const shortsWatched = document.getElementById('shortsWatched');
const timeSpent = document.getElementById('timeSpent');
const limitType = document.getElementById('limitType');
const limitValue = document.getElementById('limitValue');
const limitUnit = document.getElementById('limitUnit');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

// Load settings and stats
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['limitType', 'limitValue', 'shortsWatched', 'timeSpent'], (data) => {
    // Set limit type
    if (data.limitType) {
      limitType.value = data.limitType;
      updateLimitUnit();
    }
    
    // Set limit value
    if (data.limitValue) {
      limitValue.value = data.limitValue;
    }
    
    // Set stats
    if (data.shortsWatched) {
      shortsWatched.textContent = data.shortsWatched;
    }
    
    if (data.timeSpent) {
      timeSpent.textContent = formatTime(data.timeSpent);
    }
    
    // Update progress bar
    updateProgressBar(data);
  });
});

// Update limit unit based on type
function updateLimitUnit() {
  limitUnit.textContent = limitType.value === 'count' ? 'shorts' : 'minutes';
}

limitType.addEventListener('change', updateLimitUnit);

// Save settings
saveBtn.addEventListener('click', () => {
  const settings = {
    limitType: limitType.value,
    limitValue: parseInt(limitValue.value)
  };
  
  chrome.storage.sync.set(settings, () => {
    // Show confirmation
    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
      saveBtn.textContent = 'Save Settings';
    }, 1000);
    
    // Update progress bar
    chrome.storage.sync.get(['shortsWatched', 'timeSpent'], (data) => {
      updateProgressBar({...data, ...settings});
    });
  });
});

// Reset today's stats
resetBtn.addEventListener('click', () => {
  chrome.storage.sync.set({
    shortsWatched: 0,
    timeSpent: 0,
    lastReset: new Date().toDateString()
  }, () => {
    shortsWatched.textContent = '0';
    timeSpent.textContent = '0m';
    progressFill.style.width = '0%';
    
    // Notify content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0].url.includes('youtube.com')) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'resetStats'});
      }
    });
  });
});

// Format time in minutes to readable format
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

// Update progress bar based on current stats and limits
function updateProgressBar(data) {
  if (!data.limitType || !data.limitValue) return;
  
  let progress = 0;
  
  if (data.limitType === 'count' && data.shortsWatched) {
    progress = Math.min((data.shortsWatched / data.limitValue) * 100, 100);
  } else if (data.limitType === 'time' && data.timeSpent) {
    progress = Math.min((data.timeSpent / data.limitValue) * 100, 100);
  }
  
  progressFill.style.width = `${progress}%`;
  
  // Change color based on progress
  if (progress >= 90) {
    progressFill.style.background = '#ff0000';
  } else if (progress >= 70) {
    progressFill.style.background = '#ffa500';
  } else {
    progressFill.style.background = '#3ea6ff';
  }
}
