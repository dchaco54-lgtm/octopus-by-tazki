"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CalendarRange, Coins, History, Plus, Save } from "lucide-react";
import { DetailPageHeader } from "@/components/detail/detail-page-header";
import { ERP_ASIDE_PANEL_CLASSNAME, ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deactivateCurrencyRateAction, upsertCurrencyRateAction } from "@/modules/settings/currencies/actions";
import type { CurrencyRateRecord, CurrencyRateUpsertInput } from "@/modules/settings/currencies/types";

const MONTHS = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type FormState = {
  id: string | null;
  currencyCode: "UF" | "CLP";
  periodYear: string;
  periodMonth: string;
  referenceDate: string;
  rateValue: string;
  sourceType: "manual" | "api";
  sourceNote: string;
  isActive: boolean;
};

function todayMonthDefaults() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const referenceDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);

  return {
    periodYear: String(year),
    periodMonth: String(month),
    referenceDate,
  };
}

function createEmptyForm(): FormState {
  const defaults = todayMonthDefaults();

  return {
    id: null,
    currencyCode: "UF",
    periodYear: defaults.periodYear,
    periodMonth: defaults.periodMonth,
    referenceDate: defaults.referenceDate,
    rateValue: "",
    sourceType: "manual",
    sourceNote: "",
    isActive: true,
  };
}

function buildFormFromRate(rate: CurrencyRateRecord): FormState {
  return {
    id: rate.id,
    currencyCode: rate.currency_code,
    periodYear: String(rate.period_year),
    periodMonth: String(rate.period_month),
    referenceDate: rate.reference_date,
    rateValue: String(rate.rate_value),
    sourceType: rate.source_type,
    sourceNote: rate.source_note ?? "",
    isActive: rate.is_active,
  };
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}

function formatRate(rate: CurrencyRateRecord) {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(rate.rate_value);
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("es-CL");
}

function parseRateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;

  if (trimmed.includes(",") && trimmed.includes(".")) {
    return Number(trimmed.replace(/\./g, "").replace(",", "."));
  }

  if (trimmed.includes(",")) {
    return Number(trimmed.replace(",", "."));
  }

  return Number(trimmed);
}

export function CurrencyRatesClient({ initialRates }: { initialRates: CurrencyRateRecord[] }) {
  const [rates, setRates] = useState(initialRates);
  const [selectedId, setSelectedId] = useState<string | null>(initialRates[0]?.id ?? null);
  const [form, setForm] = useState<FormState>(initialRates[0] ? buildFormFromRate(initialRates[0]) : createEmptyForm());
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "UF" | "CLP">("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "api">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedRate = useMemo(
    () => rates.find((rate) => rate.id === selectedId) ?? null,
    [rates, selectedId]
  );

  const years = useMemo(
    () => Array.from(new Set(rates.map((rate) => String(rate.period_year)))).sort((a, b) => Number(b) - Number(a)),
    [rates]
  );

  const filteredRates = useMemo(
    () =>
      rates.filter((rate) => {
        if (currencyFilter !== "all" && rate.currency_code !== currencyFilter) return false;
        if (yearFilter !== "all" && String(rate.period_year) !== yearFilter) return false;
        if (monthFilter !== "all" && String(rate.period_month) !== monthFilter) return false;
        if (sourceFilter !== "all" && rate.source_type !== sourceFilter) return false;
        if (activeFilter === "active" && !rate.is_active) return false;
        if (activeFilter === "inactive" && rate.is_active) return false;
        return true;
      }),
    [activeFilter, currencyFilter, monthFilter, rates, sourceFilter, yearFilter]
  );

  const stats = useMemo(() => {
    const activeUf = rates.filter((rate) => rate.currency_code === "UF" && rate.is_active).length;
    const totalRows = rates.length;
    const latest = rates.find((rate) => rate.currency_code === "UF") ?? null;

    return {
      activeUf,
      totalRows,
      latestLabel: latest ? `${MONTHS[latest.period_month]} ${latest.period_year}` : "Sin datos",
    };
  }, [rates]);

  function handleSelectRate(rate: CurrencyRateRecord) {
    setSelectedId(rate.id);
    setForm(buildFormFromRate(rate));
    setStatusError(null);
    setStatusMessage(null);
  }

  function handleCreateNew() {
    setSelectedId(null);
    setForm(createEmptyForm());
    setStatusError(null);
    setStatusMessage("Preparando nuevo valor de moneda.");
  }

  function handleFormChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildPayload(): CurrencyRateUpsertInput | null {
    const year = Number(form.periodYear);
    const month = Number(form.periodMonth);
    const rateValue = parseRateInput(form.rateValue);

    if (!Number.isFinite(rateValue)) return null;

    return {
      id: form.id,
      currencyCode: form.currencyCode,
      periodYear: year,
      periodMonth: month,
      referenceDate: form.referenceDate,
      rateValue,
      sourceType: form.sourceType,
      sourceNote: form.sourceNote,
      isActive: form.isActive,
    };
  }

  function syncRateInState(nextRate: CurrencyRateRecord) {
    setRates((current) => {
      const existing = current.find((rate) => rate.id === nextRate.id);
      if (!existing) {
        return [nextRate, ...current].sort((a, b) => {
          if (a.currency_code !== b.currency_code) return a.currency_code.localeCompare(b.currency_code);
          if (a.period_year !== b.period_year) return b.period_year - a.period_year;
          return b.period_month - a.period_month;
        });
      }

      return current.map((rate) => (rate.id === nextRate.id ? nextRate : rate));
    });
    setSelectedId(nextRate.id);
    setForm(buildFormFromRate(nextRate));
  }

  function submitForm() {
    const payload = buildPayload();
    if (!payload) {
      setStatusError("Debes ingresar un valor numerico valido.");
      setStatusMessage(null);
      return;
    }

    setStatusError(null);
    setStatusMessage(null);

    startTransition(async () => {
      const result = await upsertCurrencyRateAction(payload);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }

      syncRateInState(result.rate);
      setStatusMessage(result.message);
    });
  }

  function deactivateSelected() {
    if (!selectedRate) return;

    setStatusError(null);
    setStatusMessage(null);

    startTransition(async () => {
      const result = await deactivateCurrencyRateAction(selectedRate.id);
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }

      syncRateInState(result.rate);
      setStatusMessage(result.message);
    });
  }

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
          <DetailPageHeader
            moduleLabel="Configuracion"
            title="Monedas"
            subtitle="Base monetaria operativa para Billing. La UF se administra por periodo y despues se snapshottea en cada factura."
            actions={
              <>
                <Button type="button" size="sm" onClick={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear valor
                </Button>
                <Link href="/settings" className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]">
                  Volver
                </Link>
              </>
            }
          />

          {statusMessage ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</div>
          ) : null}
          {statusError ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{statusError}</div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Card className="border-[var(--tazki-slate-200)] shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tazki-blue-900)]/10 text-[var(--tazki-blue-900)]">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">UF activas</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--tazki-slate-950)]">{stats.activeUf}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[var(--tazki-slate-200)] shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tazki-slate-100)] text-[var(--tazki-slate-700)]">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Historico</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--tazki-slate-950)]">{stats.totalRows}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[var(--tazki-slate-200)] shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Ultimo periodo UF</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--tazki-slate-950)]">{stats.latestLabel}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-3 border-y border-[var(--tazki-slate-200)] py-3 md:grid-cols-5">
            <label className="space-y-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Moneda</span>
              <select value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value as "all" | "UF" | "CLP")} className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px]">
                <option value="all">Todas</option>
                <option value="UF">UF</option>
                <option value="CLP">CLP</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Anio</span>
              <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px]">
                <option value="all">Todos</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Mes</span>
              <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px]">
                <option value="all">Todos</option>
                {MONTHS.map((month, index) =>
                  index === 0 ? null : (
                    <option key={month} value={String(index)}>
                      {month}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Origen</span>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | "manual" | "api")} className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px]">
                <option value="all">Todos</option>
                <option value="manual">Manual</option>
                <option value="api">API</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Estado</span>
              <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as "all" | "active" | "inactive")} className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px]">
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--tazki-slate-200)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--tazki-slate-50)]">
                <tr className="border-b border-[var(--tazki-slate-200)]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Moneda</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Anio</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Mes</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Fecha referencia</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Valor</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Origen</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Estado</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Ultima actualizacion</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-[var(--tazki-slate-500)]">
                      No hay valores que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((rate) => {
                    const selected = rate.id === selectedId;

                    return (
                      <tr key={rate.id} className={`border-b border-[var(--tazki-slate-200)] last:border-b-0 ${selected ? "bg-[var(--tazki-blue-900)]/[0.03]" : "bg-white"}`}>
                        <td className="px-4 py-3 font-semibold text-[var(--tazki-slate-900)]">{rate.currency_code}</td>
                        <td className="px-4 py-3 text-[var(--tazki-slate-700)]">{rate.period_year}</td>
                        <td className="px-4 py-3 text-[var(--tazki-slate-700)]">{MONTHS[rate.period_month]}</td>
                        <td className="px-4 py-3 text-[var(--tazki-slate-700)]">{formatDate(rate.reference_date)}</td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--tazki-slate-900)]">{formatRate(rate)}</td>
                        <td className="px-4 py-3 text-[var(--tazki-slate-700)]">{rate.source_type === "api" ? "API" : "Manual"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${rate.is_active ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200" : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200"}`}>
                            {rate.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--tazki-slate-500)]">{formatTimestamp(rate.updated_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => handleSelectRate(rate)}>
                              Ver detalle
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleSelectRate(rate)}>
                              Editar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="xl:sticky xl:top-[88px] xl:self-start">
          <div className={ERP_ASIDE_PANEL_CLASSNAME}>
            <div className="space-y-4 px-4 py-4">
              <div className="border-b border-[var(--tazki-slate-200)] pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tazki-slate-400)]">Detalle operativo</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--tazki-slate-950)]">{form.id ? "Editar valor" : "Nuevo valor"}</h2>
                <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">Un registro por moneda y periodo. Billing toma este valor para snapshotear facturas.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Moneda</span>
                  <select value={form.currencyCode} onChange={(event) => handleFormChange("currencyCode", event.target.value as "UF" | "CLP")} className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                    <option value="UF">UF</option>
                    <option value="CLP">CLP</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Anio</span>
                  <Input value={form.periodYear} onChange={(event) => handleFormChange("periodYear", event.target.value)} className="h-9 border-[var(--tazki-slate-200)]" />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Mes</span>
                  <select value={form.periodMonth} onChange={(event) => handleFormChange("periodMonth", event.target.value)} className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                    {MONTHS.map((month, index) =>
                      index === 0 ? null : (
                        <option key={month} value={String(index)}>
                          {month}
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Fecha referencia</span>
                  <Input type="date" value={form.referenceDate} onChange={(event) => handleFormChange("referenceDate", event.target.value)} className="h-9 border-[var(--tazki-slate-200)]" />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Valor</span>
                  <Input value={form.rateValue} onChange={(event) => handleFormChange("rateValue", event.target.value)} placeholder="39841,72" className="h-9 border-[var(--tazki-slate-200)]" />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Origen</span>
                  <select value={form.sourceType} onChange={(event) => handleFormChange("sourceType", event.target.value as "manual" | "api")} className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                    <option value="manual">Manual</option>
                    <option value="api">API</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Nota / comentario</span>
                <textarea value={form.sourceNote} onChange={(event) => handleFormChange("sourceNote", event.target.value)} rows={4} className="w-full rounded-md border border-[var(--tazki-slate-200)] px-3 py-2 text-sm text-[var(--tazki-slate-900)] outline-none focus:border-[var(--tazki-blue-600)] focus:ring-2 focus:ring-[var(--tazki-blue-600)]/20" />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-[var(--tazki-slate-200)] bg-white px-3 py-2 text-sm text-[var(--tazki-slate-700)]">
                <input type="checkbox" checked={form.isActive} onChange={(event) => handleFormChange("isActive", event.target.checked)} className="h-4 w-4 rounded border-[var(--tazki-slate-300)]" />
                Mantener valor activo para este periodo
              </label>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={submitForm} disabled={isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar
                </Button>
                <Button type="button" variant="outline" onClick={handleCreateNew} disabled={isPending}>
                  Limpiar
                </Button>
                {selectedRate ? (
                  <Button type="button" variant="outline" onClick={deactivateSelected} disabled={isPending || !selectedRate.is_active}>
                    Desactivar
                  </Button>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Trazabilidad</p>
                {selectedRate ? (
                  <div className="mt-2 space-y-2 text-sm text-[var(--tazki-slate-700)]">
                    <p><span className="font-semibold text-[var(--tazki-slate-900)]">Periodo:</span> {MONTHS[selectedRate.period_month]} {selectedRate.period_year}</p>
                    <p><span className="font-semibold text-[var(--tazki-slate-900)]">Actualizado:</span> {formatTimestamp(selectedRate.updated_at)}</p>
                    <p><span className="font-semibold text-[var(--tazki-slate-900)]">Estado:</span> {selectedRate.is_active ? "Activo" : "Inactivo"}</p>
                    <p><span className="font-semibold text-[var(--tazki-slate-900)]">Nota:</span> {selectedRate.source_note?.trim() || "Sin comentario"}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--tazki-slate-600)]">Selecciona un registro o crea uno nuevo para ver detalle operativo.</p>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--tazki-slate-200)] bg-white px-3 py-3 text-sm text-[var(--tazki-slate-700)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">Regla de negocio</p>
                <p className="mt-2">Billing usa la UF del periodo de factura y la guarda como snapshot en `billing_records`, para que la historia no cambie aunque despues edites configuracion.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
