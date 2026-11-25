# Proposal: AGENTS.md, CLAUDE.md, task list

## Context
Take-home PoC (brief in notes/brief.pdf). Stack and assumptions are already fixed in
DECISIONS.md (IDs H1–G3). Before any code, we need agent rules that encode those
decisions, plus a sequence of small reviewable tasks. Nothing is built in this step;
on approval only AGENTS.md and CLAUDE.md get written.

---

## 1. AGENTS.md (proposed, ~75 lines)

```markdown
# AGENTS.md

Rules for building this repo. DECISIONS.md is the source of truth for behaviour;
docs/SPEC.md is background. If a change would contradict DECISIONS.md, stop and ask.

## Layout
- `server/` – Node 24, TypeScript, Express 5 (port 3000)
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
```

## 2. CLAUDE.md
```
@AGENTS.md
```

---

## 3. Task list

**Scaffold**
1. Root: npm workspaces (`server`, `client`), shared strict `tsconfig.base.json`,
   Node 24 `engines`, root `npm test`, `.env.example`.
2. Server skeleton: `config.ts` (zod env), `createApp(deps)` with helmet, JSON limit,
   404 + error middleware, `GET /api/health` + Supertest test.
3. Client skeleton: Vite React TS, router with placeholder pages, dev proxy `/api` →
   :3000, Vitest + RTL + MSW setup, one smoke test.
4. Docker: server Dockerfile, client Dockerfile (build → nginx, proxy `/api`),
   compose with Mailpit. Base image `node:24-alpine`. `docker compose up` shows the placeholder app and health.

**Backend**
5. Domain types and ports (`Product`, `Category`, `ProductRepository`, `EmailSender`),
   JSON fixture, in-memory fake repository and fake email sender for tests.
6. `selectTopRated` (H1/H2, reads `featured.json`) and `matchesQuery` (S2, word-start
   matching) + unit tests, including "men" → "Mens Cotton Jacket" but not "Women's clothing".
7. Fake Store adapter: 5s timeout, zod schemas, slug/name mapping (C2), TTL cache (S1, G2)
   + tests with stubbed fetch. Live check (24 Nov): `GET /products/999` returns
   HTTP 200 with an empty body, not 404; treat that as not found.
8. `GET /api/products/featured` and `GET /api/products/:id` + tests.
9. `GET /api/categories` and `GET /api/categories/:slug` (top rated + additional, C1) + tests.
10. `GET /api/search?q=` (S1/S3: empty, >100 chars → 400) + tests.
11. `POST /api/enquiries`: zod body (E2), product lookup → 422 (E3), rate limit (E7),
    send via `EmailSender`, 502 on send failure (E5) + tests. Set `trust proxy` to 1
    (nginx in front), or the rate limit sees every customer as the same IP.
12. SMTP `EmailSender` adapter (Nodemailer, plain text, Reply-To, E4) + test with
    Nodemailer's stream transport; wire real adapters in `index.ts`; check in Mailpit.

**Frontend**
13. `api.ts` + response types, layout header (category links + search bar, C3),
    CSS variables, error/loading components + tests.
14. Home page with `ProductTile` grid + test.
15. Category page (top rated, additional, unknown slug) + test.
16. Search page at `/search?q=` (only matches shown, no results, empty term) + test.
17. Product page (P1, not found) + test.
18. Enquiry page `/products/:id/enquire`: form, client validation, "Thank you" only
    after API success, keeps input on failure (E1, E5) + tests.

**Docs**
19. README (stack choice, run in one command), AI_USAGE.md, final pass on DECISIONS.md
    (check planned names against code, fill "With another day").

---

## Things I'd simplify or flag
- **Resolved in DECISIONS.md:** S1 drops `search()` from `ProductRepository`
  (interface: `listProducts()`, `getProduct(id)`, `listCategories()`); S2 switches
  to word-start matching.
- **S2 detail to pin in tests:** split product text and query the same way, on
  non-letters/digits, with a fixed pattern (not built from input). So "men's"
  becomes "men" + "s". With AND matching, results stay narrow.
- **No shared types package.** The client re-declares the few response types in
  `api.ts`. A shared workspace package adds build wiring for ~5 types.
- **No CORS package.** nginx (compose) and the Vite proxy (dev) keep the client on
  the same origin as `/api`.
- **No dotenv.** Node 24 `--env-file` and compose `env_file` cover it.
- **`any`:** allowed when genuinely required, with a comment saying why. No ESLint.
- **Branch:** `main` exists on the remote; the PR targets it.

## Verification
- After each task: `npm test` green; task-specific check listed above.
- After task 4 and task 12: `docker compose up`, open the app, submit an enquiry,
  see the plain-text email with Reply-To in Mailpit (http://localhost:8025).
- Before PR: `grep -ri fakestore client/` returns nothing; every hit of `grep -rn ": any\|as any" server/src client/src` has a comment saying why.
