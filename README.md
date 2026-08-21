# Fullthrottle

US-market e-commerce store for motorcycle parts and gear: a public storefront
and a separate admin back office. The catalog is fully data-driven — sections
own attribute templates that generate storefront filters, product spec tables
and admin form fields automatically. Add an attribute in the admin and it
appears as a filter, a spec row and a form field with no code change.

Built against three source documents (in `docs/`, in precedence order):
the engineering brief (functional truth), the design output (visual truth),
and the functional prototype (behavioural reference).

## Stack

Next.js 15 (App Router, TypeScript strict) · Tailwind CSS v4 · PostgreSQL ·
Prisma · Auth.js v5 (Google / Apple / credentials) · Stripe Payment Element +
PayPal Orders v2 · hosted on Netlify with Netlify DB (Neon).

## Local development

```bash
npm install
cp .env.example .env         # point DATABASE_URL at a running PostgreSQL,
                             # set AUTH_SECRET, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD
npx prisma migrate dev       # creates the schema and seeds the catalog
npm run dev                  # http://localhost:3000  (admin at /admin)
```

`npm run seed` re-runs the seed (production-safe: it never touches an
existing catalog unless `SEED_FORCE=true`, and creates the first OWNER admin
from env when none exists). `npm test` runs the unit tests. The design-system
component gallery lives at `/gallery`.

## Deploying to Netlify

1. **Import** — Netlify → *Add new project → Import an existing project* →
   pick this GitHub repo. `netlify.toml` supplies the build (which runs
   migrations + the safe seed automatically) and the Next.js runtime.
2. **Database** — on the site, enable the **Neon (Netlify DB)** extension.
   It injects `NETLIFY_DATABASE_URL`; nothing else to wire.
3. **Environment** — *Site configuration → Environment variables*:
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` — the first admin (TOTP setup
     runs on first sign-in at `/admin`)
4. **Deploy.** The storefront, admin, cart and accounts work immediately.
   Checkout takes live payments once the Stripe/PayPal keys from
   `.env.example` are added (webhook endpoints: `/api/webhooks/stripe`,
   `/api/webhooks/paypal`). Google/Apple sign-in buttons appear when their
   keys are set; transactional email activates with `RESEND_API_KEY`.

## What's here

- **Storefront** — home, category listings with URL-driven dynamic filters
  (facet counts, numeric ranges, availability, price, brand), product pages
  with the fiche spec table, search, anonymous cart, sign-in/register,
  checkout (Stripe Payment Element — card/Apple Pay/Google Pay — and
  PayPal), order confirmation and tracking, account area (orders, addresses,
  profile). JSON-LD on product pages, sitemap, JSONL product feed at
  `/api/feed`.
- **AI admin assistant** (`/admin/assistant`) — chat with a Claude model (via
  OpenRouter, `OPENROUTER_API_KEY` + optional `OPENROUTER_MODEL`) that does
  the admin's work on instruction: reads the whole catalog structure, creates
  sections/brands/attributes/products with realistic spec values and
  house-style SVG artwork, updates stock and prices, and advances orders.
  Every action runs under the asking admin's role (CONTENT still can't touch
  prices) and writes an AuditLog row; assistant-drawn artwork is sanitized
  (no scripts/links/external refs) before it renders in the storefront.
- **Admin** (`/admin`, pin to a subdomain with `ADMIN_HOSTNAME`) — email +
  password + mandatory TOTP, invite-only accounts with roles (OWNER /
  MANAGER / CONTENT — no price changes / ORDERS — fulfillment only),
  overview with to-pack queue, sections & brands, attribute template editor,
  product forms generated from the template, order transitions with the
  tracking-number gate, supplier screen (disabled until the integration
  lands), audit log on every mutation.
- **Hardening** — strict per-request-nonce CSP with `strict-dynamic`, HSTS
  preload and friends, Postgres-backed rate limiting on sign-in/registration/
  checkout, webhook signature verification + idempotency, US-only shipping
  enforcement, CARB/Prop 65 compliance fields enforced at checkout and
  rendered on product pages, WCAG 2.2 AA (axe-clean on the key screens).

## Conventions that must not drift

- Money is integer cents everywhere; totals are computed server-side in
  `lib/pricing.ts` only.
- Stock is read exclusively through `getAvailability()`
  (`lib/supplier/availability.ts`).
- Order status transitions run through `lib/orders.ts` only — forward-only,
  tracking number required before `SHIPPED`.
- No component hardcodes an attribute name; everything renders from
  `AttributeDef[]` (`lib/attributes/`).
- Design tokens live in `app/globals.css` and come from the design output
  (`docs/design/fullthrottle-plan.md` Part 3). Do not invent values.
- Card fields never render in our DOM; the supplier sync stays behind
  `SUPPLIER_SYNC_ENABLED=false`; customer and admin auth share nothing.
