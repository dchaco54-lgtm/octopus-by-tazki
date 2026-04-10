"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BILLING_DOCUMENT_REQUIREMENT_OPTIONS,
  BILLING_MODEL_OPTIONS,
  DEFAULT_BILLING_DOCUMENT_REQUIREMENT,
  DEFAULT_OC_USAGE_TYPE,
  DEFAULT_OC_USAGE_TYPE_WITH_OC,
  OC_USAGE_TYPE_OPTIONS,
  billingModelRequiresValidation,
  billingModelUsesOc,
  type BillingDocumentRequirement,
  type BillingModel,
  type OcUsageType,
} from "@/modules/clients/constants";

interface ClientBillingFormProps {
  action: (formData: FormData) => void;
  formId?: string;
  showSubmitButton?: boolean;
  showTaxDataSection?: boolean;
  defaultValues: {
    billing_model: BillingModel;
    billing_document_requirement: BillingDocumentRequirement;
    oc_usage_type: OcUsageType;
    is_recurring_billing: boolean;
    billing_email: string | null;
    payer_client_id: string | null;
    payer_client_rut: string | null;
    dte_email: string | null;
    taxpayer_type: string | null;
    currency: string | null;
    industry: string | null;
    created_at_label: string;
  };
  payerOptions: Array<{
    id: string;
    trade_name: string | null;
    rut: string | null;
  }>;
  activePurchaseOrder: {
    purchase_order_number: string | null;
    valid_from_label: string;
    valid_to_label: string;
    status_label: string;
  } | null;
  viewPurchaseOrdersHref: string;
}

export function ClientBillingForm({
  action,
  formId,
  showSubmitButton = true,
  showTaxDataSection = true,
  defaultValues,
  payerOptions,
  activePurchaseOrder,
  viewPurchaseOrdersHref,
}: ClientBillingFormProps) {
  const [billingModel, setBillingModel] = useState<BillingModel>(defaultValues.billing_model);
  const [billingDocumentRequirement, setBillingDocumentRequirement] = useState<BillingDocumentRequirement>(
    defaultValues.billing_document_requirement
  );
  const [ocUsageType, setOcUsageType] = useState<OcUsageType>(defaultValues.oc_usage_type);
  const [isRecurringBilling, setIsRecurringBilling] = useState(defaultValues.is_recurring_billing);

  const showOcFields = billingModelUsesOc(billingModel);
  const showDocumentRequirement = billingModelRequiresValidation(billingModel);

  const handleBillingModelChange = (nextModel: BillingModel) => {
    setBillingModel(nextModel);
    setIsRecurringBilling(true);

    if (billingModelUsesOc(nextModel)) {
      setOcUsageType((current) => (current === DEFAULT_OC_USAGE_TYPE ? DEFAULT_OC_USAGE_TYPE_WITH_OC : current));
    } else {
      setOcUsageType(DEFAULT_OC_USAGE_TYPE);
    }

    if (!billingModelRequiresValidation(nextModel)) {
      setBillingDocumentRequirement(DEFAULT_BILLING_DOCUMENT_REQUIREMENT);
    }
  };

  return (
    <form
      id={formId}
      action={action}
      className="space-y-4"
      onReset={() => {
        setBillingModel(defaultValues.billing_model);
        setBillingDocumentRequirement(defaultValues.billing_document_requirement);
        setOcUsageType(defaultValues.oc_usage_type);
        setIsRecurringBilling(defaultValues.is_recurring_billing);
      }}
    >
      <input type="hidden" name="redirect_tab" value="billing" />

      {showTaxDataSection ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Configuracion de facturacion</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Modelo de facturacion</span>
              <select
                name="billing_model"
                value={billingModel}
                onChange={(event) => handleBillingModelChange(event.target.value as BillingModel)}
                className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3"
              >
                {BILLING_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Facturacion recurrente</span>
              <select
                name="is_recurring_billing"
                value={isRecurringBilling ? "true" : "false"}
                onChange={(event) => setIsRecurringBilling(event.target.value === "true")}
                className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3"
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
              <span className="block text-xs text-[var(--tazki-slate-500)]">Define si este cliente se factura de forma recurrente.</span>
            </label>

            {showOcFields ? (
              <label className="space-y-1 text-sm">
                <span>Uso de OC</span>
                <select
                  name="oc_usage_type"
                  value={ocUsageType}
                  onChange={(event) => setOcUsageType(event.target.value as OcUsageType)}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3"
                >
                  {OC_USAGE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {showDocumentRequirement ? (
              <label className="space-y-1 text-sm">
                <span>Documento requerido para facturar</span>
                <select
                  name="billing_document_requirement"
                  value={billingDocumentRequirement}
                  onChange={(event) => setBillingDocumentRequirement(event.target.value as BillingDocumentRequirement)}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3"
                >
                  {BILLING_DOCUMENT_REQUIREMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <section className="border-b border-[var(--tazki-slate-200)] pb-3">
          <div className="grid gap-2.5 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Modelo de facturacion</span>
              <select
                name="billing_model"
                value={billingModel}
                onChange={(event) => handleBillingModelChange(event.target.value as BillingModel)}
                className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
              >
                {BILLING_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Facturacion recurrente</span>
              <select
                name="is_recurring_billing"
                value={isRecurringBilling ? "true" : "false"}
                onChange={(event) => setIsRecurringBilling(event.target.value === "true")}
                className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
              <span className="block text-[11px] text-[var(--tazki-slate-500)]">Mantiene coherencia con el modelo seleccionado.</span>
            </label>

            {showOcFields ? (
              <label className="space-y-1 text-sm">
                <span>Uso de OC</span>
                <select
                  name="oc_usage_type"
                  value={ocUsageType}
                  onChange={(event) => setOcUsageType(event.target.value as OcUsageType)}
                  className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
                >
                  {OC_USAGE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {showDocumentRequirement ? (
              <label className="space-y-1 text-sm">
                <span>Documento requerido para facturar</span>
                <select
                  name="billing_document_requirement"
                  value={billingDocumentRequirement}
                  onChange={(event) => setBillingDocumentRequirement(event.target.value as BillingDocumentRequirement)}
                  className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
                >
                  {BILLING_DOCUMENT_REQUIREMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="space-y-1 text-sm">
              <span>Cliente pagador</span>
              <select
                name="payer_client_id"
                defaultValue={defaultValues.payer_client_id ?? ""}
                className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
              >
                <option value="">Sin cliente pagador</option>
                {payerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.trade_name} · {option.rut}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>RUT cliente pagador</span>
              <input
                name="payer_client_rut"
                defaultValue={defaultValues.payer_client_rut ?? ""}
                className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Correo facturacion</span>
              <input
                name="billing_email"
                type="email"
                defaultValue={defaultValues.billing_email ?? ""}
                className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Correo DTE</span>
              <input
                name="dte_email"
                type="text"
                defaultValue={defaultValues.dte_email ?? ""}
                placeholder="dte@empresa.cl, cobranzas@empresa.cl"
                className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
              />
              <span className="block text-[11px] text-[var(--tazki-slate-500)]">Separa multiples correos con coma.</span>
            </label>

            <label className="space-y-1 text-sm">
              <span>Tipo contribuyente</span>
              <select name="taxpayer_type" defaultValue={defaultValues.taxpayer_type ?? "Primera Categoria"} className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]">
                <option value="Primera Categoria">Primera Categoria</option>
                <option value="Segunda Categoria">Segunda Categoria</option>
                <option value="Persona Natural">Persona Natural</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Moneda</span>
              <select name="currency" defaultValue={defaultValues.currency ?? "CLP"} className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]">
                <option value="UF">UF</option>
                <option value="USD">USD</option>
                <option value="CLP">CLP</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Giro</span>
              <input
                name="industry"
                defaultValue={defaultValues.industry ?? ""}
                className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)]/80 px-2.5 text-[13px]"
              />
            </label>

            <div className="space-y-1 text-sm">
              <span>Fecha creacion</span>
              <div className="flex h-8 items-center rounded-md border border-[var(--tazki-slate-200)]/80 bg-[var(--tazki-slate-50)] px-2.5 text-[13px] text-[var(--tazki-slate-700)]">
                {defaultValues.created_at_label}
              </div>
            </div>
          </div>
        </section>
      )}

      {showTaxDataSection ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Datos tributarios</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Cliente pagador</span>
              <select name="payer_client_id" defaultValue={defaultValues.payer_client_id ?? ""} className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3">
                <option value="">Sin cliente pagador</option>
                {payerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.trade_name} · {option.rut}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>RUT cliente pagador</span>
              <input name="payer_client_rut" defaultValue={defaultValues.payer_client_rut ?? ""} className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3" />
            </label>

            <label className="space-y-1 text-sm">
              <span>Correo DTE</span>
              <input
                name="dte_email"
                type="text"
                defaultValue={defaultValues.dte_email ?? ""}
                placeholder="dte@empresa.cl, cobranzas@empresa.cl"
                className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3"
              />
              <span className="block text-[11px] text-[var(--tazki-slate-500)]">Separa multiples correos con coma.</span>
            </label>

            <label className="space-y-1 text-sm">
              <span>Tipo contribuyente</span>
              <select name="taxpayer_type" defaultValue={defaultValues.taxpayer_type ?? "Primera Categoria"} className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3">
                <option value="Primera Categoria">Primera Categoria</option>
                <option value="Segunda Categoria">Segunda Categoria</option>
                <option value="Persona Natural">Persona Natural</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Moneda</span>
              <select name="currency" defaultValue={defaultValues.currency ?? "CLP"} className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3">
                <option value="UF">UF</option>
                <option value="USD">USD</option>
                <option value="CLP">CLP</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Giro</span>
              <input name="industry" defaultValue={defaultValues.industry ?? ""} className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] px-3" />
            </label>

            <div className="space-y-1 text-sm">
              <span className="block">Fecha creacion</span>
              <div className="flex h-10 items-center rounded-lg border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 text-[var(--tazki-slate-700)]">
                {defaultValues.created_at_label}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showOcFields ? (
        showTaxDataSection ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle>OC activa</CardTitle>
              </div>
              <Link
                href={viewPurchaseOrdersHref}
                className="inline-flex items-center rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tazki-blue-700)] hover:bg-[var(--tazki-slate-50)]"
              >
                Ver OC
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {activePurchaseOrder ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">Numero de OC</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--tazki-slate-950)]">{activePurchaseOrder.purchase_order_number || "Sin registro"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">Estado</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--tazki-slate-950)]">{activePurchaseOrder.status_label}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">Vigencia desde</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--tazki-slate-950)]">{activePurchaseOrder.valid_from_label}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">Vigencia hasta</dt>
                    <dd className="mt-1 text-base font-semibold text-[var(--tazki-slate-950)]">{activePurchaseOrder.valid_to_label}</dd>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-[var(--tazki-slate-600)]">Sin OC vigente</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <section className="border-b border-[var(--tazki-slate-200)] pb-2">
            <div className="mb-3 flex flex-row items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--tazki-slate-950)]">OC activa</h2>
                <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">Referencia vigente para la facturacion operativa.</p>
              </div>
              <Link
                href={viewPurchaseOrdersHref}
                className="inline-flex items-center rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tazki-blue-700)] hover:bg-[var(--tazki-slate-50)]"
              >
                Ver OC
              </Link>
            </div>
            {activePurchaseOrder ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">Numero de OC</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--tazki-slate-950)]">{activePurchaseOrder.purchase_order_number || "Sin registro"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">Estado</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--tazki-slate-950)]">{activePurchaseOrder.status_label}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">Vigencia desde</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--tazki-slate-950)]">{activePurchaseOrder.valid_from_label}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">Vigencia hasta</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--tazki-slate-950)]">{activePurchaseOrder.valid_to_label}</dd>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-[var(--tazki-slate-600)]">Sin OC vigente</p>
            )}
          </section>
        )
      ) : null}

      {showSubmitButton ? (
        <button type="submit" className="rounded-lg bg-[var(--tazki-blue-900)] px-4 py-2 text-sm font-semibold text-white">
          Guardar cambios
        </button>
      ) : null}
    </form>
  );
}
