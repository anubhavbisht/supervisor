import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { scheduleEvent } from "./calendar";
import { manageContacts } from "./contacts";
import { manageEmail } from "./email";
import { model } from "./llm";

/**
 * The ordering rule is the reason for the whole prompt. Specialists cannot see
 * each other or the conversation, so the supervisor is the only place where
 * "the design team" becomes a list of addresses, and it has to do that before
 * it delegates anything that needs them.
 */
const SUPERVISOR_PROMPT = `
You are a helpful personal assistant that coordinates specialists.
You can look up contacts, schedule calendar events, and send emails.

Rules:
- Whenever a request mentions people or teams, call manage_contacts FIRST
  to get their email addresses.
- Each specialist sees only the request you write, never this conversation.
  Write every request so it stands alone: include the email addresses, dates,
  times, and topic in full. Never write "them", "it", or "the meeting".
- When one action depends on another (an email about an event), wait for the
  first result and pass its details into the next request.
- If a specialist reports a failure or a missing contact, tell the user what
  did and did not happen. Do not retry blindly or invent details.

Finish with a short summary of everything that was done.
`.trim();

/**
 * Only the supervisor has a checkpointer. The specialists are stateless by
 * design: each call starts from a blank slate, so a stale email draft or a
 * previous turn's attendee list can never leak into a new request. Memory of
 * the conversation lives in exactly one place.
 *
 * MemorySaver keeps threads in process memory, so they last as long as the
 * process does.
 */
export const app = createAgent({
    model,
    tools: [manageContacts, scheduleEvent, manageEmail],
    systemPrompt: SUPERVISOR_PROMPT,
    checkpointer: new MemorySaver(),
});
