import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { StockBadge } from "@/components/ui/stock-badge";
import { ChipDemo } from "./chip-demo";
import { Card } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { SpecTable } from "@/components/ui/spec-table";
import { ModalPanel } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { Timeline } from "@/components/ui/timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import type { AttributeDef } from "@/lib/attributes/types";

export const metadata: Metadata = {
  title: "Fullthrottle — Component sheet",
};

// Demo attribute template — exercises unit, boolean and multi-value rendering.
// Data-driven: the SpecTable below never names an attribute itself.
const demoAttributes: AttributeDef[] = [
  { id: "d1", key: "weight", name: "Weight", type: "NUMBER", options: [], unit: "g", filterable: true, position: 0 },
  { id: "d2", key: "pinlock-included", name: "Pinlock included", type: "BOOLEAN", options: [], unit: null, filterable: true, position: 1 },
  { id: "d3", key: "certification", name: "Certification", type: "MULTISELECT", options: ["DOT", "ECE 22.06", "SNELL M2020"], unit: null, filterable: true, position: 2 },
  { id: "d4", key: "shell-material", name: "Shell material", type: "SELECT", options: [], unit: null, filterable: true, position: 3 },
];

const demoValues = {
  weight: 1270,
  "pinlock-included": true,
  certification: ["DOT", "ECE 22.06", "SNELL M2020"],
  "shell-material": "Fiberglass composite",
};

function Panel({
  code,
  title,
  children,
  className,
}: {
  code: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col gap-4 p-6 ${className ?? ""}`} as="section">
      <h2 className="type-label text-ink-secondary">
        {code} · {title}
      </h2>
      {children}
    </Card>
  );
}

export default function GalleryPage() {
  return (
    <main className="p-6 md:p-12">
      <header className="mb-7 flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-[40px] font-bold tracking-[0.01em] text-ink">
          FULLTHROTTLE
        </h1>
        <p className="type-label text-ink-secondary">Component sheet · FT-CS-01 · Rev A</p>
      </header>

      <div className="flex max-w-[1560px] flex-wrap items-start gap-6">
        <Panel code="01" title="Button" className="w-[360px]">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Add to cart</Button>
            <Button variant="secondary">Save for later</Button>
            <Button variant="quiet">Change bike</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Out of stock</Button>
            <Button variant="destructive">Remove item</Button>
            <Button size="small" variant="secondary">
              Small · admin density
            </Button>
          </div>
          <p className="font-mono text-[11px] text-ink-secondary">
            primary · secondary · quiet / disabled · destructive · small — focus ring via
            keyboard (Tab)
          </p>
        </Panel>

        <Panel code="02" title="Input / Select / Checkbox" className="w-[360px]">
          <Input id="g-address" label="Street address" defaultValue="4418 Mill St, Apt 2" />
          <Input
            id="g-card"
            label="Card number"
            mono
            defaultValue="4242 0000"
            error="That's 8 digits — a card number has 16. Check the card and re-enter it."
          />
          <Input id="g-zip" label="ZIP" mono hint="5 digits" placeholder="89501" />
          <Select
            id="g-state"
            label="State"
            defaultValue="NV"
            options={[
              { value: "NV", label: "Nevada" },
              { value: "OR", label: "Oregon" },
            ]}
          />
          <div className="flex flex-col gap-2.5">
            <Checkbox id="g-billing" label="Use this address for billing" defaultChecked />
            <Checkbox id="g-restock" label="Email me when back in stock" />
          </div>
        </Panel>

        <Panel code="03" title="Filter chip + Stock badge" className="w-[400px]">
          <ChipDemo />
          <div className="flex flex-col items-start gap-2.5">
            <StockBadge state="in" />
            <StockBadge state="low" qty={2} />
            <StockBadge state="supplier" />
            <StockBadge state="out" />
          </div>
        </Panel>

        <Panel code="04" title="Product card" className="w-[340px]">
          <article className="overflow-hidden rounded-1 border border-line transition-[border-color] duration-(--dur-fast) hover:border-ink">
            <div className="img-placeholder relative flex h-[150px] items-center justify-center">
              <Callout n={1} className="absolute left-2.5 top-2.5" />
              <span className="font-mono text-[11px] text-ink-secondary">product photo</span>
            </div>
            <div className="flex flex-col gap-1.5 px-4 py-3.5">
              <p className="type-label text-ink-secondary">AGV · AGV-K6S-MB</p>
              <p className="text-[19px] font-semibold text-ink">K6 S</p>
              <p className="font-mono text-xs text-ink-secondary">
                Full-face · 1,270 g · DOT · ECE 22.06
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <StockBadge state="in" />
                <span className="type-data !text-[15px] text-ink">$549.00</span>
              </div>
            </div>
          </article>
        </Panel>

        <Panel code="05" title="Table (spec / fiche)" className="w-[460px]">
          <SpecTable attributes={demoAttributes} values={demoValues} />
          <p className="font-mono text-[11px] text-ink-secondary">
            unit · boolean · multi-value — all from AttributeDef[]
          </p>
        </Panel>

        <Panel code="06" title="Modal + Toast" className="w-[400px]">
          <ModalPanel
            title="Remove this item?"
            actions={
              <>
                <Button variant="secondary" size="small">
                  Keep it
                </Button>
                <Button variant="destructive" size="small">
                  Remove item
                </Button>
              </>
            }
          >
            Shoei RF-1400, size L will leave your cart. You can add it again from Moto
            Helmets.
          </ModalPanel>
          <Toast message="Added to cart — K6 S, size M" action={{ label: "View cart", href: "#" }} />
        </Panel>

        <Panel code="07" title="Order timeline" className="w-[520px]">
          <Timeline
            steps={[
              { label: "Paid", sublabel: "Aug 14", state: "done" },
              { label: "Preparing", sublabel: "Aug 14", state: "done" },
              { label: "Packed", sublabel: "Now", state: "current" },
              { label: "Shipped", sublabel: "Tracking no. appears here", state: "upcoming" },
              { label: "Delivered", state: "upcoming" },
            ]}
          />
        </Panel>

        <Panel code="08" title="Empty state + Skeleton" className="w-[400px]">
          <EmptyState
            title="No helmets match these filters"
            body="Removing the weight limit brings back 9 results."
            action={
              <Button variant="secondary" size="small">
                Clear all filters
              </Button>
            }
          />
          <SkeletonCard />
          <div className="flex animate-pulse-ft flex-col gap-2.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </Panel>
      </div>
    </main>
  );
}
