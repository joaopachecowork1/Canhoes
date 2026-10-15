"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";

import { OPEN_COMPOSE_SHEET_EVENT } from "@/lib/canhoesEvent";
import { useAuth } from "@/components/providers/AuthContext";
import { useEventOverview } from "@/hooks/useEventOverview";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

import { CanhoesBottomTabs } from "./CanhoesBottomTabs";
import { CanhoesBrandMark } from "./CanhoesBrandMark";
import { CanhoesMenuSheet } from "./CanhoesMenuSheet";
import { CanhoesPhaseHud } from "./CanhoesPhaseHud";
import { useCanhoesShellNavigation } from "./useCanhoesShellNavigation";

const loadCanhoesComposeSheet = () =>
  import("./CanhoesComposeSheet").then((module) => ({
    default: module.CanhoesComposeSheet,
  }));

const LazyCanhoesComposeSheet = dynamic(loadCanhoesComposeSheet, {
  loading: () => null,
  ssr: false,
});

/**
 * The layout of every signed-in page: header (brand, page title, phase, logout, menu), the page,
 * the dock, and the menu and compose sheets. Navigation rules live in `canhoesNavigation.ts`.
 */
export function CanhoesChrome({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLogged, logout, user } = useAuth();

  const eventOverview = useEventOverview();
  const { isAdmin } = useAdminStatus();
  const canCompose = !!eventOverview.overview?.modules.feed;

  const [isComposeSheetOpen, setIsComposeSheetOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleComposeSheetChange = useCallback((open: boolean) => {
    setIsComposeSheetOpen(open);
  }, []);

  useEffect(() => {
    setIsComposeSheetOpen(false);
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!canCompose) {
      setIsComposeSheetOpen(false);
    }
  }, [canCompose]);

  useEffect(() => {
    const handleOpenCompose = () => {
      if (!canCompose) return;
      setIsComposeSheetOpen(true);
    };

    globalThis.addEventListener(OPEN_COMPOSE_SHEET_EVENT, handleOpenCompose);
    return () => globalThis.removeEventListener(OPEN_COMPOSE_SHEET_EVENT, handleOpenCompose);
  }, [canCompose]);

  // Preload the compose sheet shortly after the page settles, so the first tap on Post is instant.
  useEffect(() => {
    if (!canCompose) return;
    const timeoutId = window.setTimeout(() => void loadCanhoesComposeSheet(), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [canCompose]);

  const {
    bottomLeftEntries,
    bottomRightEntries,
    isEventHomePath,
    menuItems,
    pageContext,
    userLabel,
  } = useCanhoesShellNavigation({
    isAdmin,
    isMenuOpen,
    onNavigate: (href) => router.push(href),
    onOpenMenu: () => setIsMenuOpen(true),
    overview: eventOverview.overview,
    pathname,
    user,
  });

  useEffect(() => {
    const eventName = eventOverview.event?.name?.trim();
    document.title = eventName
      ? `${pageContext.title} · ${eventName}`
      : `${pageContext.title} · Canhões`;
  }, [eventOverview.event?.name, pageContext.title]);

  return (
      <div
        data-theme="canhoes"
        className="bg-circuit relative isolate flex min-h-[100svh] flex-col overflow-x-clip bg-[var(--bg-void)] text-[var(--text-primary)]"
      >
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,14,8,0.92)] backdrop-blur-[6px] supports-[backdrop-filter]:bg-[rgba(10,14,8,0.88)]">
        <PageShell wide className="pb-2 pt-[env(safe-area-inset-top,0px)]">
                  <div
                    className="rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.12)] bg-[rgba(18,24,12,0.94)] px-3 py-3 text-[var(--text-primary)] shadow-[var(--shadow-elevation-sm)] sm:px-4 sm:py-3.5"
                  >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <CanhoesBrandMark compact subtitle="Prémios da edição" />

                {!isEventHomePath ? (
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 border-transparent px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]",
                          pageContext.tone === "social" &&
                            "bg-[rgba(118,98,166,0.14)] text-[var(--accent-purple-soft)]",
                          pageContext.tone === "official" &&
                            "bg-[rgba(95,123,56,0.14)] text-[var(--color-text-primary)]",
                          pageContext.tone === "admin" &&
                            "bg-[rgba(201,164,106,0.14)] text-[var(--color-text-primary)]",
                          pageContext.tone === "event" &&
                            "bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.82)]"
                        )}
                      >
                        {pageContext.toneLabel}
                      </Badge>
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {pageContext.title}
                      </p>
                    </div>

                    {pageContext.description ? (
                      <p className="line-clamp-1 text-xs text-[rgba(255,255,255,0.66)]">
                        {pageContext.description}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5">
                {isLogged ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-10 h-10 w-10 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] text-canhoes-gold hover:bg-[rgba(255,255,255,0.1)]"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      logout();
                    }}
                    aria-label="Terminar sessão"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-10 h-10 w-10 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] text-canhoes-gold hover:bg-[rgba(255,255,255,0.1)]"
                  onClick={() => setIsMenuOpen(true)}
                  aria-expanded={isMenuOpen}
                  aria-label="Abrir menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-1">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {userLabel}
                </p>
              </div>

              <CanhoesPhaseHud
                event={eventOverview.event}
                isLoading={eventOverview.isLoading}
                overview={eventOverview.overview}
              />
            </div>
          </div>
        </PageShell>
      </header>

      <div className="relative z-30 flex items-center gap-0 px-4" aria-hidden="true">
        <div className="h-px flex-1 bg-canhoes-gold/25" />
        <span className="px-2 text-[10px] text-canhoes-gold/60 select-none">✦</span>
        <div className="h-px flex-1 bg-canhoes-gold/25" />
      </div>

      <main className="relative z-10 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <PageShell wide={isEventHomePath}>
          <div
                      key={pathname}
                      className={cn(
                        "animate-fade-in mx-auto w-full",
                        isEventHomePath ? "" : "max-w-[60rem]"
                      )}
                    >
                      {children}
                    </div>
        </PageShell>
      </main>

      <CanhoesBottomTabs
        isComposeOpen={isComposeSheetOpen}
        leftItems={bottomLeftEntries}
        onCompose={() => handleComposeSheetChange(true)}
        rightItems={bottomRightEntries}
        showCompose={canCompose}
      />

      <CanhoesMenuSheet
        isAdmin={isAdmin}
        items={menuItems}
        onOpenChange={setIsMenuOpen}
        open={isMenuOpen}
        pathname={pathname}
      />

      {isComposeSheetOpen ? (
        <LazyCanhoesComposeSheet
          open={isComposeSheetOpen}
          onOpenChange={handleComposeSheetChange}
          onDone={() => handleComposeSheetChange(false)}
        />
      ) : null}
    </div>
  );
}
