import browser from "webextension-polyfill";

interface IcsCache {
  [url: string]: {
    data: string;
    timestamp: number;
  };
}

interface FetchIcsRequest {
  type: "FETCH_ICS";
  url: string;
}

interface ClearIcsCacheRequest {
  type: "CLEAR_ICS_CACHE";
}

type Request = FetchIcsRequest | ClearIcsCacheRequest;

async function handleIcsFetch(url: string) {
  const { icsCache } = await browser.storage.local.get("icsCache");
  const cache = (icsCache || {}) as IcsCache;
  const now = Date.now();
  const urlCache = cache[url];

  if (urlCache && now - urlCache.timestamp < 24 * 60 * 60 * 1000) {
    return { success: true, data: urlCache.data, fromCache: true };
  }

  try {
    const response = await fetch(url);
    const data = await response.text();

    let cached = false;
    try {
      await browser.storage.local.set({
        icsCache: {
          ...cache,
          [url]: {
            data,
            timestamp: now,
          },
        },
      });
      cached = true;
    } catch (storageError) {
      console.warn("Failed to cache ICS data", storageError);
    }

    return { success: true, data, fromCache: false, cached };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

browser.runtime.onMessage.addListener(async (request: unknown) => {
  if (typeof request === "object" && request !== null && "type" in request) {
    const req = request as Request;

    if (req.type === "FETCH_ICS") {
      return handleIcsFetch(req.url);
    }

    if (req.type === "CLEAR_ICS_CACHE") {
      await browser.storage.local.remove("icsCache");
      return { success: true };
    }
  }
});

// Open the options page in a new tab when the icon is clicked
browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});
