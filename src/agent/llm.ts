import { ChatOpenAI } from "@langchain/openai";
import { env } from "../config";

/**
 * The shared chat model, used by the supervisor and every specialist.
 *
 * One model everywhere on purpose: the supervisor's job is mostly routing and
 * rephrasing, which a mini model does well, and the specialists' prompts are
 * narrow enough not to need a bigger one. If you split them later, the
 * supervisor is the one to upgrade — a bad plan wastes every sub-agent call
 * that follows it. `MODEL` is the single line to change.
 *
 * No `temperature`: GPT-5 models only accept the default and reject anything
 * else with a 400.
 */
export const MODEL = "gpt-5-mini-2025-08-07";

export const model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: MODEL,
});
