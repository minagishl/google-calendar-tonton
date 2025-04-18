import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "./components/Button";
import browser from "webextension-polyfill";

function Options() {
  const [calendarUrl, setCalendarUrl] = useState<string>("");
  const [autoDeclineWeekends, setAutoDeclineWeekends] = useState(false);
  const [autoApplyCalendar, setAutoApplyCalendar] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [enforceWorkingHours, setEnforceWorkingHours] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<
    "right-top" | "right-bottom" | "left-top" | "left-bottom"
  >("right-top");
  const [minimalMode, setMinimalMode] = useState(false);

  useEffect(() => {
    // Load saved settings
    (async () => {
      const result = await browser.storage.local.get([
        "calendarUrl",
        "autoDeclineWeekends",
        "autoApplyCalendar",
        "startTime",
        "endTime",
        "enforceWorkingHours",
        "buttonPosition",
        "minimalMode",
      ]);

      if (result.calendarUrl) {
        setCalendarUrl(result.calendarUrl as string);
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
  }, []);

  const handleSave = async () => {
    // Validate the URL
    if (!calendarUrl) {
      alert("Please enter a valid Google Calendar URL.");
      return;
    }

    if (URL.canParse(calendarUrl) !== true) {
      alert("Please enter a valid URL.");
      return;
    }

    await browser.storage.local
      .set({
        calendarUrl,
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

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Google Calendar Tonton - Settings</h1>
      <div style={{ marginBottom: "20px" }}>
        <label
          htmlFor="calendarUrl"
          style={{ display: "block", marginBottom: "8px" }}
        >
          Google Calendar URL
        </label>
        <input
          type="text"
          id="calendarUrl"
          value={calendarUrl}
          onChange={(e) => setCalendarUrl(e.target.value)}
          style={{
            width: "100%",
            height: "32px",
            padding: "0 8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            boxSizing: "border-box",
          }}
        />
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
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button onClick={handleSave} variant="other">
          Save
        </Button>
        <div style={{ marginLeft: "auto", paddingLeft: "40px" }}>
          Please check{" "}
          <a
            href="https://github.com/minagishl/google-calendar-tonton/"
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
