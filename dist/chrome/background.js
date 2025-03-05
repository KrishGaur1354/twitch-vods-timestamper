// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('Twitch VOD Timestamper extension installed');
    
    // Set up initial storage
    chrome.storage.local.get(['vodList'], (result) => {
      if (!result.vodList) {
        chrome.storage.local.set({ vodList: [] });
      }
    });
    
    // Set up initial settings if not present
    chrome.storage.local.get({
      panelPosition: 'top-right',
      autoHide: false,
      exportClipboard: true
    }, (settings) => {
      // Only save if settings don't exist
      if (!settings.panelPosition) {
        chrome.storage.local.set({
          panelPosition: 'top-right',
          autoHide: false,
          exportClipboard: true
        });
      }
    });
  });
  
  // Listen for messages from content script or popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getVODList") {
      // Retrieve the list of VODs from storage
      chrome.storage.local.get(["vodList"], (result) => {
        sendResponse({ vodList: result.vodList || [] });
      });
      return true; // Required for async sendResponse
    }
    
    if (message.action === "saveVOD") {
      const { vodId, vodTitle } = message;
      
      // Get existing VODs
      chrome.storage.local.get(["vodList"], (result) => {
        let vodList = result.vodList || [];
        
        // Check if this VOD is already in the list
        const vodIndex = vodList.findIndex(vod => vod.id === vodId);
        
        if (vodIndex === -1) {
          // Add new VOD to list
          vodList.push({
            id: vodId,
            title: vodTitle,
            timestampCount: 0,
            lastAccessed: new Date().toISOString()
          });
        } else {
          // Update last accessed time
          vodList[vodIndex].lastAccessed = new Date().toISOString();
          
          // Update title if it's better than what we had
          if (vodTitle && (!vodList[vodIndex].title || vodList[vodIndex].title === `VOD ${vodId}`)) {
            vodList[vodIndex].title = vodTitle;
          }
        }
        
        // Sort by most recently accessed
        vodList.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
        
        // Save updated list
        chrome.storage.local.set({ vodList }, () => {
          if (sendResponse) {
            sendResponse({ success: true });
          }
        });
      });
      return true; // Required for async sendResponse
    }
    
    if (message.action === "updateVOD") {
      const { vodId, timestampCount } = message;
      
      // Update VOD timestamp count
      chrome.storage.local.get(["vodList"], (result) => {
        let vodList = result.vodList || [];
        const vodIndex = vodList.findIndex(vod => vod.id === vodId);
        
        if (vodIndex !== -1) {
          vodList[vodIndex].timestampCount = timestampCount;
          vodList[vodIndex].lastAccessed = new Date().toISOString();
        }
        
        chrome.storage.local.set({ vodList });
      });
    }
    
    if (message.action === "deleteVOD") {
      const { vodId } = message;
      
      // Remove VOD from list
      chrome.storage.local.get(["vodList"], (result) => {
        let vodList = result.vodList || [];
        vodList = vodList.filter(vod => vod.id !== vodId);
        
        chrome.storage.local.set({ vodList }, () => {
          // Also delete all timestamps for this VOD
          const storageKey = `timestamps_${vodId}`;
          chrome.storage.local.remove(storageKey, () => {
            sendResponse({ success: true });
          });
        });
      });
      return true; // Required for async sendResponse
    }
  });
  
  // Optional: Add context menu for quick access to extension features
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "add-timestamp",
      title: "Add Timestamp",
      contexts: ["video"],
      documentUrlPatterns: ["https://*.twitch.tv/videos/*"]
    });
  });
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "add-timestamp") {
      // Send message to content script to add timestamp
      chrome.tabs.sendMessage(tab.id, { action: "contextAddTimestamp" });
    }
  });