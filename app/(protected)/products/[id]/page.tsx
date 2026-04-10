import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { getProductById } from "@/services/products-service";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const priceUf = Number(product.base_price_uf ?? 0);

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--tazki-slate-200)] pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tazki-slate-400)]">
              {product.code}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">{product.name}</h1>
            <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">{product.description || "Sin descripcion"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={product.is_active ? "success" : "default"}>{product.is_active ? "Activo" : "Inactivo"}</Badge>
            <Link href={`/products/${id}/edit`} className="text-sm font-semibold text-[var(--tazki-blue-700)]">
              Editar
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-x-10 gap-y-0 lg:grid-cols-2">
          <div className="space-y-2 text-[13px] text-[var(--tazki-slate-700)]">
            <p>
              <span className="font-semibold">Categoria:</span> {product.category ?? "-"}
            </p>
            <p>
              <span className="font-semibold">Facturacion:</span> {product.billing_type ?? "-"}
            </p>
            <p>
              <span className="font-semibold">Precio base:</span> {priceUf.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF
            </p>
            <p>
              <span className="font-semibold">Suma MRR:</span> {product.affects_mrr ? "Si" : "No"}
            </p>
            <p>
              <span className="font-semibold">Suma revenue:</span> {product.affects_revenue ? "Si" : "No"}
            </p>
          </div>
          <div className="space-y-2 text-[13px] text-[var(--tazki-slate-700)]">
            <p>
              <span className="font-semibold">Override manual:</span> {product.allow_manual_override ? "Si" : "No"}
            </p>
            <p>
              <span className="font-semibold">Depende de plan:</span> {product.depends_on_plan ? "Si" : "No"}
            </p>
            <p>
              <span className="font-semibold">Legacy/manual:</span> {product.is_legacy ? "Si" : "No"}
            </p>
            <p>
              <span className="font-semibold">Upsell:</span> {product.allow_upsell ? "Si" : "No"}
            </p>
            <p>
              <span className="font-semibold">Cross-sell:</span> {product.allow_cross_sell ? "Si" : "No"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
