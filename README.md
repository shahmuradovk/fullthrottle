# Fullthrottle

US-market e-commerce store for motorcycle parts and gear: a public storefront
and a separate admin back office. The catalog is fully data-driven — sections
own attribute templates that generate storefront filters, product spec tables
and admin form fields automatically.

Built against three source documents (in `docs/` precedence order):
engineering brief (functional truth), design output (visual truth), and the
functional prototype (behavioural reference).

## Stack

Next.js 15 (App Router, TypeScript strict) · Tailwind CSS v4 · PostgreSQL ·
Prisma · deployed on Netlify.

## Getting started

```bash
npm install
cp .env.example .env        # point DATABASE_URL at a running PostgreSQL
npx prisma migrate dev      # creates the schema and seeds the catalog
npm run dev                 # http://localhost:3000
```

`npm run seed` re-seeds on demand (idempotent — wipes and recreates the
catalog tables). `npm test` runs the unit tests. The design-system component
gallery lives at `/gallery`.

## Deploying to Netlify

1. Netlify → **Add new site → Import an existing project** → pick this GitHub
   repo. `netlify.toml` supplies the build command and the Next.js runtime.
2. Create a PostgreSQL database (e.g. [Neon](https://neon.tech) free tier) and
   set `DATABASE_URL` under **Site configuration → Environment variables**.
3. Run the migrations against that database once, from your machine:
   `DATABASE_URL=<neon-url> npx prisma migrate deploy && DATABASE_URL=<neon-url> npm run seed`
4. Deploy. Later phases add the auth/payment env vars listed in
   `.env.example`.

## Build phases

- [x] **Phase 1 — Foundation.** Tokens, Prisma schema + migrations + seed,
      UI primitives, component gallery at `/gallery`.
- [ ] Phase 2 — Catalog, read-only (home, listing + URL-driven filters,
      product detail).
- [ ] Phase 3 — Admin catalog (sections, brands, attribute editor, product
      CRUD, audit log).
- [ ] Phase 4 — Cart and auth.
- [ ] Phase 5 — Checkout and payments (Stripe + PayPal, webhooks).
- [ ] Phase 6 — Orders and fulfillment.
- [ ] Phase 7 — Supplier seam and hardening (CSP, rate limits, a11y audit).

## Design tokens

All colour, type, spacing, radius and motion tokens live in
`app/globals.css` and come verbatim from the design output
(`fullthrottle-plan.md` Part 3). Do not invent values outside that file.
