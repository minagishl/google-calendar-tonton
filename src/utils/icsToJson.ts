import ICAL from "ical.js";

export interface ICalEvent {
  summary: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  status: string;
  startTimestamp: number;
  endTimestamp: number;
  dateKey: string;
}

type JCalData = ReturnType<typeof ICAL.parse>;

interface RangeCacheEntry {
  events: ICalEvent[];
  lastUsed: number;
}

interface CalendarCacheEntry {
  jcalData: JCalData;
  rangeCache: Map<string, RangeCacheEntry>;
  lastUsed: number;
}

const MAX_CALENDAR_CACHE_SIZE = 3;
const MAX_RANGE_CACHE_SIZE = 6;

const calendarCache = new Map<string, CalendarCacheEntry>();

function getCalendarCacheEntry(icsData: string): CalendarCacheEntry {
  let entry = calendarCache.get(icsData);

  if (!entry) {
    const jcalData = ICAL.parse(icsData);
    entry = {
      jcalData,
      rangeCache: new Map(),
      lastUsed: Date.now(),
    };
    calendarCache.set(icsData, entry);

    if (calendarCache.size > MAX_CALENDAR_CACHE_SIZE) {
      let oldestKey: string | undefined;
      let oldest = Number.POSITIVE_INFINITY;

      for (const [key, value] of calendarCache.entries()) {
        if (value.lastUsed < oldest) {
          oldest = value.lastUsed;
          oldestKey = key;
        }
      }

      if (oldestKey !== undefined) {
        calendarCache.delete(oldestKey);
      }
    }
  } else {
    entry.lastUsed = Date.now();
  }

  return entry;
}

function getRangeCache(entry: CalendarCacheEntry, rangeKey: string) {
  const rangeEntry = entry.rangeCache.get(rangeKey);
  if (!rangeEntry) return null;
  rangeEntry.lastUsed = Date.now();
  return rangeEntry.events;
}

function setRangeCache(
  entry: CalendarCacheEntry,
  rangeKey: string,
  events: ICalEvent[]
) {
  entry.rangeCache.set(rangeKey, { events, lastUsed: Date.now() });

  if (entry.rangeCache.size > MAX_RANGE_CACHE_SIZE) {
    let oldestKey: string | undefined;
    let oldest = Number.POSITIVE_INFINITY;

    for (const [key, value] of entry.rangeCache.entries()) {
      if (value.lastUsed < oldest) {
        oldest = value.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      entry.rangeCache.delete(oldestKey);
    }
  }
}

export function icsToJson(
  icsData: string,
  startDate?: Date,
  endDate?: Date
): ICalEvent[] {
  const cacheEntry = getCalendarCacheEntry(icsData);

  // Default date range: 30 days from today
  const rangeStart = startDate || new Date();
  const rangeEnd = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const rangeStartTime = rangeStart.getTime();
  const rangeEndTime = rangeEnd.getTime();
  const rangeKey = `${rangeStartTime}-${rangeEndTime}`;

  const cachedRange = getRangeCache(cacheEntry, rangeKey);
  if (cachedRange) {
    return cachedRange;
  }

  const comp = new ICAL.Component(cacheEntry.jcalData);
  const events = comp.getAllSubcomponents("vevent");
  const result: ICalEvent[] = [];

  for (const event of events) {
    const icalEvent = new ICAL.Event(event);

    // Check if this is a recurring event
    if (icalEvent.isRecurring()) {
      // Expand recurring events within the date range
      const iterator = icalEvent.iterator();
      let occurrence = iterator.next();
      const duration = icalEvent.endDate.subtractDate(icalEvent.startDate);

      while (occurrence) {
        const occurrenceDate = occurrence.toJSDate();
        const occurrenceStart = occurrenceDate.getTime();

        // Stop if we've gone past the end date
        if (occurrenceStart > rangeEndTime) {
          break;
        }

        // Only include occurrences within our date range
        if (occurrenceStart >= rangeStartTime) {
          const occurrenceEnd = occurrence.clone();
          occurrenceEnd.addDuration(duration);
          const occurrenceEndDate = occurrenceEnd.toJSDate();
          const occurrenceEndTime = occurrenceEndDate.getTime();
          const startDateIso = occurrenceDate.toISOString();
          const endDateIso = occurrenceEndDate.toISOString();
          const dateKey = startDateIso.split("T")[0];

          result.push({
            summary: icalEvent.summary || "",
            description: icalEvent.description || null,
            location: icalEvent.location || null,
            startDate: startDateIso,
            endDate: endDateIso,
            status: String(
              event.getFirstPropertyValue("status") || "CONFIRMED"
            ),
            startTimestamp: occurrenceStart,
            endTimestamp: occurrenceEndTime,
            dateKey,
          });
        }

        occurrence = iterator.next();
      }
    } else {
      // Handle non-recurring events
      const eventStartDate = icalEvent.startDate.toJSDate();
      const eventEndDate = icalEvent.endDate.toJSDate();
      const eventStartTime = eventStartDate.getTime();

      // Only include events within our date range
      if (eventStartTime >= rangeStartTime && eventStartTime <= rangeEndTime) {
        const startDateIso = eventStartDate.toISOString();
        const dateKey = startDateIso.split("T")[0];
        result.push({
          summary: icalEvent.summary || "",
          description: icalEvent.description || null,
          location: icalEvent.location || null,
          startDate: icalEvent.startDate.toJSDate().toISOString(),
          endDate: eventEndDate.toISOString(),
          status: String(event.getFirstPropertyValue("status") || "CONFIRMED"),
          startTimestamp: eventStartTime,
          endTimestamp: eventEndDate.getTime(),
          dateKey,
        });
      }
    }
  }

  setRangeCache(cacheEntry, rangeKey, result);

  return result;
}
