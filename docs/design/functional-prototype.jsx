import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Trash2, Package, Layers, SlidersHorizontal, Truck, Store, Settings, X, RotateCcw, Check,
  ShoppingCart, User, ChevronLeft, ClipboardList, CreditCard, Lock, Minus, Search, Home, Pencil
} from "lucide-react";

/* ================= tokens ================= */
const T = {
  steel: "#E6E8EB", card: "#FFFFFF", ink: "#101215", ink2: "#2B3038",
  muted: "#6E7681", line: "#D3D7DD", lineSoft: "#E7EAEE", signal: "#FFCC00",
  ok: "#0F7B4F", okBg: "#E4F3EC", warn: "#B45309", warnBg: "#FBF0DF", danger: "#B02A2A",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
.ft-display { font-family: 'Archivo', system-ui, sans-serif; letter-spacing: -0.01em; }
.ft-body { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
.ft-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.ft-focus:focus-visible { outline: 2px solid #101215; outline-offset: 2px; }
.ft-row:hover { background: #F4F6F8; }
.ft-btn { transition: background 120ms ease, border-color 120ms ease; }
.ft-tile:hover { border-color: #101215; }
input, select, textarea { font-family: inherit; }
`;

const uid = () => Math.random().toString(36).slice(2, 9);
const money = (n) => `$${n.toFixed(2)}`;
const STATES = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
const STATUSES = ["Paid", "Preparing", "Packed", "Shipped", "Delivered"];
const CARRIERS = ["UPS", "FedEx", "USPS"];

/* ================= seed ================= */
const seed = () => {
  const exh = "sec_exhaust", hel = "sec_helmet";
  return {
    sections: [
      { id: exh, name: "Moto Exhaust", slug: "moto-exhaust", tagline: "Slip-ons, full systems and headers" },
      { id: hel, name: "Moto Helmets", slug: "moto-helmets", tagline: "DOT, ECE and SNELL certified lids" },
    ],
    brands: [
      { id: "b1", sectionId: exh, name: "Akrapovič" }, { id: "b2", sectionId: exh, name: "Yoshimura" },
      { id: "b3", sectionId: exh, name: "Vance & Hines" }, { id: "b4", sectionId: exh, name: "SC-Project" },
      { id: "b5", sectionId: hel, name: "AGV" }, { id: "b6", sectionId: hel, name: "Shoei" },
      { id: "b7", sectionId: hel, name: "HJC" }, { id: "b8", sectionId: hel, name: "Arai" },
      { id: "b9", sectionId: hel, name: "Bell" },
    ],
    attributes: [
      { id: "a1", sectionId: exh, name: "System type", type: "select", options: ["Slip-on", "Full system", "Header"], unit: "", filterable: true },
      { id: "a2", sectionId: exh, name: "Material", type: "select", options: ["Titanium", "Stainless steel", "Carbon fiber"], unit: "", filterable: true },
      { id: "a3", sectionId: exh, name: "Finish", type: "select", options: ["Black", "Brushed titanium", "Carbon", "Polished"], unit: "", filterable: true },
      { id: "a4", sectionId: exh, name: "CARB compliant", type: "boolean", options: [], unit: "", filterable: true },
      { id: "a5", sectionId: exh, name: "Inlet diameter", type: "number", options: [], unit: "mm", filterable: false },
      { id: "a6", sectionId: exh, name: "Weight", type: "number", options: [], unit: "kg", filterable: false },
      { id: "a7", sectionId: hel, name: "Shell type", type: "select", options: ["Full face", "Modular", "Open face", "Off-road"], unit: "", filterable: true },
      { id: "a8", sectionId: hel, name: "Size", type: "multiselect", options: ["XS", "S", "M", "L", "XL", "2XL"], unit: "", filterable: true },
      { id: "a9", sectionId: hel, name: "Certification", type: "multiselect", options: ["DOT", "ECE 22.06", "SNELL M2020"], unit: "", filterable: true },
      { id: "a10", sectionId: hel, name: "Shell material", type: "select", options: ["Carbon fiber", "Fiberglass composite", "Polycarbonate"], unit: "", filterable: true },
      { id: "a11", sectionId: hel, name: "Pinlock included", type: "boolean", options: [], unit: "", filterable: true },
      { id: "a12", sectionId: hel, name: "Weight", type: "number", options: [], unit: "g", filterable: false },
    ],
    products: [
      { id: "p1", sectionId: exh, brandId: "b1", name: "Slip-On Line Titanium", sku: "AKR-S-Y10SO", price: 899, stock: 6, supplySource: "manual", supplierSku: "", description: "Titanium outer sleeve with a carbon end cap. Bolts to the stock header, keeps the OEM catalytic converter, and drops roughly 40% of the factory silencer weight. Sound is deeper without being obnoxious at cruising rpm.", values: { a1: "Slip-on", a2: "Titanium", a3: "Brushed titanium", a4: false, a5: 51, a6: 2.4 } },
      { id: "p2", sectionId: exh, brandId: "b2", name: "Alpha T Street Slip-On", sku: "YOS-14120", price: 549, stock: 12, supplySource: "manual", supplierSku: "", description: "Street-legal slip-on with a stainless sleeve and a removable baffle. Comes with the CARB executive order sticker in the box, so it stays legal in California.", values: { a1: "Slip-on", a2: "Stainless steel", a3: "Black", a4: true, a5: 45, a6: 3.1 } },
      { id: "p3", sectionId: exh, brandId: "b3", name: "Hi-Output Grenade Full System", sku: "VH-27625", price: 749, stock: 0, supplySource: "manual", supplierSku: "", description: "Complete header-back system in brushed stainless. Includes the heat shields, mounting hardware and a new O2 sensor bung. Expect to remap after fitting.", values: { a1: "Full system", a2: "Stainless steel", a3: "Black", a4: true, a5: 44, a6: 5.8 } },
      { id: "p4", sectionId: exh, brandId: "b4", name: "S1-GP Carbon Slip-On", sku: "SCP-S1GP-04", price: 1099, stock: 3, supplySource: "manual", supplierSku: "", description: "Race-derived carbon canister with a titanium link pipe. The lightest option we stock at under two kilos. Track use — no CARB exemption.", values: { a1: "Slip-on", a2: "Carbon fiber", a3: "Carbon", a4: false, a5: 54, a6: 1.9 } },
      { id: "p5", sectionId: hel, brandId: "b5", name: "K6 S", sku: "AGV-K6S-MB", price: 549, stock: 9, supplySource: "manual", supplierSku: "", description: "Aramid and fiberglass shell in four sizes, so a small head gets a small shell. Five intakes and six extractors keep it usable in summer traffic. Pinlock 120 lens included.", values: { a7: "Full face", a8: ["S", "M", "L", "XL"], a9: ["DOT", "ECE 22.06"], a10: "Fiberglass composite", a11: true, a12: 1270 } },
      { id: "p6", sectionId: hel, brandId: "b6", name: "RF-1400", sku: "SHO-RF14-BK", price: 579, stock: 4, supplySource: "manual", supplierSku: "", description: "Quiet, dense and very well finished. The shell is narrower than the outgoing RF-1200 and the shield seals against a thicker window beading, which is where most of the noise reduction comes from.", values: { a7: "Full face", a8: ["M", "L", "XL", "2XL"], a9: ["DOT", "SNELL M2020"], a10: "Fiberglass composite", a11: true, a12: 1450 } },
      { id: "p7", sectionId: hel, brandId: "b7", name: "RPHA 12 Carbon", sku: "HJC-R12C", price: 499, stock: 15, supplySource: "manual", supplierSku: "", description: "Carbon shell at a price that undercuts most composite lids. Emergency cheek pad pull tabs, washable liner, and a shield mechanism that swaps without tools.", values: { a7: "Full face", a8: ["XS", "S", "M", "L"], a9: ["DOT", "ECE 22.06"], a10: "Carbon fiber", a11: true, a12: 1400 } },
      { id: "p8", sectionId: hel, brandId: "b8", name: "Corsair-X", sku: "ARA-CSX-WH", price: 999, stock: 2, supplySource: "manual", supplierSku: "", description: "Round shell, hand-laid, and the reference for glancing-blow performance. Heavier than the carbon options here, and the shield change takes practice. Worth it if the shape fits you.", values: { a7: "Full face", a8: ["M", "L", "XL"], a9: ["DOT", "SNELL M2020"], a10: "Fiberglass composite", a11: false, a12: 1560 } },
      { id: "p9", sectionId: hel, brandId: "b9", name: "SRT Modular", sku: "BEL-SRTM-BK", price: 399, stock: 0, supplySource: "manual", supplierSku: "", description: "Flip-front lid with an internal sun shade. Polycarbonate shell keeps the price down at the cost of weight — noticeable on a long day.", values: { a7: "Modular", a8: ["S", "M", "L", "XL", "2XL"], a9: ["DOT", "ECE 22.06"], a10: "Polycarbonate", a11: true, a12: 1700 } },
    ],
  };
};

const blankSession = () => ({ user: null, users: [], cart: [], orders: [], counter: 10001 });
const CAT_KEY = "fullthrottle:catalog:v4";
const SES_KEY = "fullthrottle:session:v4";

const stockState = (n) =>
  n > 3 ? { label: "In stock", fg: T.ok, bg: T.okBg }
    : n > 0 ? { label: "Low stock", fg: T.warn, bg: T.warnBg }
      : { label: "Out of stock", fg: T.muted, bg: T.steel };

const totals = (items) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal === 0 || subtotal >= 99 ? 0 : 9.95;
  const tax = +(subtotal * 0.0825).toFixed(2);
  return { subtotal, shipping, tax, total: +(subtotal + shipping + tax).toFixed(2) };
};

const showValue = (a, v) => {
  if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  return a.unit ? `${v} ${a.unit}` : String(v);
};

/* ================= primitives ================= */
function Callout({ n }) {
  return <span className="ft-mono" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 11, background: T.ink, color: T.signal, fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{String(n).padStart(2, "0")}</span>;
}

function Btn({ children, onClick, variant = "ghost", small, disabled, title, full }) {
  const v = {
    solid: { background: T.ink, color: "#fff", borderColor: T.ink },
    ghost: { background: T.card, color: T.ink2, borderColor: T.line },
    danger: { background: "transparent", color: T.danger, borderColor: "transparent", padding: 5 },
  }[variant];
  return (
    <button title={title} disabled={disabled} onClick={disabled ? undefined : onClick} className="ft-body ft-btn ft-focus"
      style={{
        display: full ? "flex" : "inline-flex", width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined,
        alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer", borderRadius: 6,
        fontSize: small ? 12 : 13, fontWeight: 500, padding: small ? "5px 9px" : "9px 14px",
        border: "1px solid", opacity: disabled ? 0.45 : 1, ...v,
      }}>{children}</button>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div className="ft-body" style={{ fontSize: 12, fontWeight: 500, color: T.ink2, marginBottom: 5 }}>{label}</div>
      {children}
      {error && <div className="ft-body" style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>{error}</div>}
      {!error && hint && <div className="ft-body" style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "9px 10px", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 6, background: T.card, color: T.ink };

function Chip({ children, active, onClick }) {
  return (
    <button onClick={onClick} className="ft-focus ft-btn ft-body" style={{
      padding: "4px 9px", fontSize: 12, borderRadius: 5, cursor: onClick ? "pointer" : "default",
      border: `1px solid ${active ? T.ink : T.line}`, background: active ? T.ink : T.card,
      color: active ? "#fff" : T.ink2, fontWeight: 500,
    }}>{children}</button>
  );
}

const Badge = ({ children, fg, bg }) => <span className="ft-body" style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: bg, color: fg, whiteSpace: "nowrap" }}>{children}</span>;
const Empty = ({ children }) => <div className="ft-body" style={{ padding: "28px 16px", textAlign: "center", fontSize: 13, color: T.muted, border: `1px dashed ${T.line}`, borderRadius: 8 }}>{children}</div>;
const cardStyle = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, marginBottom: 14 };

function Head({ title, sub, back }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {back && <button onClick={back.onClick} className="ft-body ft-focus" style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "none", padding: 0, marginBottom: 9, fontSize: 12, color: T.muted, cursor: "pointer" }}><ChevronLeft size={14} />{back.label}</button>}
      <h2 className="ft-display" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
      {sub && <p className="ft-body" style={{ fontSize: 13, color: T.muted, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Timeline({ order }) {
  const idx = STATUSES.indexOf(order.status);
  return (
    <div>
      {STATUSES.map((s, i) => {
        const done = i <= idx, current = i === idx;
        const at = order.history.find(h => h.status === s)?.at;
        return (
          <div key={s} style={{ display: "flex", gap: 12, minHeight: i < STATUSES.length - 1 ? 46 : 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, flexShrink: 0, background: done ? T.ink : T.card, border: `2px solid ${done ? T.ink : T.line}`, boxShadow: current ? `0 0 0 4px ${T.signal}` : "none" }} />
              {i < STATUSES.length - 1 && <div style={{ flex: 1, width: 2, background: i < idx ? T.ink : T.lineSoft }} />}
            </div>
            <div style={{ paddingBottom: 14 }}>
              <div className="ft-body" style={{ fontSize: 13, fontWeight: current ? 600 : 500, color: done ? T.ink : T.muted }}>{s}</div>
              {at && <div className="ft-mono" style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{at}</div>}
              {s === "Shipped" && done && order.trackingNumber && <div className="ft-mono" style={{ fontSize: 11, marginTop: 4 }}>{order.carrier} · {order.trackingNumber}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= app ================= */
export default function App() {
  const [db, setDb] = useState(seed);
  const [ses, setSes] = useState(blankSession);
  const [mode, setMode] = useState("store");
  const [page, setPage] = useState("sections");
  const [view, setView] = useState("home");
  const [openOrder, setOpenOrder] = useState(null);
  const [openProduct, setOpenProduct] = useState(null);
  const [browseSection, setBrowseSection] = useState(null);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(CAT_KEY); if (r?.value) setDb(JSON.parse(r.value)); } catch (e) {}
      try { const r = await window.storage.get(SES_KEY); if (r?.value) setSes(JSON.parse(r.value)); } catch (e) {}
      setReady(true);
    })();
  }, []);
  useEffect(() => { if (ready) window.storage.set(CAT_KEY, JSON.stringify(db)).catch(() => {}); }, [db, ready]);
  useEffect(() => { if (ready) window.storage.set(SES_KEY, JSON.stringify(ses)).catch(() => {}); }, [ses, ready]);

  const reset = async () => {
    setDb(seed()); setSes(blankSession()); setView("home"); setOpenOrder(null); setOpenProduct(null); setQuery("");
    try { await window.storage.set(CAT_KEY, JSON.stringify(seed())); await window.storage.set(SES_KEY, JSON.stringify(blankSession())); } catch (e) {}
  };

  const updateUser = (patch) => setSes(s => {
    const u = { ...s.user, ...patch };
    return { ...s, user: u, users: s.users.map(x => x.id === u.id ? u : x) };
  });

  const openPdp = (id) => { setOpenProduct(id); setView("product"); };
  const goSection = (id) => { setBrowseSection(id); setQuery(""); setView("browse"); };

  const cartCount = ses.cart.reduce((s, i) => s + i.qty, 0);
  const nav = [
    { id: "sections", label: "Sections", icon: Layers }, { id: "attributes", label: "Attributes", icon: SlidersHorizontal },
    { id: "products", label: "Products", icon: Package }, { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "supplier", label: "Supplier", icon: Truck },
  ];

  return (
    <div className="ft-body" style={{ background: T.steel, minHeight: "100vh", color: T.ink }}>
      <style>{FONTS}</style>

      <div style={{ background: T.ink, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <button onClick={() => { setMode("store"); setView("home"); }} className="ft-focus" style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ width: 10, height: 20, background: T.signal }} />
          <span className="ft-display" style={{ color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: "0.04em" }}>FULLTHROTTLE</span>
        </button>

        {mode === "store" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 200px", maxWidth: 340, background: "#22262C", borderRadius: 6, padding: "0 10px" }}>
            <Search size={14} color="#8B93A0" />
            <input value={query} onChange={e => { setQuery(e.target.value); if (e.target.value) setView("browse"); }} placeholder="Search parts, brands, SKU"
              className="ft-body ft-focus" style={{ flex: 1, minWidth: 0, background: "none", border: "none", color: "#E6E8EB", fontSize: 13, padding: "8px 0", outline: "none" }} />
            {query && <button onClick={() => setQuery("")} className="ft-focus" style={{ background: "none", border: "none", cursor: "pointer", color: "#8B93A0", display: "flex", padding: 0 }}><X size={14} /></button>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {mode === "store" && (
            <>
              <button onClick={() => setView("cart")} className="ft-body ft-focus" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", fontSize: 13, borderRadius: 6, border: "none", cursor: "pointer", background: "#22262C", color: "#E6E8EB" }}>
                <ShoppingCart size={14} />Cart{cartCount > 0 && <span className="ft-mono" style={{ background: T.signal, color: T.ink, borderRadius: 9, padding: "1px 6px", fontSize: 11, fontWeight: 500 }}>{cartCount}</span>}
              </button>
              <button onClick={() => setView(ses.user ? "account" : "auth")} className="ft-body ft-focus" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", fontSize: 13, borderRadius: 6, border: "none", cursor: "pointer", background: "#22262C", color: "#E6E8EB" }}>
                <User size={14} />{ses.user ? ses.user.name.split(" ")[0] : "Sign in"}
              </button>
            </>
          )}
          <div style={{ display: "flex", gap: 4, padding: 3, background: "#22262C", borderRadius: 7 }}>
            {[{ id: "store", label: "Store", icon: Store }, { id: "admin", label: "Admin", icon: Settings }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} className="ft-body ft-focus" style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 13, fontWeight: 500, border: "none",
                borderRadius: 5, cursor: "pointer", background: mode === m.id ? T.card : "transparent", color: mode === m.id ? T.ink : "#A8B0BA",
              }}><m.icon size={14} />{m.label}</button>
            ))}
          </div>
        </div>
      </div>

      {mode === "admin" ? (
        <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap" }}>
          <nav style={{ width: 190, minWidth: 160, flexGrow: 1, maxWidth: 240, padding: 12, borderRight: `1px solid ${T.line}`, boxSizing: "border-box" }}>
            {nav.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} className="ft-body ft-focus" style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: "9px 11px", marginBottom: 2,
                fontSize: 13, fontWeight: 500, borderRadius: 6, border: "none", cursor: "pointer",
                background: page === n.id ? T.card : "transparent", color: page === n.id ? T.ink : T.muted,
                boxShadow: page === n.id ? `inset 3px 0 0 ${T.signal}` : "none",
              }}><n.icon size={15} />{n.label}
                {n.id === "orders" && ses.orders.length > 0 && <span className="ft-mono" style={{ marginLeft: "auto", fontSize: 11, color: T.muted }}>{ses.orders.length}</span>}
              </button>
            ))}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.line}` }}><Btn onClick={reset} small><RotateCcw size={12} />Reset data</Btn></div>
          </nav>
          <main style={{ flex: "1 1 480px", minWidth: 300, padding: 20 }}>
            {page === "sections" && <SectionsPage db={db} setDb={setDb} />}
            {page === "attributes" && <AttributesPage db={db} setDb={setDb} />}
            {page === "products" && <ProductsPage db={db} setDb={setDb} />}
            {page === "orders" && <AdminOrders ses={ses} setSes={setSes} />}
            {page === "supplier" && <SupplierPage />}
          </main>
        </div>
      ) : (
        <main style={{ padding: 20 }}>
          {view === "home" && <HomePage db={db} goSection={goSection} openPdp={openPdp} />}
          {view === "browse" && <Browse db={db} setSes={setSes} initSection={browseSection} query={query} openPdp={openPdp} />}
          {view === "product" && <ProductPage db={db} id={openProduct} setSes={setSes} go={setView} goSection={goSection} />}
          {view === "cart" && <Cart db={db} ses={ses} setSes={setSes} go={setView} />}
          {view === "auth" && <Auth ses={ses} setSes={setSes} go={setView} />}
          {view === "checkout" && <Checkout db={db} ses={ses} setSes={setSes} updateUser={updateUser} go={setView} setOpenOrder={setOpenOrder} />}
          {view === "done" && <Confirmation ses={ses} orderId={openOrder} go={setView} setOpenOrder={setOpenOrder} />}
          {view === "account" && <Account ses={ses} setSes={setSes} updateUser={updateUser} go={setView} setOpenOrder={setOpenOrder} />}
          {view === "order" && <OrderDetail ses={ses} orderId={openOrder} go={setView} />}
        </main>
      )}
    </div>
  );
}

/* ================= admin ================= */
function SectionsPage({ db, setDb }) {
  const [newSection, setNewSection] = useState("");
  const [newBrand, setNewBrand] = useState({});
  const addSection = () => {
    const n = newSection.trim(); if (!n) return;
    setDb(d => ({ ...d, sections: [...d.sections, { id: uid(), name: n, slug: n.toLowerCase().replace(/[^a-z0-9]+/g, "-"), tagline: "" }] }));
    setNewSection("");
  };
  const delSection = (id) => setDb(d => ({ ...d, sections: d.sections.filter(s => s.id !== id), brands: d.brands.filter(b => b.sectionId !== id), attributes: d.attributes.filter(a => a.sectionId !== id), products: d.products.filter(p => p.sectionId !== id) }));
  const addBrand = (sectionId) => {
    const n = (newBrand[sectionId] || "").trim(); if (!n) return;
    setDb(d => ({ ...d, brands: [...d.brands, { id: uid(), sectionId, name: n }] }));
    setNewBrand(v => ({ ...v, [sectionId]: "" }));
  };

  return (
    <div>
      <Head title="Sections and brands" sub="Create a section, then add brands under it. No code required." />
      {db.sections.map(s => {
        const brands = db.brands.filter(b => b.sectionId === s.id);
        return (
          <div key={s.id} style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "13px 15px", borderBottom: `1px solid ${T.lineSoft}` }}>
              <div style={{ minWidth: 0 }}>
                <div className="ft-display" style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div>
                <div className="ft-mono" style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>/{s.slug} · {db.attributes.filter(a => a.sectionId === s.id).length} attributes · {db.products.filter(p => p.sectionId === s.id).length} products</div>
              </div>
              <Btn variant="danger" onClick={() => delSection(s.id)} title="Delete section"><Trash2 size={15} /></Btn>
            </div>
            <div style={{ padding: "12px 15px" }}>
              <input value={s.tagline || ""} onChange={e => setDb(d => ({ ...d, sections: d.sections.map(x => x.id === s.id ? { ...x, tagline: e.target.value } : x) }))}
                placeholder="Short tagline shown on the home page" className="ft-focus" style={{ ...inputStyle, marginBottom: 12 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {brands.length === 0 && <span className="ft-body" style={{ fontSize: 12, color: T.muted }}>No brands yet. Add the first one below.</span>}
                {brands.map(b => (
                  <span key={b.id} className="ft-body" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 6px 4px 10px", fontSize: 12, fontWeight: 500, border: `1px solid ${T.line}`, borderRadius: 5 }}>
                    {b.name}<button onClick={() => setDb(d => ({ ...d, brands: d.brands.filter(x => x.id !== b.id), products: d.products.filter(p => p.brandId !== b.id) }))} title={`Remove ${b.name}`} className="ft-focus" style={{ border: "none", background: "none", cursor: "pointer", color: T.muted, padding: 0, display: "flex" }}><X size={13} /></button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newBrand[s.id] || ""} onChange={e => setNewBrand(v => ({ ...v, [s.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && addBrand(s.id)} placeholder="Brand name" className="ft-focus" style={{ ...inputStyle, maxWidth: 240 }} />
                <Btn onClick={() => addBrand(s.id)}><Plus size={14} />Add brand</Btn>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ ...cardStyle, padding: 15 }}>
        <div className="ft-body" style={{ fontSize: 12, fontWeight: 500, marginBottom: 7 }}>New section</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={newSection} onChange={e => setNewSection(e.target.value)} onKeyDown={e => e.key === "Enter" && addSection()} placeholder="e.g. Moto Gloves" className="ft-focus" style={{ ...inputStyle, maxWidth: 280 }} />
          <Btn variant="solid" onClick={addSection}><Plus size={14} />Create section</Btn>
        </div>
      </div>
    </div>
  );
}

const TYPES = [
  { id: "select", label: "Select — one option" }, { id: "multiselect", label: "Multi-select" },
  { id: "number", label: "Number" }, { id: "text", label: "Text" }, { id: "boolean", label: "Yes / No" },
];

function AttributesPage({ db, setDb }) {
  const [sel, setSel] = useState(db.sections[0]?.id);
  const [draft, setDraft] = useState({ name: "", type: "select", options: "", unit: "", filterable: true });
  const active = db.sections.find(s => s.id === sel) || db.sections[0];
  const attrs = db.attributes.filter(a => a.sectionId === active?.id);

  const add = () => {
    if (!draft.name.trim() || !active) return;
    setDb(d => ({ ...d, attributes: [...d.attributes, { id: uid(), sectionId: active.id, name: draft.name.trim(), type: draft.type, options: draft.options.split(",").map(o => o.trim()).filter(Boolean), unit: draft.unit.trim(), filterable: draft.filterable }] }));
    setDraft({ name: "", type: "select", options: "", unit: "", filterable: true });
  };

  return (
    <div>
      <Head title="Attribute template" sub="Add a field to a section — the product form, the spec table and the store filters all update themselves." />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {db.sections.map(s => <Chip key={s.id} active={s.id === active?.id} onClick={() => setSel(s.id)}>{s.name}</Chip>)}
      </div>
      {!active ? <Empty>Create a section first.</Empty> : (
        <>
          <div style={cardStyle}>
            {attrs.length === 0 && <div style={{ padding: 15 }}><Empty>No attributes in this section yet. Add one below.</Empty></div>}
            {attrs.map((a, i) => (
              <div key={a.id} className="ft-row" style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 15px", borderBottom: i < attrs.length - 1 ? `1px solid ${T.lineSoft}` : "none" }}>
                <Callout n={i + 1} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ft-body" style={{ fontSize: 13, fontWeight: 500 }}>{a.name}{a.unit && <span className="ft-mono" style={{ color: T.muted, fontWeight: 400 }}> ({a.unit})</span>}</div>
                  <div className="ft-mono" style={{ fontSize: 11, color: T.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{TYPES.find(t => t.id === a.type)?.label}{a.options.length > 0 && ` · ${a.options.join(" / ")}`}</div>
                </div>
                <Chip active={a.filterable} onClick={() => setDb(d => ({ ...d, attributes: d.attributes.map(x => x.id === a.id ? { ...x, filterable: !x.filterable } : x) }))}>{a.filterable ? "In filters" : "Not filtered"}</Chip>
                <Btn variant="danger" onClick={() => setDb(d => ({ ...d, attributes: d.attributes.filter(x => x.id !== a.id) }))} title={`Delete ${a.name}`}><Trash2 size={15} /></Btn>
              </div>
            ))}
          </div>
          <div style={{ ...cardStyle, padding: 15 }}>
            <div className="ft-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 13 }}>New attribute — {active.name}</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}><Field label="Name"><input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Visor type" className="ft-focus" style={inputStyle} /></Field></div>
              <div style={{ flex: "1 1 180px" }}><Field label="Type"><select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))} className="ft-focus" style={inputStyle}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Field></div>
            </div>
            {(draft.type === "select" || draft.type === "multiselect") && <Field label="Options" hint="Separate with commas"><input value={draft.options} onChange={e => setDraft(d => ({ ...d, options: e.target.value }))} placeholder="Clear, Tinted, Iridium" className="ft-focus" style={inputStyle} /></Field>}
            {draft.type === "number" && <Field label="Unit" hint="Optional"><input value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))} placeholder="mm" className="ft-focus" style={{ ...inputStyle, maxWidth: 140 }} /></Field>}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={draft.filterable} onChange={e => setDraft(d => ({ ...d, filterable: e.target.checked }))} className="ft-focus" />Show as a filter in the store
              </label>
              <Btn variant="solid" onClick={add}><Plus size={14} />Add attribute</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const emptyProduct = { brandId: "", name: "", sku: "", price: "", stock: "", supplierSku: "", description: "", values: {} };

function ProductsPage({ db, setDb }) {
  const [sectionId, setSectionId] = useState(db.sections[0]?.id || "");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [f, setF] = useState(emptyProduct);
  const [err, setErr] = useState("");
  const attrs = db.attributes.filter(a => a.sectionId === sectionId);
  const brands = db.brands.filter(b => b.sectionId === sectionId);
  const list = db.products.filter(p => p.sectionId === sectionId);
  const setVal = (aid, v) => setF(s => ({ ...s, values: { ...s.values, [aid]: v } }));

  const startNew = () => { setF(emptyProduct); setEditId(null); setErr(""); setOpen(true); };
  const startEdit = (p) => { setF({ ...p, price: String(p.price), stock: String(p.stock) }); setEditId(p.id); setErr(""); setOpen(true); };
  const close = () => { setOpen(false); setEditId(null); setErr(""); };

  const save = () => {
    if (!f.name.trim()) return setErr("Enter a product name.");
    if (!f.brandId) return setErr("Select a brand.");
    setErr("");
    const body = { sectionId, brandId: f.brandId, name: f.name.trim(), sku: f.sku.trim() || "—", price: Number(f.price) || 0, stock: Number(f.stock) || 0, supplySource: "manual", supplierSku: (f.supplierSku || "").trim(), description: f.description || "", values: f.values };
    setDb(d => editId
      ? { ...d, products: d.products.map(p => p.id === editId ? { ...p, ...body } : p) }
      : { ...d, products: [...d.products, { id: uid(), ...body }] });
    close();
  };

  return (
    <div>
      <Head title="Products" sub="Pick a section and the form opens with that section's own fields." />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {db.sections.map(s => <Chip key={s.id} active={s.id === sectionId} onClick={() => { setSectionId(s.id); close(); }}>{s.name}</Chip>)}
      </div>
      <div style={cardStyle}>
        {list.length === 0 && <div style={{ padding: 15 }}><Empty>No products in this section. Add the first one below.</Empty></div>}
        {list.map((p, i) => (
          <div key={p.id} className="ft-row" style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 15px", borderBottom: i < list.length - 1 ? `1px solid ${T.lineSoft}` : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ft-body" style={{ fontSize: 13, fontWeight: 500 }}>{db.brands.find(b => b.id === p.brandId)?.name} {p.name}</div>
              <div className="ft-mono" style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{p.sku} · {money(p.price)} · {p.stock} in stock</div>
            </div>
            <Btn small onClick={() => startEdit(p)} title={`Edit ${p.name}`}><Pencil size={13} />Edit</Btn>
            <Btn variant="danger" onClick={() => setDb(d => ({ ...d, products: d.products.filter(x => x.id !== p.id) }))} title={`Delete ${p.name}`}><Trash2 size={15} /></Btn>
          </div>
        ))}
      </div>

      {!open ? <Btn variant="solid" onClick={startNew} disabled={!sectionId}><Plus size={14} />New product</Btn> : (
        <div style={{ ...cardStyle, padding: 15 }}>
          <div className="ft-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{editId ? "Edit product" : "New product"}</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}><Field label="Brand"><select value={f.brandId} onChange={e => setF(s => ({ ...s, brandId: e.target.value }))} className="ft-focus" style={inputStyle}><option value="">— select —</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field></div>
            <div style={{ flex: "1 1 200px" }}><Field label="Model name"><input value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} className="ft-focus" style={inputStyle} /></Field></div>
          </div>
          <Field label="Description" hint="Shown on the product page"><textarea value={f.description} onChange={e => setF(s => ({ ...s, description: e.target.value }))} rows={3} className="ft-focus" style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 140px" }}><Field label="SKU"><input value={f.sku} onChange={e => setF(s => ({ ...s, sku: e.target.value }))} className="ft-focus ft-mono" style={inputStyle} /></Field></div>
            <div style={{ flex: "1 1 100px" }}><Field label="Price ($)"><input type="number" value={f.price} onChange={e => setF(s => ({ ...s, price: e.target.value }))} className="ft-focus" style={inputStyle} /></Field></div>
            <div style={{ flex: "1 1 100px" }}><Field label="Stock"><input type="number" value={f.stock} onChange={e => setF(s => ({ ...s, stock: e.target.value }))} className="ft-focus" style={inputStyle} /></Field></div>
            <div style={{ flex: "1 1 140px" }}><Field label="Supplier SKU" hint="For the integration"><input value={f.supplierSku} onChange={e => setF(s => ({ ...s, supplierSku: e.target.value }))} className="ft-focus ft-mono" style={inputStyle} /></Field></div>
          </div>
          <div style={{ marginTop: 6, paddingTop: 14, borderTop: `1px solid ${T.lineSoft}` }}>
            <div className="ft-body" style={{ fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 12 }}>These fields come from the “{db.sections.find(s => s.id === sectionId)?.name}” template</div>
            {attrs.length === 0 && <Empty>This section has no attributes. Add them on the Attributes page.</Empty>}
            {attrs.map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 11, marginBottom: 14 }}>
                <div style={{ paddingTop: 2 }}><Callout n={i + 1} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ft-body" style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>{a.name}{a.unit && <span className="ft-mono" style={{ color: T.muted, fontWeight: 400 }}> ({a.unit})</span>}</div>
                  {a.type === "select" && <select value={f.values[a.id] || ""} onChange={e => setVal(a.id, e.target.value)} className="ft-focus" style={inputStyle}><option value="">— select —</option>{a.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}
                  {a.type === "multiselect" && <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{a.options.map(o => <Chip key={o} active={(f.values[a.id] || []).includes(o)} onClick={() => setF(s => { const cur = s.values[a.id] || []; return { ...s, values: { ...s.values, [a.id]: cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o] } }; })}>{o}</Chip>)}</div>}
                  {a.type === "number" && <input type="number" value={f.values[a.id] ?? ""} onChange={e => setVal(a.id, e.target.value === "" ? "" : Number(e.target.value))} className="ft-focus" style={{ ...inputStyle, maxWidth: 160 }} />}
                  {a.type === "text" && <input value={f.values[a.id] || ""} onChange={e => setVal(a.id, e.target.value)} className="ft-focus" style={inputStyle} />}
                  {a.type === "boolean" && <div style={{ display: "flex", gap: 5 }}><Chip active={f.values[a.id] === true} onClick={() => setVal(a.id, true)}>Yes</Chip><Chip active={f.values[a.id] === false} onClick={() => setVal(a.id, false)}>No</Chip></div>}
                </div>
              </div>
            ))}
          </div>
          {err && <div className="ft-body" style={{ fontSize: 12, color: T.danger, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: "flex", gap: 7 }}><Btn variant="solid" onClick={save}><Check size={14} />{editId ? "Save changes" : "Save product"}</Btn><Btn onClick={close}>Cancel</Btn></div>
        </div>
      )}
    </div>
  );
}

function AdminOrders({ ses, setSes }) {
  const [sel, setSel] = useState(null);
  const [track, setTrack] = useState({ carrier: "UPS", number: "" });
  const [err, setErr] = useState("");
  const order = ses.orders.find(o => o.id === sel);

  const advance = () => {
    const i = STATUSES.indexOf(order.status);
    if (i >= STATUSES.length - 1) return;
    const next = STATUSES[i + 1];
    if (next === "Shipped" && !track.number.trim()) { setErr("Enter a tracking number before marking this shipped."); return; }
    setErr("");
    setSes(s => ({ ...s, orders: s.orders.map(o => o.id !== order.id ? o : {
      ...o, status: next, carrier: next === "Shipped" ? track.carrier : o.carrier,
      trackingNumber: next === "Shipped" ? track.number.trim() : o.trackingNumber,
      history: [...o.history, { status: next, at: new Date().toLocaleString("en-US") }],
    }) }));
  };

  if (order) {
    const t = totals(order.items);
    const next = STATUSES[STATUSES.indexOf(order.status) + 1];
    return (
      <div>
        <Head title={`Order ${order.number}`} sub={`${order.customerName} · ${order.customerEmail}`} back={{ label: "All orders", onClick: () => { setSel(null); setErr(""); } }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ ...cardStyle, padding: 15 }}>
              {order.items.map(i => (
                <div key={i.productId} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 9, marginBottom: 9, borderBottom: `1px solid ${T.lineSoft}` }}>
                  <div><div className="ft-body" style={{ fontSize: 13 }}>{i.brand} {i.name} × {i.qty}</div><div className="ft-mono" style={{ fontSize: 11, color: T.muted }}>{i.sku}</div></div>
                  <div className="ft-body" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{money(i.price * i.qty)}</div>
                </div>
              ))}
              <div className="ft-body" style={{ fontSize: 13, display: "flex", justifyContent: "space-between", fontWeight: 600 }}><span>Total</span><span>{money(t.total)}</span></div>
              <div className="ft-body" style={{ fontSize: 12, color: T.muted, marginTop: 12, lineHeight: 1.7 }}>
                {order.address.line1}<br />{order.address.city}, {order.address.state} {order.address.zip}<br />
                <span className="ft-mono">Paid with {order.paymentMethod}</span>
              </div>
            </div>
          </div>
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ ...cardStyle, padding: 15 }}>
              <Timeline order={order} />
              {next && (
                <div style={{ marginTop: 8, paddingTop: 14, borderTop: `1px solid ${T.lineSoft}` }}>
                  {next === "Shipped" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <select value={track.carrier} onChange={e => setTrack(v => ({ ...v, carrier: e.target.value }))} className="ft-focus" style={{ ...inputStyle, maxWidth: 110 }}>{CARRIERS.map(c => <option key={c}>{c}</option>)}</select>
                      <input value={track.number} onChange={e => setTrack(v => ({ ...v, number: e.target.value }))} placeholder="Tracking number" className="ft-focus ft-mono" style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                    </div>
                  )}
                  {err && <div className="ft-body" style={{ fontSize: 12, color: T.danger, marginBottom: 9 }}>{err}</div>}
                  <Btn variant="solid" onClick={advance} full>Mark as {next}</Btn>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Head title="Orders" sub="Move an order along the pipeline. The customer sees every step." />
      {ses.orders.length === 0 ? <Empty>No orders yet. Switch to Store, add something to the cart and check out.</Empty> : (
        <div style={cardStyle}>
          {ses.orders.map((o, i) => (
            <button key={o.id} onClick={() => { setSel(o.id); setTrack({ carrier: "UPS", number: "" }); setErr(""); }} className="ft-row ft-focus" style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", padding: "12px 15px", background: "none", border: "none", borderBottom: i < ses.orders.length - 1 ? `1px solid ${T.lineSoft}` : "none", cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ft-mono" style={{ fontSize: 13, fontWeight: 500 }}>{o.number}</div>
                <div className="ft-body" style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{o.customerName} · {o.items.length} item{o.items.length > 1 ? "s" : ""} · {money(totals(o.items).total)}</div>
              </div>
              <Badge fg={o.status === "Delivered" ? T.ok : T.ink2} bg={o.status === "Delivered" ? T.okBg : T.steel}>{o.status}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierPage() {
  const rows = [["Supplier name", "—"], ["API endpoint", "—"], ["API key", "—"], ["Sync interval", "30 min"], ["Status", "Not connected"]];
  return (
    <div>
      <Head title="Supplier" sub="The screen is ready. The connection comes after the site is finished." />
      <div style={{ ...cardStyle, padding: 15, borderStyle: "dashed" }}>
        <div className="ft-mono" style={{ display: "inline-block", padding: "5px 10px", borderRadius: 5, background: T.warnBg, color: T.warn, fontSize: 12, fontWeight: 500, marginBottom: 15 }}>SUPPLIER_SYNC_ENABLED = false</div>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
            <span className="ft-body" style={{ fontSize: 13, color: T.muted }}>{k}</span><span className="ft-mono" style={{ fontSize: 12 }}>{v}</span>
          </div>
        ))}
        <p className="ft-body" style={{ fontSize: 12, color: T.muted, marginTop: 15, marginBottom: 0, lineHeight: 1.6 }}>
          Every product currently runs from the <span className="ft-mono">manual</span> source. When the supplier documentation arrives, only the adapter class gets written — the product, cart, and checkout screens stay untouched.
        </p>
      </div>
    </div>
  );
}

/* ================= store ================= */
function ProductCard({ db, p, attrs, openPdp, addToCart, added }) {
  const brand = db.brands.find(b => b.id === p.brandId)?.name;
  const st = stockState(p.stock);
  const chips = attrs.filter(a => a.filterable).map(a => showValue(a, p.values[a.id])).filter(Boolean).slice(0, 2);
  return (
    <article style={{ ...cardStyle, marginBottom: 0, padding: 14, display: "flex", flexDirection: "column" }} className="ft-tile">
      <button onClick={() => openPdp(p.id)} className="ft-focus" style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: T.ink }}>
        <div className="ft-mono" style={{ fontSize: 10, color: T.muted, letterSpacing: "0.06em" }}>{brand?.toUpperCase()}</div>
        <div className="ft-display" style={{ fontSize: 14, fontWeight: 600, margin: "3px 0 7px", lineHeight: 1.3 }}>{p.name}</div>
      </button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 11 }}>
        {chips.map((c, i) => <span key={i} className="ft-body" style={{ fontSize: 11, padding: "2px 6px", background: T.steel, borderRadius: 4, color: T.ink2 }}>{c}</span>)}
      </div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <span className="ft-display" style={{ fontSize: 17, fontWeight: 700 }}>{money(p.price)}</span>
        <Badge fg={st.fg} bg={st.bg}>{st.label}</Badge>
      </div>
      <Btn variant={added === p.id ? "ghost" : "solid"} disabled={p.stock <= 0} onClick={() => addToCart(p)} full>
        {added === p.id ? <><Check size={14} />Added</> : p.stock <= 0 ? "Out of stock" : "Add to cart"}
      </Btn>
      <div className="ft-mono" style={{ fontSize: 10, color: T.muted, marginTop: 8 }}>{p.sku}</div>
    </article>
  );
}

const useCartAdder = (setSes) => {
  const [added, setAdded] = useState(null);
  const addToCart = (p, qty = 1) => {
    setSes(s => {
      const found = s.cart.find(i => i.productId === p.id);
      return { ...s, cart: found ? s.cart.map(i => i.productId === p.id ? { ...i, qty: i.qty + qty } : i) : [...s.cart, { productId: p.id, qty }] };
    });
    setAdded(p.id); setTimeout(() => setAdded(null), 1400);
  };
  return { added, addToCart };
};

function HomePage({ db, goSection, openPdp }) {
  const featured = db.products.filter(p => p.stock > 0).slice(0, 4);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ background: T.ink, borderRadius: 12, padding: "34px 26px", marginBottom: 20 }}>
        <div className="ft-mono" style={{ color: T.signal, fontSize: 11, letterSpacing: "0.12em", marginBottom: 10 }}>SHIPS FROM OUR US WAREHOUSE</div>
        <h1 className="ft-display" style={{ color: "#fff", fontSize: 30, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.15, maxWidth: 520 }}>Parts with the spec sheet attached.</h1>
        <p className="ft-body" style={{ color: "#A8B0BA", fontSize: 14, margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
          Every listing carries the numbers you actually need — material, weight, certification, inlet diameter. Filter on them, then order.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 26 }}>
        {db.sections.map(s => {
          const count = db.products.filter(p => p.sectionId === s.id).length;
          const brands = db.brands.filter(b => b.sectionId === s.id).length;
          return (
            <button key={s.id} onClick={() => goSection(s.id)} className="ft-tile ft-btn ft-focus" style={{ ...cardStyle, marginBottom: 0, padding: 18, textAlign: "left", cursor: "pointer" }}>
              <div className="ft-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 5 }}>{s.name}</div>
              <div className="ft-body" style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>{s.tagline || "Browse the section"}</div>
              <div className="ft-mono" style={{ fontSize: 11, color: T.ink2 }}>{count} products · {brands} brands</div>
            </button>
          );
        })}
      </div>

      <div className="ft-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Ready to ship</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 12 }}>
        {featured.map(p => {
          const brand = db.brands.find(b => b.id === p.brandId)?.name;
          return (
            <button key={p.id} onClick={() => openPdp(p.id)} className="ft-tile ft-btn ft-focus" style={{ ...cardStyle, marginBottom: 0, padding: 14, textAlign: "left", cursor: "pointer" }}>
              <div className="ft-mono" style={{ fontSize: 10, color: T.muted, letterSpacing: "0.06em" }}>{brand?.toUpperCase()}</div>
              <div className="ft-display" style={{ fontSize: 14, fontWeight: 600, margin: "3px 0 10px", lineHeight: 1.3 }}>{p.name}</div>
              <div className="ft-display" style={{ fontSize: 16, fontWeight: 700 }}>{money(p.price)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Browse({ db, setSes, initSection, query, openPdp }) {
  const [sectionId, setSectionId] = useState(initSection || db.sections[0]?.id || "");
  const [filters, setFilters] = useState({});
  const [brandFilter, setBrandFilter] = useState([]);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("name");
  const { added, addToCart } = useCartAdder(setSes);

  useEffect(() => { if (initSection) setSectionId(initSection); }, [initSection]);
  useEffect(() => { setFilters({}); setBrandFilter([]); }, [sectionId]);

  const searching = query.trim().length > 0;
  const attrs = db.attributes.filter(a => a.sectionId === sectionId);
  const filterable = attrs.filter(a => a.filterable);
  const brands = db.brands.filter(b => b.sectionId === sectionId);
  const optsFor = (a) => a.type === "boolean" ? ["Yes", "No"] : a.options;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = db.products.filter(p => {
      if (searching) {
        const brand = db.brands.find(b => b.id === p.brandId)?.name || "";
        return `${p.name} ${brand} ${p.sku}`.toLowerCase().includes(q);
      }
      if (p.sectionId !== sectionId) return false;
      if (inStock && p.stock <= 0) return false;
      if (brandFilter.length && !brandFilter.includes(p.brandId)) return false;
      return Object.entries(filters).every(([aid, sel]) => {
        if (!sel.length) return true;
        const v = p.values[aid];
        if (Array.isArray(v)) return sel.some(s => v.includes(s));
        if (typeof v === "boolean") return sel.includes(v ? "Yes" : "No");
        return sel.includes(v);
      });
    });
    if (sort === "low") out = [...out].sort((a, b) => a.price - b.price);
    if (sort === "high") out = [...out].sort((a, b) => b.price - a.price);
    if (sort === "name") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [db, sectionId, filters, brandFilter, inStock, sort, query, searching]);

  const sectionOf = (p) => db.sections.find(s => s.id === p.sectionId);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {searching ? (
        <div style={{ marginBottom: 18 }}>
          <h2 className="ft-display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Results for “{query}”</h2>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {db.sections.map(s => <Chip key={s.id} active={s.id === sectionId} onClick={() => setSectionId(s.id)}>{s.name}</Chip>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        {!searching && (
          <aside style={{ flex: "1 1 220px", maxWidth: 260, minWidth: 200 }}>
            <div style={{ ...cardStyle, padding: 15 }}>
              <div className="ft-display" style={{ fontSize: 13, fontWeight: 600, marginBottom: 13 }}>Filters</div>
              <div style={{ marginBottom: 16 }}>
                <div className="ft-body" style={{ fontSize: 12, fontWeight: 500, marginBottom: 7 }}>Brand</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {brands.map(b => <Chip key={b.id} active={brandFilter.includes(b.id)} onClick={() => setBrandFilter(v => v.includes(b.id) ? v.filter(x => x !== b.id) : [...v, b.id])}>{b.name}</Chip>)}
                </div>
              </div>
              {filterable.map(a => (
                <div key={a.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                    <Callout n={attrs.findIndex(x => x.id === a.id) + 1} />
                    <span className="ft-body" style={{ fontSize: 12, fontWeight: 500 }}>{a.name}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {optsFor(a).map(o => <Chip key={o} active={(filters[a.id] || []).includes(o)} onClick={() => setFilters(f => { const cur = f[a.id] || []; return { ...f, [a.id]: cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o] }; })}>{o}</Chip>)}
                  </div>
                </div>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer", paddingTop: 12, borderTop: `1px solid ${T.lineSoft}` }}>
                <input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} className="ft-focus" />In stock only
              </label>
            </div>
          </aside>
        )}

        <section style={{ flex: "3 1 380px", minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11, flexWrap: "wrap" }}>
            <span className="ft-mono" style={{ fontSize: 11, color: T.muted }}>{results.length} {results.length === 1 ? "product" : "products"}</span>
            <select value={sort} onChange={e => setSort(e.target.value)} className="ft-focus ft-body" style={{ ...inputStyle, width: "auto", padding: "6px 9px", fontSize: 12 }}>
              <option value="name">Name A–Z</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 12 }}>
            {results.map(p => <ProductCard key={p.id} db={db} p={p} attrs={db.attributes.filter(a => a.sectionId === p.sectionId)} openPdp={openPdp} addToCart={addToCart} added={added} />)}
          </div>
          {results.length === 0 && <Empty>{searching ? "Nothing matched that search. Try a brand or a part number." : "Nothing matches these filters. Clear a few to see more."}</Empty>}
          {searching && results.length > 0 && <div className="ft-body" style={{ fontSize: 11, color: T.muted, marginTop: 12 }}>Across {new Set(results.map(p => sectionOf(p)?.name)).size} section(s).</div>}
        </section>
      </div>
    </div>
  );
}

function ProductPage({ db, id, setSes, go, goSection }) {
  const p = db.products.find(x => x.id === id);
  const [qty, setQty] = useState(1);
  const { added, addToCart } = useCartAdder(setSes);
  if (!p) return <Empty>Product not found.</Empty>;
  const brand = db.brands.find(b => b.id === p.brandId)?.name;
  const section = db.sections.find(s => s.id === p.sectionId);
  const attrs = db.attributes.filter(a => a.sectionId === p.sectionId);
  const st = stockState(p.stock);
  const specs = attrs.map(a => [a.name, showValue(a, p.values[a.id])]).filter(([, v]) => v !== null);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Head title="" back={{ label: section?.name || "Back", onClick: () => goSection(p.sectionId) }} />
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginTop: -14 }}>
        <div style={{ flex: "1 1 300px", minWidth: 260 }}>
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div style={{ background: T.ink, padding: "50px 20px", textAlign: "center" }}>
              <div className="ft-mono" style={{ color: T.signal, fontSize: 11, letterSpacing: "0.12em", marginBottom: 8 }}>{brand?.toUpperCase()}</div>
              <div className="ft-display" style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{p.name}</div>
              <div className="ft-mono" style={{ color: "#8B93A0", fontSize: 11, marginTop: 10 }}>{p.sku}</div>
            </div>
          </div>
          {p.description && (
            <div style={{ ...cardStyle, padding: 16 }}>
              <div className="ft-display" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>About this part</div>
              <p className="ft-body" style={{ fontSize: 13, color: T.ink2, lineHeight: 1.7, margin: 0 }}>{p.description}</p>
            </div>
          )}
          <div style={{ ...cardStyle, padding: 16 }}>
            <div className="ft-display" style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Specifications</div>
            {specs.length === 0 ? <Empty>No specs recorded yet.</Empty> : specs.map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "8px 0", borderBottom: i < specs.length - 1 ? `1px solid ${T.lineSoft}` : "none" }}>
                <span className="ft-body" style={{ fontSize: 13, color: T.muted }}>{k}</span>
                <span className="ft-mono" style={{ fontSize: 12, textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <div className="ft-body" style={{ fontSize: 11, color: T.muted, marginTop: 12, lineHeight: 1.6 }}>
              Specs come straight from the {section?.name} attribute template. Add a field in the admin and it appears here.
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 250px", minWidth: 240 }}>
          <div style={{ ...cardStyle, padding: 18, position: "sticky", top: 16 }}>
            <div className="ft-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 10 }}>{money(p.price)}</div>
            <div style={{ marginBottom: 16 }}><Badge fg={st.fg} bg={st.bg}>{st.label}</Badge></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span className="ft-body" style={{ fontSize: 12, color: T.muted, marginRight: 4 }}>Qty</span>
              <Btn small onClick={() => setQty(q => Math.max(1, q - 1))} title="Decrease"><Minus size={12} /></Btn>
              <span className="ft-mono" style={{ fontSize: 14, minWidth: 22, textAlign: "center" }}>{qty}</span>
              <Btn small onClick={() => setQty(q => q + 1)} title="Increase"><Plus size={12} /></Btn>
            </div>
            <Btn variant={added === p.id ? "ghost" : "solid"} full disabled={p.stock <= 0} onClick={() => addToCart(p, qty)}>
              {added === p.id ? <><Check size={14} />Added to cart</> : p.stock <= 0 ? "Out of stock" : "Add to cart"}
            </Btn>
            <div style={{ marginTop: 10 }}><Btn full onClick={() => go("cart")}>Go to cart</Btn></div>
            <div className="ft-body" style={{ fontSize: 11, color: T.muted, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.lineSoft}`, lineHeight: 1.7 }}>
              Ships from our US warehouse.<br />Free shipping over $99.<br />30-day returns on unfitted parts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const lineItems = (db, cart) => cart.map(i => {
  const p = db.products.find(x => x.id === i.productId);
  if (!p) return null;
  return { productId: p.id, name: p.name, brand: db.brands.find(b => b.id === p.brandId)?.name, sku: p.sku, price: p.price, qty: i.qty };
}).filter(Boolean);

function Summary({ t }) {
  const rows = [["Subtotal", money(t.subtotal)], ["Shipping", t.shipping === 0 ? "Free" : money(t.shipping)], ["Estimated sales tax", money(t.tax)]];
  return (
    <div>
      {rows.map(([k, v]) => <div key={k} className="ft-body" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.muted, marginBottom: 7 }}><span>{k}</span><span>{v}</span></div>)}
      <div className="ft-display" style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, paddingTop: 10, borderTop: `1px solid ${T.lineSoft}` }}><span>Total</span><span>{money(t.total)}</span></div>
    </div>
  );
}

function Cart({ db, ses, setSes, go }) {
  const items = lineItems(db, ses.cart);
  const t = totals(items);
  const setQty = (id, d) => setSes(s => ({ ...s, cart: s.cart.map(i => i.productId === id ? { ...i, qty: Math.max(1, i.qty + d) } : i) }));
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <Head title="Your cart" back={{ label: "Keep shopping", onClick: () => go("browse") }} />
      {items.length === 0 ? <Empty>Your cart is empty. Pick a section and add a part.</Empty> : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "2 1 320px" }}>
            <div style={cardStyle}>
              {items.map((i, n) => (
                <div key={i.productId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderBottom: n < items.length - 1 ? `1px solid ${T.lineSoft}` : "none", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                    <div className="ft-mono" style={{ fontSize: 10, color: T.muted, letterSpacing: "0.06em" }}>{i.brand?.toUpperCase()}</div>
                    <div className="ft-body" style={{ fontSize: 13, fontWeight: 500 }}>{i.name}</div>
                    <div className="ft-mono" style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{i.sku} · {money(i.price)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Btn small onClick={() => setQty(i.productId, -1)} title="Decrease"><Minus size={12} /></Btn>
                    <span className="ft-mono" style={{ fontSize: 13, minWidth: 20, textAlign: "center" }}>{i.qty}</span>
                    <Btn small onClick={() => setQty(i.productId, 1)} title="Increase"><Plus size={12} /></Btn>
                  </div>
                  <div className="ft-body" style={{ fontSize: 13, fontWeight: 500, minWidth: 62, textAlign: "right" }}>{money(i.price * i.qty)}</div>
                  <Btn variant="danger" onClick={() => setSes(s => ({ ...s, cart: s.cart.filter(x => x.productId !== i.productId) }))} title="Remove"><Trash2 size={15} /></Btn>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: "1 1 240px", minWidth: 220 }}>
            <div style={{ ...cardStyle, padding: 15 }}>
              <Summary t={t} />
              <div style={{ marginTop: 14 }}><Btn variant="solid" full onClick={() => go(ses.user ? "checkout" : "auth")}>Checkout</Btn></div>
              {!ses.user && <div className="ft-body" style={{ fontSize: 11, color: T.muted, marginTop: 9, textAlign: "center" }}>You'll create an account at the next step.</div>}
              <div className="ft-body" style={{ fontSize: 11, color: T.muted, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.lineSoft}`, lineHeight: 1.6 }}>Free shipping over $99. We ship within the United States only.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Auth({ ses, setSes, go }) {
  const [tab, setTab] = useState("register");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [errs, setErrs] = useState({});

  const signInWith = (provider) => {
    const email = provider === "Google" ? "chris.mora@gmail.com" : "chris@privaterelay.appleid.com";
    const existing = ses.users.find(u => u.email === email);
    const user = existing || { id: uid(), name: "Chris Mora", email, provider };
    setSes(s => ({ ...s, user, users: existing ? s.users : [...s.users, user] }));
    go("checkout");
  };

  const submit = () => {
    const e = {};
    if (tab === "register" && !f.name.trim()) e.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email address.";
    if (f.password.length < 8) e.password = "Use at least 8 characters.";
    setErrs(e);
    if (Object.keys(e).length) return;
    if (tab === "register") {
      if (ses.users.some(u => u.email === f.email.toLowerCase())) { setErrs({ email: "That email already has an account. Sign in instead." }); return; }
      const user = { id: uid(), name: f.name.trim(), email: f.email.toLowerCase(), provider: "Email" };
      setSes(s => ({ ...s, user, users: [...s.users, user] }));
    } else {
      const user = ses.users.find(u => u.email === f.email.toLowerCase());
      if (!user) { setErrs({ email: "No account with that email. Create one instead." }); return; }
      setSes(s => ({ ...s, user }));
    }
    go("checkout");
  };

  const social = (label) => (
    <button onClick={() => signInWith(label)} className="ft-body ft-btn ft-focus" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", gap: 8, padding: "11px 14px", marginBottom: 8, fontSize: 13, fontWeight: 500, background: T.card, border: `1px solid ${T.line}`, borderRadius: 6, cursor: "pointer", color: T.ink }}>
      Continue with {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <Head title={tab === "register" ? "Create your account" : "Sign in"} sub="An account is required to pay, track your order, and handle returns." back={{ label: "Back to cart", onClick: () => go("cart") }} />
      <div style={{ ...cardStyle, padding: 18 }}>
        {social("Google")}{social("Apple")}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.lineSoft }} />
          <span className="ft-body" style={{ fontSize: 11, color: T.muted }}>or use email</span>
          <div style={{ flex: 1, height: 1, background: T.lineSoft }} />
        </div>
        {tab === "register" && <Field label="Full name" error={errs.name}><input value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} className="ft-focus" style={inputStyle} /></Field>}
        <Field label="Email" error={errs.email}><input value={f.email} onChange={e => setF(s => ({ ...s, email: e.target.value }))} className="ft-focus" style={inputStyle} /></Field>
        <Field label="Password" error={errs.password} hint={tab === "register" ? "At least 8 characters" : undefined}><input type="password" value={f.password} onChange={e => setF(s => ({ ...s, password: e.target.value }))} className="ft-focus" style={inputStyle} /></Field>
        <Btn variant="solid" full onClick={submit}>{tab === "register" ? "Create account" : "Sign in"}</Btn>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={() => { setTab(tab === "register" ? "signin" : "register"); setErrs({}); }} className="ft-body ft-focus" style={{ background: "none", border: "none", fontSize: 12, color: T.ink2, cursor: "pointer", textDecoration: "underline" }}>
            {tab === "register" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressFields({ a, setA, errs }) {
  return (
    <>
      <Field label="Street address" error={errs?.line1}><input value={a.line1} onChange={e => setA(s => ({ ...s, line1: e.target.value }))} className="ft-focus" style={inputStyle} /></Field>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 160px" }}><Field label="City" error={errs?.city}><input value={a.city} onChange={e => setA(s => ({ ...s, city: e.target.value }))} className="ft-focus" style={inputStyle} /></Field></div>
        <div style={{ flex: "1 1 90px" }}><Field label="State"><select value={a.state} onChange={e => setA(s => ({ ...s, state: e.target.value }))} className="ft-focus" style={inputStyle}>{STATES.map(s => <option key={s}>{s}</option>)}</select></Field></div>
        <div style={{ flex: "1 1 100px" }}><Field label="ZIP" error={errs?.zip}><input value={a.zip} onChange={e => setA(s => ({ ...s, zip: e.target.value }))} maxLength={5} className="ft-focus ft-mono" style={inputStyle} /></Field></div>
      </div>
    </>
  );
}

function Checkout({ db, ses, setSes, updateUser, go, setOpenOrder }) {
  const items = lineItems(db, ses.cart);
  const t = totals(items);
  const [a, setA] = useState(ses.user?.address || { line1: "", city: "", state: "CA", zip: "" });
  const [saveAddr, setSaveAddr] = useState(true);
  const [pay, setPay] = useState("Card");
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [errs, setErrs] = useState({});

  const place = () => {
    const e = {};
    if (!a.line1.trim()) e.line1 = "Enter a street address.";
    if (!a.city.trim()) e.city = "Enter a city.";
    if (!/^\d{5}$/.test(a.zip)) e.zip = "Enter a 5-digit ZIP code.";
    if (pay === "Card") {
      if (card.number.replace(/\s/g, "").length < 15) e.number = "Enter a card number.";
      if (!/^\d{2}\/\d{2}$/.test(card.exp)) e.exp = "Use MM/YY.";
      if (card.cvc.length < 3) e.cvc = "Enter the CVC.";
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    if (saveAddr) updateUser({ address: a });
    const order = {
      id: uid(), number: `FT-${ses.counter}`, userId: ses.user.id, customerName: ses.user.name, customerEmail: ses.user.email,
      items, address: a, paymentMethod: pay, status: "Paid", carrier: "", trackingNumber: "",
      history: [{ status: "Paid", at: new Date().toLocaleString("en-US") }],
    };
    setSes(s => ({ ...s, orders: [order, ...s.orders], cart: [], counter: s.counter + 1 }));
    setOpenOrder(order.id);
    go("done");
  };

  if (items.length === 0) return <div style={{ maxWidth: 500, margin: "0 auto" }}><Head title="Checkout" /><Empty>Your cart is empty. Add a part before checking out.</Empty></div>;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <Head title="Checkout" sub={`Signed in as ${ses.user.email}`} back={{ label: "Back to cart", onClick: () => go("cart") }} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "2 1 340px" }}>
          <div style={{ ...cardStyle, padding: 16 }}>
            <div className="ft-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Shipping address</div>
            <AddressFields a={a} setA={setA} errs={errs} />
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer", marginBottom: 10 }}>
              <input type="checkbox" checked={saveAddr} onChange={e => setSaveAddr(e.target.checked)} className="ft-focus" />Save this address to my account
            </label>
            <div className="ft-body" style={{ fontSize: 11, color: T.muted }}>We ship within the United States only.</div>
          </div>

          <div style={{ ...cardStyle, padding: 16 }}>
            <div className="ft-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Payment</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["Card", "Apple Pay", "PayPal"].map(m => (
                <button key={m} onClick={() => setPay(m)} className="ft-body ft-btn ft-focus" style={{
                  flex: "1 1 110px", padding: "12px 10px", fontSize: 13, fontWeight: 500, borderRadius: 7, cursor: "pointer",
                  border: `1px solid ${pay === m ? T.ink : T.line}`, background: pay === m ? T.ink : T.card, color: pay === m ? "#fff" : T.ink2,
                }}>{m}</button>
              ))}
            </div>
            {pay === "Card" && (
              <div>
                <Field label="Card number" error={errs.number}><input value={card.number} onChange={e => setCard(s => ({ ...s, number: e.target.value }))} placeholder="4242 4242 4242 4242" className="ft-focus ft-mono" style={inputStyle} /></Field>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}><Field label="Expiry" error={errs.exp}><input value={card.exp} onChange={e => setCard(s => ({ ...s, exp: e.target.value }))} placeholder="12/28" className="ft-focus ft-mono" style={inputStyle} /></Field></div>
                  <div style={{ flex: 1 }}><Field label="CVC" error={errs.cvc}><input value={card.cvc} onChange={e => setCard(s => ({ ...s, cvc: e.target.value }))} placeholder="123" maxLength={4} className="ft-focus ft-mono" style={inputStyle} /></Field></div>
                </div>
                <div className="ft-body" style={{ display: "flex", gap: 7, fontSize: 11, color: T.muted, background: T.steel, padding: "9px 11px", borderRadius: 6, lineHeight: 1.5 }}>
                  <Lock size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  Prototype fields only. In production these are Stripe Elements rendered inside an iframe — card data never reaches our server or database.
                </div>
              </div>
            )}
            {pay === "Apple Pay" && <div className="ft-body" style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>Apple Pay opens the device payment sheet. Face ID or Touch ID confirms, and the shipping address comes back from the Wallet.</div>}
            {pay === "PayPal" && <div className="ft-body" style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>PayPal opens in a popup. You approve the payment there and land back here on the confirmation page.</div>}
          </div>
        </div>

        <div style={{ flex: "1 1 250px", minWidth: 230 }}>
          <div style={{ ...cardStyle, padding: 16 }}>
            {items.map(i => (
              <div key={i.productId} className="ft-body" style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: T.ink2 }}>{i.name} × {i.qty}</span><span style={{ whiteSpace: "nowrap" }}>{money(i.price * i.qty)}</span>
              </div>
            ))}
            <div style={{ paddingTop: 10, borderTop: `1px solid ${T.lineSoft}`, marginTop: 4 }}><Summary t={t} /></div>
            <div style={{ marginTop: 14 }}><Btn variant="solid" full onClick={place}><CreditCard size={14} />Place order · {money(t.total)}</Btn></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Confirmation({ ses, orderId, go, setOpenOrder }) {
  const order = ses.orders.find(o => o.id === orderId);
  if (!order) return <Empty>Order not found.</Empty>;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div style={{ ...cardStyle, padding: 24, textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: T.okBg, color: T.ok, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Check size={22} /></div>
        <h2 className="ft-display" style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Order placed</h2>
        <p className="ft-body" style={{ fontSize: 13, color: T.muted, margin: "0 0 4px" }}>We emailed a receipt to {order.customerEmail}.</p>
        <div className="ft-mono" style={{ fontSize: 15, fontWeight: 500, margin: "14px 0 20px" }}>{order.number}</div>
        <p className="ft-body" style={{ fontSize: 12, color: T.muted, margin: "0 0 18px", lineHeight: 1.6 }}>Your order is now being prepared. You'll get a tracking number as soon as it ships.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn variant="solid" onClick={() => { setOpenOrder(order.id); go("order"); }}>Track this order</Btn>
          <Btn onClick={() => go("home")}><Home size={14} />Keep shopping</Btn>
        </div>
      </div>
    </div>
  );
}

function Account({ ses, setSes, updateUser, go, setOpenOrder }) {
  const [tab, setTab] = useState("orders");
  const [a, setA] = useState(ses.user?.address || { line1: "", city: "", state: "CA", zip: "" });
  const [saved, setSaved] = useState(false);
  if (!ses.user) return <div style={{ maxWidth: 400, margin: "0 auto" }}><Empty>Sign in to see your account.</Empty></div>;
  const mine = ses.orders.filter(o => o.userId === ses.user.id);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Head title="Your account" sub={`${ses.user.name} · ${ses.user.email} · signed in with ${ses.user.provider}`} back={{ label: "Keep shopping", onClick: () => go("home") }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <Chip active={tab === "orders"} onClick={() => setTab("orders")}>Orders</Chip>
        <Chip active={tab === "address"} onClick={() => setTab("address")}>Shipping address</Chip>
      </div>

      {tab === "orders" && (mine.length === 0 ? <Empty>No orders yet.</Empty> : (
        <div style={cardStyle}>
          {mine.map((o, i) => (
            <button key={o.id} onClick={() => { setOpenOrder(o.id); go("order"); }} className="ft-row ft-focus" style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", padding: "13px 15px", background: "none", border: "none", borderBottom: i < mine.length - 1 ? `1px solid ${T.lineSoft}` : "none", cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ft-mono" style={{ fontSize: 13, fontWeight: 500 }}>{o.number}</div>
                <div className="ft-body" style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{o.items.length} item{o.items.length > 1 ? "s" : ""} · {money(totals(o.items).total)}</div>
              </div>
              <Badge fg={o.status === "Delivered" ? T.ok : T.ink2} bg={o.status === "Delivered" ? T.okBg : T.steel}>{o.status}</Badge>
            </button>
          ))}
        </div>
      ))}

      {tab === "address" && (
        <div style={{ ...cardStyle, padding: 16 }}>
          <AddressFields a={a} setA={setA} errs={{}} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn variant="solid" onClick={() => { updateUser({ address: a }); setSaved(true); setTimeout(() => setSaved(false), 1600); }}><Check size={14} />Save address</Btn>
            {saved && <span className="ft-body" style={{ fontSize: 12, color: T.ok }}>Saved. Checkout will prefill from this.</span>}
          </div>
        </div>
      )}

      <Btn onClick={() => { setSes(s => ({ ...s, user: null })); go("home"); }}>Sign out</Btn>
    </div>
  );
}

function OrderDetail({ ses, orderId, go }) {
  const order = ses.orders.find(o => o.id === orderId);
  if (!order) return <Empty>Order not found.</Empty>;
  const t = totals(order.items);
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Head title={order.number} sub={`Placed ${order.history[0].at}`} back={{ label: "Your account", onClick: () => go("account") }} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 240px" }}><div style={{ ...cardStyle, padding: 16 }}><Timeline order={order} /></div></div>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ ...cardStyle, padding: 16 }}>
            {order.items.map(i => (
              <div key={i.productId} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 9, marginBottom: 9, borderBottom: `1px solid ${T.lineSoft}` }}>
                <div><div className="ft-body" style={{ fontSize: 13 }}>{i.brand} {i.name} × {i.qty}</div><div className="ft-mono" style={{ fontSize: 11, color: T.muted }}>{i.sku}</div></div>
                <div className="ft-body" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{money(i.price * i.qty)}</div>
              </div>
            ))}
            <Summary t={t} />
            <div className="ft-body" style={{ fontSize: 12, color: T.muted, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.lineSoft}`, lineHeight: 1.7 }}>
              {order.address.line1}<br />{order.address.city}, {order.address.state} {order.address.zip}<br />
              <span className="ft-mono">Paid with {order.paymentMethod}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
