import type { LucideIcon } from "lucide-react";
import { Flame, Gift, Medal, Ruler, ScrollText, Sticker, Trophy, Vote } from "lucide-react";

import type { AdminModuleKey } from "@/lib/api/types";
import messages from "@/messages/pt.json";

export type CanhoesModule = {
  key: AdminModuleKey;
  /** Short name, used in the dock, the menu and the admin list. */
  label: string;
  href: string;
  icon: LucideIcon;
  /** One line on what members do there, shown in the menu. */
  description: string;
  /** When the phase opens it (`resolveMemberModules`), shown in the admin area. */
  opensIn: string;
};

/**
 * Every member-facing area of an edition, in navigation order: the first two open ones go to
 * the dock and the rest to the menu, so the area of the current phase (ballot, gala) comes
 * first. Admin screens, the shell and the module gates all read labels and links from here.
 */
export const CANHOES_MODULES: readonly CanhoesModule[] = [
  {
    key: "voting",
    label: messages.modules.voting.label,
    href: "/canhoes/votacao",
    icon: Flame,
    description: messages.modules.voting.description,
    opensIn: messages.modules.voting.opensIn,
  },
  {
    key: "gala",
    label: messages.modules.gala.label,
    href: "/canhoes/gala",
    icon: Medal,
    description: messages.modules.gala.description,
    opensIn: messages.modules.gala.opensIn,
  },
  {
    key: "secretSanta",
    label: messages.modules.secretSanta.label,
    href: "/canhoes/amigo-secreto",
    icon: Gift,
    description: messages.modules.secretSanta.description,
    opensIn: messages.modules.secretSanta.opensIn,
  },
  {
    key: "wishlist",
    label: messages.modules.wishlist.label,
    href: "/canhoes/wishlist",
    icon: Gift,
    description: messages.modules.wishlist.description,
    opensIn: messages.modules.wishlist.opensIn,
  },
  {
    key: "nominees",
    label: messages.modules.nominees.label,
    href: "/canhoes/nomeacoes",
    icon: Vote,
    description: messages.modules.nominees.description,
    opensIn: messages.modules.nominees.opensIn,
  },
  {
    key: "categories",
    label: messages.modules.categories.label,
    href: "/canhoes/categorias",
    icon: Trophy,
    description: messages.modules.categories.description,
    opensIn: messages.modules.categories.opensIn,
  },
  {
    key: "stickers",
    label: messages.modules.stickers.label,
    href: "/canhoes/stickers",
    icon: Sticker,
    description: messages.modules.stickers.description,
    opensIn: messages.modules.stickers.opensIn,
  },
  {
    key: "measures",
    label: messages.modules.measures.label,
    href: "/canhoes/medidas",
    icon: Ruler,
    description: messages.modules.measures.description,
    opensIn: messages.modules.measures.opensIn,
  },
  {
    key: "feed",
    label: messages.modules.feed.label,
    href: "/canhoes",
    icon: ScrollText,
    description: messages.modules.feed.description,
    opensIn: messages.modules.feed.opensIn,
  },
];

export const CANHOES_MODULE_BY_KEY = Object.fromEntries(
  CANHOES_MODULES.map((module) => [module.key, module])
) as Record<AdminModuleKey, CanhoesModule>;
