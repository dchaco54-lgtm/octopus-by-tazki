import type { ReactNode } from "react";

interface BillingPageHeaderProps {
  tools: ReactNode;
}

export function BillingPageHeader({ tools }: BillingPageHeaderProps) {
  return (
    <div className="flex min-h-14 flex-col justify-center gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--tazki-slate-950)]">Facturacion</h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">{tools}</div>
    </div>
  );
}
