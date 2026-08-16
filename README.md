# One Million Pixels

A Million Dollar Homepage-inspired canvas, reimagined as two front ends sharing one
backend, in a dark neon/cyberpunk visual style. Live at
[onemillionpixels.site](https://onemillionpixels.site).

- **`/pixels/` — "El Muro // 2026"**: a neon grid canvas where visitors buy pixels (1 px
  minimum) and leave an emoji, message, slogan, link, and/or image. Includes a live
  scanning-beam/data-spark ambient animation, a sequential "you're buyer #N" gamification
  badge, milestone toasts, a scrolling activity ticker, a progress bar, and a live side
  panel with stats and a real-time activity log.
- **`/capsules/` — "Cápsulas en Órbita"**: an animated starfield (parallax stars, shooting
  stars, an occasional comet) where visitors write a message, seal it in a capsule, and
  launch it into real orbital motion around a central hub, for a flat price. A capsule can
  optionally be **sealed until a future date** — its content stays hidden everywhere
  (canvas, activity log, detail view, share page) until that day, when a scheduled sweep
  emails a chosen recipient and reveals it automatically.

Both call the same API and the same D1 database, but each writes to its own table
(`pixel_blocks` / `capsule_blocks`) with its own buyer-number counter — a pixel and a
capsule can occupy the same coordinates without conflicting, and neither product's
activity leaks into the other's. `/` is a landing page linking to both, and `/stats/` is a
public, embeddable live-stats dashboard.

Built entirely on Cloudflare's free tier — no fixed costs beyond the domain and (once
enabled) payment-processor fees.

## Features

- **Bilingual (ES/EN)** — `public/shared/i18n.js`, a small custom i18n system (no
  framework); every page, error message, and toast is translated, with a persistent
  language toggle.
- **Country flags & first-of-country badges** — buyers can optionally attach a country;
  the first buyer from each country gets a celebratory badge/toast.
- **Live viewer presence** — a lightweight heartbeat (`/api/presence`) shows a
  real-time "N people here now" pill on every page.
- **Public stats dashboard** (`/stats/`) — pixels sold, capsules launched, total raised,
  countries represented, live viewers; embeddable, updates on a poll.
- **Shareable purchase cards** — every sold block gets a standalone share page
  (`/s/pixel/:id`, `/s/capsule/:id`) with per-purchase Open Graph/Twitter Card images, for
  clean link previews when a buyer shares their mark.
- **Basic moderation** — a word-boundary profanity/hate-speech filter (ES+EN, with basic
  leetspeak normalization) on all free-text fields.
- **Charity banner** — a declared commitment that 30% of proceeds go to earthquake relief
  for Venezuela (a stated commitment, not an automated payment split).
- **Sales kill switch** — `SALES_ENABLED` (see [Configuration](#configuration)) gates
  `/api/checkout` server-side, so the site can be fully live and browsable while payments
  are still being wired up.

## Stack

- **Cloudflare Workers** — serves the static frontend (`public/`) and the API (`src/`),
  including a Cron Trigger for scheduled capsule delivery.
- **D1** — one database, two independent tables (`pixel_blocks`, `capsule_blocks`) plus
  `counters` (atomic per-kind buyer numbering) and `presence` (live-viewer heartbeat).
  See `migrations/`.
- **R2** — stores uploaded/generated block images.
- **Cloudflare Email Service** (`send_email` binding) — sends the sealed-capsule delivery
  notification. Not yet onboarded for the domain — see [Email Service](#email-service).
- **Stripe Checkout** — payment integration is scaffolded (redirect-based, currency EUR)
  but currently gated off via `SALES_ENABLED` while the final payment gateway is decided.

## Project structure

```
src/
  index.ts               — router + scheduled (Cron) handler
  routes/
    config.ts             — GET  /api/config     grid size, pricing, salesEnabled
    blocks.ts             — GET  /api/pixels      sold pixel_blocks
                             GET  /api/capsules    sold capsule_blocks
                             GET  /api/blocks/:id  looks up either table
    upload.ts              — POST /api/upload      image → R2, returns imageKey
    checkout.ts             — POST /api/checkout    validates, reserves, creates Stripe session
    webhook.ts               — POST /api/webhook     Stripe webhook, marks block sold
    presence.ts               — POST/GET /api/presence  live-viewer heartbeat + count
    stats.ts                   — GET  /api/stats     public aggregate stats
    share.ts                    — GET  /s/:kind/:id   standalone OG/share page per block
    delivery.ts                  — scheduled sweep: emails + unseals due capsules
  lib/
    blockTable.ts          — Kind ("pixel" | "capsule") → table name, validated whitelist
    counters.ts            — atomic per-kind buyer-number counter (SQLite RETURNING)
    countries.ts            — ISO country code whitelist
    moderation.ts            — profanity/hate-speech filter
    grid.ts                   — env-driven grid/pricing/salesEnabled config helper
    stripe.ts                  — Stripe client factory

public/
  index.html              — landing page (links to /pixels/, /capsules/, /stats/)
  stats/                   — public live-stats dashboard
  shared/
    api.js                 — fetch helpers shared by both front ends
    cyber.css                — the neon design system (fonts, colors, chrome, modal,
                                toast, side panel, detail-view popover, autocomplete,
                                emoji picker, file picker, charity/sales banners)
    i18n.js                   — ES/EN dictionary, t()/tn(), translateNode(), lang toggle
    countries.js                — country name/flag lookup
    country-picker.js            — custom autocomplete combobox for country selection
    emoji-picker.js               — emoji + country-flag picker popover
    detail.js                     — shared read-only "detail view" popover (click a
                                     mark/capsule); renders the sealed state for capsules
    share.js                       — share-button rendering (X/Twitter, WhatsApp, copy link)
    presence.js                     — heartbeat + live-count polling
    capsule-sealed.svg               — placeholder image shown for sealed capsules
  pixels/                 — "El Muro // 2026"
  capsules/                — "Cápsulas en Órbita"
  favicon.svg, favicon.ico, favicon-16.png, favicon-32.png, apple-touch-icon.png
  og-image.png, robots.txt, sitemap.xml

migrations/
  0001_init.sql            — original single blocks table (superseded by 0003)
  0002_wall_fields.sql      — message/emoji/slogan/buyer_number columns + counters table
  0003_split_tables.sql      — splits into pixel_blocks/capsule_blocks + per-kind counters
  0004_country_presence.sql   — country column on both tables + presence table
  0005_capsule_delivery.sql    — deliver_at/recipient_email/delivered_at (sealed capsules)
```

Every request that touches a block (`/api/checkout`, `/api/pixels`, `/api/capsules`,
`/api/blocks/:id`, the Stripe webhook) is parameterized by `kind: "pixel" | "capsule"` —
either sent explicitly by the client (checkout) or carried in the Stripe session's
metadata (webhook), and always resolved through `blockTable.ts`'s fixed whitelist rather
than interpolating raw input into SQL.

## One-time setup

```bash
npm install
npx wrangler login
```

Create the D1 database and copy the returned `database_id` into `wrangler.jsonc`
(`d1_databases[0].database_id`):

```bash
npx wrangler d1 create one-million-pixels-db
```

Create the R2 bucket (R2 must be enabled once per account first, via the Cloudflare
dashboard → R2 → "Add R2 subscription"; the free tier stays $0 unless you exceed it):

```bash
npx wrangler r2 bucket create one-million-pixels-images
```

Run the migrations:

```bash
npm run db:migrate:local    # local dev
npm run db:migrate:remote   # production
```

Set Stripe secrets (get keys from the Stripe dashboard):

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

`STRIPE_WEBHOOK_SECRET` comes from creating a webhook endpoint in the Stripe dashboard
pointing at `https://<your-worker-domain>/api/webhook`, subscribed to at least
`checkout.session.completed` (and optionally `checkout.session.expired`).

For local testing against real Stripe, use the Stripe CLI instead:

```bash
stripe listen --forward-to localhost:8787/api/webhook
```

and put the `whsec_...` value it prints into `.dev.vars`, alongside your test secret key.

Update `PUBLIC_SITE_URL` in `wrangler.jsonc` (`vars`) to your production URL before
deploying — it's used for Stripe's success/cancel redirect URLs, share-page links, and the
sealed-capsule delivery email. Also replace the `onemillionpixels.site` domain used in
canonical/OG/Twitter meta tags and `robots.txt`/`sitemap.xml` (search across `public/`)
with your own domain.

### Sales kill switch

`SALES_ENABLED` (`wrangler.jsonc` → `vars`) gates `/api/checkout` **server-side** — when
`"false"`, the site is fully browsable but every checkout attempt is rejected with a 403
(`sales_disabled`), regardless of what the frontend does. Useful for deploying the site
before payments are fully wired up. Flip it to `"true"` and redeploy once you're ready to
accept real purchases.

### Email Service

Sealed-capsule delivery notifications use the native `send_email` Workers binding
(`EMAIL` in `wrangler.jsonc`). Before it will actually send anything, onboard your domain:

```bash
npx wrangler email sending enable yourdomain.com
```

This adds SPF/DKIM DNS records to your zone. Until it's done, capsule delivery sends fail
silently (logged, not thrown) and the capsule just stays sealed until retried.

### Testing locally without Stripe at all

`.dev.vars` (gitignored) sets:

```
SKIP_PAYMENT_FOR_TESTING=true
PUBLIC_SITE_URL=http://localhost:8787
SALES_ENABLED=true
```

With `SKIP_PAYMENT_FOR_TESTING`, `/api/checkout` never touches Stripe — it marks the block
`sold` immediately and redirects straight back as if payment succeeded. This is for local
development only: never set this in `wrangler.jsonc` or as a deployed secret, since it
would let anyone claim blocks for free in production. `src/types.ts` documents the same
warning next to the `Env` field. `.dev.vars` overrides the `SALES_ENABLED`/`PUBLIC_SITE_URL`
values from `wrangler.jsonc` for local dev only, so production can stay locked down while
local testing stays unblocked.

## Develop

```bash
npm run dev
```

Then open `http://localhost:8787` (landing page), `/pixels/`, `/capsules/`, or `/stats/`.

To test the scheduled capsule-delivery sweep locally without waiting for the real cron:

```bash
npx wrangler dev --test-scheduled
curl http://localhost:8787/__scheduled
```

Local dev simulates `send_email` sends to disk (under `.wrangler/tmp/email/`) instead of
actually sending — safe to test repeatedly.

## Deploy

```bash
npm run deploy
```

## How it works

1. Visitor picks a spot — a pixel/rectangle drag on `/pixels/`, or a click anywhere in
   space on `/capsules/` (which renders their message onto a generated capsule signal
   image client-side, canvas-to-PNG, before uploading). On `/capsules/`, they can also opt
   to seal the capsule until a future date, providing a recipient email.
2. The browser uploads the image to `/api/upload` (stored in R2), then calls
   `/api/checkout` with `kind: "pixel" | "capsule"`, which checks `SALES_ENABLED`,
   validates the selection doesn't overlap an existing sold/pending block *within that
   kind's own table*, reserves it in D1 for 30 minutes (`status = 'pending'`), and creates
   a Stripe Checkout Session with `kind` in its metadata (skipped entirely in local test
   mode, see above).
3. Visitor pays on Stripe's hosted page.
4. Stripe calls `/api/webhook` on `checkout.session.completed`, which reads `kind` back
   out of the session metadata, flips the block to `status = 'sold'` in the right table,
   and assigns it the next number from that kind's buyer counter (`src/lib/counters.ts`,
   atomic via SQLite's `UPDATE ... RETURNING`). The front end re-fetches `/api/pixels` or
   `/api/capsules` and renders the image; the buyer sees a "you're #N" reveal (with a
   milestone toast at round numbers).
5. Expired, unpaid reservations are cleaned up lazily the next time someone else tries to
   check out an overlapping block in that same table.
6. If a capsule was sealed, its `message`/`emoji`/`slogan`/`link`/image stay masked
   everywhere in the public API (`src/routes/blocks.ts`, `src/routes/share.ts`) until an
   hourly Cron Trigger (`src/routes/delivery.ts`) finds its `deliver_at` has passed, emails
   the recipient a link to `/s/capsule/:id`, and stamps `delivered_at` — after which it
   reads like any other capsule.

Both front ends share `public/shared/api.js` (fetch helpers), `public/shared/cyber.css`
(the neon design system), `public/shared/i18n.js` (translations), and
`public/shared/detail.js` (the click-to-see-details popover); each has its own
`app.js`/`style.css` for its distinct canvas behavior and animation.

## Configuration

Grid size, pricing, and the sales kill switch live in `wrangler.jsonc` under `vars`:

- `GRID_WIDTH` / `GRID_HEIGHT` — grid dimensions in pixels (default 1250×800 — a
  widescreen ratio, still exactly 1,000,000 pixels total, chosen to better fill wide
  monitors than a 1000×1000 square would)
- `PRICE_PER_PIXEL_CENTS` — price per pixel in cents (default 100 = 1 €/px)
- `MIN_BLOCK_PIXELS` — smallest purchasable area on `/pixels/` (default 1 — a single pixel)
- `PUBLIC_SITE_URL` — your production URL, used for redirect/share/email links
- `SALES_ENABLED` — `"true"`/`"false"` kill switch for `/api/checkout` (see above)

`/capsules/` reserves a fixed small footprint per capsule (`FOOTPRINT` in
`public/capsules/app.js`, default 5×2 = 10 px → 10 €), independent of the size it's drawn
at on screen and independent of its orbital position — the reservation only exists to
price and roughly deconflict capsules, not to represent literal screen pixels the way
`/pixels/` does. A capsule's orbit radius/angle/speed are derived client-side from its
stored launch point each frame, so no extra schema was needed to represent motion.

A sealed capsule's `deliver_at` must be at least 1 day and at most 5 years in the future
(`MIN_DELIVER_DELAY_SECONDS`/`MAX_DELIVER_DELAY_SECONDS` in `src/routes/checkout.ts`).

## SEO & assets

- `public/favicon.svg` is the primary favicon (hand-authored, matches the brand palette);
  `favicon.ico`/`favicon-16.png`/`favicon-32.png`/`apple-touch-icon.png` are generated
  fallbacks for browsers/platforms that don't support SVG favicons.
- `public/og-image.png` (1200×630) is the default social preview image; individual sold
  blocks get their own per-purchase OG image via `/s/:kind/:id` (`src/routes/share.ts`).
- All pages carry `<meta name="description">`, canonical URLs, Open Graph, and Twitter
  Card tags. The landing page also has a minimal `WebSite` JSON-LD block.
- `public/robots.txt` allows all crawlers and points at `public/sitemap.xml`.
- The favicon/OG PNGs were generated with a small dependency-free Node script that
  hand-encodes PNG bytes via `zlib.deflateSync` (no image libraries). The script itself
  wasn't kept in the repo since it's a one-off; regenerate by writing a similar script if
  you need to tweak the design (see `public/favicon.svg` for the source color/pattern to
  match).

## Costs

- Cloudflare Workers/D1/R2/Email Service: free tier (100k requests/day, 5GB D1, 10GB R2,
  ~5000 emails/day) — plenty for launch-scale traffic.
- Stripe (once enabled): no setup or monthly fee, just a per-transaction cut (~1.5-3.25% +
  fixed fee depending on card origin).
- The domain is the only current out-of-pocket cost.
