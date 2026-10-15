"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import { Dock, type DockItem } from "@/components/ui/dock-two";

import { MENU_NAV_ITEM, type CanhoesNavItem } from "./canhoesNavigation";

export type CanhoesBottomTabEntry = {
  item: CanhoesNavItem;
  isActive?: boolean;
  onClick: () => void;
};

type CanhoesBottomTabsProps = {
  isComposeOpen: boolean;
  leftItems: readonly CanhoesBottomTabEntry[];
  onCompose: () => void;
  rightItems: readonly CanhoesBottomTabEntry[];
  showCompose?: boolean;
};

/** The fixed dock at the bottom: left tabs, the Post button in the middle, right tabs. */
export function CanhoesBottomTabs({
  isComposeOpen,
  leftItems,
  onCompose,
  rightItems,
  showCompose = true,
}: Readonly<CanhoesBottomTabsProps>) {
  const composeItem: DockItem = {
    ariaLabel: "Criar post",
    ariaPressed: isComposeOpen,
    buttonClassName: cn(
      "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[var(--color-text-primary)]",
      isComposeOpen &&
        "border-[rgba(95,123,56,0.24)] bg-[rgba(95,123,56,0.16)] text-[var(--color-text-primary)]"
    ),
    icon: Plus,
    iconClassName: cn("h-5 w-5", isComposeOpen && "text-[var(--moss)]"),
    isActive: isComposeOpen,
    label: "Post",
    onClick: onCompose,
  };

  const items = [
    ...leftItems.map(toDockItem),
    ...(showCompose ? [composeItem] : []),
    ...rightItems.map(toDockItem),
  ] as const satisfies readonly DockItem[];

  return (
    <nav
      aria-label="Navegação principal do evento"
      className="fixed inset-x-0 bottom-0 z-50"
    >
      <div className="mx-auto max-w-[calc(var(--page-max-width)+10rem)] px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:px-3">
        <Dock
          items={items}
          className="w-full"
          dockClassName="rounded-[1.25rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(12,17,9,0.96)] p-1.5 shadow-[var(--shadow-elevation-md)]"
        />
      </div>
    </nav>
  );
}

function toDockItem(entry: CanhoesBottomTabEntry): DockItem {
  const isActive = Boolean(entry.isActive);
  const isMenuItem = entry.item.id === MENU_NAV_ITEM.id;

  return {
    ariaLabel: entry.item.label,
    buttonClassName: cn(
      isMenuItem && !isActive && "text-[var(--color-text-primary)]"
    ),
    icon: entry.item.icon,
    iconClassName: cn(
      "h-[18px] w-[18px]",
      isMenuItem && !isActive && "text-[var(--color-text-primary)]",
      isActive && "text-[var(--neon-amber)]"
    ),
    isActive,
    label: entry.item.label,
    onClick: entry.onClick,
  };
}
