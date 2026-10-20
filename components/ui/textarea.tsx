import * as React from "react";

import { cn } from "@/lib/utils";

/** Campo de texto de várias linhas, que cresce com o conteúdo. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full min-w-0 rounded-[0.875rem] border border-[var(--border-paper)] bg-[var(--bg-paper)] px-4 py-3 text-base text-[var(--color-text-primary)] shadow-none outline-none transition duration-200 placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-veil)]/12 focus-visible:border-[var(--moss)]/50 focus-visible:bg-[var(--color-veil)]/6 focus-visible:ring-[3px] focus-visible:ring-[var(--moss)]/20 disabled:cursor-not-allowed disabled:opacity-50 field-sizing-content min-h-24 rounded-[var(--radius-md-token)] font-[family-name:var(--font-body)] resize-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
