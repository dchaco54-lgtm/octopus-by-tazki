"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SubscriptionSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SubscriptionSearchBar({ value, onChange }: SubscriptionSearchBarProps) {
  return (
    <div className="relative w-full max-w-[360px] min-w-[240px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tazki-slate-400)]" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar..."
        className="h-8 rounded-md border-[var(--tazki-slate-200)] bg-white pl-9 pr-3 text-[13px] shadow-none focus-visible:ring-1"
      />
    </div>
  );
}

