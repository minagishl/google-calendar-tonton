import ICAL from "ical.js";

interface ICalEvent {
  summary: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  status: string;
}

export function icsToJson(
  icsData: string,
  startDate?: Date,
  endDate?: Date
): ICalEvent[] {
  const jcalData = ICAL.parse(icsData);
  const comp = new ICAL.Component(jcalData);
  const events = comp.getAllSubcomponents("vevent");
  const result: ICalEvent[] = [];

  // Default date range: 30 days from today
  const rangeStart = startDate || new Date();
  const rangeEnd = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  for (const event of events) {
    const icalEvent = new ICAL.Event(event);

    // Check if this is a recurring event
    if (icalEvent.isRecurring()) {
      // Expand recurring events within the date range
      const iterator = icalEvent.iterator();
      let occurrence = iterator.next();

      while (occurrence) {
        const occurrenceDate = occurrence.toJSDate();

        // Stop if we've gone past the end date
        if (occurrenceDate > rangeEnd) {
          break;
        }

        // Only include occurrences within our date range
        if (occurrenceDate >= rangeStart) {
          const duration = icalEvent.endDate.subtractDate(icalEvent.startDate);
          const occurrenceEnd = occurrence.clone();
          occurrenceEnd.addDuration(duration);

          result.push({
            summary: icalEvent.summary || "",
            description: icalEvent.description || null,
            location: icalEvent.location || null,
            startDate: occurrenceDate.toISOString(),
            endDate: occurrenceEnd.toJSDate().toISOString(),
            status: String(
              event.getFirstPropertyValue("status") || "CONFIRMED"
            ),
          });
        }

        occurrence = iterator.next();
      }
    } else {
      // Handle non-recurring events
      const eventStartDate = icalEvent.startDate.toJSDate();

      // Only include events within our date range
      if (eventStartDate >= rangeStart && eventStartDate <= rangeEnd) {
        result.push({
          summary: icalEvent.summary || "",
          description: icalEvent.description || null,
          location: icalEvent.location || null,
          startDate: icalEvent.startDate.toJSDate().toISOString(),
          endDate: icalEvent.endDate.toJSDate().toISOString(),
          status: String(event.getFirstPropertyValue("status") || "CONFIRMED"),
        });
      }
    }
  }

  return result;
}
