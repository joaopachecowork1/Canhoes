"use client";

import { ChevronRight, CircleHelp, LogOut, Shield } from "lucide-react";
import Link from "next/link";

import { useStoredFlag, WELCOME_DISMISSED_STORAGE_KEY } from "@/lib/domains/event/hooks/useStoredFlag";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { areaColorVar, type CanhoesNavItem } from "./canhoesNavigation";
import { PersonColorPicker } from "./PersonColorPicker";
import messages from "@/messages/pt.json";

const copy = messages.shell.CanhoesMenuSheet;

/**
 * Bottom sheet com as áreas abertas que não cabem no dock. Opaco de propósito, para a página
 * por trás nunca competir com as ligações. Os admins têm ainda uma ligação para todas as áreas,
 * as fechadas incluídas, que vive na área de administração.
 */
export function CanhoesMenuSheet({
  isAdmin,
  items,
  onLogout,
  onOpenChange,
  open,
  pathname,
}: Readonly<{
  isAdmin: boolean;
  items: readonly CanhoesNavItem[];
  onLogout: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pathname: string | null;
}>) {
  const [, setIsWelcomeDismissed] = useStoredFlag(WELCOME_DISMISSED_STORAGE_KEY, true);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85svh] gap-0 overflow-y-auto border-[var(--border-subtle)] bg-[var(--bg-surface)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-[var(--text-primary)] sm:mx-auto sm:max-w-md"
      >
        <SheetHeader className="pb-3 pr-14">
          <SheetTitle className="text-xl">{messages.shell.common.menu}</SheetTitle>
          <SheetDescription className="text-sm text-[var(--color-text-muted)]">{copy.menuDescription}</SheetDescription>
        </SheetHeader>

        <PersonColorPicker />

        <nav aria-label={copy.otherAreasLabel} className="flex flex-col px-2">
          {items.map((item) => (
            <MenuLink
              key={item.id}
              item={item}
              isActive={Boolean(pathname?.startsWith(item.href))}
              onSelect={() => onOpenChange(false)}
            />
          ))}

          {items.length === 0 ? (
            <p className="px-3 py-4 text-base text-[var(--color-text-muted)]">{copy.noMoreAreas}</p>
          ) : null}

          {isAdmin ? (
            <MenuLink
              item={{
                id: "admin",
                label: copy.allAreas,
                href: "/canhoes/admin/configuracoes",
                icon: Shield,
                description: copy.allAreasDescription,
              }}
              isActive={false}
              onSelect={() => onOpenChange(false)}
            />
          ) : null}

          <MenuLink
            item={{
              id: "welcome",
              label: copy.welcomeAgain,
              href: "/canhoes",
              icon: CircleHelp,
              description: copy.welcomeAgainDescription,
            }}
            isActive={false}
            // Voltar a mostrar as boas-vindas é só limpar a flag guardada.
            onSelect={() => {
              setIsWelcomeDismissed(false);
              onOpenChange(false);
            }}
          />

          <LogoutButton
            onLogout={() => {
              onOpenChange(false);
              onLogout();
            }}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/** Botão de terminar sessão, com o mesmo aspeto das ligações do menu. */
function LogoutButton({ onLogout }: Readonly<{ onLogout: () => void }>) {
  return (
    <button
      type="button"
      onClick={onLogout}
      className="mt-2 flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 text-left text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-paper)] hover:text-[var(--text-primary)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-paper)]">
        <LogOut className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-base font-semibold">{copy.logout}</span>
    </button>
  );
}

/** Uma linha do menu: ícone na cor da área, nome, descrição opcional e seta. */
function MenuLink({
  isActive,
  item,
  onSelect,
}: Readonly<{ isActive: boolean; item: CanhoesNavItem; onSelect: () => void }>) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onSelect}
      aria-current={isActive ? "page" : undefined}
      style={{ "--area": areaColorVar(item.id) }}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[var(--bg-paper)] active:bg-[var(--bg-paper)]",
        isActive && "bg-[var(--bg-paper)]",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--area,var(--moss))] text-[var(--on-person)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{item.label}</span>
        {item.description ? (
          <span className="block text-sm text-[var(--color-text-muted)]">{item.description}</span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
    </Link>
  );
}
