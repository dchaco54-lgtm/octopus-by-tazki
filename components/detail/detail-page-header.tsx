import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface DetailPageHeaderProps {
  moduleLabel: string;
  title: string;
  subtitle?: string | null;
  statusLabel?: string;
  statusVariant?: "success" | "warning" | "danger" | "default";
  statusClassName?: string;
  actions?: ReactNode;
}

export function DetailPageHeader({
  moduleLabel,
  title,
  subtitle,
  statusLabel,
  statusVariant = "default",
  statusClassName,
  actions,
}: DetailPageHeaderProps) {
  return (
    <div className="border-b border-[var(--tazki-slate-200)] pb-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tazki-slate-400)]">{moduleLabel}</p>
            {statusLabel ? (
              <Badge variant={statusVariant} className={statusClassName}>
                {statusLabel}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--tazki-slate-950)]">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-[13px] text-[var(--tazki-slate-500)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

