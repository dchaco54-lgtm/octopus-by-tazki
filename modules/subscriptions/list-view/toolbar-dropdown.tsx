"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarDropdownProps {
  label: string;
  icon: ReactNode;
  children: (controls: { close: () => void }) => ReactNode;
  panelClassName?: string;
  count?: number;
}

export function ToolbarDropdown({ label, icon, children, panelClassName, count }: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-[var(--tazki-slate-700)] transition hover:bg-[var(--tazki-slate-100)] hover:text-[var(--tazki-slate-950)]",
          open && "bg-[var(--tazki-slate-100)] text-[var(--tazki-slate-950)]"
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-[var(--tazki-slate-500)]">{icon}</span>
        <span>{label}</span>
        {typeof count === "number" && count > 0 ? (
          <span className="rounded-full bg-[var(--tazki-slate-200)] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--tazki-slate-700)]">
            {count}
          </span>
        ) : null}
        <ChevronDown className="h-3.5 w-3.5 text-[var(--tazki-slate-400)]" />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-20 w-[280px] rounded-xl border border-[var(--tazki-slate-200)] bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)]",
            panelClassName
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  );
}

