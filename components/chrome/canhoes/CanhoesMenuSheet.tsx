"use client";

import { ChevronRight, Shield } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import type { CanhoesNavItem } from "./canhoesNavigation";

/**
 * Bottom sheet with the open areas that do not fit in the dock. Opaque on purpose, so the page
 * behind never competes with the links. Admins also get a link to every area, closed ones
 * included, which lives in the admin area.
 */
export function CanhoesMenuSheet({
  isAdmin,
  items,
  onOpenChange,
  open,
  pathname,
}: Readonly<{
  isAdmin: boolean;
  items: readonly CanhoesNavItem[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pathname: string | null;
}>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85svh] gap-0 overflow-y-auto border-[var(--border-subtle)] bg-[var(--bg-surface)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-[var(--text-primary)] sm:mx-auto sm:max-w-md"
      >
        <SheetHeader className="pb-3 pr-14">
          <SheetTitle className="text-lg">Menu</SheetTitle>
          <SheetDescription className="text-sm text-[var(--color-text-muted)]">
            Áreas abertas nesta fase.
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="Outras áreas" className="flex flex-col px-2">
          {items.map((item) => (
            <MenuLink
              key={item.id}
              item={item}
              isActive={Boolean(pathname?.startsWith(item.href))}
              onSelect={() => onOpenChange(false)}
            />
          ))}

          {items.length === 0 ? (
            <p className="px-3 py-4 text-base text-[var(--color-text-muted)]">
              Não há mais áreas abertas nesta fase.
            </p>
          ) : null}

          {isAdmin ? (
            <MenuLink
              item={{
                id: "admin-areas",
                label: "Todas as áreas",
                href: "/canhoes/admin/configuracoes",
                icon: Shield,
                description: "As fechadas nesta fase estão no Admin.",
              }}
              isActive={false}
              onSelect={() => onOpenChange(false)}
            />
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

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
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[var(--bg-paper)] active:bg-[var(--bg-paper)]",
        isActive && "bg-[var(--bg-paper)]"
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--moss)] text-[var(--color-text-primary)]">
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
