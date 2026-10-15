import type { LucideIcon } from "lucide-react";
import { Flame, Gift, Medal, Ruler, ScrollText, Sticker, Trophy, Vote } from "lucide-react";

import type { AdminModuleKey } from "@/lib/api/types";

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
    label: "Votação",
    href: "/canhoes/votacao",
    icon: Flame,
    description: "Escolhe um vencedor por categoria.",
    opensIn: "Votação",
  },
  {
    key: "gala",
    label: "Gala",
    href: "/canhoes/gala",
    icon: Medal,
    description: "Os vencedores de cada categoria.",
    opensIn: "Resultados",
  },
  {
    key: "secretSanta",
    label: "Amigo",
    href: "/canhoes/amigo-secreto",
    icon: Gift,
    description: "A quem dás o presente.",
    opensIn: "Sorteio em diante",
  },
  {
    key: "wishlist",
    label: "Wishlist",
    href: "/canhoes/wishlist",
    icon: Gift,
    description: "O que gostavas de receber.",
    opensIn: "Sempre",
  },
  {
    key: "nominees",
    label: "Nomeações",
    href: "/canhoes/nomeacoes",
    icon: Vote,
    description: "Nomeia alguém para uma categoria.",
    opensIn: "Propostas",
  },
  {
    key: "categories",
    label: "Categorias",
    href: "/canhoes/categorias",
    icon: Trophy,
    description: "Propõe uma categoria nova.",
    opensIn: "Propostas",
  },
  {
    key: "stickers",
    label: "Stickers",
    href: "/canhoes/stickers",
    icon: Sticker,
    description: "Envia um sticker para uma categoria.",
    opensIn: "Propostas",
  },
  {
    key: "measures",
    label: "Medidas",
    href: "/canhoes/medidas",
    icon: Ruler,
    description: "Propõe uma regra para a gala.",
    opensIn: "Propostas",
  },
  {
    key: "feed",
    label: "Mural",
    href: "/canhoes",
    icon: ScrollText,
    description: "Posts, fotos e sondagens do grupo.",
    opensIn: "Sempre",
  },
];

export const CANHOES_MODULE_BY_KEY = Object.fromEntries(
  CANHOES_MODULES.map((module) => [module.key, module])
) as Record<AdminModuleKey, CanhoesModule>;
