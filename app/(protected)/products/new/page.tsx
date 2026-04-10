import Link from "next/link";
import { ProductForm } from "@/components/shared/product-form";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { createProductAction } from "@/modules/products/actions";

interface NewProductPageProps {
  searchParams: Promise<{ error?: string; category?: string }>;
}

export default async function NewProductPage({ searchParams }: NewProductPageProps) {
  const params = await searchParams;
  const initialCategory = params.category ?? "plan";

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tazki-slate-200)] pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">Nuevo producto</h1>
          <Link href="/products" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
            Volver a productos
          </Link>
        </div>

        <div className="pt-4">
          {params.error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{params.error}</p>
          ) : null}
          <ProductForm action={createProductAction} submitLabel="Crear producto" defaultValues={{ category: initialCategory }} />
        </div>
      </div>
    </section>
  );
}
