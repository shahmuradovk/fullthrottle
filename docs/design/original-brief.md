# Fullthrottle — Design Brief

> Paste this whole document into Claude Design. Then hand its output (plan + code) to Claude Code.

---

## 0. Your role

You are the design lead at a small studio known for giving every client a visual identity that could not be mistaken for anyone else's. This client has already rejected proposals that felt templated. Make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take one real aesthetic risk you can justify in writing.

Work in two passes: **plan first, critique the plan against the anti-brief below, revise, then build.** Do not skip the critique.

---

## 0.5. About the working prototype

A functional React prototype accompanies this brief. Read it as a **functional specification only.**

Take from it: the data model and field names, the screen inventory, the four stock states, the five-step order status machine, the form fields and their validation messages, the empty and error states, and the exact seed content (brands, SKUs, spec values).

Ignore entirely: its palette, typography, spacing, border radii, layout, and component styling. Those are placeholders written to prove the data model works, not a visual direction. Do not treat them as a starting point, do not "refine" them, and do not carry over its neutral grey-and-black scheme. The visual direction must come from Section 3 and your own plan.

If the prototype has not been provided yet, produce the design plan from this brief alone — that is the intended first step.

---

## 1. The product

**Fullthrottle.com** — a US-market online store for motorcycle parts, gear, and accessories.

Launch catalog is two sections: **Moto Exhaust** and **Moto Helmets**. More sections (gloves, brake pads, tires, luggage) get added later by a non-technical admin, so nothing in the design may be hardcoded to these two.

**Who uses it.** US riders, roughly 25–55, split between two mindsets:
- The wrencher — already knows the part number, wants to confirm fitment and stock, and be gone in 90 seconds.
- The gear buyer — shopping for a helmet, comparing certifications, sizes, weight, and price.

Both arrive knowing what bike they ride. Neither wants to be sold to. The three questions the interface must answer instantly: **Will it fit my bike? Is it in stock? When does it ship?**

**Two surfaces**, both to be designed:
- **Storefront** — public, English (US), prices in USD.
- **Admin** — internal, separate subdomain, separate visual weight (denser, quieter, more utilitarian, but same type and color system so it reads as one product).

**Business facts that shape the UI:**
- Shipping is **US domestic only**. No currency switcher, no country picker, no customs messaging.
- **Payment requires an account.** Guests browse and fill a cart freely; registration happens at the checkout step. Sign-up options: Google, Apple, or email + password.
- Three payment methods at checkout: **bank card, Apple Pay, PayPal.**
- Stock badges are fed by a supplier sync that is not connected yet. Design must express four stock states: *In stock*, *Low stock*, *Ships from supplier (2–4 days)*, *Out of stock*.
- After payment, the order moves through a status timeline: **Paid → Preparing → Packed → Shipped → Delivered**, with a carrier tracking number appearing at Shipped.

**The one structural idea everything hangs on.** The catalog is a Lego system, not a fixed taxonomy:

```
Section  (Moto Helmet)
  └─ Brand  (AGV, Shoei, HJC)
       └─ Product  (K6 S)

Each Section owns an attribute template:
  Moto Helmet  → Type, Size, Certification, Shell material, Weight, Pinlock
  Moto Exhaust → System type, Material, Color, CARB compliant, Inlet dia., Weight
```

The admin defines those attributes. Whichever ones are flagged *filterable* appear automatically as filters on the storefront, and every attribute appears automatically as a row in the product spec table and as a field in the admin product form.

**Therefore: no screen may hardcode an attribute name, a filter label, or a spec row.** Design the filter sidebar to survive 2 groups or 8 groups, checkbox lists or numeric ranges, 3 options or 20. Design the spec table to survive an attribute with a unit (`1,270 g`), a boolean (`Pinlock included — yes`), and a multi-value (`DOT, ECE 22.06, SNELL M2020`). Show these variations in the mockups.

---

## 2. The anti-brief — what this must not look like

AI-generated design right now clusters around a handful of looks. Any of these will be rejected:

- Warm cream background near `#F4F1EA` with a high-contrast serif display and a terracotta accent near `#D97757`.
- Near-black background with a single acid-green or vermilion accent.
- Broadsheet layout: hairline rules, zero border-radius, dense newspaper columns.
- Purple-to-blue SaaS gradient hero, glassmorphism panels, floating 3D blobs, mesh backgrounds.
- Inter + `rounded-2xl` + `shadow-lg` card grid on white.
- A full-bleed stock photo of a motorcycle at golden hour with a dark overlay and a centered headline.
- Big-number stat blocks (`10,000+ parts` / `Free shipping` / `24/7 support`) as a hero device.
- Copy like "Shop Now", "Elevate your ride", "Premium quality parts". Emoji anywhere.

Also reject **luxury-by-default**: black and gold, thin uppercase letter-spaced serif, "premium" signaled through emptiness. Premium here means *precise*, not *expensive-looking*. This store's authority comes from knowing more about the part than the customer does.

---

## 3. Where to find a real direction

Go into the subject's own material world and take the visual language from there. Some of the vocabulary available to you:

- **The parts fiche** — exploded diagrams with numbered callouts, reference numbers, "qty 2" columns. This is the native document format of this industry.
- **Certification stamps** — DOT, ECE 22.06, SNELL M2020 as physical embossed marks on a helmet shell.
- **Measured facts** — dB ratings, torque specs, inlet diameters in mm, shell weight in grams, part numbers. These are the store's real content and should be typeset as data, not prose.
- **Materials** — titanium heat-tint on exhaust headers, carbon weave, brushed and anodized aluminium, powder-coated black.
- **Workshop signage** — crate stencils, hazard tape, service manual print, bin labels, blueprint annotation.

You do not have to use all or any of these. Pick a lane and commit. What matters is that the direction is traceable to something real in this world rather than to a design trend.

---

## 4. Deliver in this order

### Part 1 — Design plan (write this before any code)

- **Palette**: 5–6 named hex values with a one-line rationale each. State which one is the accent and where it is allowed to appear.
- **Type**: three roles — display, body, and a utility/mono face for part numbers, SKUs, specs, and attribute keys. Name real fonts (Google Fonts or system). Explain the pairing in one sentence. Give a type scale with weights.
- **Layout**: one-sentence concept plus ASCII wireframes for the two hardest screens (category listing with dynamic filters, and product detail).
- **Signature**: the single element this site will be remembered by. One thing, not three. It must encode something true about the content, not decorate it.
- **Motion**: what animates and why. If the answer is "almost nothing", say so.

### Part 2 — Self-critique

Work through what a generic response to this brief would look like. Then state, explicitly: which parts of your plan resemble it, and what you changed. If nothing resembles it, prove that by naming the default you avoided at each decision.

### Part 3 — Design tokens

CSS custom properties: color, type scale, spacing scale, radii, borders, elevation, motion durations. This is the contract Claude Code will build against, so make it complete and unambiguous.

### Part 4 — Component code

Build the shared primitives first: Button (variants + states), Input, Select, Checkbox, Chip/Filter pill, Badge (the four stock states), Card, Table, Modal, Toast, Timeline step, Empty state, Skeleton loader.

### Part 5 — Screens

**Storefront**
1. Home
2. Category listing — dynamic filter sidebar, sort, product grid, pagination
3. Product detail — gallery, dynamic spec table, stock state, quantity, add to cart, fitment note
4. Cart
5. Register / sign in — Google, Apple, email; account-required-to-pay explained in one line without friction
6. Checkout — address, three payment options, review, place order
7. Order confirmation
8. Order tracking — the status timeline with carrier number
9. Account — orders, addresses, profile

**Admin**
10. Admin shell + navigation
11. Sections and brands
12. Attribute template editor — add attribute, choose type, mark filterable
13. Product form — fields generated from the section's attribute template
14. Orders list and order detail with status change
15. Supplier integration — disabled state, showing what will connect later

### Part 6 — Handoff notes for Claude Code

A short build order, the file structure you assumed, which components are shared between storefront and admin, and any decision Claude Code must not silently change.

---

## 5. Hard constraints

- **React + Tailwind**, targeting Next.js App Router. Separate files per component.
- **Data-driven everywhere.** Filters, spec rows, and form fields render from an array of attribute definitions. Include the TypeScript type for that definition and show a component rendering an unknown attribute correctly.
- **Every screen needs its empty, loading, and error state.** An out-of-stock product, a filter combination with zero results, a failed payment, an order with no tracking number yet.
- **WCAG 2.2 AA is a requirement, not a nice-to-have.** US e-commerce sites are the most-sued category for web accessibility. Visible keyboard focus on every interactive element, 4.5:1 text contrast, filters operable by keyboard, every form field labelled, no accessibility overlay.
- **Mobile-first.** The filter sidebar becomes a bottom sheet. The admin tables become stacked cards. Checkout is one column.
- Never use `localStorage` or `sessionStorage`.
- No placeholder lorem ipsum — write real product names, real SKUs, real spec values from the exhaust and helmet examples above.

## 6. Copy

Write the microcopy yourself and make it part of the design. Plain verbs, sentence case, no filler. Name things by what the rider controls, not by how the system works. A button says exactly what happens when it is pressed, and the same word carries through to the confirmation. Errors explain what went wrong and what to do next; they do not apologise and they are never vague. An empty screen is an invitation to act, not a shrug.
