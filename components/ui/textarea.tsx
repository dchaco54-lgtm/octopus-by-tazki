import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-24 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 py-2 text-sm text-[var(--tazki-slate-950)] shadow-sm placeholder:text-[var(--tazki-slate-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tazki-blue-600)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
