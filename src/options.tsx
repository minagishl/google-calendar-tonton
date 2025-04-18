import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "./components/Button";

function Options() {
  const [calendarUrl, setCalendarUrl] = useState<string>("");

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(["calendarUrl"], (result) => {
      if (result.calendarUrl) {
        setCalendarUrl(result.calendarUrl);
      }
    });
  }, []);

  const handleSave = () => {
    // Validate the URL
    if (!calendarUrl) {
      alert("Please enter a valid Google Calendar URL.");
      return;
    }

    chrome.storage.local.set({ calendarUrl }, () => {
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
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>
      <Button onClick={handleSave} variant="other">
        Save
      </Button>
    </div>
  );
}

const root = document.createElement("div");
document.body.appendChild(root);
createRoot(root).render(<Options />);
