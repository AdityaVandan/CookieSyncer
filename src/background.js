// Background script for auto-sync functionality
let autoSyncInterval = null;

// Listen for tab updates to trigger auto-sync
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkAndAutoSync(tab.url);
  }
});

// Listen for tab activation to trigger auto-sync
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    checkAndAutoSync(tab.url);
  }
});

async function checkAndAutoSync(url) {
  // Get auto-sync setting
  const result = await chrome.storage.sync.get(['autoSync', 'uatUrl', 'localUrl', 'cookieName']);
  
  if (!result.autoSync || !result.uatUrl || !result.localUrl || !result.cookieName) {
    return;
  }

  try {
    const uatDomain = new URL(result.uatUrl).hostname;
    const localDomain = new URL(result.localUrl).hostname;
    const currentDomain = new URL(url).hostname;

    // If we're on localhost, try to sync cookie from UAT
    if (currentDomain === localDomain || currentDomain === 'localhost') {
      await syncCookieToLocalhost(result);
    }
    // If we're on UAT and cookie changed, store it for later sync
    else if (currentDomain === uatDomain) {
      await storeCookieFromUAT(result);
    }
  } catch (error) {
    console.log('Auto-sync error:', error);
  }
}

async function syncCookieToLocalhost(config) {
  // Check if we have a stored UAT cookie
  const storedCookie = await chrome.storage.local.get(['storedUATCookie']);
  
  if (!storedCookie.storedUATCookie) {
    // Try to get cookie directly from UAT
    await getCookieFromUAT(config);
    return;
  }

  const cookie = storedCookie.storedUATCookie;
  
  // Check if stored cookie is still valid (less than 1 hour old)
  if (Date.now() - cookie.timestamp > 3600000) {
    await getCookieFromUAT(config);
    return;
  }

  // Apply stored cookie to localhost
  try {
    await chrome.cookies.set({
      url: config.localUrl,
      name: config.cookieName,
      value: cookie.value,
      domain: 'localhost',
      path: cookie.path || '/',
      secure: false,
      httpOnly: cookie.httpOnly || false,
      sameSite: 'lax'
    });
    
    console.log('Auto-sync: Cookie applied to localhost');
    
    // Show notification
    showNotification('Cookie synced to localhost!');
  } catch (error) {
    console.log('Error applying cookie to localhost:', error);
  }
}

async function getCookieFromUAT(config) {
  try {
    const cookie = await chrome.cookies.get({
      url: config.uatUrl,
      name: config.cookieName
    });

    if (cookie) {
      // Store the cookie with timestamp
      await chrome.storage.local.set({
        storedUATCookie: {
          ...cookie,
          timestamp: Date.now()
        }
      });
      
      console.log('Auto-sync: UAT cookie stored');
    }
  } catch (error) {
    console.log('Error getting UAT cookie:', error);
  }
}

async function storeCookieFromUAT(config) {
  try {
    const cookie = await chrome.cookies.get({
      url: config.uatUrl,
      name: config.cookieName
    });

    if (cookie) {
      // Check if cookie has changed
      const stored = await chrome.storage.local.get(['storedUATCookie']);
      
      if (!stored.storedUATCookie || stored.storedUATCookie.value !== cookie.value) {
        // Store the updated cookie
        await chrome.storage.local.set({
          storedUATCookie: {
            ...cookie,
            timestamp: Date.now()
          }
        });
        
        console.log('Auto-sync: UAT cookie updated');
        showNotification('UAT cookie updated for auto-sync');
      }
    }
  } catch (error) {
    console.log('Error storing UAT cookie:', error);
  }
}

function showNotification(message) {
  // Create a simple notification using badge text
  chrome.action.setBadgeText({text: '✓'});
  chrome.action.setBadgeBackgroundColor({color: '#4CAF50'});
  
  // Clear badge after 3 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({text: ''});
  }, 3000);
}

// Listen for manual sync requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'manualSync') {
    manualSync(request.config).then(result => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
});

async function manualSync(config) {
  try {
    // Get cookie from UAT
    const cookie = await chrome.cookies.get({
      url: config.uatUrl,
      name: config.cookieName
    });

    if (!cookie) {
      return { success: false, message: 'Cookie not found on UAT site' };
    }

    // Store the cookie
    await chrome.storage.local.set({
      storedUATCookie: {
        ...cookie,
        timestamp: Date.now()
      }
    });

    // Set cookie on localhost
    await chrome.cookies.set({
      url: config.localUrl,
      name: config.cookieName,
      value: cookie.value,
      domain: 'localhost',
      path: cookie.path || '/',
      secure: false,
      httpOnly: cookie.httpOnly || false,
      sameSite: 'lax'
    });

    showNotification('Manual sync completed!');
    return { success: true, message: 'Cookie synced successfully!' };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.message };
  }
}