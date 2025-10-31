import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import { Button } from "./components/Button";
import { icsToJson } from "./utils/icsToJson";
import type { ICalEvent } from "./utils/icsToJson";

interface CalendarSource {
  url: string;
  cacheTimestamp: string;
  events: ICalEvent[];
}

function Options() {
  const [calendarUrls, setCalendarUrls] = useState<string[]>([""]);
  const [autoDeclineWeekends, setAutoDeclineWeekends] = useState(false);
  const [autoApplyCalendar, setAutoApplyCalendar] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [enforceWorkingHours, setEnforceWorkingHours] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<
    "right-top" | "right-bottom" | "left-top" | "left-bottom"
  >("right-top");
  const [minimalMode, setMinimalMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Listen for changes in storage
    const handleStorageChange = (
      changes: { [key: string]: browser.Storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;

      if (changes.calendarUrls) {
        setCalendarUrls((changes.calendarUrls.newValue as string[]) || [""]);
      }
      if (changes.autoDeclineWeekends) {
        setAutoDeclineWeekends(changes.autoDeclineWeekends.newValue as boolean);
      }
      if (changes.autoApplyCalendar) {
        setAutoApplyCalendar(changes.autoApplyCalendar.newValue as boolean);
      }
      if (changes.startTime) {
        setStartTime(changes.startTime.newValue as string);
      }
      if (changes.endTime) {
        setEndTime(changes.endTime.newValue as string);
      }
      if (changes.enforceWorkingHours) {
        setEnforceWorkingHours(changes.enforceWorkingHours.newValue as boolean);
      }
      if (changes.buttonPosition) {
        setButtonPosition(
          changes.buttonPosition.newValue as
            | "right-top"
            | "right-bottom"
            | "left-top"
            | "left-bottom"
        );
      }
      if (changes.minimalMode !== undefined) {
        setMinimalMode(changes.minimalMode.newValue as boolean);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    // Load saved settings
    (async () => {
      const result = await browser.storage.local.get([
        "calendarUrls",
        "autoDeclineWeekends",
        "autoApplyCalendar",
        "startTime",
        "endTime",
        "enforceWorkingHours",
        "buttonPosition",
        "minimalMode",
        "icsCache",
      ]);

      if (result.calendarUrls) {
        setCalendarUrls(result.calendarUrls as string[]);
      }

      if (result.autoDeclineWeekends) {
        setAutoDeclineWeekends(result.autoDeclineWeekends as boolean);
      }

      if (result.autoApplyCalendar) {
        setAutoApplyCalendar(result.autoApplyCalendar as boolean);
      }

      if (result.startTime) {
        setStartTime(result.startTime as string);
      }

      if (result.endTime) {
        setEndTime(result.endTime as string);
      }

      if (result.enforceWorkingHours) {
        setEnforceWorkingHours(result.enforceWorkingHours as boolean);
      }

      if (result.buttonPosition) {
        setButtonPosition(
          result.buttonPosition as
            | "right-top"
            | "right-bottom"
            | "left-top"
            | "left-bottom"
        );
      }

      if (result.minimalMode !== undefined) {
        setMinimalMode(result.minimalMode as boolean);
      }
    })();
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleSave = async () => {
    // Validate URLs and remove empty ones
    const validUrls = calendarUrls.filter((url) => url.trim() !== "");

    if (validUrls.length === 0) {
      alert("Please enter at least one valid Google Calendar URL.");
      return;
    }

    // Validate all URLs
    for (const url of validUrls) {
      if (URL.canParse(url) !== true) {
        alert(`Invalid URL: ${url}`);
        return;
      }
    }

    await browser.storage.local
      .set({
        calendarUrls: validUrls,
        autoDeclineWeekends,
        autoApplyCalendar,
        startTime,
        endTime,
        enforceWorkingHours,
        buttonPosition,
        minimalMode,
      })
      .then(() => {
        alert("Settings have been saved");
      });
  };

  const loadCalendarData = useCallback(async () => {
    console.log("Loading calendar data...");
    setIsLoading(true);
    try {
      const { icsCache } = await browser.storage.local.get("icsCache");
      console.log("Retrieved icsCache:", icsCache);

      if (!icsCache) {
        console.log("No icsCache found, setting empty data");
        setCalendarData([]);
        return;
      }

      const allEvents: CalendarSource[] = [];

      for (const [url, cacheData] of Object.entries(icsCache)) {
        const cache = cacheData as { data: string; timestamp: number };
        try {
          // For debug display, show events for a wider range
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
          const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
          const events = icsToJson(cache.data, startDate, endDate);
          console.log(`Parsed ${events.length} events for ${url}`);
          allEvents.push({
            url,
            cacheTimestamp: new Date(cache.timestamp).toLocaleString(),
            events,
          });
        } catch (error) {
          console.error(`Error parsing ICS data for ${url}:`, error);
        }
      }

      console.log("Setting calendar data:", allEvents);
      setCalendarData(allEvents);
    } catch (error) {
      console.error("Error loading calendar data:", error);
      alert(`Error loading calendar data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // watch icsCache changes in real-time
  useEffect(() => {
    if (!debugMode) return;

    const handleIcsCacheChange = (
      changes: { [key: string]: browser.Storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;

      if (changes.icsCache) {
        loadCalendarData();
      }
    };

    browser.storage.onChanged.addListener(handleIcsCacheChange);

    // when debug mode is enabled, load the initial data
    loadCalendarData();

    return () => {
      browser.storage.onChanged.removeListener(handleIcsCacheChange);
    };
  }, [debugMode, loadCalendarData]);

  const handleDebugToggle = () => {
    setDebugMode(!debugMode);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Google Calendar Tonton - Settings</h1>
      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="calendar-urls"
          style={{ display: "block", marginBottom: "8px" }}
        >
          Google Calendar URLs
        </label>
        {calendarUrls.map((url, index) => (
          <div
            key={`calendar-url-${url}`}
            style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
          >
            <input
              id={index === 0 ? "calendar-urls" : undefined}
              type="text"
              value={url}
              onChange={(e) => {
                const newUrls = [...calendarUrls];
                newUrls[index] = e.target.value;
                setCalendarUrls(newUrls);
              }}
              style={{
                flex: 1,
                height: "32px",
                padding: "0 8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => {
                const newUrls = calendarUrls.filter((_, i) => i !== index);
                if (newUrls.length === 0) newUrls.push(""); // Keep at least one
                setCalendarUrls(newUrls);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCalendarUrls([...calendarUrls, ""])}
          style={{
            marginTop: "8px",
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Add another calendar URL
        </button>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={autoDeclineWeekends}
            onChange={(e) => setAutoDeclineWeekends(e.target.checked)}
          />
          Automatically decline events on Saturdays and Sundays
        </label>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={autoApplyCalendar}
            onChange={(e) => setAutoApplyCalendar(e.target.checked)}
          />
          Automatically apply calendar events
        </label>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <input
            type="checkbox"
            checked={enforceWorkingHours}
            onChange={(e) => setEnforceWorkingHours(e.target.checked)}
          />
          Enforce working hours
        </label>
        <div
          style={{
            display: "block",
            marginBottom: "8px",
            opacity: enforceWorkingHours ? 1 : 0.5,
          }}
        >
          <span>Working Hours:</span>
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginTop: "8px",
            }}
          >
            <label
              htmlFor="startTime"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!enforceWorkingHours}
                style={{
                  height: "32px",
                  padding: "0 8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                }}
              />
            </label>
            <span>to</span>
            <label
              htmlFor="endTime"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!enforceWorkingHours}
                style={{
                  height: "32px",
                  padding: "0 8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                }}
              />
            </label>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="buttonPosition"
          style={{ display: "block", marginBottom: "8px" }}
        >
          Button Position
        </label>
        <select
          id="buttonPosition"
          value={buttonPosition}
          onChange={(e) =>
            setButtonPosition(
              e.target.value as
                | "right-top"
                | "right-bottom"
                | "left-top"
                | "left-bottom"
            )
          }
          style={{
            width: "100%",
            height: "32px",
            padding: "0 8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            boxSizing: "border-box",
          }}
        >
          <option value="right-top">Right Top</option>
          <option value="right-bottom">Right Bottom</option>
          <option value="left-top">Left Top</option>
          <option value="left-bottom">Left Bottom</option>
        </select>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={minimalMode}
            onChange={(e) => setMinimalMode(e.target.checked)}
          />
          Use minimal button mode (icon only)
        </label>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={debugMode}
            onChange={handleDebugToggle}
          />
          Debug Mode (Show Calendar Data)
        </label>
      </div>
      {debugMode && (
        <div style={{ marginBottom: "20px" }}>
          <h2>Calendar Debug Information</h2>
          <div style={{ marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => {
                console.log("Refresh button clicked");
                loadCalendarData();
              }}
              disabled={isLoading}
              style={{
                marginRight: "10px",
                padding: "8px 16px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                background: isLoading ? "#e0e0e0" : "#f5f5f5",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? "Loading..." : "Refresh Calendar Data"}
            </button>
            <span style={{ fontSize: "12px", color: "#666" }}>
              {isLoading
                ? "Updating..."
                : `Last updated: ${new Date().toLocaleTimeString()}`}
            </span>
          </div>
          {calendarData.length === 0 ? (
            <p>No calendar data found in cache.</p>
          ) : (
            calendarData.map((calendarSource) => (
              <div
                key={calendarSource.url}
                style={{
                  marginBottom: "24px",
                  padding: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: "#f9f9f9",
                }}
              >
                <h3>Calendar Source</h3>
                <p style={{ overflowWrap: "anywhere" }}>
                  <strong>URL:</strong> {calendarSource.url}
                </p>
                <p>
                  <strong>Cache Updated:</strong>{" "}
                  {calendarSource.cacheTimestamp}
                </p>
                <p>
                  <strong>Events Found:</strong> {calendarSource.events.length}
                </p>

                {calendarSource.events.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <h4>Events:</h4>
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      {calendarSource.events.map((event) => (
                        <div
                          key={`${event.startDate}-${event.summary}`}
                          style={{
                            marginBottom: "12px",
                            padding: "12px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            background: "#fff",
                          }}
                        >
                          <p>
                            <strong>Title:</strong> {event.summary}
                          </p>
                          <p>
                            <strong>Start:</strong>{" "}
                            {new Date(event.startDate).toLocaleString()}
                          </p>
                          <p>
                            <strong>End:</strong>{" "}
                            {new Date(event.endDate).toLocaleString()}
                          </p>
                          <p>
                            <strong>Status:</strong> {event.status}
                          </p>
                          {event.location && (
                            <p>
                              <strong>Location:</strong> {event.location}
                            </p>
                          )}
                          {event.description && (
                            <p>
                              <strong>Description:</strong> {event.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button onClick={handleSave} variant="other">
          Save
        </Button>
        <div style={{ marginLeft: "auto", paddingLeft: "40px" }}>
          Please check{" "}
          <a
            href="https://github.com/minagishl/google-calendar-tonton"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          for inquiries.
        </div>
      </div>
    </div>
  );
}

const root = document.createElement("div");
document.body.appendChild(root);
createRoot(root).render(<Options />);
