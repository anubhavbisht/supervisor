import { createAgent } from "langchain";
import { delegateTo } from "../delegate";
import { model } from "../llm";
import { sendEmail } from "./tools";

const EMAIL_AGENT_PROMPT = `
You are an email assistant.
Compose professional emails based on natural language requests.
Craft an appropriate subject line and body text from the request.
Send only to email addresses given in the request. If none are given,
do not send — reply saying which recipients' addresses are missing.
Use send_email to send the message.
Always confirm what was sent, and to whom, in your final response.
`.trim();

const emailAgent = createAgent({
    model,
    tools: [sendEmail],
    systemPrompt: EMAIL_AGENT_PROMPT,
});

export const manageEmail = delegateTo(emailAgent, {
    name: "manage_email",
    description: `
Send emails using natural language.

Use this when the user wants to send notifications, reminders, or any email communication.
Handles subject generation and email composition.
Include recipient email addresses and every fact the email must mention (date,
time, topic) — this tool sees only your request, not the conversation.

Input: Natural language email request (e.g., 'email sujoy@x.com that standup is tomorrow at 9am')
    `.trim(),
    requestDescription: "Self-contained email request, including recipient emails and content",
});
