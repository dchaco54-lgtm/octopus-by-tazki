"use client";

import { useMemo } from "react";

export type RevenueStackPoint = {
  label: string;
  saas: number;
  expansion: number;
  implementation: number;
  consulting: number;
};

function clamp(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function formatUf(n: number) {
  return `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} UF`;
}

const COLORS = {
  saas: "#0f2b70", // tazki blue 900-ish
  expansion: "#2563eb", // blue 600
  implementation: "#f97316", // orange 500
  consulting: "#14b8a6", // teal 500
} as const;

const CHART_PADDING = { top: 18, right: 18, bottom: 36, left: 58 } as const;

export function RevenueStackedBarChart({
  points,
  height = 260,
}: {
  points: RevenueStackPoint[];
  height?: number;
}) {
  const width = Math.max(920, points.length * 72);

  const computed = useMemo(() => {
    const totals = points.map((p) => clamp(p.saas) + clamp(p.expansion) + clamp(p.implementation) + clamp(p.consulting));
    const max = Math.max(1, ...totals);
    const maxY = Math.ceil(max * 1.12 * 100) / 100;

    const innerW = width - CHART_PADDING.left - CHART_PADDING.right;
    const innerH = height - CHART_PADDING.top - CHART_PADDING.bottom;
    const barW = points.length > 0 ? Math.min(46, Math.max(26, innerW / points.length - 18)) : 36;
    const gap = points.length > 0 ? (innerW - barW * points.length) / Math.max(1, points.length - 1) : 0;

    function x(i: number) {
      return CHART_PADDING.left + i * (barW + gap);
    }

    function h(v: number) {
      const t = clamp(v) / maxY;
      return t * innerH;
    }

    const ticks = Array.from({ length: 4 }, (_, i) => {
      const v = (maxY * i) / 3;
      const y = CHART_PADDING.top + innerH - (v / maxY) * innerH;
      return { v, y };
    });

    return { maxY, innerH, barW, x, h, ticks };
  }, [points, height, width]);

  return (
    <div className="rounded-lg border border-[var(--tazki-slate-200)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tazki-slate-400)]">Revenue</p>
          <h2 className="mt-1 text-sm font-semibold text-[var(--tazki-slate-950)]">Composición del ingreso mensual por tipo</h2>
          <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">Incluye ingresos recurrentes y únicos. El MRR de cierre se muestra aparte.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <LegendDot color={COLORS.saas} label="Suscripción SaaS" />
          <LegendDot color={COLORS.expansion} label="Expansión" />
          <LegendDot color={COLORS.implementation} label="Implementación" />
          <LegendDot color={COLORS.consulting} label="Consultoría" />
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label="Composición del ingreso mensual por tipo">
          <rect x="0" y="0" width={width} height={height} fill="white" />

          {computed.ticks.map((t) => (
            <g key={t.v}>
              <line x1={CHART_PADDING.left} x2={width - CHART_PADDING.right} y1={t.y} y2={t.y} stroke="var(--tazki-slate-100)" />
              <text x={CHART_PADDING.left - 10} y={t.y + 4} textAnchor="end" fontSize="11" fill="var(--tazki-slate-500)">
                {formatUf(t.v).replace(" UF", "")}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            const total = clamp(p.saas) + clamp(p.expansion) + clamp(p.implementation) + clamp(p.consulting);
            const barX = computed.x(i);
            const baseY = CHART_PADDING.top + computed.innerH;

            const segs: Array<{ key: keyof typeof COLORS; value: number }> = [
              { key: "saas", value: clamp(p.saas) },
              { key: "expansion", value: clamp(p.expansion) },
              { key: "implementation", value: clamp(p.implementation) },
              { key: "consulting", value: clamp(p.consulting) },
            ];

            let yCursor = baseY;
            return (
              <g key={p.label}>
                {segs.map((s) => {
                  const hh = computed.h(s.value);
                  if (hh <= 0.5) return null;
                  yCursor -= hh;
                  return (
                    <rect
                      key={s.key}
                      x={barX}
                      y={yCursor}
                      width={computed.barW}
                      height={hh}
                      fill={COLORS[s.key]}
                      rx={i === 0 ? 6 : 4}
                      ry={i === 0 ? 6 : 4}
                    />
                  );
                })}

                <text
                  x={barX + computed.barW / 2}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--tazki-slate-500)"
                >
                  {p.label}
                </text>

                <title>{`${p.label}\nTotal: ${formatUf(total)}\nSaaS: ${formatUf(p.saas)}\nExpansión: ${formatUf(p.expansion)}\nImplementación: ${formatUf(p.implementation)}\nConsultoría: ${formatUf(p.consulting)}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[var(--tazki-slate-600)]">{label}</span>
    </div>
  );
}
