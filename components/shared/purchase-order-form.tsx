"use client";

import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

type PurchaseOrderStatus = "vigente" | "vencida" | "futura" | "anulada";

export interface PurchaseOrderFormValues {
  purchase_order_number?: string;
  valid_from?: string;
  valid_to?: string;
  status?: PurchaseOrderStatus;
  notes?: string;
}

interface PurchaseOrderFormProps {
  action: (formData: FormData) => void;
  submitLabel?: string;
  defaultValues?: PurchaseOrderFormValues;
  showCancelHref?: string;
  onCancel?: () => void;
}

export function PurchaseOrderForm({
  action,
  submitLabel = "Guardar",
  defaultValues,
  showCancelHref,
  onCancel,
}: PurchaseOrderFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <input
          name="purchase_order_number"
          defaultValue={defaultValues?.purchase_order_number ?? ""}
          placeholder="Numero OC"
          className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
          required
        />
        <input
          name="valid_from"
          type="date"
          defaultValue={defaultValues?.valid_from ?? ""}
          className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
        />
        <input
          name="valid_to"
          type="date"
          defaultValue={defaultValues?.valid_to ?? ""}
          className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <select
          name="status"
          defaultValue={defaultValues?.status ?? "vigente"}
          className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
        >
          <option value="vigente">vigente</option>
          <option value="vencida">vencida</option>
          <option value="futura">futura</option>
          <option value="anulada">anulada</option>
        </select>
        <input
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Observacion"
          className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm md:col-span-2"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex min-w-[240px] items-center gap-3">
          <input
            ref={fileInputRef}
            name="attachment_pdf"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFileName(file?.name ?? "");
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
            Adjuntar PDF
          </Button>
          <span className="truncate text-xs text-[var(--tazki-slate-500)]">
            {fileName ? fileName : "Ningun archivo seleccionado"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showCancelHref ? (
            <a
              href={showCancelHref}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--tazki-slate-600)] hover:bg-[var(--tazki-slate-100)]"
            >
              Cancelar
            </a>
          ) : onCancel ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit">{submitLabel}</Button>
        </div>
      </div>
    </form>
  );
}
