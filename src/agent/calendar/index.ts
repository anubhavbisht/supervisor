import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { delegateTo } from "../delegate";
import { model } from "../llm";
import { createCalendarEvent, getAvailableTimeSlots } from "./tools";

const CALENDAR_AGENT_PROMPT = `
You are a calendar scheduling assistant.
Parse natural language scheduling requests (e.g., 'next Tuesday at 2pm')
into proper ISO datetime formats, relative to the current date below.
If no duration is given, assume 30 minutes.
Use get_available_time_slots to check availability when needed.
Use create_calendar_event to schedule events.
Always confirm what was scheduled, with exact date and time, in your final response.
`.trim();

/**
 * "Tomorrow at 9am" means nothing without today's date, and the model has no
 * clock. Without this line it resolves relative dates against its training
 * data and schedules the meeting in the wrong year.
 *
 * Why middleware and not a string built once: a string is fixed when the
 * process starts, so a CLI left open past midnight would be off by a day. The
 * middleware rebuilds the prompt on every model call.
 */
const withCurrentDate = dynamicSystemPromptMiddleware(() => {
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = now.toLocaleDateString("en-CA"); // en-CA formats as YYYY-MM-DD
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    return `${CALENDAR_AGENT_PROMPT}\n\nCurrent date: ${weekday}, ${today} (${tz}).`;
});

const calendarAgent = createAgent({
    model,
    tools: [createCalendarEvent, getAvailableTimeSlots],
    middleware: [withCurrentDate],
});

export const scheduleEvent = delegateTo(calendarAgent, {
    name: "schedule_event",
    description: `
Schedule calendar events using natural language.

Use this when the user wants to create, modify, or check calendar appointments.
Handles date/time parsing, availability checking, and event creation.
Include attendee email addresses in the request — this tool cannot look them up.

Input: Natural language scheduling request (e.g., 'standup tomorrow at 9am with sujoy@x.com, john@x.com')
    `.trim(),
    requestDescription: "Self-contained scheduling request, including attendee emails",
});
