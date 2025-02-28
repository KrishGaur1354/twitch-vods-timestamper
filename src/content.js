// Main initialization function to start the extension
function initTwitchTimestamper() {
    console.log("Twitch Timestamper: Initializing...");
    
    // Extract VOD info from page
    const vodId = window.location.pathname.split('/').pop();
    let vodTitle = document.title.replace(" - Twitch", "");
    
    // Try to get a better title from the page
    const titleElement = document.querySelector("h1") || 
                        document.querySelector("[data-a-target='stream-title']") ||
                        document.querySelector(".tw-title");
    
    if (titleElement) {
      vodTitle = titleElement.textContent.trim();
    }
    
    // Save this VOD in our list
    chrome.runtime.sendMessage({
      action: "saveVOD",
      vodId,
      vodTitle
    });
    
    // Create UI elements
    createTimestampPanel();
    
    // Load existing timestamps
    loadTimestamps();
    
    // Add event listeners
    const addButton = document.getElementById('add-timestamp-btn');
    if (addButton) {
      addButton.addEventListener('click', addCurrentTimestamp);
    }
  }
  
  // Function to find the Twitch player and wait until it's loaded
  function waitForTwitchPlayer() {
    console.log("Twitch Timestamper: Waiting for player...");
    
    // Try different selectors Twitch might be using
    const selectors = [
      'video',
      '.video-player__container',
      '.persistent-player',
      '.player-controls'
    ];
    
    // Check every 2 seconds if any of the selectors exist
    let attempts = 0;
    const maxAttempts = 20; // Maximum wait time: 40 seconds
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      // Try each selector
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Twitch Timestamper: Found player with selector ${selector}`);
          clearInterval(checkInterval);
          
          // Wait a bit more for the player to be fully functional
          setTimeout(initTwitchTimestamper, 1500);
          return;
        }
      }
      
      // If we've tried too many times, stop checking
      if (attempts >= maxAttempts) {
        console.log("Twitch Timestamper: Failed to find player");
        clearInterval(checkInterval);
      }
    }, 2000);
  }
  
  // Start the extension once the page is loaded
  if (document.readyState === "complete" || document.readyState === "interactive") {
    waitForTwitchPlayer();
  } else {
    document.addEventListener("DOMContentLoaded", waitForTwitchPlayer);
  }
  
  // Create the UI panel for timestamps
  function createTimestampPanel() {
    // Create the timestamp panel container
    const panel = document.createElement('div');
    panel.className = 'twitch-timestamper-panel';
    panel.innerHTML = `
      <div class="twitch-timestamper-header">
        <h3>VOD Timestamps</h3>
        <div class="twitch-timestamper-actions">
          <button id="add-timestamp-btn" class="twitch-timestamper-btn twitch-timestamper-primary">Add Timestamp</button>
          <button id="toggle-timestamps-btn" class="twitch-timestamper-btn">Hide</button>
        </div>
      </div>
      <div class="twitch-timestamper-content">
        <div class="twitch-timestamper-input-container">
          <input type="text" id="timestamp-title" placeholder="Enter description for this moment...">
        </div>
        <div class="twitch-timestamper-list-header">
          <span>Time</span>
          <span>Description</span>
          <span>Actions</span>
        </div>
        <div class="twitch-timestamper-list" id="timestamp-list"></div>
      </div>
    `;
    
    // Try to insert the panel in a good location
    document.body.appendChild(panel);
    
    // Make panel draggable
    makeDraggable(panel);
    
    // Add toggle functionality
    const toggleBtn = document.getElementById('toggle-timestamps-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const content = panel.querySelector('.twitch-timestamper-content');
        if (content.style.display === 'none') {
          content.style.display = 'block';
          toggleBtn.textContent = 'Hide';
        } else {
          content.style.display = 'none';
          toggleBtn.textContent = 'Show';
        }
      });
    }
  }
  
  // Make an element draggable
  function makeDraggable(element) {
    const header = element.querySelector('.twitch-timestamper-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    if (!header) return;
    
    header.style.cursor = 'move';
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return; // Don't initiate drag on buttons
      
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  // Get the current video time
  function getCurrentTime() {
    const videoPlayer = document.querySelector('video');
    if (!videoPlayer) {
      console.error("Twitch Timestamper: Could not find video element");
      return null;
    }
    
    // Get current time in seconds
    const currentTimeInSeconds = Math.floor(videoPlayer.currentTime);
    
    // Format time as HH:MM:SS
    const hours = Math.floor(currentTimeInSeconds / 3600);
    const minutes = Math.floor((currentTimeInSeconds % 3600) / 60);
    const seconds = currentTimeInSeconds % 60;
    
    return {
      seconds: currentTimeInSeconds,
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    };
  }
  
  // Add a timestamp at the current video position
  function addCurrentTimestamp() {
    const currentTime = getCurrentTime();
    if (!currentTime) return;
    
    const titleInput = document.getElementById('timestamp-title');
    if (!titleInput) return;
    
    const title = titleInput.value.trim() || `Timestamp at ${currentTime.formatted}`;
    titleInput.value = '';
    
    const vodId = window.location.pathname.split('/').pop();
    
    // Save timestamp
    saveTimestamp(vodId, currentTime.seconds, title, currentTime.formatted);
    
    // Update UI
    addTimestampToList(vodId, currentTime.seconds, title, currentTime.formatted);
  }
  
  // Save a timestamp to storage
  function saveTimestamp(vodId, timeInSeconds, title, formattedTime) {
    const storageKey = `timestamps_${vodId}`;
    
    chrome.storage.local.get({ [storageKey]: [] }, function(data) {
      let timestamps = data[storageKey] || [];
      
      timestamps.push({
        time: timeInSeconds,
        title: title,
        formatted: formattedTime,
        created: new Date().toISOString()
      });
      
      // Sort timestamps by time
      timestamps.sort((a, b) => a.time - b.time);
      
      chrome.storage.local.set({ [storageKey]: timestamps }, () => {
        // Update VOD metadata with timestamp count
        chrome.runtime.sendMessage({
          action: "updateVOD",
          vodId,
          timestampCount: timestamps.length
        });
      });
    });
  }
  
  // Load all timestamps for the current VOD
  function loadTimestamps() {
    const vodId = window.location.pathname.split('/').pop();
    const storageKey = `timestamps_${vodId}`;
    
    chrome.storage.local.get({ [storageKey]: [] }, function(data) {
      const timestamps = data[storageKey] || [];
      
      const timestampList = document.getElementById('timestamp-list');
      if (!timestampList) return;
      
      timestampList.innerHTML = '';
      
      if (timestamps.length === 0) {
        timestampList.innerHTML = '<div class="twitch-timestamper-empty">No timestamps yet. Add one by clicking "Add Timestamp" when something interesting happens!</div>';
        return;
      }
      
      timestamps.forEach(timestamp => {
        addTimestampToList(vodId, timestamp.time, timestamp.title, timestamp.formatted);
      });
    });
  }
  
  // Add a timestamp to the UI list
  function addTimestampToList(vodId, timeInSeconds, title, formattedTime) {
    const timestampList = document.getElementById('timestamp-list');
    if (!timestampList) return;
    
    // Remove empty message if present
    const emptyMessage = timestampList.querySelector('.twitch-timestamper-empty');
    if (emptyMessage) {
      emptyMessage.remove();
    }
    
    const timestampItem = document.createElement('div');
    timestampItem.className = 'twitch-timestamper-item';
    timestampItem.dataset.time = timeInSeconds;
    
    timestampItem.innerHTML = `
      <div class="twitch-timestamper-time">${formattedTime}</div>
      <div class="twitch-timestamper-title" title="${title}">${title}</div>
      <div class="twitch-timestamper-item-actions">
        <button class="twitch-timestamper-btn twitch-timestamper-jump" data-time="${timeInSeconds}">Jump</button>
        <button class="twitch-timestamper-btn twitch-timestamper-copy" data-time="${formattedTime}" data-title="${title}">Copy</button>
        <button class="twitch-timestamper-btn twitch-timestamper-delete" data-time="${timeInSeconds}">Delete</button>
      </div>
    `;
    
    // Add event listeners
    const jumpBtn = timestampItem.querySelector('.twitch-timestamper-jump');
    jumpBtn.addEventListener('click', () => jumpToTime(timeInSeconds));
    
    const copyBtn = timestampItem.querySelector('.twitch-timestamper-copy');
    copyBtn.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?t=${timeInSeconds}s`;
      navigator.clipboard.writeText(`${title} - ${url}`);
      showNotification('Timestamp copied to clipboard!');
    });
    
    const deleteBtn = timestampItem.querySelector('.twitch-timestamper-delete');
    deleteBtn.addEventListener('click', () => {
      deleteTimestamp(vodId, timeInSeconds);
      timestampItem.remove();
      
      // Check if list is now empty
      if (timestampList.children.length === 0) {
        timestampList.innerHTML = '<div class="twitch-timestamper-empty">No timestamps yet. Add one by clicking "Add Timestamp" when something interesting happens!</div>';
      }
    });
    
    timestampList.appendChild(timestampItem);
  }
  
  // Jump to a specific time in the video
  function jumpToTime(timeInSeconds) {
    const videoPlayer = document.querySelector('video');
    if (videoPlayer) {
      videoPlayer.currentTime = timeInSeconds;
      videoPlayer.play();
    }
  }
  
  // Delete a timestamp
  function deleteTimestamp(vodId, timeInSeconds) {
    const storageKey = `timestamps_${vodId}`;
    
    chrome.storage.local.get({ [storageKey]: [] }, function(data) {
      let timestamps = data[storageKey] || [];
      
      // Filter out the timestamp to delete
      timestamps = timestamps.filter(ts => ts.time !== timeInSeconds);
      
      chrome.storage.local.set({ [storageKey]: timestamps }, () => {
        // Update VOD metadata with new timestamp count
        chrome.runtime.sendMessage({
          action: "updateVOD",
          vodId,
          timestampCount: timestamps.length
        });
      });
    });
  }
  
  // Show a notification message
  function showNotification(message) {
    // Check if a notification already exists
    let notification = document.querySelector('.twitch-timestamper-notification');
    
    if (!notification) {
      // Create new notification element
      notification = document.createElement('div');
      notification.className = 'twitch-timestamper-notification';
      document.body.appendChild(notification);
    }
    
    // Set message and show
    notification.textContent = message;
    notification.classList.add('show');
    
    // Hide after delay
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }