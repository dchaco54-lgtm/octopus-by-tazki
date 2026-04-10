"use client";

import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COLUMN_DEFINITIONS, type ColumnKey } from "@/modules/subscriptions/list-view/types";
import { moveColumn, orderColumnOptions } from "@/modules/subscriptions/list-view/helpers";
import { ToolbarDropdown } from "@/modules/subscriptions/list-view/toolbar-dropdown";

interface ColumnVisibilityMenuProps {
  columns: ColumnKey[];
  onChange: (columns: ColumnKey[]) => void;
  onResetWidths: () => void;
}

export function ColumnVisibilityMenu({ columns, onChange, onResetWidths }: ColumnVisibilityMenuProps) {
  const orderedColumns = orderColumnOptions(columns);

  function toggleColumn(column: ColumnKey, checked: boolean) {
    const definition = COLUMN_DEFINITIONS.find((item) => item.key === column);
    if (!definition) return;

    if (definition.required) {
      return;
    }

    if (checked) {
      onChange(columns.includes(column) ? columns : [...columns, column]);
      return;
    }

    onChange(columns.filter((item) => item !== column));
  }

  return (
    <ToolbarDropdown label="Columnas" icon={<Columns3 className="h-4 w-4" />} panelClassName="w-[336px]">
      {({ close }) => (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Columnas visibles</p>
            <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">La vista base siempre mantiene las columnas obligatorias.</p>
          </div>

          <div className="max-h-[320px] space-y-1 overflow-auto pr-1">
            {orderedColumns.map((columnKey) => {
              const definition = COLUMN_DEFINITIONS.find((item) => item.key === columnKey);
              if (!definition) return null;

              const isVisible = columns.includes(columnKey);
              const visibleIndex = columns.indexOf(columnKey);

              return (
                <div
                  key={columnKey}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[var(--tazki-slate-800)] hover:bg-[var(--tazki-slate-50)]"
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={definition.required}
                    onChange={(event) => toggleColumn(columnKey, event.target.checked)}
                    className="h-4 w-4 rounded border-[var(--tazki-slate-300)] text-[var(--tazki-blue-700)] disabled:opacity-60"
                  />
                  <span className="min-w-0 flex-1 truncate">{definition.label}</span>
                  {definition.required ? <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-400)]">Base</span> : null}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!isVisible || visibleIndex <= 0}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--tazki-slate-500)] transition hover:bg-white hover:text-[var(--tazki-slate-900)] disabled:opacity-30"
                      onClick={() => onChange(moveColumn(columns, columnKey, "up"))}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!isVisible || visibleIndex === -1 || visibleIndex >= columns.length - 1}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--tazki-slate-500)] transition hover:bg-white hover:text-[var(--tazki-slate-900)] disabled:opacity-30"
                      onClick={() => onChange(moveColumn(columns, columnKey, "down"))}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onResetWidths}>
              Reset widths
            </Button>
            <Button type="button" size="sm" onClick={close}>
              Listo
            </Button>
          </div>
        </div>
      )}
    </ToolbarDropdown>
  );
}

