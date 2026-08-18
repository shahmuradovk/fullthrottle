import { PrismaClient, AttributeType } from "@prisma/client";

const prisma = new PrismaClient();

// Seed content reproduces the functional prototype verbatim:
// 2 sections, 9 brands, 12 attributes, 9 products.

const PROP65_EXHAUST =
  "WARNING: This product can expose you to chemicals including chromium, which is known to the State of California to cause cancer. For more information go to www.P65Warnings.ca.gov.";

async function main() {
  // Idempotent: wipe catalog tables, then re-create.
  await prisma.cartItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.attribute.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.section.deleteMany();

  const exhaust = await prisma.section.create({
    data: {
      name: "Moto Exhaust",
      slug: "moto-exhaust",
      tagline: "Slip-ons, full systems and headers",
      position: 0,
    },
  });
  const helmets = await prisma.section.create({
    data: {
      name: "Moto Helmets",
      slug: "moto-helmets",
      tagline: "DOT, ECE and SNELL certified lids",
      position: 1,
    },
  });

  const brandRows: { sectionId: string; name: string; slug: string }[] = [
    { sectionId: exhaust.id, name: "Akrapovič", slug: "akrapovic" },
    { sectionId: exhaust.id, name: "Yoshimura", slug: "yoshimura" },
    { sectionId: exhaust.id, name: "Vance & Hines", slug: "vance-hines" },
    { sectionId: exhaust.id, name: "SC-Project", slug: "sc-project" },
    { sectionId: helmets.id, name: "AGV", slug: "agv" },
    { sectionId: helmets.id, name: "Shoei", slug: "shoei" },
    { sectionId: helmets.id, name: "HJC", slug: "hjc" },
    { sectionId: helmets.id, name: "Arai", slug: "arai" },
    { sectionId: helmets.id, name: "Bell", slug: "bell" },
  ];
  const brands: Record<string, string> = {};
  for (const row of brandRows) {
    const b = await prisma.brand.create({ data: row });
    brands[row.slug] = b.id;
  }

  // Attribute keys are slugified names — stable, never mutated after create.
  // Weight is filterable in both sections: the design output deliberately marks
  // it filterable to exercise the numeric range filter (plan Part 7).
  const attributeRows: {
    sectionId: string;
    key: string;
    name: string;
    type: AttributeType;
    options?: string[];
    unit?: string;
    filterable: boolean;
    position: number;
  }[] = [
    { sectionId: exhaust.id, key: "system-type", name: "System type", type: "SELECT", options: ["Slip-on", "Full system", "Header"], filterable: true, position: 0 },
    { sectionId: exhaust.id, key: "material", name: "Material", type: "SELECT", options: ["Titanium", "Stainless steel", "Carbon fiber"], filterable: true, position: 1 },
    { sectionId: exhaust.id, key: "finish", name: "Finish", type: "SELECT", options: ["Black", "Brushed titanium", "Carbon", "Polished"], filterable: true, position: 2 },
    { sectionId: exhaust.id, key: "carb-compliant", name: "CARB compliant", type: "BOOLEAN", filterable: true, position: 3 },
    { sectionId: exhaust.id, key: "inlet-diameter", name: "Inlet diameter", type: "NUMBER", unit: "mm", filterable: false, position: 4 },
    { sectionId: exhaust.id, key: "weight", name: "Weight", type: "NUMBER", unit: "kg", filterable: true, position: 5 },
    { sectionId: helmets.id, key: "shell-type", name: "Shell type", type: "SELECT", options: ["Full face", "Modular", "Open face", "Off-road"], filterable: true, position: 0 },
    { sectionId: helmets.id, key: "size", name: "Size", type: "MULTISELECT", options: ["XS", "S", "M", "L", "XL", "2XL"], filterable: true, position: 1 },
    { sectionId: helmets.id, key: "certification", name: "Certification", type: "MULTISELECT", options: ["DOT", "ECE 22.06", "SNELL M2020"], filterable: true, position: 2 },
    { sectionId: helmets.id, key: "shell-material", name: "Shell material", type: "SELECT", options: ["Carbon fiber", "Fiberglass composite", "Polycarbonate"], filterable: true, position: 3 },
    { sectionId: helmets.id, key: "pinlock-included", name: "Pinlock included", type: "BOOLEAN", filterable: true, position: 4 },
    { sectionId: helmets.id, key: "weight", name: "Weight", type: "NUMBER", unit: "g", filterable: true, position: 5 },
  ];
  for (const row of attributeRows) {
    await prisma.attribute.create({ data: row });
  }

  const products = [
    {
      sectionId: exhaust.id,
      brandId: brands["akrapovic"],
      name: "Slip-On Line Titanium",
      slug: "akrapovic-slip-on-line-titanium",
      sku: "AKR-S-Y10SO",
      priceCents: 89900,
      stock: 6,
      description:
        "Titanium outer sleeve with a carbon end cap. Bolts to the stock header, keeps the OEM catalytic converter, and drops roughly 40% of the factory silencer weight. Sound is deeper without being obnoxious at cruising rpm.",
      values: { "system-type": "Slip-on", material: "Titanium", finish: "Brushed titanium", "carb-compliant": false, "inlet-diameter": 51, weight: 2.4 },
      prop65Warning: PROP65_EXHAUST,
      caLegal: false, // no CARB exemption
    },
    {
      sectionId: exhaust.id,
      brandId: brands["yoshimura"],
      name: "Alpha T Street Slip-On",
      slug: "yoshimura-alpha-t-street-slip-on",
      sku: "YOS-14120",
      priceCents: 54900,
      stock: 12,
      description:
        "Street-legal slip-on with a stainless sleeve and a removable baffle. Comes with the CARB executive order sticker in the box, so it stays legal in California.",
      values: { "system-type": "Slip-on", material: "Stainless steel", finish: "Black", "carb-compliant": true, "inlet-diameter": 45, weight: 3.1 },
      prop65Warning: PROP65_EXHAUST,
      carbEoNumber: "D-732-14",
    },
    {
      sectionId: exhaust.id,
      brandId: brands["vance-hines"],
      name: "Hi-Output Grenade Full System",
      slug: "vance-hines-hi-output-grenade-full-system",
      sku: "VH-27625",
      priceCents: 74900,
      stock: 0,
      description:
        "Complete header-back system in brushed stainless. Includes the heat shields, mounting hardware and a new O2 sensor bung. Expect to remap after fitting.",
      values: { "system-type": "Full system", material: "Stainless steel", finish: "Black", "carb-compliant": true, "inlet-diameter": 44, weight: 5.8 },
      prop65Warning: PROP65_EXHAUST,
      carbEoNumber: "D-201-88",
    },
    {
      sectionId: exhaust.id,
      brandId: brands["sc-project"],
      name: "S1-GP Carbon Slip-On",
      slug: "sc-project-s1-gp-carbon-slip-on",
      sku: "SCP-S1GP-04",
      priceCents: 109900,
      stock: 3,
      description:
        "Race-derived carbon canister with a titanium link pipe. The lightest option we stock at under two kilos. Track use — no CARB exemption.",
      values: { "system-type": "Slip-on", material: "Carbon fiber", finish: "Carbon", "carb-compliant": false, "inlet-diameter": 54, weight: 1.9 },
      prop65Warning: PROP65_EXHAUST,
      caLegal: false, // track use only — no CARB exemption
    },
    {
      sectionId: helmets.id,
      brandId: brands["agv"],
      name: "K6 S",
      slug: "agv-k6-s",
      sku: "AGV-K6S-MB",
      priceCents: 54900,
      stock: 9,
      description:
        "Aramid and fiberglass shell in four sizes, so a small head gets a small shell. Five intakes and six extractors keep it usable in summer traffic. Pinlock 120 lens included.",
      values: { "shell-type": "Full face", size: ["S", "M", "L", "XL"], certification: ["DOT", "ECE 22.06"], "shell-material": "Fiberglass composite", "pinlock-included": true, weight: 1270 },
    },
    {
      sectionId: helmets.id,
      brandId: brands["shoei"],
      name: "RF-1400",
      slug: "shoei-rf-1400",
      sku: "SHO-RF14-BK",
      priceCents: 57900,
      stock: 4,
      description:
        "Quiet, dense and very well finished. The shell is narrower than the outgoing RF-1200 and the shield seals against a thicker window beading, which is where most of the noise reduction comes from.",
      values: { "shell-type": "Full face", size: ["M", "L", "XL", "2XL"], certification: ["DOT", "SNELL M2020"], "shell-material": "Fiberglass composite", "pinlock-included": true, weight: 1450 },
    },
    {
      sectionId: helmets.id,
      brandId: brands["hjc"],
      name: "RPHA 12 Carbon",
      slug: "hjc-rpha-12-carbon",
      sku: "HJC-R12C",
      priceCents: 49900,
      stock: 15,
      description:
        "Carbon shell at a price that undercuts most composite lids. Emergency cheek pad pull tabs, washable liner, and a shield mechanism that swaps without tools.",
      values: { "shell-type": "Full face", size: ["XS", "S", "M", "L"], certification: ["DOT", "ECE 22.06"], "shell-material": "Carbon fiber", "pinlock-included": true, weight: 1400 },
    },
    {
      sectionId: helmets.id,
      brandId: brands["arai"],
      name: "Corsair-X",
      slug: "arai-corsair-x",
      sku: "ARA-CSX-WH",
      priceCents: 99900,
      stock: 2,
      description:
        "Round shell, hand-laid, and the reference for glancing-blow performance. Heavier than the carbon options here, and the shield change takes practice. Worth it if the shape fits you.",
      values: { "shell-type": "Full face", size: ["M", "L", "XL"], certification: ["DOT", "SNELL M2020"], "shell-material": "Fiberglass composite", "pinlock-included": false, weight: 1560 },
    },
    {
      sectionId: helmets.id,
      brandId: brands["bell"],
      name: "SRT Modular",
      slug: "bell-srt-modular",
      sku: "BEL-SRTM-BK",
      priceCents: 39900,
      stock: 0,
      description:
        "Flip-front lid with an internal sun shade. Polycarbonate shell keeps the price down at the cost of weight — noticeable on a long day.",
      values: { "shell-type": "Modular", size: ["S", "M", "L", "XL", "2XL"], certification: ["DOT", "ECE 22.06"], "shell-material": "Polycarbonate", "pinlock-included": true, weight: 1700 },
    },
  ];
  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  const sections = await prisma.section.count();
  const brandCount = await prisma.brand.count();
  const attributes = await prisma.attribute.count();
  const productCount = await prisma.product.count();
  console.log(
    `Seeded ${sections} sections, ${brandCount} brands, ${attributes} attributes, ${productCount} products.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
