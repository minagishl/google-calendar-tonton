import ICAL from "ical.js";

interface ICalEvent {
  summary: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  status: string;
}

export function icsToJson(icsData: string): ICalEvent[] {
  const jcalData = ICAL.parse(icsData);
  const comp = new ICAL.Component(jcalData);
  const events = comp.getAllSubcomponents("vevent");

  return events.map((event) => {
    const icalEvent = new ICAL.Event(event);

    return {
      summary: icalEvent.summary || "",
      description: icalEvent.description || null,
      location: icalEvent.location || null,
      startDate: icalEvent.startDate.toJSDate().toISOString(),
      endDate: icalEvent.endDate.toJSDate().toISOString(),
      status: String(event.getFirstPropertyValue("status") || "CONFIRMED"),
    };
  });
}
