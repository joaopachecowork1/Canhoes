"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Um botão do dock: ícone, etiqueta, estado ativo e cor de destaque. */
export type DockItem = {
  /** CSS colour of the active state (the area's tab colour). */
  accent?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  buttonClassName?: string;
  icon: LucideIcon;
  iconClassName?: string;
  isActive?: boolean;
  label: string;
  onClick?: () => void;
};

/** Propriedades do `Dock`. */
type DockProps = {
  className?: string;
  dockClassName?: string;
  items: readonly DockItem[];
};

/** Um botão do dock: ícone por cima da etiqueta, destacado com a cor da área quando ativo. */
function DockButton({
  accent,
  ariaLabel,
  ariaPressed,
  buttonClassName,
  icon: Icon,
  iconClassName,
  isActive,
  label,
  onClick,
}: Readonly<DockItem>) {
  // Fundo do estado ativo: a cor de destaque misturada com transparente.
  const activeStyle =
    isActive && accent
      ? { color: accent, backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)` }
      : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive && !ariaPressed ? "page" : undefined}
      aria-pressed={ariaPressed}
      aria-label={ariaLabel ?? label}
      style={activeStyle}
      className={cn(
        "relative flex min-h-[3.375rem] w-full flex-col items-center justify-center gap-1 rounded-[0.95rem] px-0.5 py-2 leading-none transition-colors duration-200 active:scale-[0.97]",
        isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--color-veil)]/6",
        buttonClassName,
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} aria-hidden />
      <span className="max-w-full font-[family-name:var(--font-display)] text-[0.8125rem] font-bold uppercase">
        {label}
      </span>
    </button>
  );
}

/** Barra de botões em grelha, uma coluna por item, usada como navegação em baixo. */
function Dock({ className, dockClassName, items }: Readonly<DockProps>) {
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn("grid w-full gap-1.5", dockClassName)}
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <DockButton key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}

export { Dock };
