import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/shared/product-form";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { updateProductAction } from "@/modules/products/actions";
import { getProductById } from "@/services/products-service";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const boundAction = updateProductAction.bind(null, id);

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tazki-slate-200)] pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">Editar producto</h1>
          <Link href={`/products/${id}`} className="text-sm font-semibold text-[var(--tazki-blue-700)]">
            Volver al detalle
          </Link>
        </div>

        <div className="pt-4">
          {query.error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{query.error}</p>
          ) : null}
          <ProductForm action={boundAction} submitLabel="Guardar cambios" defaultValues={product} />
        </div>
      </div>
    </section>
  );
}
