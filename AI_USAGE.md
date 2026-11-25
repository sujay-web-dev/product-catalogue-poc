# AI usage

## Tools and models

| Tool | Model | Used for |
|---|---|---|
| ChatGPT | (chat) | Turning the brief into `docs/SPEC.md` and a first draft of `DECISIONS.md` |
| Claude Code (VS Code extension) | Claude Opus 5.5 | Planning the tasks, writing the code, tests and docs, running checks |

## Agent instructions, plan and spec

- [`AGENTS.md`](AGENTS.md): the rules the coding agent followed. Services depend
  only on the two interfaces; the client calls only our `/api`; strict
  TypeScript; zod at every boundary; tests for every endpoint and critical UI
  flow; security rules (no secrets, no contact details in logs, plain-text email
  with Reply-To); DECISIONS.md IDs in code comments; an allowed-library list
  (ask before adding anything else); one small task at a time, then stop for my
  review and commit.
- [`CLAUDE.md`](CLAUDE.md) contains only `@AGENTS.md`, so any agent reads the same rules.
- [`docs/SPEC.md`](docs/SPEC.md): the spec. [`docs/PLAN.md`](docs/PLAN.md): the
  19-task plan, from scaffold and Docker through backend (with tests) to
  frontend (with tests) and docs. Each task was one reviewable diff and one commit.

## Key prompts and moments

1. **"If something in the spec looks unnecessary, say so instead of building it."**
   This was part of the planning prompt that also set the AGENTS.md rules and
   the stop-after-each-task workflow. The plan pointed out things to drop, such
   as a `search()` method on the repository, a shared types package, a CORS
   library and dotenv.
2. **Cutting the first design down.** The first draft of DECISIONS.md was
   over-engineered: a third interface for the owner's picks, TanStack Query, a
   switch to run from local JSON, a honeypot field. I cut it down to two
   interfaces and a plain config file before any code was written (commit
   "docs: simplify design decisions").
3. **Search that excludes the right things.** The plan noted that substring
   matching makes "men" return women's clothing and suggested just documenting
   that in a test. I changed S2 to word-start matching instead, and tests check
   what is excluded as well as what is found.
4. **"Is products.json just a dummy until we call the real API?"** Answering
   this led to checking the live Fake Store API against its OpenAPI spec. They
   disagree: `rating` and `/products/categories` aren't documented, and an
   unknown ID returns HTTP 200 with an empty body instead of an error. That
   became G4: the adapter makes only the one documented call, `GET /products`,
   works everything else out from that list, and treats `rating` as optional.
5. **"I want to see the API calls in the terminal."** This led to one log line
   per request in the server and the Vite dev proxy, with bodies never logged,
   so enquiry contact details stay out of logs (E7).

## Where the AI got things wrong, and how it was caught

| What went wrong | How it was caught |
|---|---|
| **Client tests could pass while making real network calls.** MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame`. Later, the custom handler called MSW's `defaults.error()`, which only prints, so an unmocked request went through and the app's error state let the test pass. | The renamed option failed the typecheck. The second problem showed up only after forcing console output on (below). Now any unmocked request is blocked and fails its test, and a setup test proves it. |
| **"No warnings" claims after two tasks were wrong.** Vitest hides console output from passing tests, so the agent's checks for warnings could never find any. | Spotted when a test that should have produced an MSW error printed nothing. Rerun with `--silent=false`. |
| **Assertions that could never fail.** For example `queryByRole('form')`: an unnamed `<form>` has no role, so "no form" was always true. | Reviewing tests that passed on the first run. Replaced with a check for the Send button. |
| **Test helpers that broke tests.** A URL probe used `<output>`, which counts as a status message and clashed with "Loading…". A mock for `/api/products/:id` also answered `/api/products/featured`. | Failing tests, then reading why. Both helpers fixed. |
| **Docs that didn't match the code.** DECISIONS.md said adapters were chosen from environment variables. Actually `index.ts` always wires the same adapters; env vars only give their settings. | Final pass checking every planned name and claim against the code. |
| Small things: an `eslint-disable` comment in a repo without ESLint, and a test helper named like a React hook (`useCategories`). | Code review before each commit. |

## How I reviewed the output

- One small task at a time. After each, the agent ran the typecheck and tests
  and summarised the changes and any new assumptions, then stopped. I reviewed
  the diff and committed it myself.
- Behaviour was checked against reality, not only tests: the adapter and rules
  were run against the live Fake Store API, an enquiry was sent through real
  SMTP to a local listener, and I ran `docker compose up` and used the app myself.
- For the most important rule (E5: "Thank you" only after the email is sent),
  the code was deliberately broken to confirm the tests fail, then restored.
- I asked about anything I didn't follow, for example why Docker exists if the
  brief mentions AWS, before accepting it.
