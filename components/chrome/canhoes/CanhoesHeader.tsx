"use client";

import Link from "next/link";
import { Menu, Shield } from "lucide-react";

import type { EventOverviewDto, EventSummaryDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import messages from "@/messages/pt.json";

import { CanhoesBrandMark } from "./CanhoesBrandMark";
import { CanhoesPhaseHud } from "./CanhoesPhaseHud";
import { ADMIN_NAV_ITEM, type CanhoesPageContext, type CanhoesPageTone } from "./canhoesNavigation";

const copy = messages.shell.CanhoesHeader;

const TONE_BADGE_CLASS: Record<CanhoesPageTone, string> = {
  social: "bg-[rgba(118,98,166,0.14)] text-[var(--accent-purple-soft)]",
  official: "bg-[var(--moss)]/14 text-[var(--color-text-primary)]",
  admin: "bg-[rgba(201,164,106,0.14)] text-[var(--color-text-primary)]",
  event: "bg-[var(--color-veil)]/8 text-[var(--text-secondary)]",
};

type CanhoesHeaderProps = {
  event: EventSummaryDto | null;
  isAdmin: boolean;
  isEventHomePath: boolean;
  isLoading: boolean;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  overview: EventOverviewDto | null;
  pageContext: CanhoesPageContext;
  userLabel: string;
};

function PageHeading({ pageContext }: Readonly<{ pageContext: CanhoesPageContext }>) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <Badge
          variant="outline"
          className={cn("shrink-0 border-transparent px-2 py-0.5 text-xs font-medium", TONE_BADGE_CLASS[pageContext.tone])}
        >
          {pageContext.toneLabel}
        </Badge>
        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{pageContext.title}</p>
      </div>

      {pageContext.description ? (
        <p className="line-clamp-1 text-xs text-[var(--text-muted)]">{pageContext.description}</p>
      ) : null}
    </div>
  );
}

/** Admins get a shortcut to the admin area; members get the menu (admins reach it from the dock). */
function HeaderAction({ isAdmin, isMenuOpen, onOpenMenu }: Readonly<Pick<CanhoesHeaderProps, "isAdmin" | "isMenuOpen" | "onOpenMenu">>) {
  if (isAdmin) {
    return (
      <Link
        href={ADMIN_NAV_ITEM.href}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
      >
        <Shield className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{ADMIN_NAV_ITEM.label}</span>
      </Link>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="min-h-10 h-10 w-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
      onClick={onOpenMenu}
      aria-expanded={isMenuOpen}
      aria-label={copy.openMenu}
    >
      <Menu className="h-4 w-4" />
    </Button>
  );
}

/** Sticky header: brand, page title, admin or menu button, the user and the active phase. */
export function CanhoesHeader({
  event,
  isAdmin,
  isEventHomePath,
  isLoading,
  isMenuOpen,
  onOpenMenu,
  overview,
  pageContext,
  userLabel,
}: Readonly<CanhoesHeaderProps>) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--color-panel)]/94 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[72rem] px-4 pb-3 pt-[env(safe-area-inset-top,0px)] sm:px-6 lg:px-8">
        <div className="px-0.5 pt-1 text-[var(--text-primary)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <CanhoesBrandMark compact subtitle={messages.shell.CanhoesChrome.eventSubtitle} />
              {isEventHomePath ? null : <PageHeading pageContext={pageContext} />}
            </div>

            <div className="flex items-center gap-1.5">
              <HeaderAction isAdmin={isAdmin} isMenuOpen={isMenuOpen} onOpenMenu={onOpenMenu} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-[var(--bg-paper)] px-2.5 py-1">
              <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{userLabel}</p>
            </div>

            <CanhoesPhaseHud event={event} isLoading={isLoading} overview={overview} />
          </div>
        </div>
      </div>
    </header>
  );
}
