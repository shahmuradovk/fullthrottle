"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

// The dialog panel on its own — 4 px radius and shadow are allowed here
// (elevation is reserved for modal / toast / bottom sheet).
export function ModalPanel({
  title,
  children,
  actions,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cn(
        "flex w-full max-w-md flex-col gap-3 rounded-2 border border-line bg-surface p-5 shadow-(--shadow-pop)",
        className
      )}
    >
      <h2 className="font-display text-[22px] font-semibold leading-tight text-ink">{title}</h2>
      {children && <div className="type-small text-ink-secondary">{children}</div>}
      {actions && <div className="mt-1 flex justify-end gap-2.5">{actions}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <ModalPanel title={title} actions={actions}>
          {children}
        </ModalPanel>
      </div>
    </div>
  );
}
