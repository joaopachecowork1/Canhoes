import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("flex w-full min-w-0 rounded-[0.875rem] border border-[var(--border-paper)] bg-[var(--bg-paper)] px-4 py-3 text-base text-[var(--color-text-primary)] shadow-none outline-none transition duration-200 placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-veil)]/12 focus-visible:border-[var(--moss)]/50 focus-visible:bg-[var(--color-veil)]/6 focus-visible:ring-[3px] focus-visible:ring-[var(--moss)]/20 focus-visible:shadow-[0_0_12px_rgba(152,190,92,0.1)] disabled:cursor-not-allowed disabled:opacity-50 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--ink-muted)] file:text-[var(--ink-muted)] selection:bg-[var(--moss)] selection:text-[var(--text-primary)] min-h-11 rounded-[var(--radius-sm-token)] font-[var(--font-body)] aria-invalid:border-[var(--destructive)] aria-invalid:ring-[var(--destructive)]/20", className)}
      {...props}
    />
  );
}

export { Input };
