import type React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { Button } from "./components/Button";
import { icsToJson } from "./utils/icsToJson";
import browser from "webextension-polyfill";

interface TimeSlot {
  time: string;
}

interface ScheduleData {
  date: string;
  availableSlots: TimeSlot[];
}

const isTimeInRange = (
  time: string,
  startTime: Date,
  endTime: Date
): boolean => {
  const [hours, minutes] = time.split(":").map(Number);
  const timeDate = new Date(startTime);
  timeDate.setHours(hours, minutes, 0, 0);
  return timeDate >= startTime && timeDate < endTime;
};

const applyCalendarEvents = async (): Promise<void> => {
  // Get saved settings
  interface StorageData {
    icsCache?: string;
    calendarUrl?: string;
    autoDeclineWeekends?: boolean;
  }

  const { calendarUrl, autoDeclineWeekends } = (await browser.storage.local.get(
    ["calendarUrl", "autoDeclineWeekends"]
  )) as StorageData;

  console.log(calendarUrl, autoDeclineWeekends);

  // Check if calendar URL is set
  if (!calendarUrl) {
    const url = prompt("Please enter your Google Calendar ICS URL:");
    if (url) {
      await browser.storage.local.set({ calendarUrl: url });
      await applyCalendarEvents();
    }
    console.log("Calendar URL not set!");
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

    // Auto decline weekends if enabled (moved after collecting slots)
    if (autoDeclineWeekends) {
      // Use JST (UTC+9) for day of week calculation
      const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      const dayOfWeek = jstDate.getDay();
      // If it's Saturday (6) or Sunday (0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        for (const slot of availableSlots) {
          markBusyTimeSlots(
            new Date(`${jstDate.toISOString().split("T")[0]}T${slot.time}`)
          );
        }
        // Skip further scheduling for weekends
        continue;
      }
    }

    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const jstDateString = jstDate.toISOString().split("T")[0];
    result.push({ date: jstDateString, availableSlots });
  }

  try {
    const response = (await browser.runtime.sendMessage({
      type: "FETCH_ICS",
      url: calendarUrl,
    })) as { success: boolean; error?: string; data?: string };

    if (!response.success) throw new Error(response.error);
    if (!response.data) throw new Error("No ICS data received.");

    const icsEvents = icsToJson(response.data);

    // Find non-overlapping slots
    for (const schedule of result) {
      const dateEvents = icsEvents.filter(
        (event) =>
          new Date(event.startDate).toISOString().split("T")[0] ===
          schedule.date
      );
      const busyTimeSlots = schedule.availableSlots.filter((slot) => {
        const [hours, minutes] = slot.time.split(":").map(Number);
        const slotDate = new Date(schedule.date);
        slotDate.setHours(hours, minutes, 0, 0);

        // Check if the slot overlaps with any event
        return dateEvents.some((event) => {
          const eventStart = new Date(event.startDate);
          const eventEnd = new Date(event.endDate);
          return isTimeInRange(slot.time, eventStart, eventEnd);
        });
      });

      if (busyTimeSlots.length === 0) {
        console.log("No available time slots found");
      } else {
        for (const slot of busyTimeSlots) {
          markBusyTimeSlots(new Date(`${schedule.date}T${slot.time}`));
        }
      }
    }
  } catch (error) {
    console.error("Error processing schedules:", error);
  }
};

const markBusyTimeSlots = (date: Date): void => {
  const button = document.querySelector<HTMLAnchorElement>("a#add-ancher");
  const dialog = document.querySelector<HTMLElement>("div#add-form-dlg");

  if (button && dialog?.style.visibility === "hidden") {
    button.dispatchEvent(
      new Event("click", { bubbles: true, cancelable: true })
    );

    const target = document.querySelector<HTMLInputElement>(
      'fieldset[id="schedule_list"] input[onclick="MT_setTimelineColor(1)"]'
    );
    if (target) {
      target.checked = true;
      target.click();
    }
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

  // Check if cache exists on mount
  useEffect(() => {
    (async () => {
      const result = await browser.storage.local.get("icsCache");
      setHasCachedData(!!result.icsCache);
    })();

    // Listen for cache changes
    const listener = (changes: {
      [key: string]: browser.Storage.StorageChange;
    }) => {
      if (changes.icsCache) setHasCachedData(!!changes.icsCache.newValue);
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
    if (window.confirm("Are you sure you want to reset the calendar URL?")) {
      browser.storage.local.remove("icsCache");
      browser.storage.local.remove("icsCacheTimestamp");
      browser.storage.local.remove("icsUrl");
      browser.storage.local.remove("calendarUrl").then(() => {
        alert("Calendar URL has been reset.");
      });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        display: "flex",
        gap: "8px",
        zIndex: 9999,
      }}
    >
      <Button onClick={handleResetUrl} variant="danger">
        Reset URL
      </Button>
      {hasCachedData && (
        <Button onClick={handleClearCache} variant="warning">
          Clear Cache
        </Button>
      )}
      <Button onClick={handleApplyCalendar} disabled={isLoading}>
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
