/** Um evento nas listas: id, nome e se é o ativo. */
export type EventSummaryDto = {
  id: string;
  name: string;
  isActive: boolean;
};

/** Uma fase do evento (PROPOSALS, VOTING, ...) e se está ativa. */
export type EventPhaseDto = {
  id: string;
  type: string;
  isActive: boolean;
};

/** O que o utilizador pode fazer no evento na fase atual. */
export type EventPermissionsDto = {
  isAdmin: boolean;
  canSubmitProposal: boolean;
  canVote: boolean;
};

/** Para cada área (por chave), se está aberta. */
export type EventModulesDto = Record<string, boolean>;

/** O evento ativo como a shell o vê: fase, o que o utilizador pode fazer e que áreas estão abertas. */
export type EventOverviewDto = {
  event: EventSummaryDto;
  activePhase: EventPhaseDto | null;
  permissions: EventPermissionsDto;
  /** Áreas abertas na fase ativa (`resolveMemberModules`), iguais para admins e membros. */
  modules: EventModulesDto;
};

/** Uma pessoa referida por outro DTO (por ex. a quem se dá o presente). */
export type EventUserDto = {
  id: string;
  name: string;
  role: string;
};

/** Um membro como o resto do grupo o vê. */
export type PublicUserDto = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  /** Chave da paleta com a cor do membro (lib/personColors.ts). */
  color: string;
};

/** Uma story ativa; a imagem pede-se ao endereço `mediaUrl`, que exige sessão. */
export type StoryDto = {
  id: string;
  createdAtUtc: string;
  expiresAtUtc: string;
  mediaUrl: string;
};

/** As stories ativas de um membro, da mais antiga para a mais recente. */
export type StoryAuthorDto = {
  authorUserId: string;
  authorName: string;
  /** Chave da paleta com a cor do membro (lib/personColors.ts). */
  authorColor: string;
  stories: StoryDto[];
};

/** Um item da lista de desejos de um membro. */
export type EventWishlistItemDto = {
  id: string;
  userId: string;
  eventId: string;
  title: string;
  url: string | null;
  notes: string | null;
  imageUrl: string | null;
  updatedAtUtc: string;
};

/** O que o membro vê do Amigo Secreto: se há sorteio, a quem dá o presente e quantos desejos tem. */
export type EventSecretSantaOverviewDto = {
  eventId: string;
  hasDraw: boolean;
  hasAssignment: boolean;
  assignedUser: EventUserDto | null;
  myWishlistItemCount: number;
};

/** Uma opção de uma sondagem do feed, com os seus votos. */
type EventFeedPollOptionDto = {
  id: string;
  text: string;
  voteCount: number;
};

/** Uma sondagem do feed com os resultados e a escolha do utilizador. */
export type EventFeedPollDto = {
  question: string;
  options: EventFeedPollOptionDto[];
  myOptionId: string | null;
  totalVotes: number;
};

/** Uma categoria de prémios como os membros a veem. */
export type EventCategoryDto = {
  id: string;
  eventId: string;
  name: string;
  kind: number;
  isActive: boolean;
  description: string | null;
};

/** Um post do feed completo: autor, imagens, contagens, reações do utilizador e sondagem. */
export type EventFeedPostFullDto = {
  id: string;
  eventId: string;
  authorUserId: string;
  authorName: string;
  /** Chave da paleta com a cor do autor. */
  authorColor: string;
  postNumber: number;
  text: string;
  mediaUrl: string | null;
  mediaUrls: string[];
  isPinned: boolean;
  pinnedOrder: number | null;
  createdAtUtc: string;
  likeCount: number;
  commentCount: number;
  downvoteCount: number;
  reactionCounts: Record<string, number>;
  myReactions: string[];
  likedByMe: boolean;
  downvotedByMe: boolean;
  poll: EventFeedPollDto | null;
  gathering: EventGatheringDto | null;
};

export type EventGatheringStatus = "POLLING" | "CONFIRMED" | "CANCELLED";
export type EventGatheringRsvpStatus = "GOING" | "NOT_GOING" | "MAYBE";

export type EventGatheringDateOptionDto = {
  id: string;
  dateText: string;
  sortOrder: number;
  voteCount: number;
  hasVoted: boolean;
};

export type EventGatheringRsvpDto = {
  userId: string;
  userName: string;
  userColor: string;
  status: EventGatheringRsvpStatus;
  note: string | null;
  updatedAtUtc: string;
};

export type EventGatheringDto = {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  location: string | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
  placeId: string | null;
  status: EventGatheringStatus;
  confirmedDate: string | null;
  postId: string | null;
  createdAtUtc: string;
  dateOptions: EventGatheringDateOptionDto[];
  rsvps: EventGatheringRsvpDto[];
  myRsvp: EventGatheringRsvpStatus | null;
  myRsvpNote: string | null;
};

/** Sugestão de local obtida via pesquisa do Google Places. */
export type PlaceSuggestionDto = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
};

/** Corpo do pedido para criar um post do feed. */
export type CreateEventFeedPostRequest = {
  text: string;
  mediaUrl?: string | null;
  mediaUrls?: string[] | null;
  pollQuestion?: string | null;
  pollOptions?: string[] | null;
  gatheringTitle?: string | null;
  gatheringDescription?: string | null;
  gatheringLocation?: string | null;
  gatheringLocationAddress?: string | null;
  gatheringLatitude?: number | null;
  gatheringLongitude?: number | null;
  gatheringMapUrl?: string | null;
  gatheringPlaceId?: string | null;
  gatheringDates?: string[] | null;
};

/** O evento ativo com o respetivo overview. */
export type EventActiveContextDto = {
  event: EventSummaryDto;
  overview: EventOverviewDto;
};

/** Uma proposta de categoria devolvida logo após ser criada. */
export type EventProposalDto = {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
};

/** Estado de moderação de uma proposta ou nomeação. */
type ProposalStatus = "pending" | "approved" | "rejected";

/** Uma proposta de categoria na lista de moderação. */
export type CategoryProposalDto = {
  id: string;
  name: string;
  kind: number;
  description: string | null;
  status: ProposalStatus;
  createdAtUtc: string;
};

/** Uma proposta de medida da gala. */
export type MeasureProposalDto = {
  id: string;
  text: string;
  status: ProposalStatus;
  createdAtUtc: string;
};

/** Uma medida oficial da gala. */
export type GalaMeasureDto = {
  id: string;
  text: string;
  isActive: boolean;
  createdAtUtc: string;
};

/** Uma nomeação (ou cromo) com a sua imagem e estado. */
export type NomineeDto = {
  id: string;
  categoryId: string | null;
  title: string;
  imageUrl: string | null;
  status: ProposalStatus;
  createdAtUtc: string;
};

/** Uma nomeação do próprio utilizador, como a página de nomeações a mostra (uma por categoria). */
export type MyNominationDto = {
  categoryId: string | null;
  status: ProposalStatus;
  /** Null enquanto a nomeação ainda está a ser enviada. */
  nomineeId: string | null;
  nomineeTitle: string;
};

/** Uma nomeação na lista de moderação, com o nome de quem a submeteu. */
export type AdminNomineeDto = {
  id: string;
  categoryId: string | null;
  title: string;
  imageUrl: string | null;
  status: ProposalStatus;
  createdAtUtc: string;
  submittedByName: string;
};

/** Totais para os indicadores dos separadores de admin. */
export type AdminListCountsDto = {
  membersTotal: number;
  categoriesTotal: number;
  officialResultsCategoriesCount: number;
};

/** Interruptor de cada área (por chave) definido pelo admin. */
export type EventAdminModuleVisibilityDto = Record<string, boolean>;

/** O estado do evento no painel de admin: fase, interruptores e áreas efetivamente abertas. */
export type EventAdminStateDto = {
  eventId: string;
  activePhase: EventPhaseDto | null;
  nominationsVisible: boolean;
  resultsVisible: boolean;
  moduleVisibility: EventAdminModuleVisibilityDto;
  effectiveModules: EventModulesDto;
};

/** A vista de admin do Amigo Secreto: código, sorteio, se está revelado e contagens. */
export type EventAdminSecretSantaStateDto = {
  eventId: string;
  eventCode: string;
  hasDraw: boolean;
  createdAtUtc: string | null;
  isLocked: boolean;
  memberCount: number;
  assignmentCount: number;
};

/** Uma opção votável (um nomeado ou uma pessoa). */
export type EventVoteOptionDto = {
  id: string;
  label: string;
  imageUrl: string | null;
};

/** Uma categoria no quadro de votação, com as opções e o voto atual do utilizador. */
export type EventVotingCategoryDto = {
  id: string;
  title: string;
  kind: number;
  description: string | null;
  voteQuestion: string | null;
  options: EventVoteOptionDto[];
  myOptionId: string | null;
};

/** O quadro de votação: se se pode votar e as categorias. */
export type EventVotingBoardDto = {
  eventId: string;
  canVote: boolean;
  categories: EventVotingCategoryDto[];
};

/** Os resultados públicos de uma categoria: total de votos e os primeiros lugares. */
export type PublicCategoryResultDto = {
  categoryId: string;
  categoryName: string;
  totalVotes: number;
  top: Array<{
    nomineeId: string;
    title: string;
    imageUrl: string | null;
    voteCount: number;
  }>;
};

/** Corpo do pedido para votar numa categoria. */
export type CastOfficialVoteRequest = {
  categoryId: string;
  selectionId: string;
};

/** A vista de admin de uma categoria de prémios. */
export type AwardCategoryDto = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  kind: number;
  description: string | null;
  voteQuestion: string | null;
  voteRules: string | null;
};

/** Corpo do pedido para criar uma categoria. */
export type CreateAwardCategoryRequest = {
  name: string;
  sortOrder: number | null;
  kind: number;
  description: string | null;
  voteQuestion: string | null;
  voteRules: string | null;
};

/** Corpo do pedido para atualizar uma categoria: só os campos enviados mudam. */
export type UpdateAwardCategoryRequest = Partial<CreateAwardCategoryRequest> & { isActive?: boolean };

/** Os resultados de uma categoria para o admin, com a taxa de participação e quem votou em quem. */
export type AdminCategoryResultDto = {
  categoryId: string;
  categoryName: string;
  totalVotes: number;
  participationRate: number;
  nominees: Array<{
    nomineeId: string;
    title: string;
    imageUrl: string | null;
    voteCount: number;
    /** Nomes dos membros que votaram neste. */
    voterNames: string[];
  }>;
};

/** Tudo o que o painel de admin carrega de uma vez. */
export type EventAdminBootstrapDto = {
  events: EventSummaryDto[];
  state: EventAdminStateDto;
  counts: AdminListCountsDto;
};

/** Uma página de resultados com o total e se há mais. */
export type PagedResult<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
};

/** Um voto individual na auditoria de admin. */
export type AdminVoteAuditRowDto = {
  categoryId: string;
  categoryName: string;
  nomineeId: string;
  nomineeName: string;
  userId: string;
  userName: string;
  updatedAtUtc: string;
};

/** Uma página de votos individuais para o admin. */
export type AdminVotesPagedDto = {
  total: number;
  votes: AdminVoteAuditRowDto[];
  skip: number;
  take: number;
  hasMore: boolean;
};

/** Uma página de nomeações para moderação. */
export type AdminNomineesPagedDto = {
  total: number;
  nominations: AdminNomineeDto[];
  skip: number;
  take: number;
  hasMore: boolean;
};

/** As chaves das áreas (módulos) que o admin pode ligar ou desligar. */
export type AdminModuleKey =
  "feed" | "nominees" | "categories" | "secretSanta" | "wishlist" | "voting" | "stickers" | "measures" | "gala";

/** Um comentário de um post do feed, com as reações. */
export type HubCommentDto = {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  /** Chave da paleta com a cor de quem comentou. */
  userColor: string;
  text: string;
  createdAtUtc: string;
  replyToId: string | null;
  reactionCounts: Record<string, number>;
  myReactions: string[];
};

/** Um convite gerado para um utilizador, visível no painel de admin. */
export type UserInvitationDto = {
  id: string;
  email: string;
  role: "participant" | "admin";
  createdAtUtc: string;
  expiresAtUtc: string;
  usedAtUtc: string | null;
  status: "pending" | "used" | "expired";
  inviteUrl: string;
};
