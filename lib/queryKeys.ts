/*
 * Todas as chaves de TanStack Query da app, para o ecrã que lê uma lista e o código que a atualiza
 * depois de uma escrita não as escreverem de forma diferente. As chaves com id de evento começam
 * pelo mesmo prefixo, por isso invalidar o prefixo atualiza todas as variantes (páginas, filtros).
 */

/** O evento da página atual, que só se conhece depois de a visão geral carregar. */
type EventId = string | null | undefined;

/** As chaves de cache de todas as queries da app, agrupadas por funcionalidade. */
export const queryKeys = {
  eventOverview: ["eventOverview"] as const,
  eventMembers: (eventId: EventId) => ["eventMembers", eventId] as const,
  hubPosts: (eventId: EventId) => ["hub-posts", eventId] as const,
  hubComments: (postId: string) => ["hub-comments", postId] as const,
  wishlistItems: (eventId: EventId) => ["wishlistItems", eventId] as const,
  secretSantaOverview: (eventId: EventId) => ["secretSantaOverview", eventId] as const,
  secretSantaWishlist: (eventId: EventId) => ["secretSantaWishlist", eventId] as const,
  categories: (eventId: EventId) => ["categories", eventId] as const,
  measures: (eventId: EventId) => ["measures", eventId] as const,
  galaResults: (eventId: EventId) => ["galaResults", eventId] as const,
  stickerCategories: (eventId: EventId) => ["stickerCategories", eventId] as const,
  approvedNominees: (eventId: EventId) => ["approvedNominees", eventId] as const,
  officialVoting: (eventId: EventId) => ["official-voting", eventId ?? ""] as const,
  nominationCategories: (eventId: string) => ["nominations", eventId, "categories"] as const,
  nominationsApproved: (eventId: string) => ["nominations", eventId, "approved"] as const,
  /**
   * As listas em cache que mostram a cor de uma pessoa: `authorColor` em publicações e comentários, `PublicUserDto.color` nas listas
   * de membros (faixa do mural, wishlist, admin). Atualizam quando alguém muda a sua; um ecrã novo que mostre uma cor tem de juntar aqui a sua raiz.
   */
  colorRoots: ["hub-posts", "hub-comments", "eventMembers", "canhoes"] as readonly unknown[],
  admin: {
    /** Todas as queries de admin de um evento, exceto `bootstrap` e `proposals`: uma só invalidação atualiza-as todas. */
    all: (eventId: EventId) => ["canhoes", "admin", eventId] as const,
    bootstrap: (eventId: EventId) => ["adminBootstrap", eventId] as const,
    proposals: (eventId: EventId) => ["admin", "proposals", eventId] as const,
    categoryProposals: (eventId: EventId) => ["admin", "proposals", eventId, "categories", "pending"] as const,
    measureProposals: (eventId: EventId) => ["admin", "proposals", eventId, "measures", "pending"] as const,
    categories: (eventId: EventId) => ["canhoes", "admin", eventId, "categories"] as const,
    nominationsAll: (eventId: EventId) => ["canhoes", "admin", eventId, "nominations", "all"] as const,
    nominationsPendingCount: (eventId: EventId) =>
      ["canhoes", "admin", eventId, "nominations", "pending-count"] as const,
    nominationsPage: (eventId: EventId, page: number, pageSize: number) =>
      ["canhoes", "admin", eventId, "nominations", page, pageSize, "pending"] as const,
    votesAudit: (eventId: EventId) => ["canhoes", "admin", eventId, "votes-audit"] as const,
    officialResults: (eventId: EventId) => ["canhoes", "admin", eventId, "official-results"] as const,
    members: (eventId: EventId) => ["canhoes", "admin", eventId, "members"] as const,
    membersPage: (eventId: EventId, skip: number, take: number) =>
      ["canhoes", "admin", eventId, "members", skip, take] as const,
    secretSantaState: (eventId: EventId) => ["canhoes", "admin", eventId, "secret-santa-state"] as const,
    /** O que invalidar depois de qualquer escrita de admin, para todos os separadores desse evento ficarem atualizados. */
    afterWrite: (eventId: EventId) =>
      [
        ["canhoes", "admin", eventId],
        ["adminBootstrap", eventId],
        ["admin", "proposals", eventId],
        ["eventMembers", eventId],
      ] as const,
  },
};
