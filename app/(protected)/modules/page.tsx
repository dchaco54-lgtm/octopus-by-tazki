import {
  BarChart3,
  CircleHelp,
  Link2,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { navigationItems, secondaryNavigationItems } from "@/components/layout/navigation-config";

const modules = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    title: "Dashboard",
    description: "Indicadores ejecutivos y visibilidad general de operaciones.",
  },
  {
    key: "overview",
    href: "/modules",
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Vista central",
    description: "Acceso rapido a la operacion y navegacion principal.",
  },
  ...navigationItems
    .filter((item) => item.href)
    .map((item) => ({
      key: item.key,
      href: item.href!,
      icon: <item.icon className="h-5 w-5" />,
      title: item.label,
      description: item.description,
    })),
  ...secondaryNavigationItems
    .filter((item) => item.href)
    .map((item) => ({
      key: item.key,
      href: item.href!,
      icon: <item.icon className="h-5 w-5" />,
      title: item.label,
      description: item.description,
    })),
  {
    key: "hubspot",
    href: "/hubspot-connect",
    icon: <Link2 className="h-5 w-5" />,
    title: "HubSpot Connect",
    description: "Conector comercial del CRM de ventas.",
  },
  {
    key: "support",
    href: "/support",
    icon: <CircleHelp className="h-5 w-5" />,
    title: "Soporte",
    description: "Canal interno de ayuda y seguimiento.",
  },
];

export default function ModulesPage() {
  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {modules.map((module) => (
          <Link key={module.key} href={module.href} className="group block">
            <Card className="border-[var(--tazki-slate-200)] bg-white transition-all group-hover:-translate-y-0.5 group-hover:border-[var(--tazki-blue-600)] group-hover:shadow-[0_10px_20px_rgba(19,38,77,0.15)]">
              <CardContent className="p-4">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tazki-blue-900)]/10 text-[var(--tazki-blue-900)]">
                  {module.icon}
                </div>
                <h3 className="text-sm font-semibold text-[var(--tazki-slate-950)]">{module.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--tazki-slate-500)]">{module.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
