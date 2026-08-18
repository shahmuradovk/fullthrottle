# Handoff: Fullthrottle — motorcycle parts store (storefront + admin)

## Overview
Fullthrottle.com is a US-market online store for motorcycle parts, gear, and accessories, with two surfaces: a public storefront and an internal admin on a separate subdomain. The catalog is fully data-driven — sections own attribute templates that generate filters, spec tables, and admin form fields automatically. This package contains the complete visual design (15 screens + component library), the design plan/tokens, the original brief, and the functional prototype.

## About the design files
The `.dc.html` files are **design references created in HTML** — high-fidelity prototypes showing intended look and behavior, NOT production code to copy. The task is to **recreate these designs in React + Tailwind targeting Next.js App Router** (per the brief's hard constraints), separate files per component. Inline styles in the mocks map 1:1 to the CSS custom properties in `fullthrottle-plan.md` Part 3 — build a Tailwind theme from those tokens first.

`functional-prototype.jsx` is a working React prototype. Treat it as the **functional specification only**: take its data model, field names, seed content, validation messages, and state machine. **Ignore its visual styling entirely** — the visual truth is the `.dc.html` files and the plan.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final. Recreate pixel-faithfully using the token contract; all microcopy in the mocks is intentional and should be carried over verbatim.

## Design direction (one paragraph)
The visual language is the parts fiche: dark "garage" anthracite surfaces, warm bone text, measured facts typeset as data in a mono face, and the signature element — a circled reference number ("fiche callout") that appears on product cards, spec rows, checkout steps, and the order timeline. Accent is fuel-tank orange (`#E8622C`), second hue Slipstream blue (`#6FA3DC`) for links and the supplier stock state. Motion is nearly nothing: 120 ms state transitions, 200 ms bottom sheet, one 1.6 s skeleton pulse (killed by `prefers-reduced-motion`).

## Files
| File | Contents |
|---|---|
| `fullthrottle-plan.md` | Design plan, self-critique, **full token contract (Part 3)**, `AttributeDef` type, build order + must-not-change decisions (Part 6), prototype alignment (Part 7). Read this first. |
| `Fullthrottle Components.dc.html` | All primitives: Button (primary/secondary/quiet/focus/disabled/destructive), Input (default/error), Select, Checkbox, Filter chip, the four stock badges, Product card, Fiche spec table, Modal, Toast, Order timeline, Empty state, Skeleton. |
| `Fullthrottle Storefront.dc.html` | Screen 02 Category listing (dynamic filter sidebar rendered from attribute data, active chips, sort, grid, pagination, zero-results empty state) and Screen 03 Product detail (gallery, fitment box, stock states, qty, dynamic spec table, description). Stock state and zero-results are switchable via component props in the mock. |
| `Fullthrottle Storefront II.dc.html` | Screens 01 Home, 04 Cart, 05 Register/sign in, 06 Checkout (with failed-payment error state), 07 Order confirmation, 08 Order tracking (packed/shipped switchable), 09 Account. |
| `Fullthrottle Admin.dc.html` | Screens 10 Admin shell + nav, 11 Sections and brands, 12 Attribute template editor, 13 Product form (fields generated from template), 14 Orders list + detail with status change (tracking required before Shipped), 15 Supplier integration (disabled state). |
| `original-brief.md` | The client brief — anti-brief, hard constraints (WCAG 2.2 AA, mobile-first, no localStorage), copy rules. |
| `functional-prototype.jsx` | Functional spec: data model, seed content, validation strings, totals logic, status machine. |

## Screens / views
Screen-by-screen layout, copy, and component usage are visible directly in the mocks; the structural rules that must survive implementation:

- **Category listing** — 264 px filter sidebar + product grid (3-up desktop). Every filter group renders from `AttributeDef[]`: checkbox lists, numeric min/max ranges (with unit), boolean Yes/No. Active filters appear as removable Fuel-orange pills above the grid. Zero results shows the empty state with a one-click "Remove weight limit" recovery.
- **Product detail** — gallery left, sticky buy column right (brand + SKU mono, price, fitment box, stock badge + ship line, qty stepper ≥44 px targets, CTA), fiche spec table below with numbered rows (`01`–`06`), unit/boolean values from the template.
- **Cart → Auth → Checkout** — guests cart freely; account wall at checkout explained in one line ("An account is required to pay, track your order, and handle returns. Your cart carries over."). Checkout: address card, three payment methods (Card/Apple Pay/PayPal), failed-payment banner pattern, order summary with $99+ free shipping and 8.25 % estimated tax.
- **Tracking** — five-step horizontal timeline (Paid → Preparing → Packed → Shipped → Delivered); carrier + tracking number appear only at Shipped, with the explicit no-tracking-yet message before.
- **Admin** — 190 px left nav, near-black `#101316` top bar, denser type (13–14 px). Brands live inside sections. Attribute editor rows: label, type, unit, options, filterable flag, filter control. Product form = base fields (brand, name, SKU, price, stock on hand, supplier SKU, description) + template-generated fields. Orders: "Mark as Shipped" requires carrier + tracking number ("Enter a tracking number before marking this shipped."). Supplier page ships disabled (`SUPPLIER_SYNC_ENABLED = false`).

## Interactions, states, validation
- Every screen needs empty, loading (skeleton), and error states — patterns for all are in the Components sheet and mocks.
- Stock state derives from count: >3 In stock · 1–3 Low stock · 0 Out of stock; "Ships from supplier (2–4 days)" when the product's supply source is the (future) supplier sync. Always text badges, never bare dots.
- Validation strings are fixed and listed verbatim in `fullthrottle-plan.md` Part 7.
- Focus: visible ring (`--focus-ring`) on every interactive element; filters fully keyboard-operable; every field labelled; 4.5:1 minimum contrast; no accessibility overlay. Never use localStorage/sessionStorage.
- Mobile-first: filter sidebar becomes a bottom sheet (200 ms), admin tables become stacked cards, checkout is one column. (Mobile variants are not mocked — apply these rules to the desktop designs.)

## Design tokens
The complete contract is `fullthrottle-plan.md` Part 3 (colors, type scale with Barlow Condensed / Barlow / IBM Plex Mono, spacing, radii, borders, elevation, motion). Part 6 lists the decisions that must not be silently changed.

## Assets
No raster assets. All imagery in the mocks is a striped placeholder with a mono label describing the expected photo (product shots, section photos, exploded-diagram hero) — real photography to be supplied by the client. Fonts load from Google Fonts.
