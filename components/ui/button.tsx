import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Configurações de variantes visuais para o componente Button.
 * Inclui estados como default, primary, destructive, outline, secondary, ghost, link e glow.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md-token)] text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] min-h-[44px]",
  {
    variants: {
      variant: {
        default: "border border-[rgba(95,123,56,0.36)] bg-[var(--moss)] text-white shadow-[var(--shadow-elevation-sm)] hover:bg-[var(--moss-light)] hover:border-[rgba(95,123,56,0.48)] hover:shadow-[var(--shadow-elevation-md)]",
        primary: "border-0 rounded-full text-white bg-[#4F6336] shadow-[0_2px_8px_rgba(79,99,54,0.25)] hover:bg-[#677f46] hover:shadow-lg hover:-translate-y-0.5",
        destructive: "border border-[rgba(224,90,58,0.22)] bg-[linear-gradient(180deg,var(--color-danger),var(--color-danger-hover))] text-white shadow-[var(--shadow-elevation-sm)] hover:border-[rgba(224,90,58,0.3)] hover:brightness-110",
        outline: "border border-white/10 bg-white/[0.05] text-[var(--color-text-primary)] shadow-none hover:bg-white/[0.08] hover:border-white/15 hover:shadow-sm",
        secondary: "border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)] shadow-none hover:bg-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.18)]",
        ghost: "border-transparent bg-transparent text-[var(--text-primary)] shadow-none hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--moss)]",
        "ghost-subtle": "border-transparent bg-transparent text-[var(--text-muted)] shadow-none hover:bg-[var(--bg-paper)] hover:text-[var(--text-primary)]",
        link: "px-0 text-[var(--moss)] underline-offset-4 shadow-none hover:text-[var(--ink-primary)] hover:underline decoration-[rgba(95,123,56,0.3)] decoration-2 hover:underline-offset-4",
        glow: "border border-[rgba(95,123,56,0.22)] bg-[rgba(95,123,56,0.12)] text-[var(--text-primary)] shadow-[var(--shadow-elevation-sm)] hover:bg-[rgba(95,123,56,0.16)] hover:shadow-[0_0_15px_rgba(95,123,56,0.2)]",
        neon: "bg-neon-glow border border-neon-green/30 text-neon-green hover:bg-neon-green/25 shadow-neon font-semibold",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

/**
 * Componente de botão interativo e acessível com suporte para múltiplas variantes visuais.
 * 
 * @param asChild - Se true, renderiza o componente usando o Slot do Radix para composição.
 * @param variant - O estilo visual do botão.
 * @param size - O tamanho do botão.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
