import browser from "webextension-polyfill";

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
      const { icsCache, icsCacheTimestamp } = await browser.storage.local.get([
        "icsCache",
        "icsCacheTimestamp",
      ]);
      const now = Date.now();
      const timestamp =
        typeof icsCacheTimestamp === "number" ? icsCacheTimestamp : 0;
      if (icsCache && now - timestamp < 24 * 60 * 60 * 1000) {
        return { success: true, data: icsCache, fromCache: true };
      }
      try {
        const response = await fetch(req.url);
        const data = await response.text();
        await browser.storage.local.set({
          icsCache: data,
          icsCacheTimestamp: now,
          icsUrl: req.url,
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
      await browser.storage.local.remove([
        "icsCache",
        "icsCacheTimestamp",
        "icsUrl",
      ]);
      return { success: true };
    }
  }
});

// Open the options page in a new tab when the icon is clicked
browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});
