import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsagePage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Uso</h1>
        <p className="mt-2 text-[var(--tazki-slate-500)]">
          Modulo base preparado para futuras metricas de adopcion y consumo por cliente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base lista para evolucionar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--tazki-slate-700)]">
          <p>Hoy esta pantalla existe para validar la navegacion principal y mantener visible el mapa completo de Octopus.</p>
          <p>El siguiente paso natural sera conectar eventos de uso o telemetria desde Supabase cuando definamos esa capa.</p>
        </CardContent>
      </Card>
    </section>
  );
}
