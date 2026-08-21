import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { writeAudit } from "@/lib/audit";
import { canChangePrices } from "@/lib/admin/guard";
import type { AdminSession } from "@/lib/admin/session";
import { transitionOrder, OrderTransitionError } from "@/lib/orders";
import { fetchImage, storeProductImage } from "@/lib/product-images";
import { addNote, MAX_NOTE_LENGTH } from "./notes";
import type { ORToolDef } from "./openrouter";
import { AttributeType, OrderStatus, type Prisma } from "@prisma/client";

// Every tool runs under the asking admin's identity: the same role rules as
// the admin UI (CONTENT cannot touch prices, ORDERS is fenced to fulfillment)
// and every mutation writes an AuditLog row with the admin as the actor.

const ORDER_ROLES = ["OWNER", "MANAGER", "ORDERS"];
const CATALOG_ROLES = ["OWNER", "MANAGER", "CONTENT"];

class ToolError extends Error {}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

export const TOOL_DEFS: ORToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_store_overview",
      description:
        "Full catalog structure: every section with its slug, brands, attribute template (key, name, type, options, unit, filterable) and product count. Call this first to ground yourself.",
      parameters: obj({}),
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description: "List products (sku, name, brand, price, stock, active), optionally for one section.",
      parameters: obj({
        section_slug: { type: "string", description: "Optional section slug filter" },
      }),
    },
  },
  {
    type: "function",
    function: {
      name: "get_product",
      description: "Full detail of one product by SKU, including its attribute values.",
      parameters: obj({ sku: { type: "string" } }, ["sku"]),
    },
  },
  {
    type: "function",
    function: {
      name: "create_section",
      description: "Create a new catalog section. It needs at least one attribute before products can be added.",
      parameters: obj(
        { name: { type: "string" }, tagline: { type: "string" } },
        ["name"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "add_brand",
      description: "Add a brand to a section.",
      parameters: obj(
        { section_slug: { type: "string" }, name: { type: "string" } },
        ["section_slug", "name"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "create_attribute",
      description:
        "Add an attribute to a section's template. It automatically becomes a storefront filter (if filterable), a spec row and a product-form field.",
      parameters: obj(
        {
          section_slug: { type: "string" },
          name: { type: "string" },
          type: { type: "string", enum: ["SELECT", "MULTISELECT", "NUMBER", "TEXT", "BOOLEAN"] },
          options: { type: "array", items: { type: "string" }, description: "Required for SELECT/MULTISELECT" },
          unit: { type: "string", description: "For NUMBER attributes, e.g. g, mm, kg" },
          filterable: { type: "boolean" },
        },
        ["section_slug", "name", "type"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description:
        "Create a product. values must be keyed by the section's attribute KEYS (see get_store_overview) with types matching each attribute (MULTISELECT = array of strings, BOOLEAN = true/false, NUMBER = number). Prices are in USD dollars.",
      parameters: obj(
        {
          section_slug: { type: "string" },
          brand_name: { type: "string" },
          name: { type: "string" },
          sku: { type: "string" },
          price_usd: { type: "number" },
          stock: { type: "integer" },
          description: { type: "string" },
          values: { type: "object", additionalProperties: true },
          publish: { type: "boolean", description: "true = live on the storefront, false = draft" },
          prop65_warning: { type: "string" },
          carb_eo_number: { type: "string" },
          ca_legal: { type: "boolean", description: "false blocks shipping to California" },
        },
        ["section_slug", "brand_name", "name", "sku", "price_usd", "stock"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description: "Update fields of an existing product by SKU. Only provided fields change. values merges by attribute key; set a key to null to clear it.",
      parameters: obj(
        {
          sku: { type: "string" },
          name: { type: "string" },
          price_usd: { type: "number" },
          stock: { type: "integer" },
          description: { type: "string" },
          values: { type: "object", additionalProperties: true },
          publish: { type: "boolean" },
        },
        ["sku"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "set_product_image",
      description:
        "Attach a product's real photo (shown on cards and the product page). image_url must be a direct https link to an actual photograph of this exact product — the manufacturer's product/press photo or a major retailer's image CDN — matching the model and colorway. JPEG/PNG/WebP/AVIF, 4MB max. The server downloads and verifies it before storing; if the download fails you get the reason back — try a different image URL.",
      parameters: obj(
        {
          sku: { type: "string" },
          image_url: { type: "string", description: "Direct https image URL (not a product-page URL)" },
          alt: { type: "string", description: "Optional alt text; defaults to brand + product name" },
        },
        ["sku", "image_url"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "save_note",
      description:
        "Record ONE terse, durable lesson about THIS store in the shared notebook. The notebook is injected into every future session — including under a different model — so use it for store conventions, admin preferences, and fixes for mistakes you made. Never for one-off facts or things the notebook already says.",
      parameters: obj({ note: { type: "string", description: "One line, max 300 chars" } }, ["note"]),
    },
  },
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "Recent orders with number, customer, status and total.",
      parameters: obj({
        status: {
          type: "string",
          enum: ["PENDING_PAYMENT", "PAID", "PREPARING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"],
        },
      }),
    },
  },
  {
    type: "function",
    function: {
      name: "advance_order",
      description:
        "Move an order one step forward (PAID→PREPARING→PACKED→SHIPPED→DELIVERED; CANCELLED before packing). SHIPPED requires carrier (UPS/FedEx/USPS) and tracking_number. Emails the customer.",
      parameters: obj(
        {
          number: { type: "string", description: "Order number like FT-10001" },
          next: { type: "string", enum: ["PREPARING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] },
          carrier: { type: "string" },
          tracking_number: { type: "string" },
        },
        ["number", "next"]
      ),
    },
  },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function requireRole(session: AdminSession, roles: string[], what: string): void {
  if (!roles.includes(session.role)) {
    throw new ToolError(`Your ${session.role} role can't ${what}.`);
  }
}

async function findSection(slug: string) {
  const section = await prisma.section.findUnique({
    where: { slug },
    include: { attributes: true, brands: true },
  });
  if (!section) {
    throw new ToolError(`No section with slug "${slug}". Call get_store_overview for the real slugs.`);
  }
  return section;
}

async function findProduct(sku: string) {
  const product = await prisma.product.findUnique({
    where: { sku },
    include: { section: { include: { attributes: true } }, brand: true },
  });
  if (!product) throw new ToolError(`No product with SKU "${sku}".`);
  return product;
}

// Coerce and validate assistant-supplied values against the section template.
function normalizeValues(
  raw: Record<string, unknown>,
  attributes: { key: string; name: string; type: AttributeType; options: string[] }[],
  base: Record<string, unknown> = {}
): Record<string, unknown> {
  const byKey = Object.fromEntries(attributes.map((a) => [a.key, a]));
  const values: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(raw)) {
    const def = byKey[key];
    if (!def) {
      throw new ToolError(
        `"${key}" is not an attribute of this section. Valid keys: ${attributes.map((a) => a.key).join(", ")}.`
      );
    }
    if (value === null) {
      delete values[key];
      continue;
    }
    switch (def.type) {
      case "MULTISELECT": {
        const arr = Array.isArray(value) ? value.map(String) : [String(value)];
        const bad = arr.filter((v) => !def.options.includes(v));
        if (bad.length) {
          throw new ToolError(`${def.name}: ${bad.join(", ")} not in options [${def.options.join(", ")}].`);
        }
        values[key] = arr;
        break;
      }
      case "SELECT": {
        const v = String(value);
        if (!def.options.includes(v)) {
          throw new ToolError(`${def.name}: "${v}" not in options [${def.options.join(", ")}].`);
        }
        values[key] = v;
        break;
      }
      case "NUMBER": {
        const n = Number(value);
        if (!Number.isFinite(n)) throw new ToolError(`${def.name} must be a number.`);
        values[key] = n;
        break;
      }
      case "BOOLEAN":
        values[key] = value === true || value === "true";
        break;
      default:
        values[key] = String(value);
    }
  }
  return values;
}

function purgeCatalog(): void {
  try {
    revalidatePath("/", "layout");
  } catch {
    // Outside a Next.js request context (scripts, tests) there is no cache
    // to purge — the mutation itself already happened.
  }
}

// ── executor ─────────────────────────────────────────────────────────────────

export async function executeTool(
  session: AdminSession,
  name: string,
  args: Record<string, unknown>
): Promise<{ result: string; summary: string }> {
  try {
    switch (name) {
      case "get_store_overview": {
        const sections = await prisma.section.findMany({
          orderBy: { position: "asc" },
          include: {
            brands: { orderBy: { name: "asc" } },
            attributes: { orderBy: { position: "asc" } },
            _count: { select: { products: true } },
          },
        });
        return {
          summary: "read store overview",
          result: JSON.stringify(
            sections.map((s) => ({
              slug: s.slug,
              name: s.name,
              tagline: s.tagline,
              products: s._count.products,
              brands: s.brands.map((b) => b.name),
              attributes: s.attributes.map((a) => ({
                key: a.key,
                name: a.name,
                type: a.type,
                options: a.options,
                unit: a.unit,
                filterable: a.filterable,
              })),
            }))
          ),
        };
      }

      case "list_products": {
        const where: Prisma.ProductWhereInput = {};
        if (typeof args.section_slug === "string") {
          where.sectionId = (await findSection(args.section_slug)).id;
        }
        const products = await prisma.product.findMany({
          where,
          include: { brand: true, section: true },
          orderBy: { name: "asc" },
          take: 100,
        });
        return {
          summary: `listed ${products.length} products`,
          result: JSON.stringify(
            products.map((p) => ({
              sku: p.sku,
              name: `${p.brand.name} ${p.name}`,
              section: p.section.slug,
              price_usd: p.priceCents / 100,
              stock: p.stock,
              active: p.active,
            }))
          ),
        };
      }

      case "get_product": {
        const p = await findProduct(String(args.sku));
        return {
          summary: `read ${p.sku}`,
          result: JSON.stringify({
            sku: p.sku,
            brand: p.brand.name,
            name: p.name,
            section: p.section.slug,
            slug: p.slug,
            price_usd: p.priceCents / 100,
            stock: p.stock,
            active: p.active,
            description: p.description,
            values: p.values,
            prop65_warning: p.prop65Warning,
            carb_eo_number: p.carbEoNumber,
            ca_legal: p.caLegal,
          }),
        };
      }

      case "create_section": {
        requireRole(session, CATALOG_ROLES, "edit the catalog");
        const sectionName = String(args.name).trim();
        const slug = slugify(sectionName);
        if (!slug) throw new ToolError("Section name is empty.");
        if (await prisma.section.findUnique({ where: { slug } })) {
          throw new ToolError(`Section "${slug}" already exists.`);
        }
        const section = await prisma.section.create({
          data: {
            name: sectionName,
            slug,
            tagline: typeof args.tagline === "string" ? args.tagline : null,
            position: (await prisma.section.count()) + 1,
          },
        });
        await writeAudit({
          actorId: session.adminId,
          action: "assistant.section.create",
          entity: "Section",
          entityId: section.id,
          after: section,
        });
        purgeCatalog();
        return {
          summary: `created section ${section.name}`,
          result: JSON.stringify({ ok: true, slug: section.slug, note: "Add at least one attribute before products." }),
        };
      }

      case "add_brand": {
        requireRole(session, CATALOG_ROLES, "edit the catalog");
        const section = await findSection(String(args.section_slug));
        const brandName = String(args.name).trim();
        const slug = slugify(brandName);
        if (!slug) throw new ToolError("Brand name is empty.");
        const existing = section.brands.find((b) => b.slug === slug);
        if (existing) return { summary: `brand ${brandName} already exists`, result: JSON.stringify({ ok: true, existing: true }) };
        const brand = await prisma.brand.create({
          data: { sectionId: section.id, name: brandName, slug },
        });
        await writeAudit({
          actorId: session.adminId,
          action: "assistant.brand.create",
          entity: "Brand",
          entityId: brand.id,
          after: brand,
        });
        purgeCatalog();
        return { summary: `added brand ${brand.name}`, result: JSON.stringify({ ok: true }) };
      }

      case "create_attribute": {
        requireRole(session, CATALOG_ROLES, "edit the catalog");
        const section = await findSection(String(args.section_slug));
        const attrName = String(args.name).trim();
        const key = slugify(attrName);
        const type = String(args.type) as AttributeType;
        if (!Object.values(AttributeType).includes(type)) throw new ToolError(`Unknown attribute type "${type}".`);
        if (section.attributes.some((a) => a.key === key)) {
          throw new ToolError(`Attribute key "${key}" already exists in ${section.name}.`);
        }
        const options = Array.isArray(args.options) ? args.options.map(String) : [];
        if ((type === "SELECT" || type === "MULTISELECT") && options.length === 0) {
          throw new ToolError("SELECT/MULTISELECT attributes need options.");
        }
        const attribute = await prisma.attribute.create({
          data: {
            sectionId: section.id,
            key,
            name: attrName,
            type,
            options,
            unit: typeof args.unit === "string" && args.unit ? args.unit : null,
            filterable: args.filterable !== false,
            position: section.attributes.length,
          },
        });
        await writeAudit({
          actorId: session.adminId,
          action: "assistant.attribute.create",
          entity: "Attribute",
          entityId: attribute.id,
          after: attribute,
        });
        purgeCatalog();
        return { summary: `added attribute ${attrName}`, result: JSON.stringify({ ok: true, key }) };
      }

      case "create_product": {
        requireRole(session, CATALOG_ROLES, "edit the catalog");
        const section = await findSection(String(args.section_slug));
        if (section.attributes.length === 0) {
          throw new ToolError(`${section.name} has no attribute template yet — create attributes first.`);
        }
        const brand = section.brands.find(
          (b) => b.name.toLowerCase() === String(args.brand_name).toLowerCase()
        );
        if (!brand) {
          throw new ToolError(
            `Brand "${args.brand_name}" is not in ${section.name}. Existing: ${section.brands.map((b) => b.name).join(", ") || "none"}. Add it with add_brand first.`
          );
        }
        const sku = String(args.sku).trim();
        if (await prisma.product.findUnique({ where: { sku } })) {
          throw new ToolError(`SKU ${sku} already exists.`);
        }
        const priceUsd = Number(args.price_usd);
        if (!Number.isFinite(priceUsd) || priceUsd < 0) throw new ToolError("price_usd must be ≥ 0.");
        if (priceUsd > 0 && !canChangePrices(session)) {
          throw new ToolError("Your CONTENT role can't set prices — the product can be created at $0 as a draft for a manager to price.");
        }
        const values = normalizeValues(
          (args.values as Record<string, unknown>) ?? {},
          section.attributes
        );
        const productName = String(args.name).trim();
        const product = await prisma.product.create({
          data: {
            sectionId: section.id,
            brandId: brand.id,
            name: productName,
            slug: slugify(`${brand.slug} ${productName}`),
            sku,
            priceCents: Math.round(priceUsd * 100),
            stock: Math.max(0, Math.trunc(Number(args.stock) || 0)),
            description: typeof args.description === "string" ? args.description : null,
            active: args.publish !== false,
            values: values as Prisma.InputJsonValue,
            prop65Warning: typeof args.prop65_warning === "string" && args.prop65_warning ? args.prop65_warning : null,
            carbEoNumber: typeof args.carb_eo_number === "string" && args.carb_eo_number ? args.carb_eo_number : null,
            caLegal: args.ca_legal !== false,
          },
        });
        await writeAudit({
          actorId: session.adminId,
          action: "assistant.product.create",
          entity: "Product",
          entityId: product.id,
          after: product,
        });
        purgeCatalog();
        return {
          summary: `created product ${brand.name} ${product.name} (${product.sku})`,
          result: JSON.stringify({ ok: true, sku: product.sku, slug: product.slug, live: product.active }),
        };
      }

      case "update_product": {
        requireRole(session, CATALOG_ROLES, "edit the catalog");
        const product = await findProduct(String(args.sku));
        const data: Prisma.ProductUpdateInput = {};
        if (typeof args.name === "string" && args.name.trim()) data.name = args.name.trim();
        if (args.price_usd !== undefined) {
          if (!canChangePrices(session)) throw new ToolError("Your CONTENT role can't change prices.");
          const priceUsd = Number(args.price_usd);
          if (!Number.isFinite(priceUsd) || priceUsd < 0) throw new ToolError("price_usd must be ≥ 0.");
          data.priceCents = Math.round(priceUsd * 100);
        }
        if (args.stock !== undefined) data.stock = Math.max(0, Math.trunc(Number(args.stock) || 0));
        if (typeof args.description === "string") data.description = args.description;
        if (args.publish !== undefined) data.active = args.publish === true;
        if (args.values && typeof args.values === "object") {
          data.values = normalizeValues(
            args.values as Record<string, unknown>,
            product.section.attributes,
            (product.values ?? {}) as Record<string, unknown>
          ) as Prisma.InputJsonValue;
        }
        const after = await prisma.product.update({ where: { id: product.id }, data });
        await writeAudit({
          actorId: session.adminId,
          action: "assistant.product.update",
          entity: "Product",
          entityId: product.id,
          before: product,
          after,
        });
        purgeCatalog();
        return { summary: `updated ${product.sku}`, result: JSON.stringify({ ok: true }) };
      }

      case "set_product_image": {
        requireRole(session, CATALOG_ROLES, "edit the catalog");
        const product = await findProduct(String(args.sku));
        const sourceUrl = String(args.image_url ?? "").trim();
        const fetched = await fetchImage(sourceUrl);
        if (!fetched.ok) throw new ToolError(fetched.error);
        const image = await storeProductImage({
          productId: product.id,
          bytes: fetched.bytes,
          contentType: fetched.contentType,
          alt:
            typeof args.alt === "string" && args.alt.trim()
              ? args.alt.trim()
              : `${product.brand.name} ${product.name}`,
          sourceUrl,
        });
        await writeAudit({
          actorId: session.adminId,
          action: "assistant.product.image",
          entity: "ProductImage",
          entityId: image.id,
          after: {
            productId: product.id,
            sourceUrl,
            contentType: fetched.contentType,
            bytes: fetched.bytes.length,
          },
        });
        purgeCatalog();
        return {
          summary: `set photo for ${product.sku} (${Math.round(fetched.bytes.length / 1024)} KB ${fetched.contentType})`,
          result: JSON.stringify({ ok: true, image_url: image.url }),
        };
      }

      case "save_note": {
        const note = String(args.note ?? "").trim();
        if (!note) throw new ToolError("The note is empty.");
        if (note.length > MAX_NOTE_LENGTH) {
          throw new ToolError(`Keep notes under ${MAX_NOTE_LENGTH} characters — distill the lesson.`);
        }
        const { added, count } = await addNote(note);
        if (added) {
          await writeAudit({
            actorId: session.adminId,
            action: "assistant.note.save",
            entity: "Setting",
            entityId: "assistant.notes",
            after: { note },
          });
        }
        return {
          summary: added ? "saved a lesson to the store notebook" : "notebook already had that lesson",
          result: JSON.stringify({ ok: true, added, notebook_size: count }),
        };
      }

      case "list_orders": {
        requireRole(session, ORDER_ROLES.concat("CONTENT"), "read orders");
        const where: Prisma.OrderWhereInput = {};
        if (typeof args.status === "string") where.status = args.status as OrderStatus;
        const orders = await prisma.order.findMany({
          where,
          include: { user: true, items: true },
          orderBy: { createdAt: "desc" },
          take: 25,
        });
        return {
          summary: `listed ${orders.length} orders`,
          result: JSON.stringify(
            orders.map((o) => ({
              number: o.number,
              status: o.status,
              customer: o.user.name,
              items: o.items.map((i) => `${i.brandName} ${i.name} ×${i.qty}`),
              total_usd: o.totalCents / 100,
              tracking: o.trackingNumber ? `${o.carrier} ${o.trackingNumber}` : null,
            }))
          ),
        };
      }

      case "advance_order": {
        requireRole(session, ORDER_ROLES, "manage orders");
        const order = await prisma.order.findUnique({
          where: { number: String(args.number) },
        });
        if (!order) throw new ToolError(`No order ${args.number}.`);
        try {
          await transitionOrder({
            orderId: order.id,
            next: String(args.next) as OrderStatus,
            actorId: session.adminId,
            carrier: typeof args.carrier === "string" ? args.carrier : undefined,
            trackingNumber:
              typeof args.tracking_number === "string" ? args.tracking_number : undefined,
          });
        } catch (e) {
          if (e instanceof OrderTransitionError) throw new ToolError(e.message);
          throw e;
        }
        await writeAudit({
          actorId: session.adminId,
          action: "assistant.order.transition",
          entity: "Order",
          entityId: order.id,
          before: { status: order.status },
          after: { status: args.next },
        });
        return {
          summary: `moved ${order.number} to ${args.next}`,
          result: JSON.stringify({ ok: true }),
        };
      }

      default:
        throw new ToolError(`Unknown tool "${name}".`);
    }
  } catch (e) {
    if (e instanceof ToolError) {
      return { summary: `✗ ${name}: ${e.message}`, result: JSON.stringify({ error: e.message }) };
    }
    throw e;
  }
}
