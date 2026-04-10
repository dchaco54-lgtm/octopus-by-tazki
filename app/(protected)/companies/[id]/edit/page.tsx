import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyForm } from "@/components/shared/company-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCompanyAction } from "@/modules/companies/actions";
import { getCompanyById } from "@/services/companies-service";

interface EditCompanyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditCompanyPage({ params, searchParams }: EditCompanyPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const company = await getCompanyById(id);

  if (!company) {
    notFound();
  }

  const boundAction = updateCompanyAction.bind(null, id);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Editar empresa</h1>
        <Link href={`/companies/${id}`} className="text-sm font-semibold text-[var(--tazki-blue-700)]">
          Volver al detalle
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{company.trade_name}</CardTitle>
        </CardHeader>
        <CardContent>
          {query.error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{query.error}</p>}
          <CompanyForm action={boundAction} submitLabel="Guardar cambios" defaultValues={company} />
        </CardContent>
      </Card>
    </section>
  );
}
