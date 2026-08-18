import { cn } from "@/lib/cn";

export type TimelineStepState = "done" | "current" | "upcoming";

export type TimelineStep = {
  label: string;
  sublabel?: string;
  state: TimelineStepState;
};

function StepMarker({ state }: { state: TimelineStepState }) {
  if (state === "done") {
    return (
      <span className="flex size-[22px] items-center justify-center rounded-pill bg-accent text-xs text-accent-ink">
        ✓
      </span>
    );
  }
  if (state === "current") {
    return <span className="box-border size-[22px] rounded-pill border-2 border-accent bg-surface" />;
  }
  return <span className="box-border size-[22px] rounded-pill border-[1.5px] border-line bg-surface" />;
}

// The order timeline — Paid → Preparing → Packed → Shipped → Delivered.
// Customer and admin render from the same OrderEvent list.
export function Timeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn("flex items-start", className)} aria-label="Order progress">
      {steps.map((step, i) => (
        <li key={step.label} className="contents">
          {i > 0 && (
            <span
              aria-hidden
              className={cn(
                "mt-[10px] h-[1.5px] flex-1",
                step.state === "upcoming" ? "bg-line" : "bg-ink"
              )}
            />
          )}
          <span
            className="flex flex-1 flex-col items-center gap-2 text-center"
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <StepMarker state={step.state} />
            <span
              className={cn(
                "font-mono text-[11px] uppercase tracking-[0.06em]",
                step.state === "current"
                  ? "text-accent"
                  : step.state === "done"
                    ? "text-ink"
                    : "text-ink-secondary"
              )}
            >
              {step.label}
            </span>
            {step.sublabel && (
              <span className="font-mono text-[10px] uppercase text-ink-secondary">
                {step.sublabel}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
