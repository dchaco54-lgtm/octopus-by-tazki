import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SupportPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Soporte</h1>
        <p className="mt-2 text-[var(--tazki-slate-500)]">Canal interno para solicitudes, incidencias y seguimiento operativo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Centro de soporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--tazki-slate-700)]">
          <p>Usa el boton Soporte del header para enviar mensajes rapidos al equipo interno.</p>
          <p>Este modulo queda preparado para evolucionar a un tablero de tickets.</p>
        </CardContent>
      </Card>
    </section>
  );
}
