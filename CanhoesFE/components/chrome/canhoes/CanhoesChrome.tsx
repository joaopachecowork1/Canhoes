"use client";

import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { CanhoesBottomTabs } from "./CanhoesBottomTabs";
import { CanhoesMoreSheet } from "./CanhoesMoreSheet";
import { CanhoesComposeSheet } from "./CanhoesComposeSheet";

const PAGE_TITLES = [
  { href: "/canhoes/admin", label: "Admin" },
  { href: "/canhoes/amigo-secreto", label: "Amigo Secreto" },
  { href: "/canhoes/categorias", label: "Categorias" },
  { href: "/canhoes/feed", label: "Feed" },
  { href: "/canhoes/gala", label: "Gala" },
  { href: "/canhoes/medidas", label: "Medidas" },
  { href: "/canhoes/nomeacoes", label: "Nomeações" },
  { href: "/canhoes/stickers", label: "Stickers" },
  { href: "/canhoes/votacao", label: "Votação" },
  { href: "/canhoes/wishlist", label: "Wishlist" },
] as const;

function getPageTitle(pathname: string | null) {
  if (!pathname) return "Feed";

  const matchedPage = PAGE_TITLES.find(({ href }) => pathname.startsWith(href));
  return matchedPage?.label ?? "Feed";
}

export function CanhoesChrome({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLogged, logout, user } = useAuth();

  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isComposeSheetOpen, setIsComposeSheetOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Scroll handler se necessário
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const pageTitle = getPageTitle(pathname);
  const isFeedPath = pathname === "/canhoes" || pathname === "/canhoes/" || pathname === "/canhoes/feed";

  return (
    <div
      data-theme="canhoes"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[var(--color-bg-primary)]"
    >
      {/* Header Sticky */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-[var(--color-border-default)]",
          "bg-[var(--color-bg-card)]/95 backdrop-blur"
        )}
      >
        <div className="mx-auto flex min-h-16 max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="label text-[var(--color-title)] font-bold">Canhões</p>
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <h1 className="heading-2 truncate text-[var(--color-title)] font-extrabold">Canhões do Ano</h1>
                <p className="body-small truncate text-[var(--color-text-secondary)] font-semibold">{pageTitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLogged ? (
              <Button
                variant="ghost"
                className="inline-flex px-4 py-2 font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-danger)]/30 hover:text-[var(--color-danger)] transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  logout();
                }}
              >
                Sair
              </Button>
            ) : null}

            <Button
              variant="secondary"
              size="icon"
              className="shrink-0 border border-[var(--color-title)]/40 bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-title)]/25 transition-colors"
              onClick={() => setIsMoreSheetOpen(true)}
              aria-label="Abrir menu"
              title={user?.email ?? "Mais opções"}
            >
              <Menu className="h-5 w-5" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
        <div className={cn("mx-auto w-full max-w-2xl py-4", isFeedPath ? "px-0 sm:px-4" : "px-4")}>{children}</div>
      </main>

      <CanhoesBottomTabs
        pathname={pathname ?? ""}
        onNavigate={(href) => router.push(href)}
        onCompose={() => setIsComposeSheetOpen(true)}
      />

      <CanhoesMoreSheet
        open={isMoreSheetOpen}
        onOpenChange={setIsMoreSheetOpen}
        onNavigate={(href) => {
          setIsMoreSheetOpen(false);
          router.push(href);
        }}
      />

      <CanhoesComposeSheet
        open={isComposeSheetOpen}
        onOpenChange={setIsComposeSheetOpen}
        onDone={() => setIsComposeSheetOpen(false)}
      />
    </div>
  );
}
