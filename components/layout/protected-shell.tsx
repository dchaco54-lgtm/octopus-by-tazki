"use client";

import { ERP_LAYOUT_NOTE, ERP_WORKSPACE_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { TopHeader } from "@/components/layout/top-header";

interface ProtectedShellProps {
  children: React.ReactNode;
  displayName: string;
  email: string;
}

export function ProtectedShell({ children, displayName, email }: ProtectedShellProps) {
  // The protected workspace must remain a neutral ERP canvas so every module
  // can reuse the same Odoo-like composition without drifting visually.
  void ERP_LAYOUT_NOTE;

  return (
    <div className="min-h-screen">
      <div>
        <TopHeader displayName={displayName} email={email} />
        <main className={ERP_WORKSPACE_CLASSNAME}>{children}</main>
      </div>
    </div>
  );
}
