import { tool } from "langchain";
import { z } from "zod";

export const sendEmail = tool(
    async ({ to, subject, body, cc }) => {
        // Stub: in practice, SendGrid / Gmail API.
        const copied = cc?.length ? ` (cc: ${cc.join(", ")})` : "";
        return `Email sent to ${to.join(", ")}${copied} - Subject: ${subject}`;
    },
    {
        name: "send_email",
        description: "Send an email via email API. Requires properly formatted addresses.",
        schema: z.object({
            // z.email() rather than z.string(): if the model passes "Sujoy",
            // the schema rejects it and the model gets the error back to fix.
            // With z.string() it would pass validation and fail silently at
            // the real provider.
            to: z.array(z.email()).min(1).describe("recipient email addresses"),
            subject: z.string(),
            body: z.string(),
            cc: z.array(z.email()).optional(),
        }),
    },
);
