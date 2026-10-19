import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Configurações de variantes visuais para o componente Button.
 * Inclui estados como default, primary, destructive, outline, secondary, ghost, link e glow.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md-token)] text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] min-h-[44px]",
  {
    variants: {
      variant: {
        default: "border border-[var(--moss)]/36 bg-[var(--moss)] text-[var(--on-moss)] shadow-[var(--shadow-elevation-sm)] hover:bg-[var(--moss-light)] hover:border-[var(--moss)]/48 hover:shadow-[var(--shadow-elevation-md)]",
        primary: "border-0 rounded-full text-[var(--on-moss)] bg-[var(--moss)] shadow-[var(--shadow-elevation-sm)] hover:bg-[var(--moss-glow)] hover:shadow-[var(--shadow-elevation-md)]",
        destructive: "border border-[var(--color-danger)]/22 bg-[linear-gradient(180deg,var(--color-danger),var(--color-danger-hover))] text-[var(--text-primary)] shadow-[var(--shadow-elevation-sm)] hover:border-[var(--color-danger)]/30 hover:brightness-110",
        outline: "border border-[var(--color-veil)]/10 bg-[var(--color-veil)]/5 text-[var(--color-text-primary)] shadow-none hover:bg-[var(--color-veil)]/8 hover:border-[var(--color-veil)]/15 hover:shadow-sm",
        secondary: "border border-[var(--border-subtle)] bg-[var(--color-veil)]/8 text-[var(--text-primary)] shadow-none hover:bg-[var(--color-veil)]/14 hover:border-[var(--color-veil)]/18",
        ghost: "border-transparent bg-transparent text-[var(--text-primary)] shadow-none hover:bg-[var(--color-veil)]/8 hover:text-[var(--moss-glow)]",
        "ghost-subtle": "border-transparent bg-transparent text-[var(--text-muted)] shadow-none hover:bg-[var(--bg-paper)] hover:text-[var(--text-primary)]",
        link: "px-0 text-[var(--moss-glow)] underline-offset-4 shadow-none hover:text-[var(--ink-primary)] hover:underline decoration-[var(--moss)]/30 decoration-2 hover:underline-offset-4",
        glow: "border border-[var(--moss)]/22 bg-[var(--moss)]/12 text-[var(--moss-glow)] shadow-[var(--shadow-elevation-sm)] hover:bg-[var(--moss)]/16 hover:shadow-[var(--shadow-elevation-md)]",
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

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

/**
 * Componente de botão interativo e acessível com suporte para múltiplas variantes visuais.
 * 
 * @param asChild - Se true, renderiza o componente usando o Slot do Radix para composição.
 * @param variant - O estilo visual do botão.
 * @param size - O tamanho do botão.
 */
function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button }
