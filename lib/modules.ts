import type {
  AdminModuleKey,
  EventAdminModuleVisibilityDto,
  EventModulesDto,
} from "@/lib/api/types";

export type CanhoesMemberModuleKey = AdminModuleKey;

export type CanhoesMemberModuleDefinition = {
  description: string;
  group: "community" | "core" | "finale";
  href: string;
  key: CanhoesMemberModuleKey;
  label: string;
  navLabel?: string;
};

// Source of truth for member-facing modules. Admin UI, visibility toggles and
// shell navigation should read from this registry instead of spreading labels
// and descriptions across unrelated files.
const CANHOES_MEMBER_MODULES: readonly CanhoesMemberModuleDefinition[] = [
  {
    key: "feed",
    label: "Feed",
    navLabel: "Mural",
    href: "/canhoes/feed",
    group: "core",
    description: "Mural social da edição com posts, imagens e sondagens rápidas do grupo.",
  },
  {
    key: "nominees",
    label: "Nomeações",
    navLabel: "Nomeações",
    href: "/canhoes/nomeacoes",
    group: "community",
    description: "Área oficial para consultar nomeações aprovadas e o que já entrou no ciclo.",
  },
  {
    key: "categories",
    label: "Categorias",
    navLabel: "Categorias",
    href: "/canhoes/categorias",
    group: "core",
    description: "Área oficial com categorias do prémio e propostas abertas nesta fase.",
  },
  {
    key: "secretSanta",
    label: "Amigos",
    navLabel: "Amigo",
    href: "/canhoes/amigo-secreto",
    group: "community",
    description: "Acesso ao Amigo Secreto, atribuição individual e ritual desta fase.",
  },
  {
    key: "wishlist",
    label: "Wishlist",
    navLabel: "Wishlist",
    href: "/canhoes/wishlist",
    group: "community",
    description: "Pistas, desejos e referências ligadas ao teu Amigo Secreto.",
  },
  {
    key: "voting",
    label: "Votação",
    navLabel: "Boletim",
    href: "/canhoes/votacao",
    group: "core",
    description: "Boletim oficial da edição com voto validado e progresso por categoria.",
  },
  {
    key: "stickers",
    label: "Stickers",
    navLabel: "Stickers",
    href: "/canhoes/stickers",
    group: "community",
    description: "Submissão e consulta de stickers aprovados nesta edição.",
  },
  {
    key: "measures",
    label: "Medidas",
    navLabel: "Medidas",
    href: "/canhoes/medidas",
    group: "finale",
    description: "Regras, medidas aprovadas e ajustes para a reta final.",
  },
  {
    key: "gala",
    label: "Gala",
    navLabel: "Gala",
    href: "/canhoes/gala",
    group: "finale",
    description: "Momento final da edição com resultados e fecho do ritual.",
  },
] as const;

export const CANHOES_MEMBER_NAV_ORDER: readonly CanhoesMemberModuleKey[] = [
  "feed",
  "secretSanta",
  "wishlist",
  "categories",
  "voting",
  "stickers",
  "nominees",
  "measures",
  "gala",
] as const;

export const CANHOES_MEMBER_MODULE_MAP = Object.fromEntries(
  CANHOES_MEMBER_MODULES.map((moduleDefinition) => [
    moduleDefinition.key,
    moduleDefinition,
  ])
) as Record<CanhoesMemberModuleKey, CanhoesMemberModuleDefinition>;

export function countVisibleModules(
  visibility: EventAdminModuleVisibilityDto | EventModulesDto | null | undefined
) {
  if (!visibility) return 0;

  return CANHOES_MEMBER_MODULES.filter(
    (moduleDefinition) => visibility[moduleDefinition.key]
  ).length;
}
