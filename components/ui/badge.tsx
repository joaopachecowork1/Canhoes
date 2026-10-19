import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva("inline-flex min-h-7 items-center justify-center rounded-full border px-3 py-1 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.12em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--moss)] focus:ring-offset-0", {
    variants: {
        variant: {
            default: "border-[var(--moss)]/28 bg-[var(--moss)]/16 text-[var(--moss-glow)] shadow-none hover:bg-[var(--moss)]/24",
            secondary: "border-[var(--color-veil)]/10 bg-[var(--color-veil)]/8 text-[var(--color-text-secondary)] shadow-none hover:bg-[var(--color-veil)]/12",
            destructive: "border-[var(--color-danger)]/22 bg-[var(--color-danger)]/10 text-[var(--color-danger)] shadow-none hover:bg-[var(--color-danger)]/15",
            outline: "border-[var(--color-border-strong)] bg-[var(--color-veil)]/6 text-[var(--accent-purple-soft)] shadow-none hover:bg-[var(--color-veil)]/10",
            amber: "border-[var(--neon-amber)]/40 bg-[var(--neon-amber)]/12 text-[var(--neon-amber)] shadow-none hover:bg-[var(--neon-amber)]/18",
            cyan: "border-[var(--moss)]/18 bg-[var(--color-veil)]/8 text-[var(--text-muted)] shadow-none hover:text-[var(--text-primary)] hover:border-[var(--moss)]/30",
        },
    },
    defaultVariants: {
        variant: "default",
    },
})

type BadgeProps = React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
