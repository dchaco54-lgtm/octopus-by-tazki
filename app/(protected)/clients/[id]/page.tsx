import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ClientContactCreatePanel } from "@/components/clients/client-contact-create-panel";
import { ClientDetailShell } from "@/components/clients/client-detail-shell";
import { ClientInternalContactCreatePanel } from "@/components/clients/client-internal-contact-create-panel";
import { PurchaseOrderCreatePanel } from "@/components/clients/purchase-order-create-panel";
import { DetailSidePanelSection } from "@/components/detail/detail-side-panel-section";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  addClientContactAction,
  addClientInternalContactAction,
  addClientNoteAction,
  addClientPurchaseOrderAction,
  deleteClientNoteAction,
  deleteClientContactAction,
  deleteClientInternalContactAction,
  updateClientAction,
  updateClientBillingAction,
  updateClientContactAction,
  updateClientInternalContactAction,
  updateClientPurchaseOrderAction,
} from "@/modules/clients/actions";
import { ClientBillingForm } from "@/components/shared/client-billing-form";
import {
  type BillingDocumentRequirement,
  type OcUsageType,
  DEFAULT_BILLING_DOCUMENT_REQUIREMENT,
  DEFAULT_BILLING_MODEL,
  DEFAULT_OC_USAGE_TYPE,
  billingModelRequiresValidation,
  billingModelUsesOc,
  getBillingModelLabel,
  getOcUsageTypeLabel,
} from "@/modules/clients/constants";
import { getClientById, listClientPayerOptions } from "@/services/clients-service";
import { PurchaseOrderForm, type PurchaseOrderFormValues } from "@/components/shared/purchase-order-form";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    error?: string;
    edit_po?: string;
    edit_contact?: string;
    delete_contact?: string;
    edit_internal_contact?: string;
    delete_internal_contact?: string;
    new_contact?: string;
    new_internal_contact?: string;
    new_po?: string;
  }>;
}

const clientTabs = [
  { key: "client-contacts", label: "Contactos cliente" },
  { key: "internal-team", label: "Equipo Tazki" },
  { key: "billing", label: "Facturacion" },
  { key: "purchase-orders", label: "Ordenes de compra" },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CL");
}

function displayValue(value: string | null | undefined, fallback = "Sin registro") {
  if (!value || value.trim().length === 0) return fallback;
  return value;
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function purchaseOrderStatusBadge(status: string | null | undefined, validTo: string | null | undefined) {
  const normalized = (status || "").toLowerCase();
  const until = daysUntil(validTo);

  if (normalized === "vigente") {
    if (until !== null && until >= 0 && until <= 14) {
      return { label: "Por vencer", variant: "warning" as const };
    }
    return { label: "Vigente", variant: "success" as const };
  }
  if (normalized === "vencida") return { label: "Vencida", variant: "danger" as const };
  if (normalized === "futura") {
    return {
      label: "Futura",
      variant: "default" as const,
      className: "bg-[var(--tazki-blue-900)]/10 text-[var(--tazki-blue-900)]",
    };
  }
  if (normalized === "anulada") return { label: "Anulada", variant: "default" as const };
  return { label: status || "-", variant: "default" as const };
}

function getCurrentDateInSantiago() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function getActivePurchaseOrder<T extends { valid_from: string | null; valid_to: string | null }>(orders: T[]) {
  const today = getCurrentDateInSantiago();

  return (
    orders
      .filter((order) => {
        if (!order.valid_from || !order.valid_to) return false;
        return order.valid_from <= today && today <= order.valid_to;
      })
      .sort((a, b) => b.valid_from!.localeCompare(a.valid_from!))[0] ?? null
  );
}

function clientContactTypeLabel(contactType: string | null | undefined) {
  if (contactType === "finance") return "Contacto Finanzas";
  if (contactType === "commercial") return "Contacto Comercial";
  if (contactType === "preventionist") return "Contacto Prevencionista";
  if (contactType === "mutual_achs") return "Contacto Mutual/Achs";
  return contactType || "Contacto";
}

function internalRoleLabel(roleType: string | null | undefined) {
  if (roleType === "sdr") return "Quien prospecto";
  if (roleType === "prospector") return "Quien prospecto";
  if (roleType === "sales_executive") return "Ejecutivo de venta";
  if (roleType === "ob_executive") return "Ejecutivo de OB";
  if (roleType === "csm") return "Customer Success Manager";
  return roleType || "Sin rol";
}

function SectionBlock({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const hasHeader = Boolean(title || description || action);

  return (
    <section className={hasHeader ? "border-b border-[var(--tazki-slate-200)] pb-3" : undefined}>
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {title ? <h2 className="text-sm font-semibold text-[var(--tazki-slate-950)]">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[11px] text-[var(--tazki-slate-500)]">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={hasHeader ? "pt-2.5" : undefined}>{children}</div>
    </section>
  );
}

function DetailField({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--tazki-slate-500)]">{label}</dt>
      <dd className={`mt-1 text-sm font-semibold text-[var(--tazki-slate-950)] ${valueClassName ?? ""}`.trim()}>{value}</dd>
    </div>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[152px_minmax(0,1fr)] items-center gap-3 py-1">
      <dt className="text-[11px] font-semibold text-[var(--tazki-slate-500)]">{label}</dt>
      <dd className="min-w-0 text-[13px] text-[var(--tazki-slate-950)]">{value}</dd>
    </div>
  );
}

function EditableFieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid grid-cols-[152px_minmax(0,1fr)] items-center gap-3 py-1 text-sm">
      <span className="text-[11px] font-semibold text-[var(--tazki-slate-500)]">{label}</span>
      <span>{children}</span>
    </label>
  );
}

export default async function ClientDetailPage({ params, searchParams }: ClientDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const normalizedTab = query.tab === "contacts" ? "client-contacts" : query.tab;
  const initialTab = clientTabs.some((tab) => tab.key === normalizedTab) ? (normalizedTab as string) : "client-contacts";
  const editingPurchaseOrderId = query.edit_po ?? "";
  const editingContactId = typeof query.edit_contact === "string" ? query.edit_contact : "";
  const deletingContactId = typeof query.delete_contact === "string" ? query.delete_contact : "";
  const editingInternalContactId = typeof query.edit_internal_contact === "string" ? query.edit_internal_contact : "";
  const deletingInternalContactId = typeof query.delete_internal_contact === "string" ? query.delete_internal_contact : "";
  const shouldOpenNewContactForm = query.new_contact === "1";
  const shouldOpenNewInternalContactForm = query.new_internal_contact === "1";
  const shouldOpenNewPurchaseOrderForm = query.new_po === "1";

  const supabase = await createServerSupabaseClient();
  const [{ data: authData }, detail, payerOptions] = await Promise.all([
    supabase.auth.getUser(),
    getClientById(id),
    listClientPayerOptions(),
  ]);
  if (!detail) {
    notFound();
  }

  const { client, payer, contacts, internalContacts, purchaseOrders, notes, activityLogs } = detail;
  const updateAction = updateClientAction.bind(null, id);
  const updateBillingAction = updateClientBillingAction.bind(null, id);
  const addContactAction = addClientContactAction.bind(null, id);
  const addInternalContactAction = addClientInternalContactAction.bind(null, id);
  const addPurchaseOrderAction = addClientPurchaseOrderAction.bind(null, id);
  const addNoteAction = addClientNoteAction.bind(null, id);
  const currentUserEmail = authData.user?.email?.trim().toLowerCase() ?? "";
  const validPayerOptions = payerOptions.filter((option) => option.id !== id);
  const headerRut = client.rut?.trim() ? client.rut.trim() : null;
  const headerClientCode = client.internal_code?.trim() ? client.internal_code.trim() : null;
  const billingModel = client.billing_model ?? DEFAULT_BILLING_MODEL;
  const payerDisplayName = payer?.trade_name || "Sin cliente pagador";
  const billingDocumentRequirement = displayValue(client.billing_document_requirement, DEFAULT_BILLING_DOCUMENT_REQUIREMENT);
  const ocUsageTypeLabel = getOcUsageTypeLabel(client.oc_usage_type ?? DEFAULT_OC_USAGE_TYPE);
  const billingModelLabel = getBillingModelLabel(billingModel);
  const showOcConfiguration = billingModelUsesOc(billingModel);
  const showDocumentRequirement = billingModelRequiresValidation(billingModel);
  const activePurchaseOrder = getActivePurchaseOrder(purchaseOrders);
  const primaryPhone = client.phone?.trim() || client.mobile_phone?.trim() || "";

  const statusLabel =
    client.status === "active" ? "Activo" : client.status === "inactive" ? "No activo" : client.status === "churned" ? "Churneado" : client.status;
  const statusVariant = client.status === "active" ? "success" : client.status === "churned" ? "warning" : "default";
  const statusClassName = client.status === "active" ? "bg-emerald-100 text-emerald-700" : undefined;
  const headerSubtitle = [headerClientCode ? `Cliente ID ${headerClientCode}` : null, headerRut ? `RUT ${headerRut}` : null]
    .filter(Boolean)
    .join(" · ");

  const mainSectionView = (
    <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        <dl className="space-y-2">
          <FieldRow label="Cliente" value={displayValue(client.trade_name || client.legal_name)} />
          <FieldRow label="Cliente ID" value={displayValue(client.internal_code)} />
          <FieldRow label="Direccion" value={displayValue(client.address)} />
          <FieldRow label="Ciudad" value={displayValue(client.city)} />
          <FieldRow label="Comuna" value={displayValue(client.commune)} />
          <FieldRow label="Pais" value={displayValue(client.country)} />
          <FieldRow label="RUT" value={displayValue(client.rut)} />
          <FieldRow label="Cliente pagador" value={payerDisplayName} />
        </dl>

        <dl className="space-y-2">
          <FieldRow label="Telefono" value={displayValue(primaryPhone)} />
          <FieldRow label="Correo empresa" value={displayValue(client.company_email)} />
          <FieldRow label="Tipo cliente" value={displayValue(client.customer_type)} />
          <FieldRow label="Categoria empresa" value={displayValue(client.company_category)} />
          <FieldRow label="ID HubSpot" value={displayValue(client.hubspot_company_id, "-")} />
          <FieldRow label="Estado comercial" value={statusLabel} />
          <FieldRow label="Ultima actualizacion" value={formatDateTime(client.updated_at)} />
        </dl>
    </div>
  );

  const mainSectionEdit = (
    <form id="client-primary-form" action={updateAction}>
      <input type="hidden" name="redirect_tab" value={initialTab} />
      <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        <div className="space-y-2">
          <EditableFieldRow label="Nombre cliente">
            <input name="trade_name" defaultValue={client.trade_name ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" required />
          </EditableFieldRow>
          <EditableFieldRow label="Razon social">
            <input name="legal_name" defaultValue={client.legal_name ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
          <EditableFieldRow label="Cliente ID">
            <input
              name="internal_code"
              defaultValue={client.internal_code ?? ""}
              placeholder="Ingresa un identificador interno"
              className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none"
            />
          </EditableFieldRow>
          <EditableFieldRow label="Direccion">
            <input name="address" defaultValue={client.address ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
          <EditableFieldRow label="Ciudad">
            <input name="city" defaultValue={client.city ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
          <EditableFieldRow label="Comuna">
            <input name="commune" defaultValue={client.commune ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
          <EditableFieldRow label="Pais">
            <input name="country" defaultValue={client.country ?? "Chile"} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
          <EditableFieldRow label="RUT">
            <input name="rut" defaultValue={client.rut ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
          <EditableFieldRow label="Cliente pagador">
            <select name="payer_client_id" defaultValue={client.payer_client_id ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none">
              <option value="">Sin cliente pagador</option>
              {validPayerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.trade_name} · {option.rut}
                </option>
              ))}
            </select>
          </EditableFieldRow>
          <EditableFieldRow label="RUT cliente pagador">
            <input name="payer_client_rut" defaultValue={client.payer_client_rut ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
        </div>

        <div className="space-y-2">
          <EditableFieldRow label="Telefono">
            <input name="phone" defaultValue={primaryPhone} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
          <EditableFieldRow label="Correo empresa">
            <input name="company_email" type="email" defaultValue={client.company_email ?? ""} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none" />
          </EditableFieldRow>
          <EditableFieldRow label="Tipo cliente">
            <select name="customer_type" defaultValue={client.customer_type ?? "Empresa"} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none">
              <option value="Empresa">Empresa</option>
              <option value="Persona">Persona</option>
            </select>
          </EditableFieldRow>
          <EditableFieldRow label="Categoria empresa">
            <select name="company_category" defaultValue={client.company_category ?? "SMB"} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none">
              <option value="Enterprise">Enterprise</option>
              <option value="Midmarket">Midmarket</option>
              <option value="SMB">SMB</option>
            </select>
          </EditableFieldRow>
          <EditableFieldRow label="Estado cliente">
            <select name="status" defaultValue={client.status ?? "active"} className="h-7 w-full border-0 bg-transparent px-0 text-[13px] outline-none">
              <option value="active">Activo</option>
              <option value="inactive">No activo</option>
              <option value="churned">Churneado</option>
            </select>
          </EditableFieldRow>
        </div>
      </div>
    </form>
  );

  const clientContactsView = (
    <SectionBlock
      title="Contactos cliente"
      description="Listado operativo del cliente"
      action={<ClientContactCreatePanel action={addContactAction} initiallyOpen={shouldOpenNewContactForm} buttonPlacement="top" />}
    >
      <div className="space-y-4">
        <div className="overflow-x-auto">
          {contacts.length === 0 ? (
            <p className="text-sm text-[var(--tazki-slate-500)]">No hay contactos registrados aun.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium text-[var(--tazki-slate-950)]">{contact.name}</TableCell>
                    <TableCell>{clientContactTypeLabel(contact.contact_type)}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || "-"}</TableCell>
                    <TableCell>{[contact.address, contact.city].filter(Boolean).join(" · ") || "-"}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-[13px] text-[var(--tazki-slate-500)]">{contact.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link href={`/clients/${id}?tab=client-contacts&edit_contact=${contact.id}`} className="font-semibold text-[var(--tazki-blue-700)]">
                          Editar
                        </Link>
                        <Link href={`/clients/${id}?tab=client-contacts&delete_contact=${contact.id}`} className="font-semibold text-[var(--tazki-danger)]">
                          Eliminar
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {(() => {
          const contact = contacts.find((item) => item.id === editingContactId);
          if (!contact) return null;
          const updateContactAction = updateClientContactAction.bind(null, id, contact.id);
          return (
            <form action={updateContactAction} className="grid gap-3 rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] p-4 md:grid-cols-2 xl:grid-cols-4">
              <select name="contact_type" defaultValue={contact.contact_type ?? "finance"} className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                <option value="finance">Contacto Finanzas</option>
                <option value="commercial">Contacto Comercial</option>
                <option value="preventionist">Contacto Prevencionista</option>
                <option value="mutual_achs">Contacto Mutual/Achs</option>
              </select>
              <input name="name" defaultValue={contact.name ?? ""} placeholder="Nombre" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" required />
              <input name="email" type="email" defaultValue={contact.email ?? ""} placeholder="Correo" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" required />
              <input name="phone" defaultValue={contact.phone ?? ""} placeholder="Telefono" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" />
              <input name="address" defaultValue={contact.address ?? ""} placeholder="Direccion" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm md:col-span-2" />
              <input name="city" defaultValue={contact.city ?? ""} placeholder="Ciudad" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" />
              <input name="notes" defaultValue={contact.notes ?? ""} placeholder="Notas internas" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm xl:col-span-2" />
              <div className="flex items-center justify-end gap-2 xl:col-span-4">
                <Link href={`/clients/${id}?tab=client-contacts`} className="rounded-lg border border-[var(--tazki-slate-300)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tazki-slate-700)]">
                  Cancelar
                </Link>
                <button type="submit" className="rounded-lg bg-[var(--tazki-blue-900)] px-4 py-2 text-sm font-semibold text-white">
                  Guardar
                </button>
              </div>
            </form>
          );
        })()}

        {(() => {
          const contact = contacts.find((item) => item.id === deletingContactId);
          if (!contact) return null;
          const deleteContactAction = deleteClientContactAction.bind(null, id, contact.id);
          return (
            <form action={deleteContactAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--tazki-slate-900)]">¿Seguro que quieres eliminar este contacto?</p>
                <p className="text-xs text-[var(--tazki-slate-500)]">Esta accion eliminara el registro del cliente.</p>
              </div>
              <input type="hidden" name="contact_name" value={contact.name ?? ""} />
              <div className="flex items-center gap-2">
                <Link href={`/clients/${id}?tab=client-contacts`} className="rounded-lg border border-[var(--tazki-slate-300)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tazki-slate-700)]">
                  Cancelar
                </Link>
                <button type="submit" className="rounded-lg bg-[var(--tazki-danger)] px-4 py-2 text-sm font-semibold text-white">
                  Eliminar
                </button>
              </div>
            </form>
          );
        })()}
      </div>
    </SectionBlock>
  );

  const internalTeamView = (
    <SectionBlock
      title="Equipo Tazki"
      description="Responsables internos asociados a la cuenta"
      action={<ClientInternalContactCreatePanel action={addInternalContactAction} initiallyOpen={shouldOpenNewInternalContactForm} />}
    >
      <div className="space-y-4">
        <div className="overflow-x-auto">
          {internalContacts.length === 0 ? (
            <p className="text-sm text-[var(--tazki-slate-500)]">No hay responsables internos asociados aun.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {internalContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium text-[var(--tazki-slate-950)]">{contact.full_name}</TableCell>
                    <TableCell>{internalRoleLabel(contact.role_type)}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={contact.is_active ? "success" : "default"} className={contact.is_active ? "bg-emerald-100 text-emerald-700" : undefined}>
                        {contact.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-[13px] text-[var(--tazki-slate-500)]">{contact.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link href={`/clients/${id}?tab=internal-team&edit_internal_contact=${contact.id}`} className="font-semibold text-[var(--tazki-blue-700)]">
                          Editar
                        </Link>
                        <Link href={`/clients/${id}?tab=internal-team&delete_internal_contact=${contact.id}`} className="font-semibold text-[var(--tazki-danger)]">
                          Eliminar
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {(() => {
          const contact = internalContacts.find((item) => item.id === editingInternalContactId);
          if (!contact) return null;
          const updateInternalContactAction = updateClientInternalContactAction.bind(null, id, contact.id);
          return (
            <form action={updateInternalContactAction} className="grid gap-3 rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] p-4 md:grid-cols-2 xl:grid-cols-4">
              <select name="role_type" defaultValue={contact.role_type === "sdr" ? "prospector" : (contact.role_type ?? "prospector")} className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                <option value="prospector">Quien prospecto</option>
                <option value="sales_executive">Ejecutivo de venta</option>
                <option value="ob_executive">Ejecutivo de OB</option>
                <option value="csm">Customer Success Manager</option>
              </select>
              <input name="full_name" defaultValue={contact.full_name ?? ""} placeholder="Nombre" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" required />
              <input name="email" type="email" defaultValue={contact.email ?? ""} placeholder="Correo" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" required />
              <input name="phone" defaultValue={contact.phone ?? ""} placeholder="Telefono" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" />
              <input name="notes" defaultValue={contact.notes ?? ""} placeholder="Notas internas" className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm xl:col-span-2" />
              <select name="is_active" defaultValue={contact.is_active ? "true" : "false"} className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
              <div className="flex items-center justify-end gap-2 xl:col-span-4">
                <Link href={`/clients/${id}?tab=internal-team`} className="rounded-lg border border-[var(--tazki-slate-300)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tazki-slate-700)]">
                  Cancelar
                </Link>
                <button type="submit" className="rounded-lg bg-[var(--tazki-blue-900)] px-4 py-2 text-sm font-semibold text-white">
                  Guardar
                </button>
              </div>
            </form>
          );
        })()}

        {(() => {
          const contact = internalContacts.find((item) => item.id === deletingInternalContactId);
          if (!contact) return null;
          const deleteInternalContactAction = deleteClientInternalContactAction.bind(null, id, contact.id);
          return (
            <form action={deleteInternalContactAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--tazki-slate-900)]">¿Seguro que quieres eliminar este contacto?</p>
                <p className="text-xs text-[var(--tazki-slate-500)]">Esta accion eliminara el registro interno asociado a la cuenta.</p>
              </div>
              <input type="hidden" name="role_type" value={contact.role_type ?? ""} />
              <div className="flex items-center gap-2">
                <Link href={`/clients/${id}?tab=internal-team`} className="rounded-lg border border-[var(--tazki-slate-300)] bg-white px-3 py-2 text-sm font-semibold text-[var(--tazki-slate-700)]">
                  Cancelar
                </Link>
                <button type="submit" className="rounded-lg bg-[var(--tazki-danger)] px-4 py-2 text-sm font-semibold text-white">
                  Eliminar
                </button>
              </div>
            </form>
          );
        })()}
      </div>
    </SectionBlock>
  );

  const billingView = (
    <SectionBlock>
      <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <DetailField label="Modelo de facturacion" value={billingModelLabel} />
        <DetailField label="Facturacion recurrente" value={client.is_recurring_billing ? "Sí" : "No"} />
        {showOcConfiguration ? <DetailField label="Uso de OC" value={ocUsageTypeLabel} /> : null}
        {showDocumentRequirement ? <DetailField label="Documento requerido" value={billingDocumentRequirement} /> : null}
        <DetailField label="Correo facturacion" value={displayValue(client.billing_email)} />
        <DetailField label="Correo DTE" value={displayValue(client.dte_email)} />
        <DetailField label="Tipo contribuyente" value={displayValue(client.taxpayer_type)} />
        <DetailField label="Moneda" value={displayValue(client.currency)} />
        <DetailField label="Giro" value={displayValue(client.industry)} />
        <DetailField
          label="OC activa"
          className="md:col-span-2"
          value={
            showOcConfiguration ? (
              activePurchaseOrder ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>{displayValue(activePurchaseOrder.purchase_order_number)}</span>
                  <span className="text-[var(--tazki-slate-500)]">vigente hasta {formatDate(activePurchaseOrder.valid_to)}</span>
                  <Link href={`/clients/${id}?tab=purchase-orders`} className="text-sm font-semibold text-[var(--tazki-blue-700)]">
                    Ver OC
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span>Sin OC vigente</span>
                  <Link href={`/clients/${id}?tab=purchase-orders`} className="text-sm font-semibold text-[var(--tazki-blue-700)]">
                    Ver OC
                  </Link>
                </div>
              )
            ) : (
              "No utiliza OC"
            )
          }
        />
      </dl>
    </SectionBlock>
  );

  const billingEdit = (
    <ClientBillingForm
      formId="client-billing-form"
      showSubmitButton={false}
      showTaxDataSection={false}
      action={updateBillingAction}
      defaultValues={{
        billing_model: billingModel,
        billing_document_requirement: (client.billing_document_requirement ?? DEFAULT_BILLING_DOCUMENT_REQUIREMENT) as BillingDocumentRequirement,
        oc_usage_type: (client.oc_usage_type ?? DEFAULT_OC_USAGE_TYPE) as OcUsageType,
        is_recurring_billing: client.is_recurring_billing ?? true,
        billing_email: client.billing_email ?? null,
        payer_client_id: client.payer_client_id ?? null,
        payer_client_rut: client.payer_client_rut ?? null,
        dte_email: client.dte_email ?? null,
        taxpayer_type: client.taxpayer_type ?? null,
        currency: client.currency ?? null,
        industry: client.industry ?? null,
        created_at_label: formatDate(client.created_at),
      }}
      payerOptions={validPayerOptions}
      activePurchaseOrder={
        activePurchaseOrder
          ? {
              purchase_order_number: activePurchaseOrder.purchase_order_number ?? null,
              valid_from_label: formatDate(activePurchaseOrder.valid_from),
              valid_to_label: formatDate(activePurchaseOrder.valid_to),
              status_label: "Vigente",
            }
          : null
      }
      viewPurchaseOrdersHref={`/clients/${id}?tab=purchase-orders`}
    />
  );

  const purchaseOrdersView = (
    <SectionBlock
      title="Ordenes de compra"
      description="Historial y vigencias de ordenes del cliente"
      action={<PurchaseOrderCreatePanel action={addPurchaseOrderAction} initiallyOpen={shouldOpenNewPurchaseOrderForm} buttonPlacement="top" />}
    >
      <div className="space-y-4">
        <div className="overflow-x-auto">
          {purchaseOrders.length === 0 ? (
            <p className="text-sm text-[var(--tazki-slate-500)]">No hay ordenes de compra historicas para este cliente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero OC</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((order) => {
                  const badge = purchaseOrderStatusBadge(order.status, order.valid_to);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-[var(--tazki-slate-950)]">{order.purchase_order_number ?? "-"}</TableCell>
                      <TableCell>{formatDate(order.valid_from)} - {formatDate(order.valid_to)}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className={badge.className}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-[13px] text-[var(--tazki-slate-500)]">{order.notes || "Sin observacion"}</TableCell>
                      <TableCell>
                        {order.attachment_path ? (
                          <Link href={`/clients/purchase-orders/${order.id}/attachment`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--tazki-blue-700)]">
                            <Download className="h-3.5 w-3.5" />
                            Ver PDF
                          </Link>
                        ) : (
                          <span className="text-[13px] text-[var(--tazki-slate-500)]">Sin PDF</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/clients/${id}?tab=purchase-orders&edit_po=${order.id}`} className="font-semibold text-[var(--tazki-blue-700)]">
                          Editar
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {(() => {
          const order = purchaseOrders.find((item) => item.id === editingPurchaseOrderId);
          if (!order) return null;
          return (
            <div className="rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tazki-slate-500)]">Editar OC</p>
                  <p className="mt-1 text-sm text-[var(--tazki-slate-700)]">Actualiza datos y adjunta o reemplaza el PDF.</p>
                </div>
                {order.attachment_path ? (
                  <Link href={`/clients/purchase-orders/${order.id}/attachment`} className="inline-flex items-center gap-1 rounded-md border border-[var(--tazki-slate-200)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--tazki-blue-700)] hover:bg-[var(--tazki-slate-50)]">
                    <Download className="h-3.5 w-3.5" />
                    Ver PDF
                  </Link>
                ) : null}
              </div>
              <PurchaseOrderForm
                action={updateClientPurchaseOrderAction.bind(null, id, order.id)}
                submitLabel="Guardar"
                defaultValues={{
                  purchase_order_number: order.purchase_order_number ?? "",
                  valid_from: order.valid_from ?? "",
                  valid_to: order.valid_to ?? "",
                  status: (order.status ?? "vigente") as PurchaseOrderFormValues["status"],
                  notes: order.notes ?? "",
                }}
                showCancelHref={`/clients/${id}?tab=purchase-orders`}
              />
            </div>
          );
        })()}
      </div>
    </SectionBlock>
  );

  const activityPanel = (
    <div className="space-y-5">
      <DetailSidePanelSection eyebrow="Panel lateral" title="Notas">
        <form action={addNoteAction} className="space-y-3">
          <input type="hidden" name="redirect_tab" value={initialTab} />
          <textarea name="body" rows={3} placeholder="Escribe una nota interna..." className="w-full rounded-lg border border-[var(--tazki-slate-200)] p-3 text-sm" required />
          <button type="submit" className="rounded-lg bg-[var(--tazki-blue-900)] px-4 py-2 text-sm font-semibold text-white">
            Guardar nota
          </button>
        </form>

        <div className="mt-3 space-y-2">
          {notes.length === 0 ? (
            <p className="text-sm text-[var(--tazki-slate-500)]">No hay notas internas registradas.</p>
          ) : (
            notes.map((note) => {
              const canDeleteNote =
                Boolean(currentUserEmail) &&
                (note.author_email?.trim().toLowerCase() ?? "") === currentUserEmail;
              const deleteNoteAction = deleteClientNoteAction.bind(null, id, note.id);

              return (
                <div key={note.id} className="rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm text-[var(--tazki-slate-800)]">{note.body}</p>
                    {canDeleteNote ? (
                      <form action={deleteNoteAction} className="shrink-0">
                        <input type="hidden" name="redirect_tab" value={initialTab} />
                        <button type="submit" className="text-xs font-semibold text-[var(--tazki-danger)] hover:opacity-80">
                          Eliminar
                        </button>
                      </form>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-[var(--tazki-slate-500)]">
                    {note.author_name || note.author_email || "Usuario"} · {formatDateTime(note.created_at)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </DetailSidePanelSection>

      <DetailSidePanelSection title="Actividad">
        {activityLogs.length === 0 ? (
          <p className="text-sm text-[var(--tazki-slate-500)]">Aun no hay eventos registrados.</p>
        ) : (
          <div className="space-y-3">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tazki-blue-900)]/8 text-xs font-semibold text-[var(--tazki-blue-900)]">
                  {(log.actor_name || log.actor_email || "S").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-[var(--tazki-slate-950)]">{log.actor_name || log.actor_email || "Sistema"}</p>
                    <span className="text-xs text-[var(--tazki-slate-400)]">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[var(--tazki-slate-500)]">{log.action_type}</p>
                  <p className="mt-1.5 text-sm text-[var(--tazki-slate-800)]">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSidePanelSection>
    </div>
  );

  return (
    <ClientDetailShell
      moduleLabel="Clientes"
      title={client.legal_name || client.trade_name}
      subtitle={headerSubtitle || "-"}
      statusLabel={statusLabel}
      statusVariant={statusVariant}
      statusClassName={statusClassName}
      backHref="/clients"
      error={query.error}
      initialTab={initialTab}
      mainSection={{
        view: mainSectionView,
        edit: mainSectionEdit,
        formId: "client-primary-form",
      }}
      tabs={[
        {
          key: "client-contacts",
          label: "Contactos cliente",
          view: clientContactsView,
        },
        {
          key: "internal-team",
          label: "Equipo Tazki",
          view: internalTeamView,
        },
        {
          key: "billing",
          label: "Facturacion",
          view: billingView,
          edit: billingEdit,
          formId: "client-billing-form",
        },
        {
          key: "purchase-orders",
          label: "Ordenes de compra",
          view: purchaseOrdersView,
        },
      ]}
      activityPanel={activityPanel}
    />
  );
}
