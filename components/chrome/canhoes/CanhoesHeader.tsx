"use client";

import { Menu } from "lucide-react";

import type { EventOverviewDto, EventSummaryDto } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { PersonCromo } from "@/components/ui/person-cromo";
import messages from "@/messages/pt.json";

import { CanhoesBrandMark } from "./CanhoesBrandMark";
import { CanhoesPhaseHud } from "./CanhoesPhaseHud";

const copy = messages.shell.CanhoesHeader;

type CanhoesHeaderProps = {
  event: EventSummaryDto | null;
  isLoading: boolean;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  overview: EventOverviewDto | null;
  userColor?: string;
  userLabel: string;
};

/** O botão do menu: abre as áreas que não cabem no dock, a cor do membro e o logout. */
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

/** Capa de álbum fixa no topo: marca e edição, a fase e o cromo do próprio membro. A página dá o próprio título. */
export function CanhoesHeader({
  event,
  isLoading,
  isMenuOpen,
  onOpenMenu,
  overview,
  userColor,
  userLabel,
}: Readonly<CanhoesHeaderProps>) {
  // A edição costuma ter o nome da app; dizê-lo duas vezes por baixo do logótipo não acrescenta nada.
  const editionName = event?.name && event.name !== messages.common.appName ? event.name : undefined;

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)] shadow-[var(--shadow-elevation-sm)]">
      <div className="mx-auto w-full max-w-[60rem] space-y-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <CanhoesBrandMark className="flex-1" subtitle={editionName ?? messages.shell.CanhoesChrome.eventSubtitle} />
          <CanhoesPhaseHud isLoading={isLoading} overview={overview} />
          <PersonCromo name={userLabel} color={userColor} size="sm" />
          <span className="sr-only">{userLabel}</span>
          <MenuButton isMenuOpen={isMenuOpen} onOpenMenu={onOpenMenu} />
        </div>
      </div>
    </header>
  );
}
