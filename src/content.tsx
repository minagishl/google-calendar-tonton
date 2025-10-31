import { Calendar, RotateCcw, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import { Button } from "./components/Button";
import { icsToJson } from "./utils/icsToJson";
import type { ICalEvent } from "./utils/icsToJson";

interface TimeSlot {
  time: string;
}

interface ScheduleData {
  date: string;
  availableSlots: TimeSlot[];
}

const applyCalendarEvents = async (): Promise<void> => {
  // Get saved settings
  interface StorageData {
    icsCache?: string;
    calendarUrls?: string[];
    autoDeclineWeekends?: boolean;
    startTime?: string;
    endTime?: string;
    enforceWorkingHours?: boolean;
  }

  const {
    calendarUrls = [""],
    autoDeclineWeekends,
    startTime,
    endTime,
    enforceWorkingHours,
  } = (await browser.storage.local.get([
    "calendarUrls",
    "autoDeclineWeekends",
    "startTime",
    "endTime",
    "enforceWorkingHours",
  ])) as StorageData;

  const workStartTime = startTime || "09:00";
  const workEndTime = endTime || "17:00";
  const shouldEnforceWorkingHours = enforceWorkingHours || false;

  // Check if calendar URLs are set
  if (!calendarUrls.length || (calendarUrls.length === 1 && !calendarUrls[0])) {
    const url = prompt("Please enter your Google Calendar ICS URL:");
    if (url) {
      await browser.storage.local.set({ calendarUrls: [url] });
      await applyCalendarEvents();
    }
    console.log("Calendar URLs not set!");
    return;
  }

  // Get available slots from UI
  const schedules = document.querySelectorAll<HTMLElement>(".schedulelist");
  const result: ScheduleData[] = [];

  for (const schedule of schedules) {
    const labelElement = schedule.querySelector("label");
    const dateText = labelElement?.textContent ?? "";
    const date = new Date(dateText);
    const timeline = schedule.querySelector<HTMLElement>(".timeline");

    // Check if timeline is null
    if (!timeline) continue;

    const timeSlots = timeline.querySelectorAll<HTMLSpanElement>("div span");
    const availableSlots: TimeSlot[] = [];

    for (const slot of timeSlots) {
      const isEnabled = slot.classList.contains("timesel_enabled");
      const timeId = slot.id;
      const timePart = timeId.split("_").pop() || "";
      const hour = timePart.substring(0, 2);
      const minute = timePart.substring(2, 4);
      const formattedTime = `${hour}:${minute}`;

      if (isEnabled) {
        availableSlots.push({ time: formattedTime });
      }
    }

    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const jstDateString = jstDate.toISOString().split("T")[0];
    result.push({ date: jstDateString, availableSlots });
  }

  try {
    // Fetch all calendar data in parallel
    const fetchPromises = calendarUrls
      .filter((url) => url.trim())
      .map(async (url) => {
        try {
          const response = (await browser.runtime.sendMessage({
            type: "FETCH_ICS",
            url,
          })) as { success: boolean; error?: string; data?: string };

          if (!response.success || !response.data) {
            console.error(
              `Error fetching calendar ${url}:`,
              response.error || "No data received"
            );
            return [];
          }

          // Calculate date range based on available schedules
          const earliestDate = new Date(
            Math.min(...result.map((s) => new Date(s.date).getTime()))
          );
          const latestDate = new Date(
            Math.max(...result.map((s) => new Date(s.date).getTime()))
          );

          // Add some buffer to ensure we capture all relevant events
          const startDate = new Date(
            earliestDate.getTime() - 7 * 24 * 60 * 60 * 1000
          ); // 7 days before
          const endDate = new Date(
            latestDate.getTime() + 7 * 24 * 60 * 60 * 1000
          ); // 7 days after

          return icsToJson(response.data, startDate, endDate);
        } catch (error) {
          console.error(`Failed to process calendar ${url}:`, error);
          return [];
        }
      });

    // Wait for all fetches to complete
    const eventsArrays = await Promise.all(fetchPromises);
    const events = eventsArrays.flat();

    if (events.length === 0) {
      console.warn("No calendar events found from any source");
    }

    const eventsByDate = new Map<string, ICalEvent[]>();
    for (const event of events) {
      const existing = eventsByDate.get(event.dateKey);
      if (existing) {
        existing.push(event);
      } else {
        eventsByDate.set(event.dateKey, [event]);
      }
    }

    for (const dateEvents of eventsByDate.values()) {
      dateEvents.sort((a, b) => a.startTimestamp - b.startTimestamp);
    }

    // Process each schedule
    for (const schedule of result) {
      const scheduleDate = new Date(schedule.date);
      const dayOfWeek = scheduleDate.getDay();
      const processedSlots = new Set<number>();

      const slotEntries = schedule.availableSlots.map((slot) => {
        const [hours, minutes] = slot.time.split(":").map(Number);
        const slotDate = new Date(schedule.date);
        slotDate.setHours(hours, minutes, 0, 0);
        return {
          time: slot.time,
          timestamp: slotDate.getTime(),
        };
      });

      for (const entry of slotEntries) {
        const shouldMarkBusy =
          (autoDeclineWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) ||
          (shouldEnforceWorkingHours &&
            (entry.time < workStartTime || entry.time >= workEndTime));

        if (shouldMarkBusy && !processedSlots.has(entry.timestamp)) {
          processedSlots.add(entry.timestamp);
          markBusyTimeSlots(new Date(entry.timestamp));
        }
      }

      if (autoDeclineWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }

      const dateEvents = eventsByDate.get(schedule.date) ?? [];

      if (dateEvents.length === 0) {
        console.warn("No calendar events found for", schedule.date);
        continue;
      }

      const busySlotEntries = slotEntries.filter((entry) => {
        if (processedSlots.has(entry.timestamp)) {
          return false;
        }

        for (const event of dateEvents) {
          if (event.endTimestamp <= entry.timestamp) {
            continue;
          }

          if (event.startTimestamp > entry.timestamp) {
            break;
          }

          if (
            entry.timestamp >= event.startTimestamp &&
            entry.timestamp < event.endTimestamp
          ) {
            return true;
          }
        }

        return false;
      });

      if (busySlotEntries.length === 0) {
        console.log("No available time slots found");
      } else {
        for (const entry of busySlotEntries) {
          if (processedSlots.has(entry.timestamp)) {
            continue;
          }
          processedSlots.add(entry.timestamp);
          markBusyTimeSlots(new Date(entry.timestamp));
        }
      }
    }
  } catch (error) {
    console.error("Error processing schedules:", error);
  }
};

const markBusyTimeSlots = (date: Date): void => {
  // Ensure the color selector is set to "busy" regardless of dialog state
  const target = document.querySelector<HTMLInputElement>(
    'fieldset[id="schedule_list"] input[onclick="MT_setTimelineColor(1)"]'
  );
  if (target) {
    target.checked = true;
    target.click();
  }

  // If dialog is not visible, open it
  const button = document.querySelector<HTMLAnchorElement>("a#add-ancher");
  const dialog = document.querySelector<HTMLElement>("div#add-form-dlg");

  if (button && dialog?.style.visibility === "hidden") {
    button.dispatchEvent(
      new Event("click", { bubbles: true, cancelable: true })
    );
  }

  const schedules = document.querySelectorAll<HTMLElement>(
    'fieldset[id="schedule_list"] > table:not(:first-child)'
  );

  // Format the input date as "YYYY/MM/DD"
  const pad = (n: number) => n.toString().padStart(2, "0");

  schedules.forEach((schedule, idx) => {
    const labelElement = schedule.querySelector<HTMLElement>(
      "tbody > tr > td > div.nowrap-pop"
    );
    const dateText = labelElement?.textContent?.trim();
    if (!dateText) return;

    // Compare only the date part
    const inputDate = new Date(
      `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
    );

    const labelDate = new Date(dateText.replace(/-/g, "/"));

    // Compare only the date part (ignore time)
    if (
      inputDate.getFullYear() === labelDate.getFullYear() &&
      inputDate.getMonth() === labelDate.getMonth() &&
      inputDate.getDate() === labelDate.getDate()
    ) {
      // Format time as "HHMM"
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());
      const spanId = `mtgtimeedit_${idx + 1}_${hour}${minute}`;
      const span = schedule.querySelector<HTMLElement>(`span[id="${spanId}"]`);
      if (span) {
        for (const type of ["mousedown", "mouseup"]) {
          const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          span.dispatchEvent(event);
        }
      }
    }
  });
};

const ButtonContainer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<
    "right-top" | "right-bottom" | "left-top" | "left-bottom"
  >("right-top");
  const [minimalMode, setMinimalMode] = useState(false);

  // Load settings and check cache on mount
  useEffect(() => {
    (async () => {
      // Load settings
      const settings = await browser.storage.local.get([
        "buttonPosition",
        "minimalMode",
      ]);
      if (settings.buttonPosition) {
        setButtonPosition(
          settings.buttonPosition as
            | "right-top"
            | "right-bottom"
            | "left-top"
            | "left-bottom"
        );
      }

      if (settings.minimalMode !== undefined) {
        setMinimalMode(settings.minimalMode as boolean);
      }

      const { icsCache } = await browser.storage.local.get("icsCache");
      setHasCachedData(!!icsCache && Object.keys(icsCache || {}).length > 0);
    })();

    // Check and execute auto-apply feature
    (async () => {
      const result = await browser.storage.local.get("autoApplyCalendar");
      if (result.autoApplyCalendar) {
        handleApplyCalendar();
      }
    })();

    // Listen for cache changes
    const listener = (changes: {
      [key: string]: browser.Storage.StorageChange;
    }) => {
      if (changes.icsCache) {
        const newCache = changes.icsCache.newValue;
        setHasCachedData(!!newCache && Object.keys(newCache || {}).length > 0);
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
      if (changes.minimalMode) {
        setMinimalMode(changes.minimalMode.newValue as boolean);
      }
    };

    browser.storage.onChanged.addListener(listener);

    // Cleanup listener on unmount
    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  const handleApplyCalendar = async () => {
    setIsLoading(true);
    try {
      await applyCalendarEvents();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    setHasCachedData(false);
    await browser.runtime.sendMessage({ type: "CLEAR_ICS_CACHE" });
  };

  const handleResetUrl = () => {
    if (window.confirm("Are you sure you want to reset all calendar URLs?")) {
      browser.storage.local
        .remove(["icsCache", "icsCacheTimestamp", "icsUrl", "calendarUrls"])
        .then(() => {
          alert("Calendar URLs have been reset.");
        });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        ...(buttonPosition === "right-top" && { top: "20px", right: "20px" }),
        ...(buttonPosition === "right-bottom" && {
          bottom: "20px",
          right: "20px",
        }),
        ...(buttonPosition === "left-top" && { top: "20px", left: "20px" }),
        ...(buttonPosition === "left-bottom" && {
          bottom: "20px",
          left: "20px",
        }),
        display: "flex",
        gap: "8px",
        zIndex: 9999,
      }}
    >
      <Button
        onClick={handleResetUrl}
        variant="danger"
        minimize={minimalMode}
        icon={<X size={18} />}
      >
        Reset URL
      </Button>
      {hasCachedData && (
        <Button
          onClick={handleClearCache}
          variant="warning"
          minimize={minimalMode}
          icon={<RotateCcw size={18} />}
        >
          Clear Cache
        </Button>
      )}
      <Button
        onClick={handleApplyCalendar}
        disabled={isLoading}
        minimize={minimalMode}
        icon={<Calendar size={18} />}
      >
        Apply Calendar
        {isLoading && (
          <div
            style={{
              width: "8px",
              height: "8px",
              border: "1.5px solid #ffffff",
              borderTop: "1.5px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </Button>
    </div>
  );
};

// Define the spin animation
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Create container for our button
const container = document.createElement("div");
container.id = "google-calendar-tonton";
document.body.appendChild(container);

// Render the button container
const root = createRoot(container);
root.render(<ButtonContainer />);
