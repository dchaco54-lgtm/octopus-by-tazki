"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ERP_ASIDE_PANEL_CLASSNAME,
  ERP_LAYOUT_NOTE,
  ERP_SHEET_CLASSNAME,
  ERP_SHEET_WRAPPER_CLASSNAME,
} from "@/components/layout/erp-layout-contract";
import { DetailPageHeader } from "@/components/detail/detail-page-header";
import { DetailTabs } from "@/components/detail/detail-tabs";

interface DetailSection {
  view: React.ReactNode;
  edit?: React.ReactNode;
  formId?: string;
}

interface ClientDetailTab {
  key: string;
  label: string;
  view: React.ReactNode;
  edit?: React.ReactNode;
  formId?: string;
}

interface ClientDetailShellProps {
  moduleLabel: string;
  title: string;
  subtitle?: string | null;
  statusLabel: string;
  statusVariant: "success" | "warning" | "default";
  statusClassName?: string;
  backHref: string;
  error?: string;
  initialTab: string;
  mainSection: DetailSection;
  tabs: ClientDetailTab[];
  activityPanel: React.ReactNode;
}

export function ClientDetailShell({
  moduleLabel,
  title,
  subtitle,
  statusLabel,
  statusVariant,
  statusClassName,
  backHref,
  error,
  initialTab,
  mainSection,
  tabs,
  activityPanel,
}: ClientDetailShellProps) {
  // Shared ERP shell: this is the visual reference that other Octopus
  // modules should follow to preserve the Odoo-like interaction model.
  void ERP_LAYOUT_NOTE;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);

  const activePanel = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) ?? tabs[0],
    [activeTab, tabs]
  );

  const currentFormId = activePanel.formId ?? mainSection.formId;

  const syncRedirectTab = () => {
    const forms = Array.from(document.querySelectorAll<HTMLFormElement>("form"));
    forms.forEach((form) => {
      const redirectInput = form.elements.namedItem("redirect_tab");
      if (redirectInput instanceof HTMLInputElement) {
        redirectInput.value = activeTab;
      }
    });
  };

  useEffect(() => {
    const forms = Array.from(document.querySelectorAll<HTMLFormElement>("form"));
    forms.forEach((form) => {
      const redirectInput = form.elements.namedItem("redirect_tab");
      if (redirectInput instanceof HTMLInputElement) {
        redirectInput.value = activeTab;
      }
    });
  }, [activeTab]);

  const handleCancel = () => {
    const formIds = [mainSection.formId, ...tabs.map((tab) => tab.formId)].filter((value): value is string => Boolean(value));
    const uniqueFormIds = Array.from(new Set(formIds));

    uniqueFormIds.forEach((formId) => {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      form?.reset();
    });

    setIsEditing(false);
  };

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      {error ? <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-[var(--tazki-danger)]">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
          <DetailPageHeader
            moduleLabel={moduleLabel}
            title={title}
            subtitle={subtitle}
            statusLabel={statusLabel}
            statusVariant={statusVariant}
            statusClassName={statusClassName}
            actions={
              <>
                {!isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--tazki-blue-900)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--tazki-blue-700)]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-400)]"
                      title="Cambio de estado disponible proximamente"
                    >
                      Cambiar estado
                    </button>
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-[13px] font-semibold text-red-300"
                      title="Eliminacion disponible proximamente"
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form={currentFormId}
                      disabled={!currentFormId}
                      onClick={syncRedirectTab}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--tazki-blue-900)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--tazki-blue-700)]"
                    >
                      Guardar
                    </button>
                  </>
                )}
                <a
                  href={backHref}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]"
                >
                  Volver
                </a>
              </>
            }
          />

          <div className="pt-4">{isEditing ? mainSection.edit ?? mainSection.view : mainSection.view}</div>

          <div className="mt-3.5">
            <DetailTabs tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />

            <div className="pt-2.5">
              {tabs.map((tab) => (
                <div key={tab.key} className={activeTab === tab.key ? "block" : "hidden"}>
                  {isEditing && tab.edit ? tab.edit : tab.view}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="xl:sticky xl:top-[88px] xl:self-start">
          <div className={ERP_ASIDE_PANEL_CLASSNAME}>
            <div className="max-h-[calc(100vh-118px)] overflow-y-auto px-4 py-3">{activityPanel}</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
