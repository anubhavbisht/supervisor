// First import on purpose: validates the environment before any model is
// constructed, so a missing key fails here instead of inside a provider call.
import "./src/config";

import readline from "node:readline/promises";
import type { AIMessage, BaseMessage } from "@langchain/core/messages";
import { app } from "./src/agent/supervisor";

const EXIT_WORDS = ["bye", "exit", "quit"];

/** Tool results can be long (a contact list); the trace only needs the gist. */
const PREVIEW_CHARS = 160;

const preview = (text: string) => {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > PREVIEW_CHARS ? `${flat.slice(0, PREVIEW_CHARS)}…` : flat;
};

/**
 * Prints one message from the supervisor's stream. The goal is to show the
 * *delegation*: what the supervisor asked each specialist, and what came back.
 * For a supervisor, that trace is more useful than the final answer.
 */
function render(message: BaseMessage) {
    if (message.type === "ai") {
        const calls = (message as AIMessage).tool_calls ?? [];
        for (const call of calls) {
            console.log(`  → ${call.name}: ${preview(String(call.args.request ?? ""))}`);
        }
        if (calls.length === 0 && message.text) {
            console.log(`\nAI: ${message.text}\n`);
        }
    } else if (message.type === "tool") {
        console.log(`  ← ${message.name}: ${preview(message.text)}`);
    }
}

async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // One thread per run. The checkpointer keys conversation memory on this id,
    // so "send them a reminder too" in turn two can refer back to turn one.
    const config = { configurable: { thread_id: crypto.randomUUID() } };

    console.log("Personal assistant. I can look up contacts, schedule events, and send emails.");
    console.log("Type 'bye' to leave.\n");

    // Iterating the interface rather than calling `rl.question()` in a loop:
    // question() only captures the line typed after it is called, so anything
    // typed or piped in while the agent is running is lost.
    rl.setPrompt("You: ");
    rl.prompt();

    try {
        for await (const line of rl) {
            const query = line.trim();

            if (!query) {
                rl.prompt();
                continue;
            }
            if (EXIT_WORDS.includes(query.toLowerCase())) break;

            try {
                console.log();
                const stream = await app.stream(
                    { messages: [{ role: "user", content: query }] },
                    { ...config, streamMode: "updates" },
                );

                for await (const step of stream) {
                    for (const update of Object.values(step)) {
                        if (update && typeof update === "object" && "messages" in update) {
                            for (const message of update.messages as BaseMessage[]) {
                                render(message);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("AI: Something went wrong:", (e as Error).message);
            }

            rl.prompt();
        }
    } finally {
        rl.close();
    }
}

main();
