// ERP layout contract for Octopus.
// This file is the source of truth for the shared Odoo-inspired structure
// that every operational module should reuse: slim navigation rail, central
// sheet, compact tabs, and a right-side contextual panel.

export const ERP_LAYOUT_NOTE = `
All operational modules in Octopus must follow the same ERP pattern:
- slim icon-first sidebar
- central white sheet over light gray workspace
- compact identity header
- main content on the left
- notes/activity panel on the right
- sticky tabs directly attached to the sheet
- dense two-column information layout when possible
`.trim();

export const ERP_WORKSPACE_CLASSNAME = "mx-auto max-w-[1600px] bg-[var(--tazki-slate-50)] px-4 py-5 lg:px-6";

export const ERP_SHEET_WRAPPER_CLASSNAME = "mx-auto max-w-[1360px] rounded-[28px] bg-[var(--tazki-slate-50)] p-4 lg:p-6";

export const ERP_SHEET_CLASSNAME =
  "min-w-0 rounded-[18px] border border-[var(--tazki-slate-200)] bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]";

export const ERP_ASIDE_PANEL_CLASSNAME =
  "overflow-hidden rounded-[18px] border border-[var(--tazki-slate-200)] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]";

export const ERP_SIDEBAR_RAIL_CLASSNAME =
  "relative flex h-[calc(100vh-2rem)] w-[56px] flex-col items-center rounded-[20px] border border-[var(--tazki-slate-200)] bg-white/96 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur";

export const ERP_SIDEBAR_FLYOUT_CLASSNAME =
  "absolute left-[68px] top-3 w-[280px] rounded-[20px] border border-[var(--tazki-slate-200)] bg-white p-4 shadow-[0_22px_50px_rgba(15,23,42,0.16)]";
