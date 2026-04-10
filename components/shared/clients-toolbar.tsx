"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Download, Import, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const searchOptions = [
  { key: "name", label: "Nombre" },
  { key: "company", label: "Empresa" },
  { key: "company_id", label: "Cliente ID" },
  { key: "email", label: "Correo electronico" },
  { key: "phone", label: "Telefono" },
  { key: "purchase_order", label: "Orden de compra" },
];

interface ClientsToolbarProps {
  initialQuery?: string;
  initialSearchBy?: string;
  exportHref: string;
}

export function ClientsToolbar({ initialQuery = "", initialSearchBy = "", exportHref }: ClientsToolbarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importFeedback, setImportFeedback] = useState("");

  const hasText = query.trim().length > 0;
  const showDropdown = focused && hasText;
  const selectedField = useMemo(
    () => searchOptions.find((option) => option.key === initialSearchBy)?.label ?? "Busqueda libre",
    [initialSearchBy]
  );

  const pushSearch = (field?: string) => {
    const value = query.trim();
    if (!value) {
      router.push("/clients");
      return;
    }

    const params = new URLSearchParams();
    params.set("q", value);
    if (field) params.set("search_by", field);
    router.push(`/clients?${params.toString()}`);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[280px] flex-1">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--tazki-slate-200)] bg-white px-3 shadow-sm">
            <Search className="h-4 w-4 text-[var(--tazki-slate-500)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              placeholder="Buscar por Cliente ID, razon social, RUT, correo o telefono"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--tazki-slate-400)]"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  pushSearch(initialSearchBy || "name");
                }
              }}
            />
            <button
              type="button"
              onClick={() => pushSearch(initialSearchBy || "name")}
              className="rounded-md bg-[var(--tazki-blue-900)] px-2.5 py-1 text-xs font-semibold text-white"
            >
              Buscar
            </button>
          </div>

          {showDropdown && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-[var(--tazki-slate-200)] bg-white p-1 shadow-[0_18px_40px_rgba(15,23,42,0.15)]">
              {searchOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pushSearch(option.key)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--tazki-slate-700)] hover:bg-[var(--tazki-slate-50)]"
                >
                  <span>Buscar {option.label}: {query}</span>
                  <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg] text-[var(--tazki-slate-400)]" />
                </button>
              ))}
            </div>
          )}
        </div>

        <Button type="button" variant="outline" className="gap-2" onClick={() => setIsImportOpen(true)}>
          <Import className="h-4 w-4" />
          Importar
        </Button>
        <Link href={exportHref}>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </Link>
        <Link href="/clients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Crear
          </Button>
        </Link>
      </div>

      <div className="text-xs text-[var(--tazki-slate-500)]">Vista actual: {selectedField}</div>

      {isImportOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 p-4">
          <div className="mx-auto mt-16 w-full max-w-lg rounded-2xl border border-[var(--tazki-slate-200)] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--tazki-slate-950)]">Importar clientes</h3>
                <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">Carga un archivo CSV o Excel. La importacion automatica quedo preparada para el siguiente paso.</p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[var(--tazki-slate-500)] hover:bg-[var(--tazki-slate-100)]"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFeedback("");
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-[var(--tazki-slate-300)] bg-[var(--tazki-slate-50)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--tazki-slate-500)]">Descarga primero el formato oficial con todos los campos obligatorios.</p>
                <Link
                  href="/clients/import-template"
                  className="rounded-md border border-[var(--tazki-slate-300)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--tazki-blue-700)] hover:bg-[var(--tazki-slate-50)]"
                >
                  Descargar formato ejemplo
                </Link>
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setImportFileName(file?.name || "");
                  setImportFeedback("");
                }}
                className="w-full text-sm"
              />
              {importFileName && <p className="mt-2 text-xs text-[var(--tazki-slate-600)]">Archivo seleccionado: {importFileName}</p>}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFeedback("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setImportFeedback(importFileName ? "Interfaz lista. La carga automatica de datos se conectara en el siguiente sprint." : "Selecciona un archivo primero.");
                }}
              >
                Cargar
              </Button>
            </div>
            {importFeedback && <p className="mt-3 text-sm text-[var(--tazki-blue-700)]">{importFeedback}</p>}
          </div>
        </div>
      )}
    </>
  );
}
