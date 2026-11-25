# Decisions and assumptions

The acceptance criteria leave gaps on purpose. Where something was unclear I
made the smallest reasonable assumption, recorded why, and noted what it would
cost to change if it turns out to be wrong. The IDs (H1, S2, …) are referenced
from code comments and the PR description.

## Key decisions

### Stack

- **Client:** React with TypeScript, built with Vite. React Router for pages;
  plain `fetch` calls kept in one API module.
- **Backend:** Node.js with TypeScript and Express 5. zod validates everything
  that enters the system: requests, environment config at startup, and Fake
  Store responses.
- **Why two separate apps instead of Remix or Next.js:** the brief asks for clear
  boundaries between frontend, backend and data source, and a standalone API is
  what a future mobile app would reuse. Express because I can change it quickly
  and safely; Express 5 also passes errors from async handlers to the error
  middleware.

### Architecture

Backend services hold the business rules (top rated, search, enquiries). The
brief says the data source and email provider will change, so the services
depend on two interfaces, never on Fake Store or an email library directly:

| Interface | Today | Later |
|---|---|---|
| `ProductRepository` | Fake Store API with an in-memory cache | Any product system or database |
| `EmailSender` | SMTP (Mailpit locally) | AWS SES or another provider |

The owner's top-rated picks live in a plain config file (`featured.json`).
I didn't put an interface in front of it: nothing in the brief says it will
change soon, and adding one later is a small change.

- One composition root (`server/src/index.ts`) creates the adapters and passes
  them their settings from environment variables. Changing the data source or
  email provider means adding an adapter and changing that file, not editing
  routes, services or the client.
- Product IDs are strings in our API (Fake Store's numbers are converted in the
  adapter), so a future source can use SKUs or UUIDs.
- The client talks only to our API. It never sees Fake Store URLs, field names
  or category strings.
- API: REST under `/api`, errors as JSON in one shape, no stack traces in
  responses.
- Look and feel: one stylesheet, with colours, fonts and spacing defined as CSS
  variables at the top. The final branding replaces those variables.
- Configuration comes from environment variables, validated at startup.
  `.env.example` lists every one. No secrets in the repo.

### Testing

- Unit tests for the rules (top rated, search matching).
- API tests over HTTP for every endpoint, including validation failures.
- UI tests for the critical flows: home, category, search, product, enquiry.
- Tests use a fake product repository loaded from a JSON fixture and a fake
  email sender, so they never touch the network. Client tests mock the API with
  MSW, and any request without a mock fails the test that made it.
- The Fake Store adapter is tested with a stubbed `fetch` (timeouts, bad data,
  outages) and was also checked by hand against the live API.

## Assumptions

### Home page

**H1. "Top rated" means the owner's picks, not the API's rating field.**
- Gap: the criterion says "I have chosen 5 products"; Fake Store also has a
  `rating` field.
- Assumption: five product IDs in a backend config file (`featured.json`),
  shown in the configured order.
- Why: it matches the wording. When the owner needs to edit picks themselves, a
  CMS or admin screen can replace the file.
- If wrong: change where the IDs come from. The API and client don't change.

**H2. One top-rated rule everywhere.**
- Gap: a chosen product can disappear from the source, and five global picks
  can't cover every category.
- Assumption: the owner's picks within the pool come first, then the
  highest-rated remaining products, up to a limit: 5 on home, 3 per category.
- Why: one tested function used in two places. No section is ever empty or
  broken.
- If wrong: change `selectTopRated()` and its unit tests.

### Category page

**C1. "Additional products" are the rest of the category.**
- Assumption: every other product in that category, never repeating a top-rated
  one, with no pagination.
- Why: Fake Store has at most six products per category.
- If wrong: add paging parameters to the endpoint. Clients that ignore them keep
  working.

**C2. Our API owns category identifiers.**
- Gap: source categories include "men's clothing" and the misspelt "jewelery".
- Assumption: the API exposes `{ slug, name }`, for example `mens-clothing` and
  "Men's Clothing". "jewelery" becomes `jewellery` / "Jewellery", the Australian
  spelling to match AUD prices. Unknown slugs return 404.
- Why: raw source strings make fragile URLs and leak the data source into the
  client.
- If wrong: the mapping lives only in the Fake Store adapter.

**C3. Navigation.**
- Assumption: a header on every page holds the search bar and the category
  links, loaded from our API.

### Search

**S1. Search runs in our backend.**
- Gap: Fake Store has no search endpoint.
- Assumption: the backend loads the catalogue once (`GET /products`, see G4),
  caches it with an expiry, and the search service filters the list in memory
  with `matchesQuery()`.
  `ProductRepository` has no `search()` method yet.
- Why: fine for 20 products, and the smallest interface that works.
- If wrong (large catalogue): add `search()` to `ProductRepository` and implement
  it in the data source or a search engine. Routes and the client don't change.

**S2. What "matching" means.**
- Assumption: case-insensitive and trimmed; title, description and category are
  searched. Every word in the term must match the start of a word in the
  product text, so "men" matches "Mens Cotton Jacket" but not "Women's
  clothing". Plain string comparison, never a regular expression built from
  user input.
- Why: predictable results, and special characters can't break it. Plain
  substring matching made "men" return women's clothing. "I only see matching
  products" means tests also check what is excluded.
- If wrong: change `matchesQuery()` and its unit tests.

**S3. Edge cases.**
- Assumption: an empty term doesn't search; terms over 100 characters are
  rejected with 400; results live at `/search?q=…`.
- Why: shareable results, a working back button, and junk input stopped at the
  API.

### Product page

**P1. What the page shows.**
- Assumption: image, title, price, category, description, rating and an Enquire
  button. Unknown IDs show a "not found" page. The source has no currency, so
  prices are shown in AUD.

**P2. Product images load from Fake Store's image URLs.**
- Gap: the client must not call Fake Store directly.
- Assumption: that rule is about product data. The client gets image URLs from
  our API and never knows where they are hosted.
- If wrong, or in production: copy images to our own storage and CDN. Only the
  adapter changes.

### Enquiry

**E1. The form is its own page,** `/products/:id/enquire`.
- Why: it can be linked to directly, needs no modal focus handling, and is
  simple to test.

**E2. Contact details.**
- Assumption: name and email required; phone and message optional; length
  limits on every field (name 100, email 254, phone 30, message 2000). Phone
  allows digits, spaces and `+ ( ) -`. Errors name the invalid fields but never
  echo what was typed.
- The server's validation is the final word. The browser validates only to help
  the user.

**E3. The server trusts only IDs and contact details.**
- Assumption: the client sends `productId` and the contact fields. The server
  looks the product up itself, so the email can't carry forged product details.
  An unknown product is rejected with 422.

**E4. The email.**
- To: the sales inbox from config (`SALES_INBOX_EMAIL`). From: a fixed no-reply
  address. Reply-To: the customer. Plain text.
- Why: sending "from" the customer's address fails SPF and DMARC checks.
  Reply-To still lets sales answer in one click. Plain text avoids HTML
  injection.

**E5. When sending fails.**
- Assumption: the customer sees an error, keeps what they typed, and can retry.
  "Thank you" appears only after the API confirms the email was sent.

**E6. No saved enquiries and no copy to the customer.**
- Why: the email is the record for a proof of concept. Emailing a copy to any
  address typed into the form would let anyone use it to send spam.
- Next: save enquiries and send emails from a queue with retries.

**E7. Abuse and personal data.**
- Assumption: a rate limit on the enquiry endpoint (10 per client IP per 15
  minutes), a 10 KB request size limit, and no contact details in logs (only
  the product ID and error type).
- The server logs one line per request: method, URL (which includes search
  terms), status and duration. Request and response bodies are never logged.
- The API trusts one proxy hop (nginx in Docker, Vite in development) for the
  client IP. Exposing the API directly would let clients fake their IP, so in
  Docker it is reachable only through nginx.
- A CAPTCHA needs a third-party account, which the brief rules out for
  reviewers, so it is a next step.

**E8. One product per enquiry.**
- Gap: the scenario says customers enquire about "products", but the criteria
  describe one product at a time.
- Assumption: an enquiry covers the product being viewed.
- If wrong: accept a list of product IDs in the same endpoint.

### General

**G1. Responsive web app.** The brief allows web or mobile. A responsive site
covers phones now, and a native app can reuse the API later. Basic
accessibility throughout: semantic HTML, labelled fields, alt text, keyboard
use.

**G2. Fake Store may be slow or down.** A 5-second timeout, a cached catalogue
(5 minutes), and a friendly error page instead of a crash. If a refresh fails
and an older catalogue is cached, the old one is served and the refresh is
retried 30 seconds later. A malformed product is skipped and logged rather than
failing the whole catalogue.

**G3. Infrastructure.** Dockerfiles and Docker Compose only. Both containers
would run on AWS; see "How this grows".

**G4. Fake Store's documentation and behaviour differ.**
- Gap: its OpenAPI spec doesn't document `rating` or `/products/categories`,
  and says errors are 400; live, `GET /products/999` returns 200 with an empty
  body (checked 24 Nov).
- Assumption: rely on the one documented call, `GET /products`. Categories and
  single products are worked out from that cached list. `rating` is optional:
  unrated products rank last for top rated (H2) and show no rating.
- Why: an undocumented field disappearing shouldn't take the site down, and an
  empty 200 can't be mistaken for a product.

## Dropped or simplified

| What | Why |
|---|---|
| Admin screen for top-rated picks | A config file proves the rule (H1) |
| Pagination | Small catalogue (C1) |
| Saved enquiries, customer confirmation email | See E6 |
| CAPTCHA, honeypot field | CAPTCHA needs a third-party account; the rate limit covers the basics (E7) |
| Interface for top-rated picks | Config file is enough until the owner needs to edit picks (H1) |
| Switch to run from local JSON instead of Fake Store | The fixture is used in tests only (G2) |
| SMTP username and password settings | Mailpit needs none; production would use an SES adapter (E4) |
| Accounts, cart, checkout | Not in the acceptance criteria |
| Server rendering and SEO | Not needed for an interactive proof of concept |
| Translations | Not requested |
| AI features in the product | Not requested, and would need paid API keys |
| Infrastructure as code | Outside the time box; Compose shows the shape |

## How this grows

| Change | What changes | What stays |
|---|---|---|
| New product data source | New `ProductRepository` adapter, config | Routes, services, client |
| New email provider, e.g. AWS SES | New `EmailSender` adapter, config | Everything else |
| Final branding | CSS variables, plus components if layouts change | API and data |
| Owner manages top-rated picks | Read the IDs from a CMS or database instead of `featured.json` | Selection rule, client |
| Native mobile app | New client | The API |
| Large catalogue | Search and paging move into the data source or a search engine | The client's API contract |

On AWS: the web app on S3 behind CloudFront; the API on ECS Fargate behind a
load balancer; email through SES; configuration in SSM Parameter Store and
secrets in Secrets Manager; enquiries saved to DynamoDB and sent through SQS.

## With another day

- Save enquiries and send emails from a queue with retries (E6).
- An end-to-end browser test that also checks the email arrived in Mailpit.
  Today that path is covered by API tests plus a manual check.
- An OpenAPI description of the API, with client types generated from it, in
  place of the hand-written types in `client/src/api.ts`.
- An AWS SES `EmailSender` adapter, and infrastructure as code for the AWS setup.
- Pin the Docker base images (`nginx`, `mailpit`) to exact versions.
- Structured logs with request IDs, and basic metrics.
- Serve images from our own storage and CDN (P2).