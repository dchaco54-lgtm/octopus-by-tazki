"use client";

import { useState } from "react";
import { PurchaseOrderForm } from "@/components/shared/purchase-order-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CreateButtonPlacement = "top" | "bottom";

interface PurchaseOrderCreatePanelProps {
  action: (formData: FormData) => void;
  initiallyOpen?: boolean;
  buttonPlacement?: CreateButtonPlacement;
}

export function PurchaseOrderCreatePanel({
  action,
  initiallyOpen = false,
  buttonPlacement = "top",
}: PurchaseOrderCreatePanelProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const isBottomButton = buttonPlacement === "bottom";

  const triggerButton = !isOpen ? (
    <div className={cn("flex", isBottomButton ? "justify-end pt-1" : "justify-end")}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-8 text-[13px]",
          isBottomButton
            ? "border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-900)]/5 px-3.5 text-[var(--tazki-blue-900)] shadow-sm hover:bg-[var(--tazki-blue-900)]/10"
            : undefined
        )}
        onClick={() => setIsOpen(true)}
      >
        Agregar OC
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {!isBottomButton ? triggerButton : null}

      {isOpen ? (
        <div className="rounded-2xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tazki-slate-500)]">Nueva OC</p>
            <p className="mt-1 text-sm text-[var(--tazki-slate-700)]">Registra la orden y adjunta un PDF opcional.</p>
          </div>
          <PurchaseOrderForm action={action} submitLabel="Guardar" onCancel={() => setIsOpen(false)} />
        </div>
      ) : null}

      {isBottomButton ? triggerButton : null}
    </div>
  );
}
