"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CreateButtonPlacement = "top" | "bottom";

interface ClientContactCreatePanelProps {
  action: (formData: FormData) => void;
  initiallyOpen?: boolean;
  buttonPlacement?: CreateButtonPlacement;
}

export function ClientContactCreatePanel({
  action,
  initiallyOpen = false,
  buttonPlacement = "top",
}: ClientContactCreatePanelProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const isBottomButton = buttonPlacement === "bottom";

  const triggerButton = !isOpen ? (
    <div className={cn("flex", isBottomButton ? "justify-end pt-1" : "justify-end")}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-8 text-[13px]",
          isBottomButton
            ? "border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-900)]/5 px-3.5 text-[var(--tazki-blue-900)] shadow-sm hover:bg-[var(--tazki-blue-900)]/10"
            : undefined
        )}
        onClick={() => setIsOpen(true)}
      >
        Agregar contacto
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {!isBottomButton ? triggerButton : null}

      {isOpen ? (
        <div className="rounded-2xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] p-4">
          <form action={action} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select name="contact_type" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm">
              <option value="finance">Contacto Finanzas</option>
              <option value="commercial">Contacto Comercial</option>
              <option value="preventionist">Contacto Prevencionista</option>
              <option value="mutual_achs">Contacto Mutual/Achs</option>
            </select>
            <input name="name" placeholder="Nombre" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="email" type="email" placeholder="Correo" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="phone" placeholder="Telefono" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" />
            <input name="address" placeholder="Direccion" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm md:col-span-2" />
            <input name="city" placeholder="Ciudad" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" />
            <input name="notes" placeholder="Notas internas" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm xl:col-span-2" />

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

      {isBottomButton ? triggerButton : null}
    </div>
  );
}
