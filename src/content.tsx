import type React from "react";
import { createRoot } from "react-dom/client";

interface TimeSlot {
  time: string;
  isHalfHour: boolean;
}

interface ScheduleData {
  date: string;
  availableSlots: TimeSlot[];
}

const ExtractButton = (): React.ReactNode => {
  const extractSchedules = () => {
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
          const timeId = slot.id; // e.g. "mtgtime_0_0600"
          const timePart = timeId.split("_").pop() || ""; // e.g. "0600"
          const hour = timePart.substring(0, 2);
          const minute = timePart.substring(2, 4);
          const formattedTime = `${hour}:${minute}`;

          // Adding the time slot to the collection if it's enabled
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

    console.log(JSON.stringify(result, null, 2));
  };

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

// Render the button
const root = createRoot(container);
root.render(<ExtractButton />);
