"use client";

import { Plus } from "lucide-react";

import { Dock, type DockItem } from "@/components/ui/dock-two";

import { areaColorVar, HOME_NAV_ITEM, MENU_NAV_ITEM, type CanhoesNavItem } from "./canhoesNavigation";
import messages from "@/messages/pt.json";

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
    ariaPressed: isComposeOpen,
    buttonClassName: "bg-[var(--moss)] text-[var(--on-moss)] shadow-[var(--glow-green-sm)] hover:bg-[var(--moss-glow)]",
    icon: Plus,
    iconClassName: "h-6 w-6",
    isActive: isComposeOpen,
    label: messages.shell.CanhoesBottomTabs.post,
    onClick: onCompose,
  };

  const items = [
    ...leftItems.map(toDockItem),
    ...(showCompose ? [composeItem] : []),
    ...rightItems.map(toDockItem),
  ] as const satisfies readonly DockItem[];

  return (
    <nav
      aria-label={messages.shell.CanhoesBottomTabs.navLabel}
      className="fixed inset-x-0 bottom-0 z-50"
    >
      <div className="mx-auto max-w-[32rem] px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:px-3">
        <Dock
          items={items}
          className="w-full"
          dockClassName="rounded-[1.25rem] bg-[var(--bg-surface)] p-1.5 shadow-[var(--shadow-panel)]"
        />
      </div>
    </nav>
  );
}

/** The area the tab leads to sets its active colour; the mural is the home tab. */
function toDockItem(entry: CanhoesBottomTabEntry): DockItem {
  const areaId = entry.item.id === HOME_NAV_ITEM.id ? "feed" : entry.item.id;
  return {
    accent: entry.item.id === MENU_NAV_ITEM.id ? "var(--text-primary)" : areaColorVar(areaId),
    ariaLabel: entry.item.label,
    icon: entry.item.icon,
    isActive: Boolean(entry.isActive),
    label: entry.item.label,
    onClick: entry.onClick,
  };
}
