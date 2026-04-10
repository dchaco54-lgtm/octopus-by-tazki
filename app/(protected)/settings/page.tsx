import { Coins, Settings2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <section className="space-y-6 p-3 lg:p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuracion</h1>
        <p className="mt-2 max-w-3xl text-[var(--tazki-slate-500)]">
          Parametros operacionales compartidos por todo Octopus. Aqui viven las bases de configuracion que despues consumen Billing, Suscripciones y modulos futuros.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Link href="/settings/currencies" className="group block">
          <Card className="h-full border-[var(--tazki-slate-200)] transition-all group-hover:-translate-y-0.5 group-hover:border-[var(--tazki-blue-600)] group-hover:shadow-[0_10px_24px_rgba(19,38,77,0.14)]">
            <CardHeader>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tazki-blue-900)]/10 text-[var(--tazki-blue-900)]">
                <Coins className="h-5 w-5" />
              </div>
              <CardTitle>Monedas</CardTitle>
              <CardDescription>Configura UF por periodo para que Facturacion y PDFs usen snapshot monetario confiable.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-[var(--tazki-slate-600)]">
              Alta manual, edicion, historico y control de trazabilidad por mes.
            </CardContent>
          </Card>
        </Link>

        <Card className="border-dashed">
          <CardHeader>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tazki-slate-100)] text-[var(--tazki-slate-700)]">
              <Settings2 className="h-5 w-5" />
            </div>
            <CardTitle>Mas configuraciones</CardTitle>
            <CardDescription>La base del modulo ya queda preparada para seguir sumando parametros globales sin romper consistencia ERP.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-[var(--tazki-slate-600)]">
            Usuarios, catalogos y preferencias operativas pueden crecer aqui sobre el mismo lenguaje visual.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
