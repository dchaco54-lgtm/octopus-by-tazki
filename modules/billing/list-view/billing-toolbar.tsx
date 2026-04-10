"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface BillingToolbarProps {
  resultCount: number;
  selectedCount: number;
  exportHref: string;
  tools: ReactNode;
}

export function BillingToolbar({ resultCount, selectedCount, exportHref, tools }: BillingToolbarProps) {
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();

  function resetModal() {
    setIsUploadOpen(false);
    setFileName("");
    setSelectedFile(null);
    setUploadMessage(null);
    setUploadError(null);
  }

  function handleUpload() {
    if (!selectedFile) {
      setUploadError("Debes seleccionar un archivo para importar.");
      return;
    }

    setUploadMessage(null);
    setUploadError(null);

    startUploadTransition(async () => {
      const payload = new FormData();
      payload.set("file", selectedFile);

      const response = await fetch("/billing/import", {
        method: "POST",
        body: payload,
      });

      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        errors?: string[];
      };

      if (!response.ok || !result.ok) {
        setUploadError(result.error ?? result.message ?? "No fue posible completar la importacion.");
        return;
      }

      const details = result.errors?.length ? ` ${result.errors.slice(0, 3).join(" | ")}` : "";
      setUploadMessage(`${result.message ?? "Importacion completada."}${details}`);
      setSelectedFile(null);
      setFileName("");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex min-h-12 flex-col justify-center gap-3 border-t border-[var(--tazki-slate-200)] px-5 py-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/billing/new">
            <Button size="sm" className="h-8 rounded-md px-3">
              <Plus className="mr-1.5 h-4 w-4" />
              Crear factura
            </Button>
          </Link>
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-md px-3" onClick={() => setIsUploadOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Subir
          </Button>
          <Link href={exportHref}>
            <Button type="button" size="sm" variant="outline" className="h-8 rounded-md px-3">
              <Download className="mr-1.5 h-4 w-4" />
              Exportar
            </Button>
          </Link>
          <span className="text-[12px] text-[var(--tazki-slate-500)]">
            {selectedCount > 0 ? `${selectedCount} facturas seleccionadas` : "Acciones masivas disponibles proximamente"}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {tools}
          <span className="ml-2 text-[12px] text-[var(--tazki-slate-500)]">{resultCount} resultados</span>
        </div>
      </div>
      <div className="border-t border-[var(--tazki-slate-200)]" />

      {isUploadOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 p-4">
          <div className="mx-auto mt-16 w-full max-w-lg rounded-2xl border border-[var(--tazki-slate-200)] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--tazki-slate-950)]">Subir facturas</h3>
                <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">Importa un Excel operativo para crear o actualizar registros de Facturacion.</p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[var(--tazki-slate-500)] hover:bg-[var(--tazki-slate-100)]"
                onClick={resetModal}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-[var(--tazki-slate-300)] bg-[var(--tazki-slate-50)] p-4">
              <p className="mb-3 text-xs text-[var(--tazki-slate-500)]">
                Usa columnas operativas como `Cliente ID`, `Suscripcion`, `Fecha factura`, `Fecha venc.`, `Moneda`, `Tipo documento`,
                `Numero`, `Periodo servicio`, `Producto`, `Cantidad`, `Precio`, `Impuestos`, `Referencia`, `Link pago`.
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setFileName(file?.name ?? "");
                  setUploadError(null);
                  setUploadMessage(null);
                }}
                className="w-full text-sm"
              />
              {fileName ? <p className="mt-2 text-xs text-[var(--tazki-slate-600)]">Archivo seleccionado: {fileName}</p> : null}
              {uploadMessage ? <p className="mt-3 text-xs text-emerald-700">{uploadMessage}</p> : null}
              {uploadError ? <p className="mt-3 text-xs text-[var(--tazki-danger)]">{uploadError}</p> : null}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetModal} disabled={isUploading}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Importando..." : "Importar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
