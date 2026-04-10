"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ClientInternalContactCreatePanelProps {
  action: (formData: FormData) => void;
  initiallyOpen?: boolean;
}

export function ClientInternalContactCreatePanel({
  action,
  initiallyOpen = false,
}: ClientInternalContactCreatePanelProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!isOpen ? (
          <Button type="button" variant="outline" size="sm" className="h-8 text-[13px]" onClick={() => setIsOpen(true)}>
            Agregar integrante
          </Button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="rounded-2xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] p-4">
          <form action={action} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select name="role_type" defaultValue="prospector" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm">
              <option value="prospector">Quien prospecto</option>
              <option value="sales_executive">Ejecutivo de venta</option>
              <option value="ob_executive">Ejecutivo de OB</option>
              <option value="csm">Customer Success Manager</option>
            </select>
            <input name="full_name" placeholder="Nombre" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="email" type="email" placeholder="Correo" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="phone" placeholder="Telefono" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" />
            <input name="notes" placeholder="Notas internas" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm xl:col-span-2" />
            <select name="is_active" defaultValue="true" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm">
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>

            <div className="col-span-full flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                Guardar
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
