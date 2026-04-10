"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Columns3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ClientRow {
  id: string;
  internal_code: string | null;
  trade_name: string | null;
  legal_name: string | null;
  rut: string | null;
  company_email: string | null;
  billing_email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  payer_client_rut: string | null;
  status: string | null;
  currency: string | null;
  company_category: string | null;
  dte_email: string | null;
  customer_type: string | null;
  taxpayer_type: string | null;
  created_at: string | null;
}

type ColumnKey =
  | "name"
  | "rut"
  | "email"
  | "phone"
  | "payer"
  | "status"
  | "currency"
  | "category"
  | "dteEmail"
  | "customerType"
  | "taxpayerType"
  | "createdAt";

interface ClientsTableProps {
  clients: ClientRow[];
}

const STORAGE_KEY = "clients.table.visible-columns.v1";
const defaultColumns: ColumnKey[] = ["name", "rut", "email", "phone", "payer", "status"];
const columnOptions: { key: ColumnKey; label: string }[] = [
  { key: "email", label: "Correo" },
  { key: "phone", label: "Telefono" },
  { key: "payer", label: "Cliente pagador" },
  { key: "status", label: "Estado" },
  { key: "currency", label: "Moneda" },
  { key: "category", label: "Categoria empresa" },
  { key: "dteEmail", label: "Correo DTE" },
  { key: "customerType", label: "Tipo de cliente" },
  { key: "taxpayerType", label: "Tipo de contribuyente" },
  { key: "createdAt", label: "Fecha de creacion" },
];

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CL");
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => {
    if (typeof window === "undefined") return defaultColumns;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultColumns;

    try {
      const parsed = JSON.parse(raw) as ColumnKey[];
      const valid = parsed.filter((key) => key === "name" || key === "rut" || columnOptions.some((option) => option.key === key));
      return valid.includes("name") && valid.includes("rut") ? valid : defaultColumns;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return defaultColumns;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const orderedColumns = useMemo(
    () =>
      (["name", "rut", ...columnOptions.map((option) => option.key)] as ColumnKey[]).filter((column) =>
        visibleColumns.includes(column)
      ),
    [visibleColumns]
  );

  const toggleColumn = (column: ColumnKey) => {
    if (column === "name" || column === "rut") return;
    if (visibleColumns.includes(column)) {
      setVisibleColumns((prev) => prev.filter((item) => item !== column));
      return;
    }
    setVisibleColumns((prev) => [...prev, column]);
  };

  const renderCell = (client: ClientRow, column: ColumnKey) => {
    if (column === "name") {
      return (
        <div className="space-y-0.5">
          <Link href={`/clients/${client.id}`} className="font-semibold text-[var(--tazki-blue-700)] hover:underline">
            {client.trade_name || client.legal_name || "-"}
          </Link>
          <p className="text-xs text-[var(--tazki-slate-500)]">
            Cliente ID {client.internal_code || "-"}
          </p>
        </div>
      );
    }
    if (column === "rut") return client.rut ?? "-";
    if (column === "email") return client.company_email || client.billing_email || "-";
    if (column === "phone") return client.mobile_phone || client.phone || "-";
    if (column === "payer") return client.payer_client_rut || "-";
    if (column === "status") {
      const variant = client.status === "active" ? "success" : client.status === "suspended" ? "warning" : "default";
      return <Badge variant={variant}>{client.status || "-"}</Badge>;
    }
    if (column === "currency") return client.currency || "-";
    if (column === "category") return client.company_category || "-";
    if (column === "dteEmail") return client.dte_email || "-";
    if (column === "customerType") return client.customer_type || "-";
    if (column === "taxpayerType") return client.taxpayer_type || "-";
    if (column === "createdAt") return formatDate(client.created_at);
    return "-";
  };

  const getHeader = (column: ColumnKey) => {
    if (column === "name") return "Nombre del cliente";
    if (column === "rut") return "RUT";
    return columnOptions.find((option) => option.key === column)?.label || column;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-[var(--tazki-slate-200)] px-4 py-3">
          <p className="text-sm text-[var(--tazki-slate-500)]">
            {clients.length} cliente{clients.length === 1 ? "" : "s"}
          </p>
          <div className="relative">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setIsViewOpen((prev) => !prev)}>
              <Columns3 className="h-4 w-4" />
              Vista
            </Button>
            {isViewOpen && (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-[var(--tazki-slate-200)] bg-white p-2 shadow-xl">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--tazki-slate-500)]">Columnas</p>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--tazki-slate-700)]">
                    <input type="checkbox" checked readOnly />
                    Nombre del cliente
                  </label>
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--tazki-slate-700)]">
                    <input type="checkbox" checked readOnly />
                    RUT
                  </label>
                  {columnOptions.map((option) => (
                    <label key={option.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--tazki-slate-700)] hover:bg-[var(--tazki-slate-50)]">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(option.key)}
                        onChange={() => toggleColumn(option.key)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {orderedColumns.map((column) => (
                  <TableHead key={column}>{getHeader(column)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={orderedColumns.length} className="py-10 text-center text-[var(--tazki-slate-500)]">
                    No encontramos clientes para esta busqueda.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    {orderedColumns.map((column) => (
                      <TableCell key={`${client.id}-${column}`}>{renderCell(client, column)}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
