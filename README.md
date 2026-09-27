# supervisor-agent

A personal assistant built with the **supervisor** multi-agent pattern. One
supervisor agent talks to the user and plans the work. Three specialist agents
(contacts, calendar, email) each own a narrow set of tools, and the supervisor
calls them as if they were ordinary tools.

Built with LangChain `createAgent` on [Bun](https://bun.com), with OpenAI for
inference. The external services are stubs, so no real events or emails are
created.

## How it works

```
                     user
                      │
                      ▼
            ┌───────────────────┐
            │    supervisor     │  plans, orders the calls, remembers the thread
            └───────────────────┘
          ┌───────────┼───────────────┐
          ▼           ▼               ▼
  manage_contacts  schedule_event  manage_email      ← each is a tool that
          │           │               │                runs a whole agent
          ▼           ▼               ▼
   ┌──────────┐ ┌──────────┐    ┌──────────┐
   │ contacts │ │ calendar │    │  email   │        fresh message list per call,
   └──────────┘ └──────────┘    └──────────┘        only the final reply returns
   get_contacts  get_available_   send_email
                 time_slots,
                 create_calendar_
                 event
```

A typical turn, "schedule a design standup tomorrow at 9am and email the team":

1. `manage_contacts("members of the design team")` returns the addresses.
2. `schedule_event("standup tomorrow 9am with sujoy@…, john@…")` creates the event.
3. `manage_email("email sujoy@…, john@… that standup is <date> 09:00")` sends it.

The ordering matters because the specialists cannot see each other or the
conversation. Only the supervisor can turn "the design team" into addresses and
carry the event's time into the email.

### Supervisor vs. a single agent with every tool

One agent with all four tools would work here. The supervisor split pays off as
the tool count grows:

- Each specialist's prompt and tool list stay small, so it picks the right tool
  more reliably.
- The supervisor reasons over three coarse capabilities, not N low-level API
  shapes.
- A specialist can be tested, swapped, or given a different model on its own.

The cost is one extra model hop per delegation, plus the context boundary (see
*Design notes*).

## Setup

Requires [Bun](https://bun.com) 1.3+.

```bash
bun install
cp .env.example .env    # then fill in OPENAI_API_KEY
```

| variable | required | purpose |
|---|---|---|
| `OPENAI_API_KEY` | yes | `gpt-5-mini` ([platform.openai.com](https://platform.openai.com/api-keys)) |
| `LANGSMITH_*` | no | tracing. Recommended: a turn is a tree of agent runs |

## Running

```bash
bun run dev
```

```
You: schedule a design team standup tomorrow at 9am and email everyone about it

  → manage_contacts: Get the names and email addresses of everyone on the design team
  ← manage_contacts: Sujoy — sujoy@codersgyan.com; John — john@codersgyan.com
  → schedule_event: Design team standup tomorrow at 09:00 for 30 minutes with sujoy@…
  ← schedule_event: Event created: Design team standup from 2026-09-28T09:00:00 …
  → manage_email: Email sujoy@codersgyan.com and john@codersgyan.com that the …
  ← manage_email: Email sent to sujoy@codersgyan.com, john@codersgyan.com …

AI: Done — the standup is scheduled and both designers have been emailed.
```

The `→` / `←` lines are the delegation trace: what the supervisor asked each
specialist, and what came back.

## Project structure

```
index.ts                  CLI; imports config first so env fails fast
src/
  config.ts               validated environment — the app's full env inventory
  agent/
    supervisor.ts         supervisor prompt + agent + checkpointer
    delegate.ts           wraps a specialist agent as a supervisor tool
    llm.ts                the shared OpenAI chat model
    contacts/             contacts specialist
      tools/directory.ts  mock directory + pure search
      tools/directory.test.ts
      tools/get-contacts.ts
    calendar/             calendar specialist (current date injected per call)
      tools/create-event.ts
      tools/available-slots.ts
    email/                email specialist
      tools/send-email.ts
```

Each specialist lives in its own folder: `index.ts` holds the prompt, the agent,
and its `delegateTo(...)` tool, and `tools/index.ts` exposes that folder's
tools. The supervisor imports one tool per specialist.

## Design notes

**Specialists get a fresh context on every call.** `delegateTo` invokes the
specialist with a single user message, the request, and returns only its final
message. That keeps specialist context small. The catch is that every request
must be self-contained, which is why the supervisor prompt forbids "them" and
"it" and the tool descriptions ask for addresses and times.

**Only the supervisor remembers.** The `MemorySaver` checkpointer sits on the
supervisor alone. Stateless specialists cannot leak a previous turn's attendee
list into a new request.

**A failing specialist doesn't fail the turn.** `delegateTo` catches errors and
returns them as the tool result, so the supervisor can report what did
succeed.

**Every specialist loop is capped.** `MAX_SPECIALIST_STEPS` in
[delegate.ts](src/agent/delegate.ts) bounds how many steps a specialist gets.
Without it, LangGraph's default of 25 applies silently.

**The calendar knows today's date.** `dynamicSystemPromptMiddleware` rebuilds
the calendar prompt with the current date on each call. Without it, "tomorrow"
resolves against the model's training data.

**Email addresses are validated by schema.** `send_email` uses `z.email()`. A
name passed where an address belongs is rejected back to the model instead of
reaching a provider.

**The contacts stub really filters.** A stub that returns everyone for any
query hides the case where the model has to handle a miss.

## Scripts

| command | what it does |
|---|---|
| `bun run dev` | start the CLI |
| `bun test` | run the tests (no API key needed) |
| `bun run typecheck` | `tsc --noEmit` |

## Status

Not built:

- **Real integrations.** All three services are stubs with realistic shapes.
- **Human approval.** Emails are sent without confirmation. A
  `humanInTheLoopMiddleware` interrupt on `send_email` would be the next step.
- **Persistence.** Conversations live in process memory and are lost on restart.
- **Parallel delegation.** Independent calls (two unrelated emails) still run
  in order if the model chooses to.
