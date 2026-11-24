# AGENTS.md

Rules for building this repo. DECISIONS.md is the source of truth for behaviour;
docs/SPEC.md is background. If a change would contradict DECISIONS.md, stop and ask.

## Layout
- `server/` – Node 22, TypeScript, Express 5 (port 3000)
- `client/` – React, Vite, TypeScript, React Router
- `docker-compose.yml` – server, client (nginx serves the build and proxies /api), Mailpit

## Server architecture
- Flow: routes → services → interfaces. Services depend only on the
  `ProductRepository` and `EmailSender` interfaces (`server/src/domain/ports.ts`).
  Routes and services never import an adapter, `fetch`, or Nodemailer.
- Adapters live in `server/src/adapters/`. The Fake Store adapter is the only code
  that knows fakestoreapi.com, its field names or its category strings (C2).
- `createApp(deps)` builds the Express app from injected dependencies.
  `src/index.ts` is the single composition root: it reads config and wires real
  adapters. Tests pass fakes into `createApp`.
- Business rules are pure, unit-tested functions: `selectTopRated()` (H2),
  `matchesQuery()` (S2).
- All endpoints are under `/api`. One error middleware returns
  `{ "error": { "code", "message" } }`. No stack traces or upstream details in responses.

## Client
- Calls only our backend, with relative `/api/...` URLs, all in `client/src/api.ts`.
  No other file calls `fetch`.
- Nothing in `client/` may reference fakestoreapi.com, Fake Store field names or
  category strings. Image URLs arrive as data from our API (P2).
- One stylesheet; colours, fonts and spacing are CSS variables at the top.
- Semantic HTML, labelled fields, alt text, keyboard usable (G1).

## TypeScript and validation
- `strict: true`. Prefer `unknown` narrowed with zod over `any`. Use `any` only
  when genuinely required, with a short comment saying why.
- zod validates: request params, query and body; env config at startup (fail fast);
  every Fake Store response. Derive types with `z.infer`.
- Client-side validation only helps the user; the server is the final word (E2).

## Testing
- Vitest everywhere. Tests never touch the network.
- Every backend endpoint has Supertest tests: success, validation failure,
  not found, and upstream or email failure where relevant.
- Fake Store adapter: tests with stubbed fetch, including malformed data and timeout (G2).
- Unit tests for `selectTopRated` and `matchesQuery`, including what is excluded.
- Client: React Testing Library + MSW for the critical flows: home, category,
  search, product, enquiry (success and failure).
- `npm test` passes before a task is reported done.

## Security
- No secrets committed. Every env var is in `.env.example` with a safe placeholder.
- Never log names, emails, phone numbers or messages. Log IDs and status codes (E7).
- Enquiry email: plain text; From a fixed no-reply address; To `SALES_INBOX_EMAIL`;
  Reply-To the customer (E4). The server looks the product up itself (E3).
- helmet, a JSON body size limit, express-rate-limit on `POST /api/enquiries` (E7).
- Search matches each query word against the start of a word in the product text,
  with plain string comparison; never a RegExp built from input (S2).

## Decision references
- Where code implements a rule from DECISIONS.md, add a short comment with its ID,
  e.g. `// H2: owner's picks first, then highest rated`.

## Dependencies
- Allowed: React, React Router, Vite, Express 5, zod, Nodemailer,
  express-rate-limit, helmet, Vitest, Supertest, React Testing Library, MSW.
- Approved tooling: typescript, @types/*, tsx, @vitejs/plugin-react, jsdom,
  @testing-library/user-event, @testing-library/jest-dom.
- Anything else: ask first. Prefer the standard library (`fetch`, `AbortSignal.timeout`,
  `node --env-file`) over a new package.

## Working style
- One task at a time from the task list in docs/PLAN.md. Keep each diff small.
- When a task is done: run tests, summarise what changed and any new assumption,
  then stop. Do not commit; the human reviews and commits.
- Keep it simple: no speculative abstractions, no features outside DECISIONS.md.
