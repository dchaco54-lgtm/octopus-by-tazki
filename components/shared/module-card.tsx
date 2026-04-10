import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ModuleCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}

export function ModuleCard({ href, icon, title, description }: ModuleCardProps) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full border-[var(--tazki-slate-200)] transition-all group-hover:-translate-y-0.5 group-hover:border-[var(--tazki-blue-600)] group-hover:shadow-[0_10px_28px_rgba(19,38,77,0.15)]">
        <CardHeader>
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--tazki-blue-900)]/10 text-[var(--tazki-blue-900)]">
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <span className="text-sm font-semibold text-[var(--tazki-blue-700)]">Abrir modulo</span>
        </CardContent>
      </Card>
    </Link>
  );
}
