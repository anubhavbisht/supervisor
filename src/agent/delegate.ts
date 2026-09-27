import type { BaseMessage } from "@langchain/core/messages";
import { tool } from "langchain";
import { z } from "zod";

/**
 * Steps a specialist may take on one request before it is stopped. Each tool
 * call costs two steps (model, then tool), so 12 allows about five tool calls.
 * Too low and a legitimate "check slots, then create" request gets cut off
 * halfway; too high and a confused specialist burns tokens retrying one
 * failing call. Without it, LangGraph's default of 25 applies silently.
 */
export const MAX_SPECIALIST_STEPS = 12;

/**
 * The narrowest shape of a specialist that delegation needs. It is structural
 * on purpose, so this module does not depend on createAgent's generics, and
 * a test can pass a fake.
 */
export type Specialist = {
    invoke(
        input: { messages: { role: "user"; content: string }[] },
        config?: { recursionLimit?: number },
    ): Promise<{ messages: BaseMessage[] }>;
};

type DelegationSpec = {
    name: string;
    description: string;
    requestDescription: string;
};

/**
 * Exposes a specialist agent to the supervisor as one natural-language tool.
 *
 * This is the whole supervisor pattern in one function. The specialist runs
 * with a **fresh** message list. It sees only the request the supervisor wrote,
 * never the user's conversation, and only its final message comes back. That
 * isolation keeps each specialist's context small and its prompt focused. It
 * also means the request must be self-contained: "email them about it" reaches
 * the email agent with no "them" and no "it".
 */
export function delegateTo(specialist: Specialist, spec: DelegationSpec) {
    return tool(
        async ({ request }) => {
            try {
                const result = await specialist.invoke(
                    { messages: [{ role: "user", content: request }] },
                    { recursionLimit: MAX_SPECIALIST_STEPS },
                );
                return result.messages.at(-1)?.text || `${spec.name} finished without a reply.`;
            } catch (e) {
                // One failed specialist is not a failed turn. If we returned the
                // error as the tool result, the supervisor could still report
                // what did succeed (the event was created, the email was not).
                // If we threw instead, the whole turn and its work would be lost.
                return `${spec.name} failed: ${(e as Error).message}`;
            }
        },
        {
            name: spec.name,
            description: spec.description,
            schema: z.object({
                request: z.string().describe(spec.requestDescription),
            }),
        },
    );
}
