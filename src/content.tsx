import type React from "react";
import { createRoot } from "react-dom/client";
import { icsToJson } from "./utils/icsToJson";

interface TimeSlot {
  time: string;
  isHalfHour: boolean;
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
  return timeDate >= startTime && timeDate <= endTime;
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
            isHalfHour: slot.classList.contains("timesel_30"),
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

      const availableTimeSlots = schedule.availableSlots.filter((slot) => {
        const [hours, minutes] = slot.time.split(":").map(Number);
        const slotDate = new Date(schedule.date);
        slotDate.setHours(hours, minutes, 0, 0);

        // Check if the slot overlaps with any event
        return !dateEvents.some((event) => {
          const eventStart = new Date(event.startDate);
          const eventEnd = new Date(event.endDate);
          return isTimeInRange(slot.time, eventStart, eventEnd);
        });
      });

      console.log(`\nAvailable slots for ${schedule.date}:`);
      if (availableTimeSlots.length === 0) {
        console.log("No available time slots found");
      } else {
        for (const slot of availableTimeSlots) {
          console.log(
            `${slot.time} (${slot.isHalfHour ? "30 min" : "60 min"})`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error processing schedules:", error);
  }
};

const AncherButton = (): React.ReactNode => {
  const handleClick = () => {
    const button = document.querySelector("a[id='add-ancher']");
    if (button) {
      (button as HTMLElement).click();
    } else {
      alert("Ancher button not found!");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        position: "fixed",
        top: "70px",
        right: "20px",
        padding: "8px 16px",
        backgroundColor: "#FF9800",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        zIndex: 9999,
      }}
    >
      Open Add Ancher
    </button>
  );
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
root.render(
  <>
    <ExtractButton />
    <AncherButton />
  </>
);
