"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolbarDropdown } from "@/modules/subscriptions/list-view/toolbar-dropdown";
import type { BillingViewConfig, SavedBillingFavoriteView } from "@/modules/billing/list-view/types";

interface SavedViewsMenuProps {
  favorites: SavedBillingFavoriteView[];
  defaultView: BillingViewConfig;
  currentView: BillingViewConfig;
  onApplyView: (config: BillingViewConfig) => void;
  onSaveCurrent: () => void;
  onDeleteFavorite: (id: string) => void;
  onMakeDefault: () => void;
  onResetDefault: () => void;
}

export function SavedViewsMenu({
  favorites,
  defaultView,
  currentView,
  onApplyView,
  onSaveCurrent,
  onDeleteFavorite,
  onMakeDefault,
  onResetDefault,
}: SavedViewsMenuProps) {
  void currentView;

  return (
    <ToolbarDropdown label="Favoritos" icon={<Star className="h-4 w-4" />} count={favorites.length} panelClassName="w-[320px]">
      {({ close }) => (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Vistas guardadas</p>
            <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">Guarda filtros, columnas y anchos para Facturacion.</p>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md bg-[var(--tazki-slate-50)] px-2.5 py-2 text-left text-[13px] font-medium text-[var(--tazki-slate-900)]"
              onClick={() => {
                onApplyView(defaultView);
                close();
              }}
            >
              <span>Default View</span>
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Base</span>
            </button>

            {favorites.map((favorite) => (
              <div key={favorite.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--tazki-slate-50)]">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[13px] text-[var(--tazki-slate-800)]"
                  onClick={() => {
                    onApplyView(favorite.config);
                    close();
                  }}
                >
                  {favorite.name}
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--tazki-slate-500)] transition hover:text-[var(--tazki-slate-900)]"
                  onClick={() => onDeleteFavorite(favorite.id)}
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onSaveCurrent}>
              Guardar actual
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onMakeDefault}>
              Hacer default
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onResetDefault();
                close();
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </ToolbarDropdown>
  );
}
