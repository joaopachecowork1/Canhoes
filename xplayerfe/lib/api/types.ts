export type CanhoesPhase = "nominations" | "voting" | "locked" | "gala";

export type CanhoesStateDto = {
  phase: CanhoesPhase;
  nominationsVisible: boolean;
  resultsVisible: boolean;
};

export type AwardCategoryDto = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  kind: "Sticker" | "UserVote";
  eligibleUsers?: PublicUserDto[];
  description?: string | null;
  voteQuestion?: string | null;
  voteRules?: string | null;
};

export type CreateAwardCategoryRequest = {
  name: string;
  sortOrder?: number | null;
  kind: "Sticker" | "UserVote";
};
export type UserVoteDto = {
  id: string;
  categoryId: string;
  voterUserId: string;
  targetUserId: string;
  updatedAtUtc: string;
};

export type CastUserVoteRequest = {
  categoryId: string;
  targetUserId: string;
};

export type NomineeDto = {
  id: string;
  categoryId?: string | null;
  title: string;
  imageUrl?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAtUtc: string;
};

export type CreateNomineeRequest = {
  categoryId?: string | null;
  title: string;
};

export type CategoryProposalDto = {
  id: string;
  name: string;
  description?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAtUtc: string;
};

export type CreateCategoryProposalRequest = {
  name: string;
  description?: string | null;
};

export type GalaMeasureDto = {
  id: string;
  text: string;
  isActive: boolean;
  createdAtUtc: string;
};

export type MeasureProposalDto = {
  id: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  createdAtUtc: string;
};

export type CreateMeasureProposalRequest = {
  text: string;
};

export type PendingAdminDto = {
  nominees: NomineeDto[];
  categoryProposals: CategoryProposalDto[];
  measureProposals: MeasureProposalDto[];
};

export type SetNomineeCategoryRequest = {
  categoryId?: string | null;
};

export type CanhoesResultNomineeDto = {
  nomineeId: string;
  categoryId?: string | null;
  title: string;
  imageUrl?: string | null;
  votes: number;
};

export type CanhoesCategoryResultDto = {
  categoryId: string;
  categoryName: string;
  totalVotes: number;
  top: CanhoesResultNomineeDto[]; // top 3
};

export type VoteDto = {
  id: string;
  categoryId: string;
  nomineeId: string;
  updatedAtUtc: string;
};

export type CastVoteRequest = {
  categoryId: string;
  nomineeId: string;
};


export type PublicUserDto = {
  id: string;
  email: string;
  displayName?: string | null;
  isAdmin: boolean;
};

export type WishlistItemDto = {
  id: string;
  userId: string;
  title: string;
  url?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreateWishlistItemRequest = {
  title: string;
  url?: string | null;
  notes?: string | null;
};

export type SecretSantaDrawDto = {
  id: string;
  eventCode: string;
  createdAtUtc: string;
  isLocked: boolean;
};

export type SecretSantaMeDto = {
  drawId: string;
  eventCode: string;
  receiver: PublicUserDto;
};

export type CreateSecretSantaDrawRequest = {
  eventCode?: string | null;
};

// ------------------------------
// Admin helper types
// ------------------------------

export type UpdateAwardCategoryRequest = {
  name?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  kind?: string | null;
  description?: string | null;
  voteQuestion?: string | null;
  voteRules?: string | null;
};
