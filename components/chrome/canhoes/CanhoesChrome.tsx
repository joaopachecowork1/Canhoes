"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/AuthContext";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { useAdminStatus } from "@/lib/domains/admin/hooks/useAdminStatus";
import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { CanhoesBottomTabs } from "./CanhoesBottomTabs";
import { CanhoesHeader } from "./CanhoesHeader";
import { CanhoesMenuSheet } from "./CanhoesMenuSheet";
import { useCanhoesShellNavigation } from "./useCanhoesShellNavigation";
import { useComposeSheet } from "./useComposeSheet";

const loadCanhoesComposeSheet = () =>
  import("@/lib/domains/feed/components/compose/CanhoesComposeSheet").then((module) => ({
    default: module.CanhoesComposeSheet,
  }));

const LazyCanhoesComposeSheet = dynamic(loadCanhoesComposeSheet, {
  loading: () => null,
  ssr: false,
});

function useDocumentTitle(pageTitle: string, eventName: string | undefined) {
  useEffect(() => {
    const suffix = eventName?.trim() || messages.shell.CanhoesChrome.documentTitleFallback;
    document.title = `${pageTitle} · ${suffix}`;
  }, [eventName, pageTitle]);
}

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

  const compose = useComposeSheet({ canCompose, pathname, preload: loadCanhoesComposeSheet });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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

  useDocumentTitle(pageContext.title, eventOverview.event?.name);

  return (
    <div
      data-theme="canhoes"
      className="relative isolate flex min-h-[100svh] flex-col overflow-x-clip bg-[var(--bg-void)] text-[var(--text-primary)]"
    >
      <CanhoesHeader
        event={eventOverview.event}
        isAdmin={isAdmin}
        isEventHomePath={isEventHomePath}
        isLoading={eventOverview.isLoading}
        isMenuOpen={isMenuOpen}
        onOpenMenu={() => setIsMenuOpen(true)}
        overview={eventOverview.overview}
        pageContext={pageContext}
        userLabel={userLabel}
      />

      <main className="relative z-10 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", isEventHomePath ? "max-w-[72rem]" : "max-w-[60rem]")}>
          <div key={pathname} className={cn("animate-fade-in mx-auto w-full", !isEventHomePath && "max-w-[60rem]")}>
            {children}
          </div>
        </div>
      </main>

      <CanhoesBottomTabs
        isComposeOpen={compose.isOpen}
        leftItems={bottomLeftEntries}
        onCompose={() => compose.setIsOpen(true)}
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

      {compose.isOpen ? (
        <LazyCanhoesComposeSheet
          open={compose.isOpen}
          onOpenChange={compose.setIsOpen}
          onDone={() => compose.setIsOpen(false)}
        />
      ) : null}
    </div>
  );
}
