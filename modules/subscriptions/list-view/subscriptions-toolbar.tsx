import Link from "next/link";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionsToolbarProps {
  resultCount: number;
  selectedCount: number;
  tools: ReactNode;
}

export function SubscriptionsToolbar({ resultCount, selectedCount, tools }: SubscriptionsToolbarProps) {
  return (
    <>
      <div className="flex min-h-12 flex-col justify-center gap-3 border-t border-[var(--tazki-slate-200)] px-5 py-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/subscriptions/new">
            <Button size="sm" className="h-8 rounded-md px-3">
              <Plus className="mr-1.5 h-4 w-4" />
              Crear
            </Button>
          </Link>
          <span className="text-[12px] text-[var(--tazki-slate-500)]">
            {selectedCount > 0 ? `${selectedCount} seleccionadas` : "Acciones masivas disponibles proximamente"}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {tools}
          <span className="ml-2 text-[12px] text-[var(--tazki-slate-500)]">{resultCount} resultados</span>
        </div>
      </div>
      <div className="border-t border-[var(--tazki-slate-200)]" />
    </>
  );
}
