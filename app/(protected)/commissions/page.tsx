import { Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CommissionsPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-blue-900)]/8 text-[var(--tazki-blue-900)] shadow-sm">
          <Coins className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comisiones</h1>
          <p className="mt-2 text-[var(--tazki-slate-500)]">
            Modulo base para centralizar liquidaciones comerciales y seguimiento de payout.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base lista para evolucionar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--tazki-slate-700)]">
          <p>Este modulo ya quedo disponible en la navegacion principal y en la vista central de Octopus.</p>
          <p>El siguiente paso natural sera definir reglas de comision, estados de pago y cortes por ejecutivo o canal.</p>
        </CardContent>
      </Card>
    </section>
  );
}
