// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const recentVodsList = document.getElementById('recent-vods');
const allVodsList = document.getElementById('all-vods');
const searchRecentInput = document.getElementById('search-recent');
const searchAllInput = document.getElementById('search-all');
const timestampDetails = document.getElementById('timestamp-details');
const backButton = document.getElementById('back-btn');
const detailsTitle = document.getElementById('details-title');
const detailTimestamps = document.getElementById('detail-timestamps');

// Settings elements
const panelPositionSelect = document.getElementById('panel-position');
const autoHideCheckbox = document.getElementById('auto-hide');
const exportClipboardCheckbox = document.getElementById('export-clipboard');
const exportAllButton = document.getElementById('export-all-btn');
const importButton = document.getElementById('import-btn');
const clearDataButton = document.getElementById('clear-data-btn');

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Load settings
  loadSettings();
  
  // Load VODs
  loadVODs();
  
  // Set up tab switching
  setupTabs();
  
  // Set up search functionality
  setupSearch();
  
  // Set up settings handlers
  setupSettings();
  
  // Set up back button
  backButton.addEventListener('click', () => {
    timestampDetails.classList.remove('show');
  });
});

// Load user settings
function loadSettings() {
  chrome.storage.local.get({
    panelPosition: 'top-right',
    autoHide: false,
    exportClipboard: true
  }, (settings) => {
    panelPositionSelect.value = settings.panelPosition;
    autoHideCheckbox.checked = settings.autoHide;
    exportClipboardCheckbox.checked = settings.exportClipboard;
  });
}

// Save user settings
function saveSettings() {
  const settings = {
    panelPosition: panelPositionSelect.value,
    autoHide: autoHideCheckbox.checked,
    exportClipboard: exportClipboardCheckbox.checked
  };
  
  chrome.storage.local.set(settings);
}

// Set up settings event handlers
function setupSettings() {
  panelPositionSelect.addEventListener('change', saveSettings);
  autoHideCheckbox.addEventListener('change', saveSettings);
  exportClipboardCheckbox.addEventListener('change', saveSettings);
  
  // Export all timestamps
  exportAllButton.addEventListener('click', exportAllTimestamps);
  
  // Import timestamps
  importButton.addEventListener('click', importTimestamps);
  
  // Clear all data
  clearDataButton.addEventListener('click', clearAllData);
}

// Load VODs from storage
function loadVODs() {
  chrome.runtime.sendMessage({ action: "getVODList" }, (response) => {
    const vodList = response.vodList || [];
    
    // Sort by most recently accessed
    vodList.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    
    // Display in recent tab (limit to 5)
    displayVODs(recentVodsList, vodList.slice(0, 5));
    
    // Display all VODs
    displayVODs(allVodsList, vodList);
  });
}

// Display VODs in a container
function displayVODs(container, vods) {
  container.innerHTML = '';
  
  if (vods.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No VODs found</p>
        <p>Watch some Twitch VODs to start adding timestamps!</p>
      </div>
    `;
    return;
  }
  
  vods.forEach(vod => {
    const vodItem = document.createElement('div');
    vodItem.className = 'vod-item';
    vodItem.dataset.vodId = vod.id;
    
    const lastAccessed = new Date(vod.lastAccessed);
    const formattedDate = lastAccessed.toLocaleDateString();
    
    vodItem.innerHTML = `
      <div class="vod-title">${vod.title || `VOD ${vod.id}`}</div>
      <div class="vod-meta">
        <span>${vod.timestampCount} timestamp${vod.timestampCount !== 1 ? 's' : ''}</span>
        <span>Last viewed: ${formattedDate}</span>
      </div>
      <div class="vod-actions">
        <button class="btn primary view-btn" data-vod-id="${vod.id}">View Timestamps</button>
        <button class="btn secondary open-btn" data-vod-id="${vod.id}">Open VOD</button>
        <button class="btn danger delete-btn" data-vod-id="${vod.id}">Delete</button>
      </div>
    `;
    
    // Add event listeners
    const viewBtn = vodItem.querySelector('.view-btn');
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewTimestamps(vod.id, vod.title || `VOD ${vod.id}`);
    });
    
    const openBtn = vodItem.querySelector('.open-btn');
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openVOD(vod.id);
    });
    
    const deleteBtn = vodItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteVOD(vod.id, () => {
        vodItem.remove();
        
        // Check if list is now empty
        if (container.children.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <p>No VODs found</p>
              <p>Watch some Twitch VODs to start adding timestamps!</p>
            </div>
          `;
        }
        
        // Reload VODs to update both lists
        loadVODs();
      });
    });
    
    container.appendChild(vodItem);
  });
}

// Set up tab switching
function setupTabs() {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabId = button.dataset.tab;
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

// Set up search functionality
function setupSearch() {
  searchRecentInput.addEventListener('input', () => {
    filterVODs(recentVodsList, searchRecentInput.value);
  });
  
  searchAllInput.addEventListener('input', () => {
    filterVODs(allVodsList, searchAllInput.value);
  });
}

// Filter VODs by search term
function filterVODs(container, searchTerm) {
  const vodItems = container.querySelectorAll('.vod-item');
  const term = searchTerm.toLowerCase();
  
  vodItems.forEach(item => {
    const title = item.querySelector('.vod-title').textContent.toLowerCase();
    if (title.includes(term) || !term) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
  
  // Check if all items are hidden
  let allHidden = true;
  vodItems.forEach(item => {
    if (item.style.display !== 'none') {
      allHidden = false;
    }
  });
  
  // Show empty state if all items are hidden
  if (allHidden && vodItems.length > 0) {
    let emptyState = container.querySelector('.empty-state');
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <p>No VODs match your search</p>
      `;
      container.appendChild(emptyState);
    }
  } else {
    const emptyState = container.querySelector('.empty-state');
    if (emptyState && vodItems.length > 0) {
      emptyState.remove();
    }
  }
}

// View timestamps for a VOD
function viewTimestamps(vodId, vodTitle) {
  detailsTitle.textContent = vodTitle;
  detailTimestamps.innerHTML = '<div class="loading">Loading timestamps...</div>';
  
  const storageKey = `timestamps_${vodId}`;
  chrome.storage.local.get({ [storageKey]: [] }, (data) => {
    const timestamps = data[storageKey] || [];
    displayTimestamps(timestamps, vodId);
    timestampDetails.classList.add('show');
  });
}

// Display timestamps in the details view
function displayTimestamps(timestamps, vodId) {
  detailTimestamps.innerHTML = '';
  
  if (timestamps.length === 0) {
    detailTimestamps.innerHTML = `
      <div class="empty-state">
        <p>No timestamps for this VOD</p>
        <p>Add timestamps while watching to keep track of interesting moments!</p>
      </div>
    `;
    return;
  }
  
  // Sort timestamps by time
  timestamps.sort((a, b) => a.time - b.time);
  
  // Create list of timestamps
  timestamps.forEach(timestamp => {
    const item = document.createElement('div');
    item.className = 'timestamp-item';
    
    item.innerHTML = `
      <div class="timestamp-info">
        <div class="timestamp-time">${timestamp.formatted}</div>
        <div class="timestamp-title">${timestamp.title}</div>
      </div>
      <div class="timestamp-actions">
        <button class="btn secondary copy-btn" data-time="${timestamp.formatted}" data-title="${timestamp.title}" data-vod-id="${vodId}">Copy</button>
        <button class="btn danger delete-ts-btn" data-time="${timestamp.time}" data-vod-id="${vodId}">Delete</button>
      </div>
    `;
    
    // Add event listeners
    const copyBtn = item.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
      const url = `https://www.twitch.tv/videos/${vodId}?t=${timestamp.time}s`;
      navigator.clipboard.writeText(`${timestamp.title} - ${url}`);
      
      // Show feedback
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 2000);
    });
    
    const deleteBtn = item.querySelector('.delete-ts-btn');
    deleteBtn.addEventListener('click', () => {
      deleteTimestamp(vodId, timestamp.time, () => {
        item.remove();
        
        // Check if list is now empty
        if (detailTimestamps.children.length === 0) {
          detailTimestamps.innerHTML = `
            <div class="empty-state">
              <p>No timestamps for this VOD</p>
              <p>Add timestamps while watching to keep track of interesting moments!</p>
            </div>
          `;
        }
        
        // Update VOD lists
        loadVODs();
      });
    });
    
    detailTimestamps.appendChild(item);
  });
}

// Open a VOD in a new tab
function openVOD(vodId) {
  chrome.tabs.create({ url: `https://www.twitch.tv/videos/${vodId}` });
}

// Delete a VOD and its timestamps
function deleteVOD(vodId, callback) {
  if (confirm('Are you sure you want to delete this VOD and all its timestamps?')) {
    chrome.runtime.sendMessage({ 
      action: "deleteVOD", 
      vodId 
    }, (response) => {
      if (response.success && callback) {
        callback();
      }
    });
  }
}

// Delete a timestamp
function deleteTimestamp(vodId, timeInSeconds, callback) {
  const storageKey = `timestamps_${vodId}`;
  
  chrome.storage.local.get({ [storageKey]: [] }, (data) => {
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
      
      if (callback) {
        callback();
      }
    });
  });
}

// Export all timestamps
function exportAllTimestamps() {
  chrome.storage.local.get(null, (data) => {
    // Collect all timestamps data
    const exportData = {};
    const vodList = data.vodList || [];
    
    vodList.forEach(vod => {
      const storageKey = `timestamps_${vod.id}`;
      const timestamps = data[storageKey] || [];
      
      if (timestamps.length > 0) {
        exportData[vod.id] = {
          title: vod.title,
          timestamps
        };
      }
    });
    
    // Convert to JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twitch_timestamps_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Copy to clipboard if enabled
    if (exportClipboardCheckbox.checked) {
      navigator.clipboard.writeText(jsonData)
        .then(() => {
          alert('Export successful! JSON data has been copied to clipboard.');
        })
        .catch(err => {
          alert('Export successful! Saved as JSON file.');
        });
    } else {
      alert('Export successful! Saved as JSON file.');
    }
  });
}

// Import timestamps from file
function importTimestamps() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Process each VOD
        let importCount = 0;
        const promises = [];
        
        for (const vodId in data) {
          const vodData = data[vodId];
          
          // Add VOD to list if not exists
          promises.push(new Promise(resolve => {
            chrome.runtime.sendMessage({
              action: "saveVOD",
              vodId,
              vodTitle: vodData.title || `Imported VOD ${vodId}`
            }, () => {
              // Import timestamps for this VOD
              const storageKey = `timestamps_${vodId}`;
              
              chrome.storage.local.get({ [storageKey]: [] }, (result) => {
                let existingTimestamps = result[storageKey] || [];
                const newTimestamps = vodData.timestamps || [];
                
                // Add only timestamps that don't already exist
                const timestampTimes = existingTimestamps.map(ts => ts.time);
                const timestampsToAdd = newTimestamps.filter(ts => !timestampTimes.includes(ts.time));
                
                // Combine and save
                const combinedTimestamps = [...existingTimestamps, ...timestampsToAdd];
                importCount += timestampsToAdd.length;
                
                chrome.storage.local.set({ [storageKey]: combinedTimestamps }, () => {
                  // Update VOD metadata
                  chrome.runtime.sendMessage({
                    action: "updateVOD",
                    vodId,
                    timestampCount: combinedTimestamps.length
                  });
                  
                  resolve();
                });
              });
            });
          }));
        }
        
        // Wait for all imports to finish
        Promise.all(promises).then(() => {
          alert(`Import successful! Added ${importCount} new timestamps.`);
          loadVODs();
        });
        
      } catch (err) {
        alert('Error importing data. Please make sure the file is valid JSON.');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

// Clear all data
function clearAllData() {
  if (confirm('Are you sure you want to delete ALL VODs and timestamps? This cannot be undone!')) {
    chrome.storage.local.clear(() => {
      alert('All data has been deleted.');
      loadVODs();
    });
  }
}