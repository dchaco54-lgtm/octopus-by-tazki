import Link from "next/link";
import { Home, LogOut } from "lucide-react";
import { AppBranding } from "@/components/layout/app-branding";
import { HeaderControls } from "@/components/layout/header-controls";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/modules/auth/actions";

interface TopHeaderProps {
  displayName: string;
  email: string;
}

export function TopHeader({ displayName, email }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--tazki-slate-200)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="inline-flex items-center gap-2">
          <Link
            href="/modules"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--tazki-slate-200)] bg-white text-[var(--tazki-slate-600)] transition-colors hover:bg-[var(--tazki-slate-50)] hover:text-[var(--tazki-slate-950)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tazki-blue-200)]"
            aria-label="Ir al inicio"
            title="Inicio"
          >
            <Home className="h-[22px] w-[22px]" />
          </Link>
          <AppBranding />
        </div>
        <div className="flex items-center gap-3">
          <HeaderControls displayName={displayName} email={email} />
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
