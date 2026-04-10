import type { ReactNode } from "react";

interface DetailSidePanelSectionProps {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}

export function DetailSidePanelSection({ eyebrow, title, children }: DetailSidePanelSectionProps) {
  return (
    <section className="border-b border-[var(--tazki-slate-200)] pb-4 last:border-b-0 last:pb-0">
      <div className="mb-3">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tazki-slate-400)]">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-base font-semibold text-[var(--tazki-slate-950)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
