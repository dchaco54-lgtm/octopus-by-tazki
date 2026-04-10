"use client";

import { cn } from "@/lib/utils";

interface ResizableColumnHeaderProps {
  label: string;
  align?: "left" | "right";
  width?: number | string;
  onResizeStart: (clientX: number) => void;
}

export function ResizableColumnHeader({ label, align = "left", width, onResizeStart }: ResizableColumnHeaderProps) {
  return (
    <div className="group relative flex h-full w-full items-center" style={width ? { width } : undefined}>
      <span className={cn("truncate pr-3", align === "right" && "ml-auto text-right")}>{label}</span>
      <button
        type="button"
        aria-label={`Redimensionar columna ${label}`}
        className="absolute inset-y-0 right-0 w-3 cursor-col-resize opacity-0 transition group-hover:opacity-100"
        onMouseDown={(event) => {
          event.preventDefault();
          onResizeStart(event.clientX);
        }}
      >
        <span className="absolute bottom-1 top-1 right-1 w-px bg-[var(--tazki-slate-300)]" />
      </button>
    </div>
  );
}
