import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClientAction } from "@/modules/clients/actions";

interface NewClientPageProps {
  searchParams: Promise<{
    error?: string;
    trade_name?: string;
    legal_name?: string;
    internal_code?: string;
    rut?: string;
    address?: string;
    commune?: string;
    city?: string;
    country?: string;
    phone?: string;
    company_email?: string;
    dte_email?: string;
    billing_email?: string;
    industry?: string;
    status?: string;
    customer_type?: string;
    taxpayer_type?: string;
    company_category?: string;
    currency?: string;
  }>;
}

export default async function NewClientPage({ searchParams }: NewClientPageProps) {
  const params = await searchParams;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Crear cliente</h1>
        <Link href="/clients" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
          Volver a clientes
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos iniciales</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{params.error}</p>}
          <form action={createClientAction} className="grid gap-3 md:grid-cols-2">
            <input name="trade_name" defaultValue={params.trade_name ?? ""} placeholder="Nombre cliente" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="legal_name" defaultValue={params.legal_name ?? ""} placeholder="Razon social" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="internal_code" defaultValue={params.internal_code ?? ""} placeholder="Cliente ID" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" />
            <input name="rut" defaultValue={params.rut ?? ""} placeholder="RUT" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="address" defaultValue={params.address ?? ""} placeholder="Direccion" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="commune" defaultValue={params.commune ?? ""} placeholder="Comuna" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="city" defaultValue={params.city ?? ""} placeholder="Ciudad" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="country" defaultValue={params.country ?? "Chile"} placeholder="Pais" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="phone" defaultValue={params.phone ?? ""} placeholder="Telefono" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="company_email" defaultValue={params.company_email ?? ""} placeholder="Correo empresa" type="email" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input
              name="dte_email"
              defaultValue={params.dte_email ?? ""}
              placeholder="Correo DTE (separa con comas)"
              type="text"
              className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm"
              required
            />
            <input name="billing_email" defaultValue={params.billing_email ?? ""} placeholder="Correo facturacion" type="email" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <input name="industry" defaultValue={params.industry ?? ""} placeholder="Giro" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm" required />
            <select name="status" defaultValue={params.status ?? "active"} className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm">
              <option value="active">Activo</option>
              <option value="inactive">No activo</option>
              <option value="churned">Churneado</option>
            </select>
            <select name="customer_type" defaultValue={params.customer_type ?? "Empresa"} className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm">
              <option value="Empresa">Empresa</option>
              <option value="Persona">Persona</option>
            </select>
            <select name="taxpayer_type" defaultValue={params.taxpayer_type ?? "Primera Categoria"} className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm">
              <option value="Primera Categoria">Primera Categoria</option>
              <option value="Segunda Categoria">Segunda Categoria</option>
              <option value="Persona Natural">Persona Natural</option>
            </select>
            <select name="company_category" defaultValue={params.company_category ?? "SMB"} className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm">
              <option value="Enterprise">Enterprise</option>
              <option value="Midmarket">Midmarket</option>
              <option value="SMB">SMB</option>
            </select>
            <select name="currency" defaultValue={params.currency ?? "CLP"} className="h-10 rounded-lg border border-[var(--tazki-slate-200)] px-3 text-sm">
              <option value="UF">UF</option>
              <option value="USD">USD</option>
              <option value="CLP">CLP</option>
            </select>
            <button type="submit" className="rounded-lg bg-[var(--tazki-blue-900)] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
              Crear cliente
            </button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
