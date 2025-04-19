import { getVitalityMatches } from "./scrape.js";
import * as fs from "fs";
import { createEvents, type DateArray, type EventAttributes } from "ics";

/**
 * Extracts the details of recent and upcoming Vitality events, then creates an
 * ICS file named "Vitality.ics" in the current directory containing these events
 */
async function createICS() {
  try {
    const events = await getVitalityMatches();
    if (!events?.length) throw new Error("No events retrieved");

    // Convert event details in the format in accordance with the ICS generator
    const formattedEvents = events.map(formatEventForCalendar);

    console.log("\nDetailed events:");
    console.log(formattedEvents);

    // Create Vitality.ics
    const eventsData = createEvents(formattedEvents).value;
    if (eventsData) fs.writeFileSync("Vitality.ics", eventsData);
  } catch (error) {
    console.error(error);
  }
}

function formatEventForCalendar(event: UFCEvent): EventAttributes {
  const date = new Date(event.date);
  const start: DateArray = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
  const duration: { hours: number } = { hours: 3 };
  const title = event.name;
  let description = "";

  const location = event.location;
  const uid = event.url.href;
  const calName = "HLTV";

  const calendarEvent = {
    start,
    duration,
    title,
    description,
    location,
    uid,
    calName,
  };

  return calendarEvent;
}

createICS();
