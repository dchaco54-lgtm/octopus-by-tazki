import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteImportedBillingRecordAction } from "@/modules/billing/actions";
import { DetailPageHeader } from "@/components/detail/detail-page-header";
import { ERP_ASIDE_PANEL_CLASSNAME, ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { BillingStatusBadge } from "@/modules/billing/list-view/billing-status-badge";
import { formatCurrency, formatDate, formatUf, getClientName } from "@/modules/billing/list-view/helpers";
import { getBillingRecordById } from "@/services/billing-service";

interface BillingDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; success?: string; error?: string }>;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <dt className="text-[var(--tazki-slate-500)]">{label}</dt>
      <dd className="font-medium text-[var(--tazki-slate-900)]">{value}</dd>
    </div>
  );
}

export default async function BillingDetailPage({ params, searchParams }: BillingDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await getBillingRecordById(id);

  if (!detail) {
    notFound();
  }

  const activeTab = query.tab === "payments" || query.tab === "notes" ? query.tab : "summary";
  const { record, payments } = detail;
  const isExternal = record.origin === "externo";

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
          <DetailPageHeader
            moduleLabel="Facturacion"
            title={record.number}
            subtitle={[getClientName(record), record.company?.internal_code ? `Cliente ID ${record.company.internal_code}` : null].filter(Boolean).join(" · ")}
            actions={
              <>
                {!isExternal ? (
                  <Link href={`/billing/${id}/emit`} className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--tazki-blue-900)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--tazki-blue-700)]">
                    Emitir / Confirmar
                  </Link>
                ) : null}
                {!isExternal ? (
                  <Link href={`/billing/${id}/outputs/xml/generate`} className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]">
                    Generar XML
                  </Link>
                ) : null}
                <Link href={`/billing/${id}/outputs/pdf/generate`} className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]">
                  Generar PDF
                </Link>
                <form
                  action={async () => {
                    "use server";
                    const result = await deleteImportedBillingRecordAction(id);
                    if (!result.ok) {
                      redirect(`/billing/${id}?error=${encodeURIComponent(result.error)}`);
                    }
                    redirect(`/billing?success=${encodeURIComponent(result.message)}`);
                  }}
                >
                  <button type="submit" className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-[13px] font-semibold text-red-700 hover:bg-red-50">
                    Eliminar
                  </button>
                </form>
                <Link href="/billing" className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]">
                  Volver
                </Link>
              </>
            }
          />

          {query.success ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{query.success}</div>
          ) : null}
          {query.error ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{query.error}</div>
          ) : null}

          <div className="grid gap-x-8 gap-y-3 pt-4 md:grid-cols-2">
            <dl className="space-y-1">
              <FieldRow label="Numero" value={record.number} />
              <FieldRow label="Origen" value={record.origin === "externo" ? "Externo" : "Tazki"} />
              <FieldRow label="Moneda base" value={record.currency} />
              <FieldRow label="Cliente" value={getClientName(record)} />
              <FieldRow label="Cliente ID" value={record.company?.internal_code ?? "\u2014"} />
              <FieldRow label="RUT" value={record.company?.rut ?? "\u2014"} />
              <FieldRow label="Suscripcion" value={record.subscription?.subscription_code ?? "\u2014"} />
            </dl>
            <dl className="space-y-1">
              <FieldRow label="Fecha factura" value={formatDate(record.invoice_date)} />
              <FieldRow label="Fecha venc." value={formatDate(record.due_date)} />
              <FieldRow label="UF utilizada" value={record.uf_value_used > 0 ? formatUf(record.uf_value_used) : "\u2014"} />
              <FieldRow label="Total CLP" value={formatCurrency(record.total_clp)} />
              <FieldRow label="Total UF" value={formatUf(record.total_uf)} />
              <FieldRow label="Adeudado" value={formatCurrency(record.outstanding_amount)} />
            </dl>
          </div>

          <div className="mt-4 flex items-center gap-2 border-b border-[var(--tazki-slate-200)]">
            {[
              { key: "summary", label: "Resumen" },
              { key: "payments", label: "Pagos" },
              { key: "notes", label: "Observaciones" },
            ].map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={`/billing/${id}?tab=${tab.key}`}
                  className={`-mb-px rounded-t-md border border-[var(--tazki-slate-200)] px-3 py-2 text-[13px] font-semibold ${
                    selected
                      ? "border-b-white bg-white text-[var(--tazki-slate-950)]"
                      : "border-b-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] text-[var(--tazki-slate-600)] hover:bg-white hover:text-[var(--tazki-slate-950)]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-4">
            {activeTab === "summary" ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--tazki-slate-400)]">Estados</h2>
                  <div className="flex items-center gap-2">
                    <BillingStatusBadge kind="invoice" status={record.invoice_status} />
                    <BillingStatusBadge kind="payment" status={record.payment_status} />
                  </div>
                  <p className="text-sm text-[var(--tazki-slate-600)]">
                    Bloqueos documentales: {[record.blocked_by_oc ? "OC" : null, record.blocked_by_hes ? "HES/MIGO" : null].filter(Boolean).join(" + ") || "Sin bloqueos"}.
                  </p>
                </div>

                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--tazki-slate-400)]">Snapshot monetario</h2>
                  <div className="rounded-2xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-4 py-4">
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--tazki-slate-500)]">Neto UF</span>
                        <span className="font-medium text-[var(--tazki-slate-900)]">{formatUf(record.dual_totals.net_uf)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--tazki-slate-500)]">Neto CLP</span>
                        <span className="font-medium text-[var(--tazki-slate-900)]">{formatCurrency(record.dual_totals.net_clp)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--tazki-slate-500)]">IVA UF</span>
                        <span className="font-medium text-[var(--tazki-slate-900)]">{formatUf(record.dual_totals.tax_uf)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--tazki-slate-500)]">IVA CLP</span>
                        <span className="font-medium text-[var(--tazki-slate-900)]">{formatCurrency(record.dual_totals.tax_clp)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[var(--tazki-slate-900)]">Total UF</span>
                        <span className="font-semibold text-[var(--tazki-slate-950)]">{formatUf(record.dual_totals.total_uf)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[var(--tazki-slate-900)]">Total CLP</span>
                        <span className="font-semibold text-[var(--tazki-slate-950)]">{formatCurrency(record.dual_totals.total_clp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "payments" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--tazki-slate-400)]">Pagos</h2>
                    <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">Submodulo preparado para registrar pagos manuales aplicados a la factura.</p>
                  </div>
                  <Link href={`/billing/${id}?tab=payments`} className="inline-flex h-8 items-center rounded-md border border-[var(--tazki-slate-200)] px-3 text-[13px] font-semibold text-[var(--tazki-slate-700)] hover:bg-[var(--tazki-slate-50)]">
                    Registrar pago
                  </Link>
                </div>

                <div className="overflow-hidden rounded-xl border border-[var(--tazki-slate-200)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--tazki-slate-50)]">
                      <tr className="border-b border-[var(--tazki-slate-200)]">
                        <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Fecha pago</th>
                        <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Medio de pago</th>
                        <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Total pagado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-10 text-center text-[var(--tazki-slate-500)]">
                            Aun no hay pagos registrados para esta factura.
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr key={payment.id} className="border-b border-[var(--tazki-slate-200)] last:border-b-0">
                            <td className="px-4 py-3 text-[var(--tazki-slate-700)]">{formatDate(payment.payment_date)}</td>
                            <td className="px-4 py-3 text-[var(--tazki-slate-700)]">{payment.payment_method}</td>
                            <td className="px-4 py-3 text-right font-medium text-[var(--tazki-slate-900)]">{formatCurrency(payment.total_paid)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {activeTab === "notes" ? (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--tazki-slate-400)]">Observaciones</h2>
                <p className="text-sm text-[var(--tazki-slate-600)]">
                  La factura queda preparada para observaciones operativas, notas de cobranza y validaciones documentales futuras.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="xl:sticky xl:top-[88px] xl:self-start">
          <div className={ERP_ASIDE_PANEL_CLASSNAME}>
            <div className="space-y-4 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Estado factura</p>
                <div className="mt-2">
                  <BillingStatusBadge kind="invoice" status={record.invoice_status} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Estado pago</p>
                <div className="mt-2">
                  <BillingStatusBadge kind="payment" status={record.payment_status} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Saldo adeudado</p>
                <p className="mt-2 text-lg font-semibold text-[var(--tazki-slate-950)]">{formatCurrency(record.outstanding_amount)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">UF snapshot</p>
                <p className="mt-2 text-lg font-semibold text-[var(--tazki-slate-950)]">{record.uf_value_used > 0 ? formatUf(record.uf_value_used) : "\u2014"}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
