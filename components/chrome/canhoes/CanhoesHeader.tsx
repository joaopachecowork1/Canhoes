"use client";

import { Menu } from "lucide-react";

import type { EventOverviewDto, EventSummaryDto } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { PersonCromo } from "@/components/ui/person-cromo";
import messages from "@/messages/pt.json";

import { CanhoesBrandMark } from "./CanhoesBrandMark";
import { CanhoesPhaseHud } from "./CanhoesPhaseHud";
import type { CanhoesPageContext } from "./canhoesNavigation";

const copy = messages.shell.CanhoesHeader;

type CanhoesHeaderProps = {
  event: EventSummaryDto | null;
  isEventHomePath: boolean;
  isLoading: boolean;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  overview: EventOverviewDto | null;
  pageContext: CanhoesPageContext;
  userColor?: string;
  userLabel: string;
};

/** The area's colour tab with its name; the page itself says what the area is for. */
function PageHeading({ pageContext }: Readonly<{ pageContext: CanhoesPageContext }>) {
  return (
    <div className="min-w-0">
      <span
        className="inline-flex min-h-8 items-center rounded-md px-2.5 font-[family-name:var(--font-display)] text-lg font-extrabold uppercase tracking-[0.03em] text-[var(--on-person)] shadow-[var(--shadow-elevation-sm)]"
        style={{ backgroundColor: pageContext.areaColor }}
      >
        {pageContext.title}
      </span>
    </div>
  );
}

/** The menu button: areas that do not fit in the dock, the member's colour and logout. */
function MenuButton({ isMenuOpen, onOpenMenu }: Readonly<Pick<CanhoesHeaderProps, "isMenuOpen" | "onOpenMenu">>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="min-h-11 size-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
      onClick={onOpenMenu}
      aria-expanded={isMenuOpen}
      aria-label={copy.openMenu}
    >
      <Menu className="h-5 w-5" aria-hidden />
    </Button>
  );
}

/** Sticky album cover: brand and edition, the phase, the member's own cromo and the area tab. */
export function CanhoesHeader({
  event,
  isEventHomePath,
  isLoading,
  isMenuOpen,
  onOpenMenu,
  overview,
  pageContext,
  userColor,
  userLabel,
}: Readonly<CanhoesHeaderProps>) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]">
      <div className="mx-auto w-full max-w-[72rem] space-y-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <CanhoesBrandMark className="flex-1" subtitle={event?.name ?? messages.shell.CanhoesChrome.eventSubtitle} />
          <CanhoesPhaseHud isLoading={isLoading} overview={overview} />
          <PersonCromo name={userLabel} color={userColor} size="sm" />
          <span className="sr-only">{userLabel}</span>
          <MenuButton isMenuOpen={isMenuOpen} onOpenMenu={onOpenMenu} />
        </div>
        {isEventHomePath ? null : <PageHeading pageContext={pageContext} />}
      </div>
    </header>
  );
}
