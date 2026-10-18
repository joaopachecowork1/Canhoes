import type {
  AdminCategoryResultDto,
  AdminMemberDto,
  AdminNomineeDto,
  AdminVoteAuditRowDto,
  AwardCategoryDto,
  CategoryProposalDto,
  EventAdminBootstrapDto,
  EventAdminSecretSantaStateDto,
  EventFeedPostFullDto,
  EventVotingBoardDto,
  EventVotingCategoryDto,
  GalaMeasureDto,
  HubCommentDto,
  MeasureProposalDto,
  NomineeDto,
  PagedResult,
} from "@/lib/api/types";

/*
 * Test data builders: each returns a valid DTO with neutral values, and a test overrides only
 * what its case is about. The event of every builder is `event-1`.
 */

const CREATED_AT = "2026-10-01T10:00:00.000Z";

export const paged = <T>(items: T[]): PagedResult<T> => ({ items, total: items.length, skip: 0, take: 50, hasMore: false });

export const category = (overrides: Partial<AwardCategoryDto> = {}): AwardCategoryDto => ({
  id: "cat-1",
  name: "Canhão do Ano",
  sortOrder: 1,
  isActive: true,
  kind: 0,
  description: null,
  voteQuestion: null,
  voteRules: null,
  ...overrides,
});

export const nominee = (overrides: Partial<NomineeDto> = {}): NomineeDto => ({
  id: "nom-1",
  categoryId: "cat-1",
  title: "Ana",
  imageUrl: null,
  status: "approved",
  createdAtUtc: CREATED_AT,
  ...overrides,
});

export const adminNominee = (overrides: Partial<AdminNomineeDto> = {}): AdminNomineeDto => ({
  ...nominee({ status: "pending" }),
  submittedByName: "Rui",
  ...overrides,
});

export const member = (overrides: Partial<AdminMemberDto> = {}): AdminMemberDto => ({
  id: "ana",
  email: "ana@canhoes.pt",
  displayName: "Ana",
  isAdmin: false,
  ...overrides,
});

export const vote = (overrides: Partial<AdminVoteAuditRowDto> = {}): AdminVoteAuditRowDto => ({
  categoryId: "cat-1",
  categoryName: "Canhão do Ano",
  nomineeId: "nom-1",
  nomineeName: "Ana",
  userId: "rui",
  userName: "Rui",
  updatedAtUtc: CREATED_AT,
  ...overrides,
});

export const categoryProposal = (overrides: Partial<CategoryProposalDto> = {}): CategoryProposalDto => ({
  id: "cp-1",
  name: "Melhor sticker",
  kind: 0,
  description: null,
  status: "pending",
  createdAtUtc: CREATED_AT,
  ...overrides,
});

export const measureProposal = (overrides: Partial<MeasureProposalDto> = {}): MeasureProposalDto => ({
  id: "mp-1",
  text: "Quem perder paga uma rodada",
  status: "pending",
  createdAtUtc: CREATED_AT,
  ...overrides,
});

export const measure = (overrides: Partial<GalaMeasureDto> = {}): GalaMeasureDto => ({
  id: "m-1",
  text: "Ninguém sai antes da meia-noite",
  isActive: true,
  createdAtUtc: CREATED_AT,
  ...overrides,
});

export const officialResult = (overrides: Partial<AdminCategoryResultDto> = {}): AdminCategoryResultDto => ({
  categoryId: "cat-1",
  categoryName: "Canhão do Ano",
  totalVotes: 3,
  participationRate: 0.75,
  nominees: [
    { nomineeId: "n1", title: "Ana", imageUrl: null, voteCount: 2, voterUserIds: ["rui", "eva"] },
    { nomineeId: "n2", title: "Rui", imageUrl: null, voteCount: 1, voterUserIds: ["ana"] },
  ],
  ...overrides,
});

export const secretSantaState = (overrides: Partial<EventAdminSecretSantaStateDto> = {}): EventAdminSecretSantaStateDto => ({
  eventId: "event-1",
  eventCode: "CAN26",
  hasDraw: false,
  createdAtUtc: null,
  isLocked: false,
  memberCount: 4,
  assignmentCount: 0,
  ...overrides,
});

export const adminBootstrap = (overrides: Partial<EventAdminBootstrapDto> = {}): EventAdminBootstrapDto => ({
  events: [{ id: "event-1", name: "Canhões 2026", isActive: true }],
  state: {
    eventId: "event-1",
    activePhase: { id: "phase-1", type: "PROPOSALS", isActive: true },
    nominationsVisible: true,
    resultsVisible: false,
    moduleVisibility: {},
    effectiveModules: { feed: true, wishlist: true, nominees: true },
  },
  counts: { membersTotal: 4, categoriesTotal: 2, officialResultsCategoriesCount: 0 },
  ...overrides,
});

export const votingCategory = (overrides: Partial<EventVotingCategoryDto> = {}): EventVotingCategoryDto => ({
  id: "cat-1",
  title: "Canhão do Ano",
  kind: 0,
  description: null,
  voteQuestion: null,
  options: [
    { id: "opt-ana", label: "Ana", imageUrl: null },
    { id: "opt-rui", label: "Rui", imageUrl: null },
  ],
  myOptionId: null,
  ...overrides,
});

export const votingBoard = (categories: EventVotingCategoryDto[], canVote = true): EventVotingBoardDto => ({
  eventId: "event-1",
  canVote,
  categories,
});

export const post = (overrides: Partial<EventFeedPostFullDto> = {}): EventFeedPostFullDto => ({
  id: "post-1",
  eventId: "event-1",
  authorUserId: "rui",
  authorName: "Rui",
  text: "Bom dia, mural",
  mediaUrl: null,
  mediaUrls: [],
  isPinned: false,
  pinnedOrder: null,
  createdAtUtc: CREATED_AT,
  likeCount: 0,
  commentCount: 0,
  downvoteCount: 0,
  reactionCounts: {},
  myReactions: [],
  likedByMe: false,
  downvotedByMe: false,
  poll: null,
  ...overrides,
});

export const comment = (overrides: Partial<HubCommentDto> = {}): HubCommentDto => ({
  id: "comment-1",
  postId: "post-1",
  userId: "rui",
  userName: "Rui",
  text: "Concordo",
  createdAtUtc: CREATED_AT,
  replyToId: null,
  reactionCounts: {},
  myReactions: [],
  ...overrides,
});
