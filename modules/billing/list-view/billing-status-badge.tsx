import { cn } from "@/lib/utils";
import { getInvoiceStatusMeta, getPaymentStatusMeta } from "@/modules/billing/list-view/helpers";
import type { BillingInvoiceStatus, BillingPaymentStatus } from "@/modules/billing/list-view/types";

interface BillingStatusBadgeProps {
  kind: "invoice" | "payment";
  status: BillingInvoiceStatus | BillingPaymentStatus;
}

export function BillingStatusBadge({ kind, status }: BillingStatusBadgeProps) {
  const meta = kind === "invoice" ? getInvoiceStatusMeta(status as BillingInvoiceStatus) : getPaymentStatusMeta(status as BillingPaymentStatus);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}
