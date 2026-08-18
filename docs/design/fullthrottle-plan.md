# Fullthrottle — Design plan
Hand this file + the `.dc.html` mockups to Claude Code. Parts 4–5 live in the mockup files; this doc is the contract.

---

## Part 1 — Design plan

**Direction: the parts fiche.** The native document of this industry is the exploded parts diagram — numbered callouts, reference columns, quantities, part numbers. Fullthrottle is typeset like a fiche: every product, spec row, and order step carries a reference number; measured facts are set as data in a mono face, never as marketing prose. The aesthetic risk: the interface leads with the spec sheet, not the photograph — imagery supports the data, not the reverse. Justification: both audiences (wrencher, gear buyer) arrive with a question answerable only by data (fitment, stock, ship date); a data-first layout answers in the first second.

### Palette
| Name | Hex | Role / rationale |
|---|---|---|
| Anthracite | `#16191D` | Storefront page background. The dark of a garage at night — never pure black, never "luxury black". |
| Panel | `#1F242A` | Storefront cards, header, forms — a lifted sheet off Anthracite. |
| Bone | `#E8E6E0` | Text on dark. Warm off-white, like headlight-lit paper. |
| Steel | `#9BA3A8` | Secondary text, disabled, out-of-stock (on dark). |
| Fuel | `#E8622C` | **The accent** — fuel-tank orange. Allowed ONLY on: primary actions, active filter states, fiche callout numbers, focus rings, and the current timeline step. Never as a large surface. |
| Slipstream | `#6FA3DC` | Second hue — links and the "ships from supplier" state; keeps Fuel from being a lone acid accent. |

Admin runs the SAME dark system, differentiated by density (13–14 px body, tighter rows) and a near-black top bar `#101316` — quieter through compression, not through a second palette. Functional: In stock `#58B380` · Low stock `#DFA23C` · Error `#E0705F`.

### Type
- **Display — Barlow Condensed 600/700.** Descended from US highway/workshop signage lettering; condensed weight reads as stencil-adjacent without the costume.
- **Body — Barlow 400/500/600.** Same superfamily, so display and body share bone structure; grotesque, unfussy.
- **Utility — IBM Plex Mono 400/500.** Part numbers, SKUs, spec values, attribute keys, prices, quantities, dates. If a value could appear in a parts catalog column, it is set in Plex Mono.

Pairing in one sentence: one signage superfamily for voice, one engineering mono for facts — the split between what the store *says* and what it *knows*.

Scale (px / weight): 64/700 display hero · 40/700 page title · 28/600 section · 20/600 card title · 16/400 body · 14/400 secondary · 13/500 mono data · 11/500 mono labels (uppercase, +0.08em).

### Layout
Concept: a fiche sheet — a fixed 12-col grid where data columns align across cards, tables, and forms, so the whole catalog reads as one continuous parts list.

**Category listing (desktop):**
```
┌ header: wordmark | sections(dynamic) | your-bike chip | search | account cart ┐
├ breadcrumb  ······  MOTO HELMETS · 24 PRODUCTS ······ sort ▾ ┤
├──────────────┬───────────────────────────────────────────────┤
│ FILTERS      │ [active chips: Type:Full-face ×] [clear all]  │
│ (rendered    │ ┌────────┐ ┌────────┐ ┌────────┐              │
│ from attr    │ │ ①photo │ │ ②photo │ │ ③photo │  card =      │
│ template:    │ │ BRAND  │ │ ...    │ │ ...    │  callout no. │
│ checkboxes,  │ │ Name   │           │  + SKU mono │
│ numeric      │ │ spec line (mono)   │  + stock badge │
│ ranges,      │ │ [IN STOCK] $549.95 │  + price       │
│ booleans —   │ └────────┘ ...                        │
│ 2 groups or  │  pagination ‹ 1 2 3 ›                 │
│ 8, survives) │                                       │
└──────────────┴───────────────────────────────────────┘
mobile: filters button → bottom sheet; grid 1-col
```

**Product detail (desktop):**
```
┌ header ┐
├ breadcrumb: Moto Exhaust / Akrapovič ┤
├──────────────────────┬────────────────────────────┤
│ ① gallery            │ AKRAPOVIČ (mono, small)    │
│   main image         │ Slip-On Line (Titanium)    │
│   ▢ ▢ ▢ ▢ thumbs     │ SKU EXH-AKR-… (mono)       │
│                      │ $1,120.00                  │
│                      │ [FITS YOUR 2021 Z900] box  │
│                      │ [IN STOCK] ships today     │
│                      │ qty ⊖ 1 ⊕  [Add to cart]   │
├──────────────────────┴────────────────────────────┤
│ SPECIFICATIONS (fiche table, rows numbered 01–08, │
│ rendered from attribute template: unit / boolean  │
│ / multi-value all shown)                          │
└───────────────────────────────────────────────────┘
```

### Signature
**The fiche callout.** A small circled reference number with a leader line, borrowed from exploded parts diagrams. It appears on product cards (grid position), spec table rows (01–08), checkout steps, and the order timeline. One element, everywhere, encoding the site's claim: everything here is a numbered, referenced part — including your order.

### Motion
Almost nothing, and that is the point — a parts catalog does not perform. Durations: 120 ms opacity/transform on hover and state change, 200 ms for the mobile filter bottom sheet, one 1.6 s opacity pulse on skeletons. No parallax, no scroll animation, no hero motion. `prefers-reduced-motion` kills the pulse.

---

## Part 2 — Self-critique

The generic response to this brief: dark "carbon" background, acid-green or orange accent, aggressive condensed italics, a golden-hour hero bike photo, `10,000+ parts` stat blocks, Inter cards with `shadow-lg`, and a filter sidebar hardcoded to Size/Color/Price.

Decision by decision:
- **Background** — generic picks warm cream or flat #000 "premium black". Anthracite `#16191D` is a garage dark with warm Bone text, and the admin runs the same dark system, quieter through density — one system, one surface language.
- **Accent** — generic picks a single acid green/vermilion on dark. Fuel orange is paired with Slipstream blue and warm neutrals — a two-hue system traceable to fuel tanks and workshop signage, each confined to named uses.
- **Type** — generic picks Inter or a luxury serif. Barlow (signage) + Plex Mono (engineering) splits voice from data; no serif anywhere.
- **Hero** — generic picks the full-bleed golden-hour bike. Home leads with the bike selector and live catalog data; the fiche is the hero.
- **Cards** — generic picks rounded-2xl + soft shadow. Cards here are 2 px radius, 1 px Trace border, no shadow — sheets, not pillows.
- **Copy** — generic writes "Shop Now / Elevate your ride". Buttons name the action: "Add to cart", "Place order", "Save attribute". Stat blocks: none.
- **What still resembles the default and was changed:** first draft had the spec table as a plain zebra table (default); revised to numbered fiche rows with mono keys. First draft used green/amber/red stock dots (default traffic light); revised to stamped text badges because "Ships from supplier (2–4 days)" is information, not a color.
- **Remaining resemblance:** a left filter sidebar and a product grid — kept deliberately; wrenchers need convention where speed matters. The risk budget is spent on typography and the fiche system, not on relearning navigation.

---

## Part 3 — Design tokens

```css
:root {
  /* color — storefront (dark garage) */
  --color-bg: #16191D;          /* Anthracite */
  --color-surface: #1F242A;     /* Panel */
  --color-ink: #E8E6E0;         /* Bone */
  --color-ink-secondary: #9BA3A8; /* Steel */
  --color-line: #3A4148;
  --color-accent: #E8622C;      /* Fuel — actions, active filters, callouts, focus, current step */
  --color-accent-ink: #16191D;  /* text on accent */
  --color-link: #6FA3DC;        /* Slipstream — links, supplier state */
  --color-stock-in: #58B380;
  --color-stock-low: #DFA23C;
  --color-stock-supplier: #6FA3DC;
  --color-stock-out: #8A9196;
  --color-error: #E0705F;
  --color-error-bg: #382520;

  /* admin: same color tokens, denser type/spacing; top bar #101316 */
  --admin-topbar: #101316;

  /* type */
  --font-display: "Barlow Condensed", "Arial Narrow", sans-serif;
  --font-body: "Barlow", "Helvetica Neue", sans-serif;
  --font-mono: "IBM Plex Mono", "SFMono-Regular", monospace;
  --text-hero: 700 64px/1.0 var(--font-display);
  --text-title: 700 40px/1.05 var(--font-display);
  --text-section: 600 28px/1.1 var(--font-display);
  --text-card: 600 20px/1.2 var(--font-body);
  --text-body: 400 16px/1.5 var(--font-body);
  --text-small: 400 14px/1.45 var(--font-body);
  --text-data: 500 13px/1.4 var(--font-mono);
  --text-label: 500 11px/1.3 var(--font-mono); /* uppercase, letter-spacing .08em */

  /* spacing (px): 4 8 12 16 20 24 32 40 56 80 */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:20px; --space-6:24px; --space-7:32px; --space-8:40px;
  --space-9:56px; --space-10:80px;

  /* radii — near-square, never pill except chips */
  --radius-1: 2px;   /* everything */
  --radius-2: 4px;   /* modals, bottom sheet */
  --radius-pill: 999px; /* filter chips + fiche callout circle only */

  /* borders */
  --border-1: 1px solid var(--color-line);
  --border-ink: 1.5px solid var(--color-ink);

  /* elevation — flat by default */
  --shadow-none: none;                      /* cards */
  --shadow-pop: 0 8px 24px rgba(26,31,29,.16); /* modal, toast, bottom sheet only */

  /* focus */
  --focus-ring: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent);

  /* motion */
  --dur-fast: 120ms; --dur-sheet: 200ms; --ease: cubic-bezier(.2,0,.2,1);
}
```

Attribute definition type (the data-driven contract):

```ts
type AttributeDef = {
  id: string;
  sectionId: string;     // attributes belong to a section (prototype data model)
  name: string;          // "Shell material" — NEVER hardcoded in a component
  type: "select" | "multiselect" | "number" | "text" | "boolean";
  options: string[];     // for select / multiselect
  unit: string;          // "g", "mm" — render after value, mono; "" when none
  filterable: boolean;   // true → auto-appears in storefront filter sidebar
};
// Spec row rendering: number → `1,270 g` (tabular, unit appended);
// boolean → "Yes" / "No"; multiselect → values joined with " · ".
```

---

## Part 6 — Handoff notes for Claude Code

**Build order:** tokens → primitives (Button, Input, Select, Checkbox, Chip, Badge, Card, Table, Modal, Toast, TimelineStep, EmptyState, Skeleton) → `AttributeValue` + `FilterGroup` + `SpecTable` (the data-driven trio) → storefront screens → admin shell → admin screens.

**Assumed file structure (Next.js App Router):**
```
app/(store)/{page,category/[slug],product/[sku],cart,checkout,account,orders/[id]}/page.tsx
app/(admin)/admin/{sections,attributes,products,orders,integrations}/page.tsx
components/ui/*        // primitives, shared by both surfaces
components/catalog/*   // FilterSidebar, ProductCard, SpecTable, StockBadge
components/admin/*     // AttributeEditor, DynamicProductForm, OrdersTable
lib/attributes.ts      // AttributeDef type + renderers
```

**Shared between storefront and admin:** all `components/ui/*`, StockBadge, SpecTable, AttributeValue, the token file. Admin uses the same tokens at higher density (13/14 px body, 8 px row padding) — never a second color or type system.

**Decisions Claude Code must not silently change:**
1. No component may hardcode an attribute name, filter label, or spec row — everything renders from `AttributeDef[]`.
2. Fuel orange only on its named uses (actions, active states, callouts, focus, current step); Slipstream blue only for links and the supplier state; stock states are text badges, never bare dots.
3. Prices, SKUs, quantities, dates, spec values: IBM Plex Mono, tabular-nums.
4. Cards flat (1 px Trace border, 2 px radius); shadow only on modal/toast/bottom sheet.
5. Guests browse and cart freely; the account wall appears only at checkout, explained in one line.
6. Visible focus ring (`--focus-ring`) on every interactive element; 4.5:1 minimum text contrast; filter sidebar fully keyboard-operable; no accessibility overlay.
7. No localStorage/sessionStorage.


---

## Part 7 — Prototype alignment (functional spec)

Sourced from the working React prototype; per brief §0.5 its visuals are ignored, its data model is law.
- **Data model:** Section { id, name, slug, tagline } → Brand { sectionId } → Product { sectionId, brandId, sku, price, stock, supplySource, supplierSku, description, values }. Brands live under a section, not globally.
- **Stock state derives from the count:** >3 = In stock, 1–3 = Low stock, 0 = Out of stock; "Ships from supplier (2–4 days)" applies once supplySource is the supplier sync. No manual stock-state field.
- **Totals:** free shipping at $99+, otherwise $9.95; estimated sales tax 8.25%.
- **Orders:** numbers FT-10001+; statuses Paid → Preparing → Packed → Shipped → Delivered; carriers UPS / FedEx / USPS; tracking number required before Shipped ("Enter a tracking number before marking this shipped.").
- **Validation copy (verbatim):** "Enter your name." · "Enter a valid email address." · "Use at least 8 characters." · "That email already has an account. Sign in instead." · "Enter a street address." · "Enter a city." · "Enter a 5-digit ZIP code." · "Enter a card number." · "Use MM/YY." · "Enter the CVC."
- **Attribute types:** select, multiselect, number (+unit), text, boolean. Seed templates — Exhaust: System type, Material, Finish, CARB compliant, Inlet diameter (mm), Weight (kg); Helmet: Shell type, Size, Certification, Shell material, Pinlock included, Weight (g).
- **Seed content used verbatim in mockups:** AGV K6 S · AGV-K6S-MB · $549.00; Shoei RF-1400 · SHO-RF14-BK; HJC RPHA 12 Carbon · HJC-R12C; Arai Corsair-X · ARA-CSX-WH; Bell SRT Modular · BEL-SRTM-BK; Akrapovič Slip-On Line Titanium · AKR-S-Y10SO · $899.00 (51 mm, 2.4 kg, CARB no).
- **Design deviation (deliberate):** Weight is marked filterable as a numeric range in the mockups to demonstrate range filters, and the four stock states are text badges per the design plan.
