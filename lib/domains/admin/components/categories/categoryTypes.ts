import type {
  AdminNomineeDto,
  AdminVoteAuditRowDto,
  AwardCategoryDto,
  CreateAwardCategoryRequest,
  UpdateAwardCategoryRequest,
} from "@/lib/api/types";
import { CATEGORY_KIND } from "@/lib/categoryKind";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.admin.categoryRules;

type CategoryKind = typeof CATEGORY_KIND.NOMINEE | typeof CATEGORY_KIND.USER_VOTE;

export const CATEGORY_KIND_LABELS: Record<number, string> = {
  [CATEGORY_KIND.NOMINEE]: messages.categories.CategoryProposalForm.kindNominees,
  [CATEGORY_KIND.USER_VOTE]: messages.categories.CategoryProposalForm.kindMember,
};

export const CATEGORY_KIND_FORM_LABELS = {
  STICKER: "Sticker",
  USER_VOTE: "UserVote",
} as const;

export type CategoryFormState = {
  description: string;
  isActive: boolean;
  kind: string;
  name: string;
  sortOrder: string;
  voteQuestion: string;
  voteRules: string;
};

export type CategoryUsage = {
  canDelete: boolean;
  deleteReason: string | null;
  nomineeCount: number;
  voteCount: number;
};

export type CategorySheetState =
  | { mode: "create" }
  | { category: AwardCategoryDto; mode: "edit" };

export function buildInitialCategoryForm(sortOrder: number): CategoryFormState {
  return {
    description: "",
    isActive: true,
    kind: "Sticker",
    name: "",
    sortOrder: String(sortOrder),
    voteQuestion: "",
    voteRules: "",
  };
}

export function buildCategoryForm(category: AwardCategoryDto): CategoryFormState {
  return {
    description: category.description ?? "",
    isActive: category.isActive,
    kind: category.kind === CATEGORY_KIND.USER_VOTE
      ? CATEGORY_KIND_FORM_LABELS.USER_VOTE
      : CATEGORY_KIND_FORM_LABELS.STICKER,
    name: category.name,
    sortOrder: String(category.sortOrder),
    voteQuestion: category.voteQuestion ?? "",
    voteRules: category.voteRules ?? "",
  };
}

function normalizeOptionalText(value: string): string | null {
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseSortOrder(value: string): number | null {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseCategoryKind(value: string): CategoryKind {
  return value === CATEGORY_KIND_FORM_LABELS.USER_VOTE
    ? CATEGORY_KIND.USER_VOTE
    : CATEGORY_KIND.NOMINEE;
}

function buildCategoryPayload(form: Readonly<CategoryFormState>) {
  const kind = parseCategoryKind(form.kind);

  return {
    name: form.name.trim(),
    sortOrder: parseSortOrder(form.sortOrder),
    kind,
    description: normalizeOptionalText(form.description),
    voteQuestion:
      kind === CATEGORY_KIND.USER_VOTE ? normalizeOptionalText(form.voteQuestion) : null,
    voteRules:
      kind === CATEGORY_KIND.USER_VOTE ? normalizeOptionalText(form.voteRules) : null,
  };
}

export function buildCreateCategoryPayload(
  form: Readonly<CategoryFormState>
): CreateAwardCategoryRequest {
  return buildCategoryPayload(form);
}

export function buildUpdateCategoryPayload(
  form: Readonly<CategoryFormState>
): UpdateAwardCategoryRequest {
  return {
    ...buildCategoryPayload(form),
    isActive: form.isActive,
  };
}

function formatKnownDependencyCount(count: number, variants: Readonly<{ one: string; other: string }>): string | null {
  if (count === 0) return null;
  return formatMessage(count === 1 ? variants.one : variants.other, { count });
}

/**
 * Determines whether the UI can offer deletion. The API remains authoritative
 * because associations may change between this summary and the delete request.
 */
export function buildCategoryUsage(
  category: AwardCategoryDto,
  nomineeCount: number,
  voteCount: number
): CategoryUsage {
  const dependencyCount = nomineeCount + voteCount;

  if (dependencyCount > 0) {
    const dependencies = [
      formatKnownDependencyCount(nomineeCount, { one: copy.nomineeOne, other: copy.nomineeOther }),
      formatKnownDependencyCount(voteCount, { one: copy.voteOne, other: copy.voteOther }),
    ].filter((dependency): dependency is string => dependency !== null);

    return {
      canDelete: false,
      deleteReason: formatMessage(copy.deleteBlocked, { dependencies: dependencies.join(copy.and) }),
      nomineeCount,
      voteCount,
    };
  }

  if (category.kind === CATEGORY_KIND.USER_VOTE) {
    return {
      canDelete: false,
      deleteReason: copy.userVoteProtected,
      nomineeCount,
      voteCount,
    };
  }

  return {
    canDelete: true,
    deleteReason: null,
    nomineeCount,
    voteCount,
  };
}

/** Catalog order: sort order first, then name. */
export function sortCategories(categories: AwardCategoryDto[]) {
  return [...categories].sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.name.localeCompare(right.name, "pt-PT")
  );
}

function countByCategory(categoryIds: (string | null)[]) {
  const counts = new Map<string, number>();
  for (const categoryId of categoryIds) {
    if (categoryId) counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }
  return counts;
}

/** Nominees, votes and whether each category may be deleted. */
export function buildCategoryUsageById(
  categories: AwardCategoryDto[],
  nominations: Pick<AdminNomineeDto, "categoryId">[],
  votes: Pick<AdminVoteAuditRowDto, "categoryId">[]
): Record<string, CategoryUsage> {
  const nomineeCounts = countByCategory(nominations.map((nominee) => nominee.categoryId));
  const voteCounts = countByCategory(votes.map((vote) => vote.categoryId));

  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      buildCategoryUsage(category, nomineeCounts.get(category.id) ?? 0, voteCounts.get(category.id) ?? 0),
    ])
  );
}
