document.addEventListener('DOMContentLoaded', function() {
  const uatUrlInput = document.getElementById('uatUrl');
  const localUrlInput = document.getElementById('localUrl');
  const cookieNameInput = document.getElementById('cookieName');
  const syncButton = document.getElementById('syncCookie');
  const autoSyncButton = document.getElementById('autoSync');
  const statusDiv = document.getElementById('status');

  // Load saved configuration
  chrome.storage.sync.get(['uatUrl', 'localUrl', 'cookieName', 'autoSync'], function(result) {
    if (result.uatUrl) uatUrlInput.value = result.uatUrl;
    if (result.localUrl) localUrlInput.value = result.localUrl;
    if (result.cookieName) cookieNameInput.value = result.cookieName;
    
    updateAutoSyncButton(result.autoSync);
  });

  // Save configuration on change
  function saveConfig() {
    chrome.storage.sync.set({
      uatUrl: uatUrlInput.value,
      localUrl: localUrlInput.value,
      cookieName: cookieNameInput.value
    });
  }

  uatUrlInput.addEventListener('change', saveConfig);
  localUrlInput.addEventListener('change', saveConfig);
  cookieNameInput.addEventListener('change', saveConfig);

  // Manual sync
  syncButton.addEventListener('click', function() {
    const config = {
      uatUrl: uatUrlInput.value,
      localUrl: localUrlInput.value,
      cookieName: cookieNameInput.value
    };

    if (!config.uatUrl || !config.localUrl || !config.cookieName) {
      showStatus('Please fill in all fields', 'error');
      return;
    }

    syncButton.disabled = true;
    syncButton.textContent = 'Syncing...';

    // Send message to background script for manual sync
    chrome.runtime.sendMessage({
      action: 'manualSync',
      config: config
    }, function(response) {
      syncButton.disabled = false;
      syncButton.textContent = 'Sync Cookie Now';
      
      if (response && response.success) {
        showStatus(response.message, 'success');
      } else {
        showStatus(response ? response.message : 'Sync failed', 'error');
      }
    });
  });

  // Toggle auto-sync
  autoSyncButton.addEventListener('click', function() {
    chrome.storage.sync.get(['autoSync'], function(result) {
      const newAutoSync = !result.autoSync;
      chrome.storage.sync.set({ autoSync: newAutoSync });
      
      updateAutoSyncButton(newAutoSync);
      
      if (newAutoSync) {
        showStatus('Auto-sync enabled! Will sync when you visit localhost.', 'success');
      } else {
        showStatus('Auto-sync disabled', 'success');
      }
    });
  });

  function updateAutoSyncButton(isEnabled) {
    if (isEnabled) {
      autoSyncButton.textContent = 'Disable Auto-Sync';
      autoSyncButton.style.background = '#f44336';
    } else {
      autoSyncButton.textContent = 'Enable Auto-Sync';
      autoSyncButton.style.background = '#2196F3';
    }
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 5000);
  }

  // Show current auto-sync status
  chrome.storage.local.get(['storedUATCookie'], function(result) {
    if (result.storedUATCookie) {
      const age = Math.round((Date.now() - result.storedUATCookie.timestamp) / 60000);
      if (age < 60) {
        showStatus(`Stored UAT cookie (${age} min old) ready for auto-sync`, 'success');
      }
    }
  });
});