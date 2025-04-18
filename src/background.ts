chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.type === "FETCH_ICS") {
    // Try to get from cache first
    chrome.storage.local.get(
      ["icsCache", "icsCacheTimestamp"],
      async (result) => {
        const now = Date.now();
        const cacheAge = now - (result.icsCacheTimestamp || 0);
        const cacheValid = cacheAge < 24 * 60 * 60 * 1000; // 24 hours cache

        if (cacheValid && result.icsCache) {
          sendResponse({
            success: true,
            data: result.icsCache,
            fromCache: true,
          });
          return;
        }

        try {
          const response = await fetch(request.url);
          const data = await response.text();
          // Store in cache
          await chrome.storage.local.set({
            icsCache: data,
            icsCacheTimestamp: now,
            icsUrl: request.url,
          });
          sendResponse({ success: true, data, fromCache: false });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          sendResponse({ success: false, error: errorMessage });
        }
      }
    );
    return true; // Will respond asynchronously
  }

  if (request.type === "CLEAR_ICS_CACHE") {
    chrome.storage.local.remove(
      ["icsCache", "icsCacheTimestamp", "icsUrl"],
      () => {
        sendResponse({ success: true });
      }
    );
    return true;
  }
});

// Open the options page in a new tab when the icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
