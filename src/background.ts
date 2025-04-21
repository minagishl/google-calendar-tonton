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

browser.runtime.onMessage.addListener(async (request: unknown) => {
  if (typeof request === "object" && request !== null && "type" in request) {
    const req = request as Request;

    if (req.type === "FETCH_ICS") {
      const { icsCache } = await browser.storage.local.get("icsCache");
      const cache = (icsCache || {}) as IcsCache;
      const now = Date.now();
      const urlCache = cache[req.url];

      if (urlCache && now - urlCache.timestamp < 24 * 60 * 60 * 1000) {
        return { success: true, data: urlCache.data, fromCache: true };
      }

      try {
        const response = await fetch(req.url);
        const data = await response.text();

        await browser.storage.local.set({
          icsCache: {
            ...cache,
            [req.url]: {
              data,
              timestamp: now,
            },
          },
        });

        return { success: true, data, fromCache: false };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
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
