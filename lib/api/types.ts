export type EventSummaryDto = {
  id: string;
  name: string;
  isActive: boolean;
};

export type EventPhaseDto = {
  id: string;
  type: string;
  startDateUtc: string;
  endDateUtc: string;
  isActive: boolean;
};

export type EventPermissionsDto = {
  isAdmin: boolean;
  isMember: boolean;
  canPost: boolean;
  canSubmitProposal: boolean;
  canVote: boolean;
  canManage: boolean;
};

export type EventCountsDto = {
  memberCount: number;
  feedPostCount: number;
  categoryCount: number;
  pendingProposalCount: number;
  wishlistItemCount: number;
};

export type EventModulesDto = Record<string, boolean>;

export type EventOverviewDto = {
  event: EventSummaryDto;
  activePhase: EventPhaseDto | null;
  nextPhase: EventPhaseDto | null;
  permissions: EventPermissionsDto;
  counts: EventCountsDto;
  hasSecretSantaDraw: boolean;
  hasSecretSantaAssignment: boolean;
  myWishlistItemCount: number;
  myProposalCount: number;
  myVoteCount: number;
  votingCategoryCount: number;
  modules: EventModulesDto;
};

export type EventUserDto = {
  id: string;
  name: string;
  role: string;
};

export type PublicUserDto = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
};

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

export type EventSecretSantaOverviewDto = {
  eventId: string;
  hasDraw: boolean;
  hasAssignment: boolean;
  drawEventCode: string | null;
  assignedUser: EventUserDto | null;
  assignedWishlistItemCount: number;
  myWishlistItemCount: number;
};

export type EventFeedPollOptionDto = {
  id: string;
  text: string;
  voteCount: number;
};

export type EventFeedPollDto = {
  question: string;
  options: EventFeedPollOptionDto[];
  myOptionId: string | null;
  totalVotes: number;
};

export type EventCategoryDto = {
  id: string;
  eventId: string;
  name: string;
  kind: number;
  isActive: boolean;
  description: string | null;
};

export type EventFeedPostFullDto = {
  id: string;
  eventId: string;
  authorUserId: string;
  authorName: string;
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
};

export type CreateEventFeedPostRequest = {
  text: string;
  mediaUrl?: string | null;
  mediaUrls?: string[] | null;
  pollQuestion?: string | null;
  pollOptions?: string[] | null;
};

export type EventActiveContextDto = {
  event: EventSummaryDto;
  overview: EventOverviewDto;
};

export type EventProposalDto = {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
};

export type ProposalStatus = "pending" | "approved" | "rejected";

export type CategoryProposalDto = {
  id: string;
  name: string;
  kind: number;
  description: string | null;
  status: ProposalStatus;
  createdAtUtc: string;
};

export type MeasureProposalDto = {
  id: string;
  text: string;
  status: ProposalStatus;
  createdAtUtc: string;
};

export type GalaMeasureDto = {
  id: string;
  text: string;
  isActive: boolean;
  createdAtUtc: string;
};

export type NomineeDto = {
  id: string;
  categoryId: string | null;
  title: string;
  imageUrl: string | null;
  status: ProposalStatus;
  createdAtUtc: string;
};

export type MyNominationStatusDto = {
  hasNomination: boolean;
  categoryId: string | null;
  status: ProposalStatus | null;
  nomineeId: string | null;
  nomineeTitle: string | null;
};

export type AdminNomineeDto = {
  id: string;
  categoryId: string | null;
  title: string;
  imageUrl: string | null;
  status: ProposalStatus;
  createdAtUtc: string;
  submittedByUserId: string;
  submittedByName: string;
};

export type AdminMemberDto = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
};

export type AdminListCountsDto = {
  nomineesTotal: number;
  adminNomineesTotal: number;
  votesTotal: number;
  categoryProposalsTotal: number;
  categoryProposalsPendingTotal: number;
  measureProposalsTotal: number;
  measureProposalsPendingTotal: number;
  membersTotal: number;
  officialResultsCategoriesCount: number;
};

export type EventAdminModuleVisibilityDto = Record<string, boolean>;

export type EventAdminStateDto = {
  eventId: string;
  activePhase: EventPhaseDto | null;
  phases: EventPhaseDto[];
  nominationsVisible: boolean;
  resultsVisible: boolean;
  moduleVisibility: EventAdminModuleVisibilityDto;
  effectiveModules: EventModulesDto;
  counts: EventCountsDto;
};

export type EventAdminSecretSantaStateDto = {
  eventId: string;
  eventCode: string;
  hasDraw: boolean;
  drawId: string | null;
  createdAtUtc: string | null;
  isLocked: boolean;
  memberCount: number;
  assignmentCount: number;
};

export type EventVoteOptionDto = {
  id: string;
  label: string;
  imageUrl: string | null;
};

export type EventVotingCategoryDto = {
  id: string;
  title: string;
  kind: number;
  description: string | null;
  voteQuestion: string | null;
  options: EventVoteOptionDto[];
  myOptionId: string | null;
};

export type EventVotingBoardDto = {
  eventId: string;
  phaseId: string | null;
  canVote: boolean;
  categories: EventVotingCategoryDto[];
};

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

export type CastOfficialVoteRequest = {
  categoryId: string;
  selectionId: string;
};

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

export type CreateAwardCategoryRequest = {
  name: string;
  sortOrder: number | null;
  kind: number;
  description: string | null;
  voteQuestion: string | null;
  voteRules: string | null;
};

export type UpdateAwardCategoryRequest = Partial<CreateAwardCategoryRequest> & { isActive?: boolean };

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
    voterUserIds: string[];
  }>;
};

export type EventAdminBootstrapDto = {
  events: EventSummaryDto[];
  state: EventAdminStateDto;
  counts: AdminListCountsDto;
};

export type PagedResult<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
};

export type AdminVoteAuditRowDto = {
  categoryId: string;
  categoryName: string;
  nomineeId: string;
  nomineeName: string;
  userId: string;
  userName: string;
  updatedAtUtc: string;
};

export type AdminVotesPagedDto = {
  total: number;
  votes: AdminVoteAuditRowDto[];
  skip: number;
  take: number;
  hasMore: boolean;
};

export type AdminNomineesPagedDto = {
  total: number;
  nominations: AdminNomineeDto[];
  skip: number;
  take: number;
  hasMore: boolean;
};

export type AdminModuleKey = 
  | "feed"
  | "nominees"
  | "categories"
  | "secretSanta"
  | "wishlist"
  | "voting"
  | "stickers"
  | "measures"
  | "gala";

export type HubCommentDto = {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  text: string;
  createdAtUtc: string;
  replyToId: string | null;
  reactionCounts: Record<string, number>;
  myReactions: string[];
};
