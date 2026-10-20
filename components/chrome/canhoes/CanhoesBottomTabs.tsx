"use client";

import { Plus } from "lucide-react";

import { Dock, type DockItem } from "@/components/ui/dock-two";

import { areaColorVar, HOME_NAV_ITEM, MENU_NAV_ITEM, type CanhoesNavItem } from "./canhoesNavigation";
import messages from "@/messages/pt.json";

/** Um separador do dock: o item de navegação, se está ativo e o que fazer ao tocar. */
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

/** O dock fixo em baixo: separadores à esquerda, o botão Post ao meio e separadores à direita. */
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

  // O botão Post fica ao meio, entre os separadores da esquerda e da direita.
  const items = [
    ...leftItems.map(toDockItem),
    ...(showCompose ? [composeItem] : []),
    ...rightItems.map(toDockItem),
  ] as const satisfies readonly DockItem[];

  return (
    <nav aria-label={messages.shell.CanhoesBottomTabs.navLabel} className="fixed inset-x-0 bottom-0 z-50">
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

/** Converte um separador num item do dock: a área para onde leva define a cor ativa; o mural é o separador inicial. */
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
