// YouTube Shorts Limiter Content Script

class ShortsLimiter {
  constructor() {
    this.shortsWatched = 0;
    this.timeSpent = 0; // in minutes
    this.limitType = 'count';
    this.limitValue = 10;
    this.isBlocked = false;
    this.currentShortId = null;
    this.startTime = null;
    this.timer = null;
    
    this.init();
  }
  
  async init() {
    // Load settings and stats
    await this.loadSettings();
    
    // Check if we need to reset daily stats
    this.checkDailyReset();
    
    // Start observing YouTube page changes
    this.observePageChanges();
    
    // Check current page
    this.checkCurrentPage();
  }
  
  // Load settings from storage
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'limitType', 
        'limitValue', 
        'shortsWatched', 
        'timeSpent',
        'lastReset'
      ], (data) => {
        if (data.limitType) this.limitType = data.limitType;
        if (data.limitValue) this.limitValue = data.limitValue;
        if (data.shortsWatched) this.shortsWatched = data.shortsWatched;
        if (data.timeSpent) this.timeSpent = data.timeSpent;
        resolve();
      });
    });
  }
  
  // Check if we need to reset daily stats
  checkDailyReset() {
    const today = new Date().toDateString();
    chrome.storage.sync.get(['lastReset'], (data) => {
      if (data.lastReset !== today) {
        // Reset stats for new day
        this.shortsWatched = 0;
        this.timeSpent = 0;
        this.saveStats();
        chrome.storage.sync.set({lastReset: today});
      }
    });
  }
  
  // Observe page changes for SPA navigation
  observePageChanges() {
    const observer = new MutationObserver(() => {
      this.checkCurrentPage();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Check if current page is a Shorts page
  checkCurrentPage() {
    const isShortsPage = window.location.pathname.includes('/shorts/');
    
    if (isShortsPage) {
      this.handleShortsPage();
    } else {
      this.cleanupShortTracking();
    }
  }
  
  // Handle Shorts page
  handleShortsPage() {
    const shortId = this.extractShortId();
    
    // If this is a new short, start tracking
    if (shortId && shortId !== this.currentShortId) {
      this.cleanupShortTracking();
      this.currentShortId = shortId;
      this.startTracking();
    }
    
    // Check if limit is reached
    this.checkLimit();
  }
  
  // Extract Short ID from URL
  extractShortId() {
    const match = window.location.pathname.match(/\/shorts\/([^/?]+)/);
    return match ? match[1] : null;
  }
  
  // Start tracking a short
  startTracking() {
    // Check if we've already watched this short today
    if (this.hasWatchedThisShort()) return;
    
    // Increment shorts watched count
    this.shortsWatched++;
    this.saveStats();
    
    // Start time tracking
    this.startTime = Date.now();
    this.timer = setInterval(() => {
      this.timeSpent += 0.1; // 6-second intervals = 0.1 minutes
      this.saveStats();
      
      // Check limit periodically
      this.checkLimit();
    }, 6000);
  }
  
  // Check if we've already watched this short today
  hasWatchedThisShort() {
    // Simple implementation - in a real extension you might want to track individual shorts
    return false;
  }
  
  // Check if daily limit is reached
  checkLimit() {
    let limitReached = false;
    
    if (this.limitType === 'count') {
      limitReached = this.shortsWatched >= this.limitValue;
    } else if (this.limitType === 'time') {
      limitReached = this.timeSpent >= this.limitValue;
    }
    
    if (limitReached && !this.isBlocked) {
      this.blockShorts();
    }
  }
  
  // Block Shorts when limit is reached
  blockShorts() {
    this.isBlocked = true;
    
    // Create blocking overlay
    const overlay = document.createElement('div');
    overlay.id = 'shorts-limiter-overlay';
    overlay.innerHTML = `
      <div class="block-message">
        <h2>Daily Shorts Limit Reached</h2>
        <p>You've reached your daily limit of ${this.limitValue} ${this.limitType === 'count' ? 'shorts' : 'minutes'}.</p>
        <p>Take a break and come back tomorrow!</p>
        <button id="close-shorts">Close Shorts</button>
      </div>
    `;
    
    // Style the overlay
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: 'YouTube Sans', 'Roboto', sans-serif;
    `;
    
    const messageStyle = `
      background: #1f1f1f;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      max-width: 400px;
      color: white;
    `;
    
    overlay.querySelector('.block-message').style.cssText = messageStyle;
    
    // Add button style
    const button = overlay.querySelector('button');
    button.style.cssText = `
      background: #ff0000;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 15px;
      font-weight: bold;
    `;
    
    // Add button event
    button.addEventListener('click', () => {
      // Redirect to YouTube homepage
      window.location.href = 'https://www.youtube.com';
    });
    
    // Add to page
    document.body.appendChild(overlay);
    
    // Pause video if playing
    const video = document.querySelector('video');
    if (video) {
      video.pause();
    }
  }
  
  // Clean up tracking for current short
  cleanupShortTracking() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.currentShortId = null;
    this.startTime = null;
  }
  
  // Save stats to storage
  saveStats() {
    chrome.storage.sync.set({
      shortsWatched: this.shortsWatched,
      timeSpent: Math.round(this.timeSpent * 10) / 10 // Round to 1 decimal
    });
  }
  
  // Reset stats (called from popup)
  resetStats() {
    this.shortsWatched = 0;
    this.timeSpent = 0;
    this.isBlocked = false;
    this.saveStats();
    
    // Remove blocking overlay if present
    const overlay = document.getElementById('shorts-limiter-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}

// Initialize the Shorts Limiter
let shortsLimiter;

// Wait for page to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    shortsLimiter = new ShortsLimiter();
  });
} else {
  shortsLimiter = new ShortsLimiter();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'resetStats' && shortsLimiter) {
    shortsLimiter.resetStats();
  }
});
