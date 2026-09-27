import { tool } from "langchain";
import { z } from "zod";

export const createCalendarEvent = tool(
    async ({ title, startTime, endTime, attendees, location }) => {
        // Stub: in practice, Google Calendar / Outlook API.
        const where = location ? ` at ${location}` : "";
        return `Event created: ${title} from ${startTime} to ${endTime}${where} with ${attendees.length} attendee(s)`;
    },
    {
        name: "create_calendar_event",
        description: "Create a calendar event. Requires exact ISO datetime format.",
        schema: z.object({
            title: z.string(),
            startTime: z.string().describe("ISO format: '2024-01-15T14:00:00'"),
            endTime: z.string().describe("ISO format: '2024-01-15T15:00:00'"),
            attendees: z.array(z.string()).describe("email addresses; empty if none"),
            location: z.string().optional(),
        }),
    },
);
