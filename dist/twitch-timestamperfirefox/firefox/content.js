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

    // Set up video player markers
    addTimestampMarkers();
    observePlayerChanges();

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only handle if not typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 't':
            e.preventDefault();
            addCurrentTimestamp();
            break;
          case 'm':
            e.preventDefault();
            toggleMinimize();
            break;
          case 'h':
            e.preventDefault();
            toggleTimestampList();
            break;
        }
      }
    });

    // Add minimize/maximize functionality
    const minimizeBtn = document.getElementById('minimize-panel-btn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', toggleMinimize);
    }
}
  
// Function to find the Twitch player and wait until it's loaded
function waitForTwitchPlayer() {
    console.log("Twitch Timestamper: Waiting for player...");
    
    // Try different selectors Twitch might be using
    const selectors = [
      'video[data-a-target="player-video"]',
      'video.video-player__video',
      'video',
      '.video-player__container video',
      '.persistent-player video'
    ];
    
    // Check every second if any of the selectors exist
    let attempts = 0;
    const maxAttempts = 30; // Maximum wait time: 30 seconds
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      // Try each selector
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.readyState >= 2) { // Wait for metadata to be loaded
          console.log(`Twitch Timestamper: Found player with selector ${selector}`);
          clearInterval(checkInterval);
          initTwitchTimestamper();
          return;
        }
      }
      
      // If we've tried too many times, stop checking
      if (attempts >= maxAttempts) {
        console.log("Twitch Timestamper: Failed to find player");
        clearInterval(checkInterval);
      }
    }, 1000);
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

    // Create header
    const header = document.createElement('div');
    header.className = 'twitch-timestamper-header';
    
    const title = document.createElement('h3');
    title.textContent = 'VOD Timestamps';
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'twitch-timestamper-actions';

    const addBtn = document.createElement('button');
    addBtn.id = 'add-timestamp-btn';
    addBtn.className = 'twitch-timestamper-btn twitch-timestamper-primary';
    addBtn.title = 'Add Timestamp (Alt+T)';
    addBtn.textContent = 'Add Timestamp';
    actions.appendChild(addBtn);

    const minimizeBtn = document.createElement('button');
    minimizeBtn.id = 'minimize-panel-btn';
    minimizeBtn.className = 'twitch-timestamper-btn';
    minimizeBtn.title = 'Minimize Panel (Alt+M)';
    minimizeBtn.textContent = '▼';
    actions.appendChild(minimizeBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-timestamps-btn';
    toggleBtn.className = 'twitch-timestamper-btn';
    toggleBtn.title = 'Show/Hide List (Alt+H)';
    toggleBtn.textContent = 'Hide';
    actions.appendChild(toggleBtn);

    header.appendChild(actions);
    panel.appendChild(header);

    // Create VOD info section
    const vodInfo = document.createElement('div');
    vodInfo.className = 'twitch-timestamper-vod-info';

    const vodTitle = document.createElement('div');
    vodTitle.className = 'twitch-timestamper-vod-title';
    vodTitle.textContent = 'VOD Description';
    vodInfo.appendChild(vodTitle);

    const descTextarea = document.createElement('textarea');
    descTextarea.className = 'twitch-timestamper-vod-description';
    descTextarea.id = 'vod-description';
    descTextarea.placeholder = 'Add a description for this VOD...';
    vodInfo.appendChild(descTextarea);

    const saveDescBtn = document.createElement('button');
    saveDescBtn.className = 'twitch-timestamper-save-description';
    saveDescBtn.id = 'save-description-btn';
    saveDescBtn.textContent = 'Save Description';
    vodInfo.appendChild(saveDescBtn);

    panel.appendChild(vodInfo);

    // Create content section
    const content = document.createElement('div');
    content.className = 'twitch-timestamper-content';

    const inputContainer = document.createElement('div');
    inputContainer.className = 'twitch-timestamper-input-container';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'timestamp-title';
    titleInput.placeholder = 'Enter description for this moment... (Press Enter to save)';
    inputContainer.appendChild(titleInput);
    content.appendChild(inputContainer);

    const listHeader = document.createElement('div');
    listHeader.className = 'twitch-timestamper-list-header';
    
    const timeSpan = document.createElement('span');
    timeSpan.textContent = 'Time';
    listHeader.appendChild(timeSpan);

    const descSpan = document.createElement('span');
    descSpan.textContent = 'Description';
    listHeader.appendChild(descSpan);

    const actionsSpan = document.createElement('span');
    actionsSpan.textContent = 'Actions';
    listHeader.appendChild(actionsSpan);

    content.appendChild(listHeader);

    const timestampList = document.createElement('div');
    timestampList.className = 'twitch-timestamper-list';
    timestampList.id = 'timestamp-list';
    content.appendChild(timestampList);

    panel.appendChild(content);
    
    // Try to insert the panel in a good location
    document.body.appendChild(panel);
    
    // Make panel draggable
    makeDraggable(panel);
    
    // Add toggle functionality
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (content.style.display === 'none') {
          content.style.display = 'block';
          toggleBtn.textContent = 'Hide';
        } else {
          content.style.display = 'none';
          toggleBtn.textContent = 'Show';
        }
      });
    }

    // Load and set up VOD description
    const vodId = window.location.pathname.split('/').pop();

    // Load existing description
    chrome.storage.local.get(`vod_description_${vodId}`, (result) => {
      if (result[`vod_description_${vodId}`]) {
        descTextarea.value = result[`vod_description_${vodId}`];
      }
    });

    // Save description
    if (saveDescBtn && descTextarea) {
      saveDescBtn.addEventListener('click', () => {
        const description = descTextarea.value;
        chrome.storage.local.set({ [`vod_description_${vodId}`]: description }, () => {
          showNotification('VOD description saved!');
        });
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
    const videoPlayer = document.querySelector('video[data-a-target="player-video"], video.video-player__video, video');
    if (!videoPlayer) {
      console.error("Twitch Timestamper: Could not find video element");
      return null;
    }
    
    try {
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
    } catch (error) {
      console.error("Twitch Timestamper: Error getting current time:", error);
      return null;
    }
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
    
    try {
      chrome.storage.local.get({ [storageKey]: [] }, function(data) {
        let timestamps = data[storageKey] || [];
        
        // Check if timestamp already exists
        const exists = timestamps.some(ts => ts.time === timeInSeconds);
        if (exists) {
          showNotification('Timestamp already exists at this time!');
          return;
        }
        
        timestamps.push({
          time: timeInSeconds,
          title: title,
          formatted: formattedTime,
          created: new Date().toISOString()
        });
        
        // Sort timestamps by time
        timestamps.sort((a, b) => a.time - b.time);
        
        chrome.storage.local.set({ [storageKey]: timestamps }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error saving timestamp:', chrome.runtime.lastError);
            showNotification('Error saving timestamp. Please try again.');
            return;
          }
          
          // Update VOD metadata with timestamp count
          chrome.runtime.sendMessage({
            action: "updateVOD",
            vodId,
            timestampCount: timestamps.length
          });
          
          // Update video player markers
          updateTimestampMarkers();
          
          showNotification('Timestamp saved successfully!');
        });
      });
    } catch (error) {
      console.error("Error saving timestamp:", error);
      showNotification('Error saving timestamp. Please try again.');
    }
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

      // Update video player markers
      updateTimestampMarkers();
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
    
    // Create time element
    const timeDiv = document.createElement('div');
    timeDiv.className = 'twitch-timestamper-time';
    timeDiv.textContent = formattedTime;
    timestampItem.appendChild(timeDiv);

    // Create title container
    const titleContainer = document.createElement('div');
    titleContainer.className = 'twitch-timestamper-title';
    titleContainer.title = title;

    const titleText = document.createElement('span');
    titleText.className = 'title-text';
    titleText.textContent = title;
    titleContainer.appendChild(titleText);

    const titleEdit = document.createElement('input');
    titleEdit.type = 'text';
    titleEdit.className = 'title-edit';
    titleEdit.value = title;
    titleEdit.style.display = 'none';
    titleContainer.appendChild(titleEdit);

    timestampItem.appendChild(titleContainer);

    // Create actions container
    const actions = document.createElement('div');
    actions.className = 'twitch-timestamper-item-actions';

    const jumpBtn = document.createElement('button');
    jumpBtn.className = 'twitch-timestamper-btn twitch-timestamper-jump';
    jumpBtn.dataset.time = timeInSeconds;
    jumpBtn.title = 'Jump to timestamp';
    jumpBtn.textContent = 'Jump';
    actions.appendChild(jumpBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'twitch-timestamper-btn twitch-timestamper-edit';
    editBtn.title = 'Edit title';
    editBtn.textContent = 'Edit';
    actions.appendChild(editBtn);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'twitch-timestamper-btn twitch-timestamper-copy';
    copyBtn.dataset.time = formattedTime;
    copyBtn.dataset.title = title;
    copyBtn.title = 'Copy timestamp';
    copyBtn.textContent = 'Copy';
    actions.appendChild(copyBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'twitch-timestamper-btn twitch-timestamper-delete';
    deleteBtn.dataset.time = timeInSeconds;
    deleteBtn.title = 'Delete timestamp';
    deleteBtn.textContent = 'Delete';
    actions.appendChild(deleteBtn);

    timestampItem.appendChild(actions);
    
    // Add event listeners
    jumpBtn.addEventListener('click', () => jumpToTime(timeInSeconds));
    
    editBtn.addEventListener('click', () => {
      titleText.style.display = 'none';
      titleEdit.style.display = 'block';
      titleEdit.focus();
    });
    
    titleEdit.addEventListener('blur', () => {
      updateTimestampTitle(vodId, timeInSeconds, titleEdit.value);
      titleText.textContent = titleEdit.value;
      titleText.style.display = 'block';
      titleEdit.style.display = 'none';
    });
    
    titleEdit.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        titleEdit.blur();
      }
    });
    
    copyBtn.addEventListener('click', () => {
      const url = `${window.location.origin}${window.location.pathname}?t=${timeInSeconds}s`;
      navigator.clipboard.writeText(`${titleText.textContent} - ${url}`);
      showNotification('Timestamp copied to clipboard!');
    });
    
    deleteBtn.addEventListener('click', () => {
      deleteTimestamp(vodId, timeInSeconds);
      timestampItem.remove();
      
      // Check if list is now empty
      if (timestampList.children.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'twitch-timestamper-empty';
        emptyDiv.textContent = 'No timestamps yet. Add one by clicking "Add Timestamp" when something interesting happens!';
        timestampList.appendChild(emptyDiv);
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

// Add timestamp markers to video player
function addTimestampMarkers() {
    const videoPlayer = document.querySelector('video');
    if (!videoPlayer) return;

    const progressBar = document.querySelector('.video-player__seek-bar') || 
                       document.querySelector('.player-seek__progress-bar') ||
                       videoPlayer.closest('.video-player')?.querySelector('.progress-bar');
    
    if (!progressBar) return;

    const vodId = window.location.pathname.split('/').pop();
    const storageKey = `timestamps_${vodId}`;

    chrome.storage.local.get({ [storageKey]: [] }, (data) => {
      const timestamps = data[storageKey] || [];
      const videoDuration = videoPlayer.duration;

      // Remove existing markers
      document.querySelectorAll('.twitch-timestamper-marker').forEach(marker => marker.remove());

      // Add markers for each timestamp
      timestamps.forEach(timestamp => {
        const marker = document.createElement('div');
        marker.className = 'twitch-timestamper-marker';
        
        // Calculate position
        const position = (timestamp.time / videoDuration) * 100;
        marker.style.left = `${position}%`;

        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'twitch-timestamper-marker-tooltip';
        tooltip.textContent = `${timestamp.formatted} - ${timestamp.title}`;
        marker.appendChild(tooltip);

        // Add click handler
        marker.addEventListener('click', () => {
          videoPlayer.currentTime = timestamp.time;
          videoPlayer.play();
        });

        progressBar.appendChild(marker);
      });
    });
}

// Update markers when timestamps change
function updateTimestampMarkers() {
    // Remove existing markers
    document.querySelectorAll('.twitch-timestamper-marker').forEach(marker => marker.remove());
    
    // Add new markers
    addTimestampMarkers();
}

// Add observer to handle player changes
function observePlayerChanges() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'subtree') {
          addTimestampMarkers();
        }
      }
    });

    // Observe player container for changes
    const playerContainer = document.querySelector('.video-player') || 
                          document.querySelector('.persistent-player');
    
    if (playerContainer) {
      observer.observe(playerContainer, {
        childList: true,
        subtree: true
      });
    }
}

// Function to toggle minimize state
function toggleMinimize() {
    const panel = document.querySelector('.twitch-timestamper-panel');
    const minimizeBtn = document.getElementById('minimize-panel-btn');
    const vodInfo = panel.querySelector('.twitch-timestamper-vod-info');
    const content = panel.querySelector('.twitch-timestamper-content');

    if (panel.classList.contains('minimized')) {
      panel.classList.remove('minimized');
      minimizeBtn.textContent = '▼';
      minimizeBtn.title = 'Minimize Panel (Alt+M)';
      vodInfo.style.display = 'block';
      content.style.display = 'block';
    } else {
      panel.classList.add('minimized');
      minimizeBtn.textContent = '▲';
      minimizeBtn.title = 'Maximize Panel (Alt+M)';
      vodInfo.style.display = 'none';
      content.style.display = 'none';
    }
}

// Function to toggle timestamp list
function toggleTimestampList() {
    const toggleBtn = document.getElementById('toggle-timestamps-btn');
    if (toggleBtn) {
      toggleBtn.click();
    }
}

// Function to update timestamp title
function updateTimestampTitle(vodId, timeInSeconds, newTitle) {
    const storageKey = `timestamps_${vodId}`;
    
    chrome.storage.local.get({ [storageKey]: [] }, function(data) {
      let timestamps = data[storageKey] || [];
      
      // Find and update the timestamp
      const timestamp = timestamps.find(ts => ts.time === timeInSeconds);
      if (timestamp) {
        timestamp.title = newTitle;
        
        chrome.storage.local.set({ [storageKey]: timestamps }, () => {
          showNotification('Timestamp title updated!');
          updateTimestampMarkers();
        });
      }
    });
}