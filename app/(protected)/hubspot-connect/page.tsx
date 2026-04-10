import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HubSpotConnectPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HubSpot Connect</h1>
        <p className="mt-2 text-[var(--tazki-slate-500)]">
          HubSpot se mantiene como CRM comercial para oportunidades y pipeline de ventas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integracion en preparacion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--tazki-slate-700)]">
          <p>Esta vista queda lista como placeholder para conectar sincronizacion de cuentas y oportunidades.</p>
          <p>En esta fase no se integra API real de HubSpot aun.</p>
        </CardContent>
      </Card>
    </section>
  );
}
