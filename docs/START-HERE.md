# Start here

You are building **Fullthrottle.com** — a US-market motorcycle parts and gear store with a public storefront and a separate admin back office.

## The document set

| File | What it is | Authority |
|---|---|---|
| `engineering-brief.md` | Architecture, data model, business rules, security, phased build order | Wins on anything functional |
| `design-output.md` | Design tokens, components and layout from Claude Design | Wins on anything visual |
| `prototype-reference.jsx` | A working React prototype | Reference for behaviour, field names, states and flows |

**The prototype's visual styling is a placeholder.** Take its data model, field names, screen inventory, stock states, order status machine, validation messages and empty states. Discard its colours, typography, spacing and layout entirely.

If `design-output.md` is not present yet, say so and stop rather than inventing a visual direction — the design is produced separately and dropping in your own would be thrown away.

## First task

Read all three files, then complete **Phase 1 only** as defined in section 13 of the engineering brief.

Before writing any code, reply with:

- the file tree you intend to create,
- the final Prisma schema after any corrections you would make, with reasons,
- the token mapping from the design output into `globals.css`,
- anything in the engineering brief you believe is wrong, missing or underspecified.

Do not start Phase 2 until Phase 1 runs.

## One standing rule

Section 12 of the engineering brief lists thirteen guardrails. If a task appears to require breaking one of them, stop and ask rather than working around it.
