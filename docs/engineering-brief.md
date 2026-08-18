# Fullthrottle — Engineering Brief for Claude Code

> Give this to Claude Code together with (a) the design output from Claude Design and (b) `fullthrottle-prototype.jsx`.

---

## 0. What you are building

**Fullthrottle.com** — a US-market e-commerce store for motorcycle parts and gear, with a public storefront and a separate admin back office. Launch catalog is two sections (Moto Exhaust, Moto Helmets); more get added later by a non-technical admin, so nothing may be hardcoded to those two.

**Three inputs, in this precedence order when they conflict:**

1. **This document** — architecture, data model, security, business rules. Wins on anything functional.
2. **The design output** — tokens, components, layout, copy. Wins on anything visual.
3. **`fullthrottle-prototype.jsx`** — a working React prototype. It is the reference for *behaviour, field names, states and flows*. Its visual styling is a placeholder and must be discarded entirely.

If any of the three tells you to do something that contradicts a rule in Section 12 (Guardrails), stop and ask.

---

## 1. Stack — decided, do not re-litigate

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript `strict` |
| Styling | Tailwind CSS, tokens from the design output as CSS custom properties |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Auth.js v5 (NextAuth) — Google, Apple, Credentials |
| Payments | Stripe (card, Apple Pay, Google Pay) + PayPal Server SDK |
| Tax | Stripe Tax |
| Validation | Zod on every input, server-side, no exceptions |
| Mutations | Server Actions; Route Handlers for webhooks only |
| Email | Abstract behind a `sendEmail()` port; Resend as the first implementation |
| Rate limiting | Upstash Ratelimit (or a Postgres-backed equivalent) |
| Hosting | Vercel |

Use Server Components by default. Reach for `"use client"` only where interactivity requires it — filter panels, cart controls, checkout, admin forms.

---

## 2. Project structure

```
app/
  (store)/
    page.tsx                     home
    [section]/page.tsx           category listing + filters
    product/[slug]/page.tsx      product detail
    cart/page.tsx
    checkout/page.tsx
    checkout/confirmation/[id]/page.tsx
    account/page.tsx
    account/orders/[id]/page.tsx
    sign-in/page.tsx
  (admin)/admin/
    sections/  attributes/  products/  orders/  supplier/  users/
  api/
    webhooks/stripe/route.ts
    webhooks/paypal/route.ts
    .well-known/apple-developer-merchantid-domain-association/route.ts
lib/
  db.ts  auth.ts  cart.ts  pricing.ts  orders.ts  tax.ts  rate-limit.ts
  attributes/                    types, resolvers, filter builder
  payments/stripe.ts  payments/paypal.ts
  supplier/  adapter.ts  manual.ts  availability.ts
components/
  ui/                            primitives from the design output
  store/  admin/
prisma/schema.prisma
```

Serve the Apple Pay domain association file from the route handler above — it must resolve at `https://fullthrottle.com/.well-known/apple-developer-merchantid-domain-association` with `content-type: text/plain`.

---

## 3. Data model

```prisma
model Section {
  id         String      @id @default(cuid())
  name       String
  slug       String      @unique
  tagline    String?
  position   Int         @default(0)
  brands     Brand[]
  attributes Attribute[]
  products   Product[]
}

model Brand {
  id        String    @id @default(cuid())
  sectionId String
  section   Section   @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  name      String
  slug      String
  products  Product[]
  @@unique([sectionId, slug])
}

enum AttributeType { SELECT MULTISELECT NUMBER TEXT BOOLEAN }

model Attribute {
  id         String        @id @default(cuid())
  sectionId  String
  section    Section       @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  key        String        // stable machine key, generated from name on create, never mutated
  name       String        // display label, editable
  type       AttributeType
  options    String[]      @default([])
  unit       String?
  filterable Boolean       @default(true)
  position   Int           @default(0)
  @@unique([sectionId, key])
}

enum SupplySource { MANUAL SUPPLIER }

model Product {
  id             String       @id @default(cuid())
  sectionId      String
  brandId        String
  section        Section      @relation(fields: [sectionId], references: [id])
  brand          Brand        @relation(fields: [brandId], references: [id])
  name           String
  slug           String       @unique
  sku            String       @unique
  description    String?
  priceCents     Int
  stock          Int          @default(0)
  active         Boolean      @default(true)
  values         Json         @default("{}")   // { [attributeKey]: string | string[] | number | boolean }

  supplySource   SupplySource @default(MANUAL)
  supplierId     String?
  supplierSku    String?
  supplierStock  Int?
  supplierPriceCents Int?
  mapPriceCents  Int?                 // minimum advertised price — never advertise below this
  priceLocked    Boolean      @default(true)
  lastSyncedAt   DateTime?

  // US compliance — populate from day one, retrofitting 50k SKUs later is brutal
  prop65Warning  String?              // Prop 65 warning text; null = no warning required
  carbEoNumber   String?              // CARB Executive Order number for emissions-related parts
  caLegal        Boolean      @default(true)   // false → block shipping to CA addresses
  hazmatClass    String?              // battery, oil, aerosol → restricts shipping methods
  oversizeFreight Boolean     @default(false)

  images         ProductImage[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@index([sectionId, active])
}
```

Add a GIN index on `Product.values` in a migration:
`CREATE INDEX product_values_gin ON "Product" USING GIN (values jsonb_path_ops);`

That is sufficient up to roughly 100k SKUs. If filtering slows past that, the migration path is a normalised `ProductAttributeValue` table — do not build it now.

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified DateTime?
  passwordHash  String?              // null for social-only accounts
  accounts      Account[]            // Auth.js — one row per provider
  addresses     Address[]
  orders        Order[]
  createdAt     DateTime  @default(now())
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         AdminRole
  totpSecret   String                 // MFA is mandatory
  totpEnabled  Boolean  @default(false)
  lastLoginAt  DateTime?
}

enum AdminRole { OWNER MANAGER CONTENT ORDERS }

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  action    String   // "product.update"
  entity    String
  entityId  String
  before    Json?
  after     Json?
  createdAt DateTime @default(now())
  @@index([entity, entityId])
}

model Address {
  id      String  @id @default(cuid())
  userId  String
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  line1   String
  line2   String?
  city    String
  state   String   // 2-letter US code, validated against an enum
  zip     String   // 5 digits, validated
  phone   String?
  isDefault Boolean @default(false)
}

model Cart {
  id        String     @id @default(cuid())
  userId    String?                     // null while the shopper is anonymous
  token     String     @unique          // httpOnly cookie, merged into the user cart on sign-in
  items     CartItem[]
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id        String  @id @default(cuid())
  cartId    String
  cart      Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  qty       Int
  @@unique([cartId, productId])
}

enum OrderStatus { PENDING_PAYMENT PAID PREPARING PACKED SHIPPED DELIVERED CANCELLED REFUNDED }
enum PaymentMethod { CARD APPLE_PAY PAYPAL }

model Order {
  id             String        @id @default(cuid())
  number         String        @unique          // FT-10001, from a Postgres sequence
  userId         String
  user           User          @relation(fields: [userId], references: [id])
  status         OrderStatus   @default(PENDING_PAYMENT)
  items          OrderItem[]
  events         OrderEvent[]

  subtotalCents  Int
  shippingCents  Int
  taxCents       Int
  totalCents     Int

  shipTo         Json                           // address snapshot, never a live FK
  paymentMethod  PaymentMethod
  paymentRef     String?                        // Stripe PaymentIntent id or PayPal order id
  statementDescriptor String

  carrier        String?
  trackingNumber String?

  // Compelling Evidence 3.0 — captured at checkout, not derived later
  ipAddress      String?
  userAgent      String?
  deviceHash     String?
  sessionId      String?

  createdAt      DateTime      @default(now())
  @@index([userId, createdAt])
}

model OrderItem {
  id          String @id @default(cuid())
  orderId     String
  order       Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  // snapshot — never join back to Product for display
  name        String
  brandName   String
  sku         String
  unitPriceCents Int
  qty         Int
}

model OrderEvent {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  actorId   String?
  createdAt DateTime    @default(now())
}

model Supplier {
  id            String   @id @default(cuid())
  name          String
  apiBaseUrl    String?
  credentialRef String?                 // key in the secret store, never the secret itself
  syncMinutes   Int      @default(30)
  enabled       Boolean  @default(false)
  syncRuns      SyncRun[]
}

model SyncRun {
  id         String   @id @default(cuid())
  supplierId String
  supplier   Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  startedAt  DateTime @default(now())
  finishedAt DateTime?
  updated    Int      @default(0)
  errors     Json?
}
```

**Money is integer cents everywhere.** No floats, no `Decimal` in application code.

---

## 4. The attribute system — the core of the product

```ts
export type AttributeDef = {
  id: string;
  key: string;
  name: string;
  type: "SELECT" | "MULTISELECT" | "NUMBER" | "TEXT" | "BOOLEAN";
  options: string[];
  unit?: string | null;
  filterable: boolean;
  position: number;
};

export type AttributeValue = string | string[] | number | boolean | null;
```

Three surfaces render from the same `AttributeDef[]`, and **none of them may contain a literal attribute name**:

1. **Admin product form** — one input per attribute, control chosen by `type`.
2. **Storefront filter panel** — one group per attribute where `filterable` is true. `SELECT`/`MULTISELECT`/`BOOLEAN` render as option lists; `NUMBER` renders as a min/max range.
3. **Product detail spec table** — one row per attribute that has a value. Formatting: number → `${value} ${unit}`, multiselect → comma-joined, boolean → `Yes`/`No`, empty → row omitted.

Write one `renderAttributeControl()` and one `formatAttributeValue()` and use them in all three places. Include a unit test that feeds an attribute type the code has never seen and asserts it degrades to a text input rather than throwing.

`key` is generated once on create (slugified name) and is immutable. `name` is editable. Filters, values and URLs reference `key`, never `name` — renaming an attribute in the admin must not break existing product data or bookmarked filter URLs.

Filter state lives in the URL query string so listing pages are shareable and server-renderable.

---

## 5. Auth

Two completely separate realms. Different tables, different session cookie names, different middleware, different route groups.

**Customers** (`fullthrottle.com`)
- Providers: Google, Apple, Credentials (email + password).
- `passwordHash` uses Argon2id.
- Credentials sign-up requires email verification before order emails are sent; social sign-in arrives pre-verified.
- **Account linking:** if a social sign-in returns an email that already exists and is verified, link the provider to the existing `User`. Never create a duplicate account on email collision.
- **Apple specifics:** Apple returns the user's name *only on the first authorization* — persist it in that callback or it is gone. Apple's "Hide My Email" returns a `@privaterelay.appleid.com` relay address; store it as the account email and let the user add a contact email in their profile.
- A social-only user can later set a password via a "set password" flow.
- Anonymous carts are allowed. Sign-in happens at the checkout step, and the cookie cart merges into the user cart on success.

**Admin** (`admin.fullthrottle.com`)
- Email + password + **mandatory TOTP**. No social providers.
- Accounts are created by invite only; there is no public admin registration route.
- Middleware enforces role on every admin route. `CONTENT` cannot change prices; `ORDERS` can only advance order status and add tracking.
- Every mutation writes an `AuditLog` row.
- No link to the admin from any public page, sitemap or robots.txt.

---

## 6. Cart, pricing, tax, shipping

- `lib/pricing.ts` exports `computeTotals(items)` and it is the **only** place totals are calculated. Server-side, always, from database prices. A price arriving from the client is ignored, never trusted.
- Shipping: free at $99 and above, otherwise $9.95. One constant, one place.
- Tax: Stripe Tax, calculated from the shipping address. Label it "Estimated sales tax" until the payment is confirmed.
- **US shipping only.** Validate the state against a 50-state + DC enum. No country selector exists anywhere in the UI.
- Stock is read exclusively through `getAvailability(product)` (Section 9). Re-check availability at payment-intent creation and reject with a clear message if an item went out of stock while in the cart.

---

## 7. Payments

Three buttons, two integrations.

**Stripe — card, Apple Pay, Google Pay**
- Payment Element, rendered in Stripe's iframe. Card fields never exist in our DOM. This keeps us in SAQ A scope; anything that breaks it is a regression, not a refactor.
- Create the PaymentIntent server-side with an **idempotency key** derived from the cart, and with `amount` recomputed server-side at that moment.
- Register production and preview domains for Apple Pay via the Stripe API. Include `www` — Apple treats it as a separate subdomain.
- Apple Pay's payment sheet must be invoked directly inside the user-gesture handler, before any `await`. An async call before the invocation silently kills the sheet on Safari.

**PayPal**
- Orders v2: create server-side, capture server-side. The client never sends an amount.
- Verify the webhook signature on every event.

**Both**
- The **webhook is the source of truth** for "paid", not the browser redirect. A user closing the tab after paying must still end up with a `PAID` order.
- Webhook handlers are idempotent — key on the event id, store processed ids, return 200 on replays.
- One consistent `statementDescriptor` on every charge. The first six characters must be identical across all transactions or Compelling Evidence 3.0 submissions will not qualify.
- Capture `ipAddress`, `userAgent`, `deviceHash` and `sessionId` **from the checkout session** and write them onto the order. This is checkout data, not order-table data, and it is where most merchants lose chargeback representments.
- Never log a PAN, a CVC, or a full webhook body containing payment credentials.

---

## 8. Order state machine

```
PENDING_PAYMENT → PAID → PREPARING → PACKED → SHIPPED → DELIVERED
      ↓             ↓         ↓          ↓
   CANCELLED    CANCELLED  CANCELLED  (REFUNDED from any paid state)
```

Rules, enforced in `lib/orders.ts` and nowhere else:

- Forward transitions only. No skipping. No editing history.
- `PACKED → SHIPPED` requires a non-empty `carrier` and `trackingNumber`. Reject the transition otherwise with a field-level error.
- Every transition writes an `OrderEvent` with the actor and timestamp.
- `OrderItem` rows are immutable snapshots. Changing a product's price or name later must not alter any past order.
- The customer-facing timeline and the admin timeline render from the same `OrderEvent` list.

---

## 9. Supplier integration — build the module, leave it disconnected

The supplier API is **not** being connected in this build. Build the seam so connecting it later touches one file.

```ts
export interface SupplierAdapter {
  fetchStock(skus: string[]): Promise<Record<string, number>>;
  fetchPricing(skus: string[]): Promise<Record<string, number>>;  // cents
  placePurchaseOrder(order: Order): Promise<{ poNumber: string }>;
  fetchTracking(poNumber: string): Promise<{ carrier: string; trackingNumber: string } | null>;
}
```

- Ship `ManualAdapter` — every method resolves empty. It is the only implementation for now.
- Everything that needs stock calls **one** resolver:

```ts
export function getAvailability(p: Product): { inStock: boolean; qty: number; label: StockLabel } {
  const qty = p.supplySource === "SUPPLIER" ? (p.supplierStock ?? 0) : p.stock;
  // → "In stock" | "Low stock" | "Ships from supplier (2–4 days)" | "Out of stock"
}
```

Product pages, listing cards, cart and checkout all go through it. When the supplier is connected, this function's second branch activates and no screen changes.

- Gate the sync job behind `SUPPLIER_SYNC_ENABLED` (default `false`).
- `priceLocked` defaults to `true`. A sync must never overwrite an admin-entered price on a locked product. Getting this wrong wipes the entire manual price list on the first sync.
- Build the admin screens now, in their empty state: supplier config and sync-run log.
- Leave a `MAP` (minimum advertised price) field and honour it in the pricing display layer. Violating a distributor's MAP policy terminates the dealer account, so treat it as a hard business rule rather than a formatting concern.

---

## 10. Security

**PCI.** The Stripe iframe keeps card data out of our environment. To stay eligible for SAQ A we must also be able to confirm the site is not susceptible to script-based attacks:
- Strict CSP with per-request nonces and `strict-dynamic`. No `unsafe-inline`, no wildcard script sources.
- A committed inventory of every third-party script, with a justification per entry. Subresource Integrity where the source supports it.
- No third-party tag manager on the checkout route.

**Headers.** HSTS with preload, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying everything unused, `frame-ancestors 'none'`.

**Rate limits.** Sign-in, sign-up, password reset, checkout submission, and search. Card-testing attacks target checkout endpoints specifically — a burst of failed payment attempts from one IP or one account must be blocked, not just logged.

**Input.** Zod on every Server Action and Route Handler. Parse, don't validate — the parsed type is what flows onward.

**Webhooks.** Signature verified before any parsing. Exempt from CSRF, never from authentication.

**Secrets.** Environment only. `credentialRef` in the `Supplier` table is a pointer, never the credential.

---

## 11. Accessibility, SEO, quality floor

- **WCAG 2.2 AA is a requirement.** US retail is the most-litigated category for web accessibility, and checkout and filter UIs are where claims concentrate. Visible keyboard focus on every interactive element, 4.5:1 contrast, every form field labelled and every error programmatically associated with its field, filters fully keyboard-operable, correct heading order. No accessibility overlay — they do not fix the underlying markup.
- Mobile-first. Filter sidebar becomes a bottom sheet. Admin tables become stacked cards. Checkout is one column.
- `Product` and `BreadcrumbList` JSON-LD on product pages, with `availability` derived from `getAvailability()`.
- A daily product feed export (JSONL) — AI shopping agents and marketplaces consume it, and it costs almost nothing to emit now.
- Tests: unit tests for `computeTotals`, the order state machine, and attribute formatting; an integration test for the full checkout-to-webhook path with Stripe test keys.

---

## 12. Guardrails — do not silently change any of these

1. No attribute name, filter label, or spec row is ever hardcoded. All three render from `AttributeDef[]`.
2. Totals are computed server-side from database prices. Client-supplied amounts are ignored.
3. No guest checkout. Payment requires an account.
4. No international shipping, no currency selector, no country picker.
5. Card fields never render in our DOM.
6. Order status only moves forward, and `SHIPPED` requires carrier and tracking.
7. `OrderItem` rows are immutable snapshots.
8. The supplier API is not connected in this build. `SUPPLIER_SYNC_ENABLED` stays `false`.
9. A sync never overwrites a price where `priceLocked` is true.
10. Admin and customer auth never share a table, a session, or a cookie.
11. Money is integer cents.
12. Design tokens come from the design output. Do not invent colours, type scales or spacing.
13. Compliance fields are enforced, not decorative: a product with `caLegal = false` cannot be shipped to a California address, a `prop65Warning` renders on the product page before purchase, and a `hazmatClass` value restricts the available shipping methods.

If a requirement seems to demand breaking one of these, stop and ask rather than working around it.

---

## 13. Build order

Ship each phase working before starting the next. Do not scaffold all fourteen screens at once.

**Phase 1 — Foundation.** Next.js + TypeScript + Tailwind with the design tokens wired in. Prisma schema, migrations, seed script reproducing the prototype's two sections, nine brands, twelve attributes and nine products. The UI primitives from the design output, with a rendered component gallery.
*Done when:* `prisma migrate dev && npm run seed` produces the full catalog and the component gallery renders every primitive in every state.

**Phase 2 — Catalog, read-only.** Home, category listing with URL-driven dynamic filters and sort, product detail with the dynamic spec table. Server-rendered.
*Done when:* adding an attribute directly in the database makes it appear as a filter and a spec row with no code change.

**Phase 3 — Admin catalog.** Sections, brands, attribute template editor, product CRUD with the generated form. Role middleware and audit log.
*Done when:* a non-technical user can create a third section end to end and it is live on the storefront.

**Phase 4 — Cart and auth.** Anonymous cart, Google + Apple + credentials sign-in, account linking, cart merge on sign-in, account area with saved addresses.
*Done when:* a shopper can fill a cart signed out, sign in with Google, and find the cart intact.

**Phase 5 — Checkout and payments.** Stripe Payment Element (card + Apple Pay), PayPal, Stripe Tax, webhooks, order creation, CE 3.0 data capture, confirmation page.
*Done when:* a test payment closed in the browser mid-flow still lands as `PAID` via the webhook.

**Phase 6 — Orders and fulfillment.** Admin order list and detail, state machine transitions, tracking entry, customer timeline, transactional emails.
*Done when:* advancing an order in the admin updates the customer's timeline and sends the right email at each step.

**Phase 7 — Supplier seam and hardening.** Adapter interface, `ManualAdapter`, `getAvailability()`, disabled admin screens, CSP and headers, rate limits, accessibility audit, tests.
*Done when:* an axe scan on home, listing, product, cart and checkout returns no violations, and the CSP report-only log is clean.

---

## 14. Environment variables

```
DATABASE_URL
NEXTAUTH_URL  NEXTAUTH_SECRET
GOOGLE_CLIENT_ID  GOOGLE_CLIENT_SECRET
APPLE_CLIENT_ID  APPLE_TEAM_ID  APPLE_KEY_ID  APPLE_PRIVATE_KEY
STRIPE_SECRET_KEY  STRIPE_PUBLISHABLE_KEY  STRIPE_WEBHOOK_SECRET
PAYPAL_CLIENT_ID  PAYPAL_CLIENT_SECRET  PAYPAL_WEBHOOK_ID
RESEND_API_KEY
UPSTASH_REDIS_REST_URL  UPSTASH_REDIS_REST_TOKEN
ADMIN_HOSTNAME=admin.fullthrottle.com
SUPPLIER_SYNC_ENABLED=false
```

---

## 15. How to start

Begin with Phase 1 only. Before writing code, reply with:

- the file tree you intend to create,
- the final Prisma schema after any corrections you would make and why,
- the token mapping from the design output into `globals.css`,
- anything in this document you believe is wrong or underspecified.

Do not start Phase 2 until Phase 1 runs.
