import { tool } from "langchain";
import { z } from "zod";

export const getAvailableTimeSlots = tool(
    async ({ attendees, date, durationMinutes }) => {
        // Stub: in practice, a free/busy query against the calendar API.
        return JSON.stringify(["09:00", "14:00", "16:00"]);
    },
    {
        name: "get_available_time_slots",
        description: "Check calendar availability for given attendees on a specific date.",
        schema: z.object({
            attendees: z.array(z.string()).describe("email addresses"),
            date: z.string().describe("ISO format: '2024-01-15'"),
            durationMinutes: z.number(),
        }),
    },
);
