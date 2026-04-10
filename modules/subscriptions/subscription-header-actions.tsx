"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteSubscriptionAction, updateSubscriptionStatusAction } from "@/modules/subscriptions/actions";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex h-9 items-center justify-center rounded-md border px-3 text-[13px] font-semibold transition",
        "border-[var(--tazki-slate-200)] bg-white text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]",
        className
      )}
    />
  );
}

export function SubscriptionHeaderActions({
  subscriptionId,
  activeTab,
  canManage,
  isEditing,
  currentStatus,
  currentCloseReason,
  currentEndDate,
}: {
  subscriptionId: string;
  activeTab: string;
  canManage: boolean;
  isEditing: boolean;
  currentStatus: "demo" | "active" | "closed";
  currentCloseReason: string | null;
  currentEndDate: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<"demo" | "active" | "closed">(currentStatus);
  const [closeReason, setCloseReason] = useState<string>(currentCloseReason ?? "");
  const [endDate, setEndDate] = useState<string>(currentEndDate ?? "");

  function firstDayOfNextMonthISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-based
    const firstNext = new Date(y, m + 1, 1);
    return firstNext.toISOString().slice(0, 10);
  }

  const editHref = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", activeTab);
    sp.set("edit", "1");
    return `${pathname}?${sp.toString()}`;
  }, [activeTab, pathname, searchParams]);

  const cancelHref = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", activeTab);
    sp.delete("edit");
    sp.delete("error");
    return `${pathname}?${sp.toString()}`;
  }, [activeTab, pathname, searchParams]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      {canManage && !isEditing ? (
        <>
          <Link href={editHref} prefetch={false} className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--tazki-blue-900)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--tazki-blue-700)]">
            Editar
          </Link>
          <Link
            href={`/subscriptions/new?previous=${encodeURIComponent(subscriptionId)}&movement=upsell`}
            prefetch={false}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]"
          >
            Upsell
          </Link>
          <Link
            href={`/subscriptions/new?previous=${encodeURIComponent(subscriptionId)}&movement=downsell`}
            prefetch={false}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]"
          >
            Downsell
          </Link>

          <details
            className="relative"
            open={statusOpen}
            onToggle={(e) => {
              const nextOpen = (e.currentTarget as HTMLDetailsElement).open;
              setStatusOpen(nextOpen);
              if (!nextOpen) return;
              setStatusValue(currentStatus);
              setCloseReason(currentCloseReason ?? "");
              setEndDate(currentEndDate ?? "");
            }}
          >
            <summary
              className={cx(
                "list-none",
                "inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]"
              )}
            >
              Cambiar estado
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-[260px] rounded-lg border border-[var(--tazki-slate-200)] bg-white p-3 shadow-sm">
              <form action={updateSubscriptionStatusAction} className="space-y-2">
                <input type="hidden" name="subscription_id" value={subscriptionId} />
                <input type="hidden" name="tab" value={activeTab} />

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">
                    Estado
                  </span>
                  <select
                    name="status"
                    value={statusValue}
                    onChange={(e) => {
                      const next = e.target.value as "demo" | "active" | "closed";
                      setStatusValue(next);
                      if (next === "closed") {
                        // Default to first day of next month, but editable.
                        setEndDate((prev) => prev || firstDayOfNextMonthISO());
                      }
                      if (next !== "closed") {
                        setCloseReason("");
                        setEndDate("");
                      }
                    }}
                    className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                  >
                    <option value="active">Activa</option>
                    <option value="demo">Demo</option>
                    <option value="closed">Cerrada</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">
                    Motivo (si cierra)
                  </span>
                  <select
                    name="close_reason"
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                    disabled={statusValue !== "closed"}
                  >
                    <option value="">-</option>
                    <option value="new">New</option>
                    <option value="churn">Churn</option>
                  </select>
                </label>

                {statusValue === "closed" ? (
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">
                      Fecha cierre
                    </span>
                    <input
                      name="end_date"
                      type="date"
                      value={endDate || firstDayOfNextMonthISO()}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                    />
                    <p className="text-xs text-[var(--tazki-slate-500)]">Por defecto es el 1 del mes siguiente, pero puedes editarla.</p>
                  </label>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => {
                      setStatusOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-blue-900)] bg-[var(--tazki-blue-900)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--tazki-blue-700)]"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </details>

          <form action={deleteSubscriptionAction}>
            <input type="hidden" name="subscription_id" value={subscriptionId} />
            <input type="hidden" name="tab" value={activeTab} />
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-[13px] font-semibold text-[var(--tazki-danger)] hover:bg-red-100"
              onClick={(e) => {
                if (!window.confirm("Esto eliminara la suscripcion de la base de datos (irreversible). Quieres continuar?")) {
                  e.preventDefault();
                }
              }}
            >
              Eliminar
            </button>
          </form>
        </>
      ) : null}

      {canManage && isEditing ? (
        <>
          <Button
            type="button"
            onClick={() => {
              router.push(cancelHref);
            }}
          >
            Cancelar
          </Button>
          <button
            type="submit"
            form="subscription-summary-form"
            className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--tazki-blue-900)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--tazki-blue-700)]"
          >
            Guardar
          </button>
        </>
      ) : null}

      <Link href="/subscriptions" className="font-semibold text-[var(--tazki-blue-700)]">
        Volver
      </Link>
    </div>
  );
}
