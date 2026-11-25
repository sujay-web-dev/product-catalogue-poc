# Product Catalogue PoC

A small product catalogue: customers browse featured products, open categories,
search, view a product and send an enquiry that emails the sales inbox. Product
data comes from the [Fake Store API](https://fakestoreapi.com), always through
our own backend.

Built as a foundation that can grow: the product data source, email provider
and look and feel can each change without touching the rest.

- **[DECISIONS.md](DECISIONS.md)**: assumptions, trade-offs, what was cut and why,
  and how the design grows. Code comments reference its IDs (H1, S2, E5, …).
- **[AI_USAGE.md](AI_USAGE.md)**: how AI tools were used and reviewed.

## Run it (one command)

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/). No
accounts, keys or `.env` file are needed.

```sh
docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:8080 | The app |
| http://localhost:8025 | Mailpit: catches every email the app sends |

To try the enquiry flow: open a product, click **Enquire**, send the form, then
open Mailpit. The email is plain text, to `sales@example.com`, with Reply-To set
to the address you entered.

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| Client | React + TypeScript (Vite, React Router) | Typed, quick to change, easy to test with React Testing Library |
| Backend | Node.js 24 + TypeScript (Express 5, zod) | One language across the stack; zod validates requests, config and Fake Store responses |
| Email | Nodemailer over SMTP; Mailpit locally | Works with any SMTP provider; reviewers need no account |

Two separate apps rather than Next.js or Remix: the brief asks for clear
boundaries between frontend, backend and data source, and a standalone API is
what a future mobile app would reuse. Node 24 runs the server's TypeScript
directly, so the server has no build step.

## Architecture

```
Browser ──▶ /api (our backend only) ──▶ services ──▶ ProductRepository ──▶ Fake Store adapter ──▶ fakestoreapi.com
                                                 └─▶ EmailSender ───────▶ SMTP adapter ───────▶ Mailpit / SMTP
```

- **Services** hold the rules (top rated, search, enquiries) and depend only on
  the `ProductRepository` and `EmailSender` interfaces.
- **Adapters** are the only code that knows Fake Store or Nodemailer.
  `server/src/index.ts` is the one place that wires them up.
- **The client** calls only our `/api`, all from `client/src/api.ts`. It never
  sees Fake Store URLs, field names or category strings.
- **Look and feel**: one stylesheet with colours, fonts and spacing as CSS
  variables at the top of `client/src/styles.css`.

## API

| Method and path | Returns |
|---|---|
| `GET /api/products/featured` | `{ products }`: the owner's 5 top-rated picks (H1, H2) |
| `GET /api/products/:id` | `{ product }`, or 404 |
| `GET /api/categories` | `{ categories: [{ slug, name }] }` (C2) |
| `GET /api/categories/:slug` | `{ category, topRated, additional }`, or 404 (C1) |
| `GET /api/search?q=` | `{ products }`; 400 for an empty term or one over 100 characters (S3) |
| `POST /api/enquiries` | 201 once the email is sent; 400, 422, 429 or 502 otherwise (E2–E7) |
| `GET /api/health` | `{ status: "ok" }` |

Errors always have the same shape: `{ "error": { "code", "message" } }`.

## Configuration

Docker Compose sets everything for local use. For other setups, every variable
is listed in [`.env.example`](.env.example):

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | API port | `3000` |
| `FAKE_STORE_BASE_URL` | Product source | `https://fakestoreapi.com` |
| `SMTP_HOST`, `SMTP_PORT` | Mail server | Mailpit (`localhost:1025`; `mailpit:1025` in Compose) |
| `EMAIL_FROM` | Fixed no-reply sender (E4) | none, required |
| `SALES_INBOX_EMAIL` | Where enquiries go (E4) | none, required |

The server checks these at startup and refuses to start, naming any that are
missing or invalid. The owner's top-rated picks are product IDs in
[`server/src/featured.json`](server/src/featured.json).

## Develop without Docker

Needs Node.js 24 (see `.nvmrc`).

```sh
npm install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
docker compose up mailpit     # optional: catches emails at http://localhost:8025
npm run dev -w server         # API on http://localhost:3000; wait for "API listening"
npm run dev -w client         # app on http://localhost:5173, proxies /api to the server
```

Both terminals log one line per API request. Without Mailpit, browsing works
and sending an enquiry shows "We couldn't send your enquiry".

## Tests

```sh
npm test            # server and client
npm run typecheck   # strict TypeScript, both apps
```

- **Server (Vitest + Supertest)**: unit tests for the rules, the Fake Store
  adapter against a stubbed `fetch` (timeouts, bad data, outages, caching), the
  SMTP adapter, and HTTP tests for every endpoint including validation, rate
  limiting and failures.
- **Client (Vitest + React Testing Library + MSW)**: each acceptance criterion
  end to end through the real routes (home, category, search, product, enquiry),
  plus loading, not-found and error-and-retry states. Any request without a mock
  fails the test.

Tests never touch the network.

## Project layout

```
server/src/
  domain/        types, interfaces (ports.ts) and pure rules (topRated, search, enquiry email)
  services/      catalogue and enquiry services
  adapters/      fakeStore/ and smtp/: the only code that knows the outside world
  http/          routes, validation, errors, request logging
  testing/       fixture and fakes used by tests
  index.ts       composition root; app.ts builds the app from injected dependencies
client/src/
  api.ts         the only module that calls fetch
  pages/         Home, Category, Search, Product, Enquiry, NotFound
  components/    Layout (header, search, category nav), ProductTile, Status
docker-compose.yml, server/Dockerfile, client/Dockerfile (nginx serves the build and proxies /api)
```

## Time spent

About **5 hours**, over the suggested 2–3 hour time-box:

| Planning | Building | Testing | Reviewing |
|---|---|---|---|
| ~1 h | ~2 h 30 | ~1 h | ~30 min |

The extra time went into checking the live Fake Store API against its
documentation (G4) and tightening the client test setup so tests can't pass by
accident (see AI_USAGE.md).
