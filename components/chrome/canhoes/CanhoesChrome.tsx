"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Menu, Shield } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { OPEN_COMPOSE_SHEET_EVENT } from "@/lib/canhoesEvent";
import { useAuth } from "@/components/providers/AuthContext";
import { useEventOverview } from "@/hooks/useEventOverview";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shellCopy } from "@/lib/canhoesCopy";

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
  const { logout, user } = useAuth();

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
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[rgba(16,19,13,0.94)] backdrop-blur-md">
        <div className="mx-auto w-full max-w-[72rem] px-4 pb-3 pt-[env(safe-area-inset-top,0px)] sm:px-6 lg:px-8">
          <div className="px-0.5 pt-1 text-[var(--text-primary)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <CanhoesBrandMark compact subtitle={shellCopy.eventSubtitle} />

                {!isEventHomePath ? (
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 border-transparent px-2 py-0.5 text-[10px] font-medium",
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
                {isAdmin ? (
                  <Link
                    href="/canhoes/admin"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                  >
                    <Shield className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-h-10 h-10 w-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                    onClick={() => setIsMenuOpen(true)}
                    aria-expanded={isMenuOpen}
                    aria-label="Abrir mais opções"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-[var(--bg-paper)] px-2.5 py-1">
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
        </div>
      </header>

      <main className="relative z-10 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", isEventHomePath ? "max-w-[72rem]" : "max-w-[60rem]")}>
          <div
                      key={pathname}
                      className={cn(
                        "animate-fade-in mx-auto w-full",
                        isEventHomePath ? "" : "max-w-[60rem]"
                      )}
                    >
                      {children}
                    </div>
        </div>
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
        onLogout={logout}
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
