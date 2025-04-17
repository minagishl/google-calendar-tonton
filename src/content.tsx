import type React from "react";
import { createRoot } from "react-dom/client";
import { icsToJson } from "./utils/icsToJson";

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

const extractSchedules = async () => {
  // Get available slots from UI
  const schedules = document.querySelectorAll(".schedulelist");
  const result: ScheduleData[] = [];

  for (const schedule of schedules) {
    const labelElement = schedule.querySelector("label");
    const dateText = labelElement ? labelElement.textContent : "";
    const date = new Date(dateText || "");
    const timeline = schedule.querySelector(".timeline");

    if (timeline) {
      const timeSlots = timeline.querySelectorAll("div span");
      const availableSlots: TimeSlot[] = [];

      for (const slot of timeSlots) {
        const isEnabled = slot.classList.contains("timesel_enabled");
        const timeId = slot.id;
        const timePart = timeId.split("_").pop() || "";
        const hour = timePart.substring(0, 2);
        const minute = timePart.substring(2, 4);
        const formattedTime = `${hour}:${minute}`;

        if (isEnabled) {
          availableSlots.push({
            time: formattedTime,
          });
        }
      }

      // Format date in JST timezone (UTC+9)
      const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      const jstDateString = jstDate.toISOString().split("T")[0];

      result.push({
        date: jstDateString,
        availableSlots,
      });
    }
  }

  // Get ICS data
  const calendarUrl = localStorage.getItem("calendarUrl");
  if (!calendarUrl) {
    console.error("Calendar URL not set!");
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "FETCH_ICS",
      url: calendarUrl,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    const icsEvents = icsToJson(response.data);

    // Find non-overlapping slots
    for (const schedule of result) {
      const dateEvents = icsEvents.filter((event) => {
        const eventStart = new Date(event.startDate);
        return eventStart.toISOString().split("T")[0] === schedule.date;
      });

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

      console.log(`\nAvailable slots for ${schedule.date}:`);
      if (busyTimeSlots.length === 0) {
        console.log("No available time slots found");
      } else {
        for (const slot of busyTimeSlots) {
          selectTimeSlots(new Date(`${schedule.date}T${slot.time}`));
          console.log(slot.time);
        }
      }
    }
  } catch (error) {
    console.error("Error processing schedules:", error);
  }
};

const selectTimeSlots = (date: Date) => {
  const button = document.querySelector("a[id='add-ancher']");
  const dialog = document.querySelector(
    'div[id="add-form-dlg"]'
  ) as HTMLElement;
  if (button && dialog.style.visibility === "hidden") {
    (button as HTMLElement).click();

    const target = document.querySelector(
      'fieldset[id="schedule_list"] input[onclick="MT_setTimelineColor(1)"]'
    ) as HTMLInputElement;
    if (target) {
      target.checked = true;
      target.click();
    }
  }

  const schedules = document.querySelectorAll(
    'fieldset[id="schedule_list"] > table:not(:first-child)'
  );

  // Format the input date as "YYYY/MM/DD"
  const pad = (n: number) => n.toString().padStart(2, "0");

  schedules.forEach((schedule, idx) => {
    const labelElement = schedule.querySelector(
      'tbody > tr > td > div[class="nowrap-pop"]'
    );
    const dateText = labelElement ? labelElement.textContent?.trim() : "";
    if (!dateText) return;

    // Compare only the date part
    const inputDate = new Date(
      `${date.getFullYear()}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`
    );

    const labelDate = new Date(dateText.replace(/-/g, "/"));

    // Compare only the date part (ignore time)
    if (
      inputDate.getFullYear() === labelDate.getFullYear() &&
      inputDate.getMonth() === labelDate.getMonth() &&
      inputDate.getDate() === labelDate.getDate()
    ) {
      console.log("Found matching date:", dateText);
      // Format time as "HHMM"
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());
      const timeStr = `${hour}${minute}`;
      // Use idx+1 for the number part
      const spanId = `mtgtimeedit_${idx + 1}_${timeStr}`;
      const span = schedule.querySelector(
        `span[id="${spanId}"]`
      ) as HTMLElement | null;
      if (span) {
        for (const type of ["mousedown", "mouseup"]) {
          const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          span.dispatchEvent(event);
          console.log(`Dispatched span with ID: ${spanId}`);
        }
      }
    }
  });
};

const ExtractButton = (): React.ReactNode => {
  return (
    <button
      type="button"
      onClick={extractSchedules}
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "8px 16px",
        backgroundColor: "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        zIndex: 9999,
      }}
    >
      Extract Schedule
    </button>
  );
};

// Create container for our button
const container = document.createElement("div");
document.body.appendChild(container);

// Render the buttons
const root = createRoot(container);
root.render(<ExtractButton />);
