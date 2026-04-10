"use client";

import Link from "next/link";
import { House, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  navigationItems,
  secondaryNavigationItems,
  type NavigationItem,
} from "@/components/layout/navigation-config";
import {
  ERP_LAYOUT_NOTE,
  ERP_SIDEBAR_FLYOUT_CLASSNAME,
  ERP_SIDEBAR_RAIL_CLASSNAME,
} from "@/components/layout/erp-layout-contract";

function isItemActive(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarIconButton({
  item,
  pathname,
  onHover,
  onClick,
}: {
  item: NavigationItem;
  pathname: string;
  onHover: () => void;
  onClick: () => void;
}) {
  const active = isItemActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${
        active
          ? "border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-900)] text-white shadow-[0_10px_24px_rgba(19,38,77,0.16)]"
          : "border-transparent bg-white text-[var(--tazki-slate-600)] hover:border-[var(--tazki-slate-200)] hover:bg-[var(--tazki-slate-50)] hover:text-[var(--tazki-slate-950)]"
      }`}
      aria-label={item.label}
      title={item.label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export function AppSidebar() {
  // Shared navigation rail for all operational modules. Keep this thin and
  // icon-first so the ERP workspace remains the primary focus across modules.
  void ERP_LAYOUT_NOTE;
  const pathname = usePathname();
  const items = useMemo(() => [...navigationItems, ...secondaryNavigationItems], []);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  const activeKey = pinnedKey ?? hoveredKey;
  const activeItem = useMemo(
    () => items.find((item) => item.key === activeKey) ?? null,
    [activeKey, items]
  );

  return (
    <div
      className="fixed inset-y-4 left-4 z-30 hidden lg:block"
      onMouseLeave={() => {
        if (!pinnedKey) setHoveredKey(null);
      }}
    >
      <aside className={ERP_SIDEBAR_RAIL_CLASSNAME}>
        <Link
          href="/modules"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-[var(--tazki-slate-700)] transition-colors hover:border-[var(--tazki-slate-200)] hover:bg-[var(--tazki-slate-50)]"
          aria-label="Inicio"
          title="Inicio"
        >
          <House className="h-5 w-5" />
        </Link>

        <div className="my-3 h-px w-8 bg-[var(--tazki-slate-200)]" />

        <nav className="flex flex-1 flex-col items-center gap-2 overflow-y-auto">
          {items.map((item) => (
            <SidebarIconButton
              key={item.key}
              item={item}
              pathname={pathname}
              onHover={() => setHoveredKey(item.key)}
              onClick={() => setPinnedKey((current) => (current === item.key ? null : item.key))}
            />
          ))}
        </nav>
      </aside>

      {activeItem ? (
        <div className={ERP_SIDEBAR_FLYOUT_CLASSNAME} onMouseEnter={() => setHoveredKey(activeItem.key)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tazki-slate-500)]">
                Octopus
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--tazki-slate-950)]">{activeItem.label}</h2>
              <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">{activeItem.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setPinnedKey((current) => (current === activeItem.key ? null : activeItem.key))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--tazki-slate-200)] text-[var(--tazki-slate-500)] transition-colors hover:bg-[var(--tazki-slate-50)] hover:text-[var(--tazki-slate-900)]"
              aria-label={pinnedKey === activeItem.key ? "Cerrar menu" : "Fijar menu"}
            >
              {pinnedKey === activeItem.key ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-500)]">
              Submodulos
            </p>
            <div className="mt-2 space-y-1">
              {(activeItem.subItems ?? []).map((subItem) => (
                <div
                  key={subItem}
                  className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm font-medium text-[var(--tazki-slate-700)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--tazki-slate-300)]" />
                  {subItem}
                </div>
              ))}
            </div>
          </div>

          <Link
            href={activeItem.href ?? "/modules"}
            className="mt-4 inline-flex rounded-xl bg-[var(--tazki-blue-900)] px-4 py-2 text-sm font-semibold text-white"
          >
            Abrir modulo
          </Link>
        </div>
      ) : null}
    </div>
  );
}
