import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva("inline-flex min-h-7 items-center justify-center rounded-full border px-3 py-1 font-[var(--font-mono)] text-xs font-bold uppercase tracking-[0.12em] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--moss)] focus:ring-offset-0", {
    variants: {
        variant: {
            default: "border-[rgba(95,123,56,0.28)] bg-[rgba(95,123,56,0.16)] text-[var(--color-text-primary)] shadow-none hover:bg-[rgba(95,123,56,0.24)]",
            secondary: "border-white/10 bg-white/[0.08] text-[var(--color-text-secondary)] shadow-none hover:bg-white/[0.12]",
            destructive: "border-[rgba(224,90,58,0.22)] bg-[rgba(224,90,58,0.1)] text-[var(--color-danger)] shadow-none hover:bg-[rgba(224,90,58,0.15)]",
            outline: "border-[rgba(118,98,166,0.32)] bg-[rgba(118,98,166,0.1)] text-[var(--accent-purple-soft)] shadow-none hover:bg-[rgba(118,98,166,0.15)]",
            amber: "border-[rgba(201,164,106,0.28)] bg-[rgba(201,164,106,0.12)] text-[var(--bark)] shadow-none hover:bg-[rgba(201,164,106,0.18)]",
            cyan: "border-[rgba(95,123,56,0.18)] bg-[rgba(255,255,255,0.08)] text-[var(--text-muted)] shadow-none hover:text-[var(--text-primary)] hover:border-[rgba(95,123,56,0.3)]",
        },
    },
    defaultVariants: {
        variant: "default",
    },
})

interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant, ...props }, ref) => {
        return (
            <div
                className={cn(badgeVariants({ variant }), className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Badge.displayName = "Badge"

export { Badge }
