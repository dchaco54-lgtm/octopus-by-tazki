import { cn } from "@/lib/utils";
import { getStatusMeta } from "@/modules/subscriptions/list-view/helpers";
import { type DerivedSubscriptionStatus } from "@/modules/subscriptions/list-view/types";

interface SubscriptionStatusBadgeProps {
  status: DerivedSubscriptionStatus;
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}

