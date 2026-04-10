import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 py-2 text-sm text-[var(--tazki-slate-950)] shadow-sm transition-colors placeholder:text-[var(--tazki-slate-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tazki-blue-600)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
