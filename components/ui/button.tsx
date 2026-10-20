import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A disabled button with a box turns into a flat grey one; the variants without a box (ghost, link) just dim.
const DISABLED_BOX = "disabled:border-[var(--color-border)] disabled:bg-[var(--color-veil)]/8 disabled:text-[var(--color-text-muted)]";
const DISABLED_DIM = "disabled:opacity-50";

/**
 * Configurações de variantes visuais para o componente Button.
 * Inclui estados como default, primary, destructive, outline, secondary, ghost, link e glow.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md-token)] text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-none disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] min-h-[44px]",
  {
    variants: {
      variant: {
        default: `border border-[var(--moss)]/36 bg-[var(--moss)] text-[var(--on-moss)] shadow-[var(--shadow-elevation-sm)] hover:bg-[var(--moss-light)] hover:border-[var(--moss)]/48 hover:shadow-[var(--shadow-elevation-md)] ${DISABLED_BOX}`,
        primary: `border-0 rounded-full text-[var(--on-moss)] bg-[var(--moss)] shadow-[var(--shadow-elevation-sm)] hover:bg-[var(--moss-glow)] hover:shadow-[var(--shadow-elevation-md)] ${DISABLED_BOX}`,
        destructive: `border border-[var(--color-danger)]/22 bg-[linear-gradient(180deg,var(--color-danger),var(--color-danger-hover))] text-[var(--text-primary)] shadow-[var(--shadow-elevation-sm)] hover:border-[var(--color-danger)]/30 hover:brightness-110 ${DISABLED_BOX}`,
        outline: `border border-[var(--color-veil)]/10 bg-[var(--color-veil)]/5 text-[var(--color-text-primary)] shadow-none hover:bg-[var(--color-veil)]/8 hover:border-[var(--color-veil)]/15 hover:shadow-sm ${DISABLED_BOX}`,
        secondary: `border border-[var(--border-subtle)] bg-[var(--color-veil)]/8 text-[var(--text-primary)] shadow-none hover:bg-[var(--color-veil)]/14 hover:border-[var(--color-veil)]/18 ${DISABLED_BOX}`,
        ghost: `border-transparent bg-transparent text-[var(--text-primary)] shadow-none hover:bg-[var(--color-veil)]/8 hover:text-[var(--moss-glow)] ${DISABLED_DIM}`,
        "ghost-subtle": `border-transparent bg-transparent text-[var(--text-muted)] shadow-none hover:bg-[var(--bg-paper)] hover:text-[var(--text-primary)] ${DISABLED_DIM}`,
        link: `px-0 text-[var(--moss-glow)] underline-offset-4 shadow-none hover:text-[var(--ink-primary)] hover:underline decoration-[var(--moss)]/30 decoration-2 hover:underline-offset-4 ${DISABLED_DIM}`,
        glow: `border border-[var(--moss)]/22 bg-[var(--moss)]/12 text-[var(--moss-glow)] shadow-[var(--shadow-elevation-sm)] hover:bg-[var(--moss)]/16 hover:shadow-[var(--shadow-elevation-md)] ${DISABLED_BOX}`,
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
