import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { RevenueStackedBarChart } from "@/components/shared/revenue-stacked-bar-chart";
import { getMrrRevenueSeriesByYear } from "@/services/mrr-service";

function toInt(value: string | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function formatUf(n: number) {
  return `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} UF`;
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;
const RANGES = [3, 6, 9, 12] as const;
type RangeOption = (typeof RANGES)[number];

function isRangeOption(value: number): value is RangeOption {
  return RANGES.some((range) => range === value);
}

export default async function MrrDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = toInt(typeof sp.year === "string" ? sp.year : undefined) ?? now.getFullYear();
  const parsedRange = toInt(typeof sp.range === "string" ? sp.range : undefined);

  if (parsedRange !== null && !isRangeOption(parsedRange)) {
    redirect(`/dashboard/mrr?year=${year}&range=6`);
  }

  const range: RangeOption = parsedRange !== null && isRangeOption(parsedRange) ? parsedRange : 6;

  const series = await getMrrRevenueSeriesByYear(year);
  const currentMonth = now.getMonth() + 1;

  const endMonth = year === now.getFullYear() ? currentMonth : 12;
  const startMonth = Math.max(1, endMonth - range + 1);
  const windowed = series.filter((p) => p.month >= startMonth && p.month <= endMonth);
  const current = windowed[windowed.length - 1] ?? series[Math.min(endMonth - 1, 11)] ?? series[0];

  const cards = [
    { label: "MRR (fin de mes)", value: formatUf(current.mrr_end_uf) },
    { label: "Clientes activos (fin de mes)", value: String(current.active_clients) },
    { label: "New + Upsell (mes)", value: formatUf(current.new_uf + current.upsell_uf) },
    { label: "Churn (mes)", value: formatUf(current.churn_uf) },
  ];

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} space-y-4 px-5 py-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--tazki-slate-200)] pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tazki-slate-400)]">Dashboard</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">MRR</h1>
            <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">MRR y movimientos por mes (New vs Churn).</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
              Volver
            </Link>
          </div>
        </div>

        <form className="grid gap-2 md:grid-cols-[160px_160px_auto]">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Ano</span>
            <select name="year" defaultValue={String(year)} className="h-9 rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px]">
              {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i).map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Rango</span>
            <select name="range" defaultValue={String(range)} className="h-9 rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px]">
              {RANGES.map((r) => (
                <option key={r} value={String(r)}>
                  Ultimos {r} meses
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--tazki-blue-900)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--tazki-blue-700)]"
            >
              Aplicar
            </button>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[var(--tazki-slate-500)]">{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <RevenueStackedBarChart
          points={windowed.map((p) => ({
            label: MONTHS[p.month - 1] ?? String(p.month),
            saas: p.saas_subscription_uf,
            expansion: p.expansion_uf,
            implementation: p.implementation_uf,
            consulting: p.consulting_uf,
          }))}
        />
      </div>
    </section>
  );
}
