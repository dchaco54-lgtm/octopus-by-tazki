import Link from "next/link";
import { CompanyForm } from "@/components/shared/company-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCompanyAction } from "@/modules/companies/actions";

interface NewCompanyPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewCompanyPage({ searchParams }: NewCompanyPageProps) {
  const params = await searchParams;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Nueva empresa</h1>
        <Link href="/companies" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
          Volver a clientes
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{params.error}</p>}
          <CompanyForm action={createCompanyAction} submitLabel="Crear empresa" />
        </CardContent>
      </Card>
    </section>
  );
}
