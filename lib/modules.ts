import type { LucideIcon } from "lucide-react";
import { Award, Gift, Heart, Medal, Ruler, ScrollText, Sticker, Trophy, Vote } from "lucide-react";

import type { AdminModuleKey } from "@/lib/api/types";
import messages from "@/messages/pt.json";

/** Uma área do evento visível aos membros, com o seu texto, ligação e ícone. */
export type CanhoesModule = {
  key: AdminModuleKey;
  /** Nome curto, usado na dock, no menu e na lista do admin. */
  label: string;
  href: string;
  icon: LucideIcon;
  /** Uma linha sobre o que os membros fazem ali, mostrada no menu. */
  description: string;
  /** A área sob a qual esta aparece no menu: stickers ficam sob nomeações, medidas sob categorias. */
  inMenuUnder?: AdminModuleKey;
  /** Quando a fase a abre (`resolveMemberModules`), mostrado na área de administração. */
  opensIn: string;
};

/**
 * Todas as áreas de uma edição visíveis aos membros (um ícone cada, usado onde quer que a área apareça),
 * por ordem de navegação: as duas primeiras abertas vão para a dock e as restantes para o menu, por isso
 * a área da fase atual (boletim, gala) vem primeiro. Os ecrãs de admin, a shell e as guardas de área
 * leem daqui os nomes e as ligações.
 */
export const CANHOES_MODULES: readonly CanhoesModule[] = [
  {
    key: "voting",
    label: messages.modules.voting.label,
    href: "/canhoes/votacao",
    icon: Vote,
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
    icon: Heart,
    description: messages.modules.wishlist.description,
    opensIn: messages.modules.wishlist.opensIn,
  },
  {
    key: "nominees",
    label: messages.modules.nominees.label,
    href: "/canhoes/nomeacoes",
    icon: Award,
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
    inMenuUnder: "nominees",
    label: messages.modules.stickers.label,
    href: "/canhoes/stickers",
    icon: Sticker,
    description: messages.modules.stickers.description,
    opensIn: messages.modules.stickers.opensIn,
  },
  {
    key: "measures",
    inMenuUnder: "categories",
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

/** As mesmas áreas indexadas pela chave, para procurar uma área sem percorrer a lista. */
export const CANHOES_MODULE_BY_KEY = Object.fromEntries(
  CANHOES_MODULES.map((module) => [module.key, module]),
) as Record<AdminModuleKey, CanhoesModule>;
