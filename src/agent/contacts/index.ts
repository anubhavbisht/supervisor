import { createAgent } from "langchain";
import { delegateTo } from "../delegate";
import { model } from "../llm";
import { getContacts } from "./tools";

const CONTACT_AGENT_PROMPT = `
You are a contacts assistant.
Look up people and teams with get_contacts.
Always return each person's name, team, and email address exactly as the tool
returned them — other assistants will send mail to these addresses.
If nobody matches, say so plainly. Never guess or invent an address.
`.trim();

const contactAgent = createAgent({
    model,
    tools: [getContacts],
    systemPrompt: CONTACT_AGENT_PROMPT,
});

export const manageContacts = delegateTo(contactAgent, {
    name: "manage_contacts",
    description: `
Look up contacts using natural language.

Use this whenever you need someone's email address, or the members of a team,
before scheduling a meeting or sending an email.

Input: Natural language contact request (e.g., 'all contacts on the design team')
    `.trim(),
    requestDescription: "Natural language contact lookup request",
});
