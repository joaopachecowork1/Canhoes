import type {
  AwardCategoryDto,
  CreateAwardCategoryRequest,
  UpdateAwardCategoryRequest,
} from "@/lib/api/types";

export const CATEGORY_KIND = {
  STICKER: 0,
  USER_VOTE: 1,
} as const;

type CategoryKind = (typeof CATEGORY_KIND)[keyof typeof CATEGORY_KIND];

export const CATEGORY_KIND_LABELS: Record<number, string> = {
  [CATEGORY_KIND.STICKER]: "Vota-se nas nomeações",
  [CATEGORY_KIND.USER_VOTE]: "Vota-se num membro",
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
    : CATEGORY_KIND.STICKER;
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

function formatKnownDependencyCount(label: string, count: number): string | null {
  if (count === 0) return null;
  return `${count} ${label}${count > 1 ? "s" : ""}`;
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
      formatKnownDependencyCount("nomeação", nomineeCount),
      formatKnownDependencyCount("voto", voteCount),
    ].filter((dependency): dependency is string => dependency !== null);

    return {
      canDelete: false,
      deleteReason: `Apagamento bloqueado por ${dependencies.join(" e ")} já associados.`,
      nomineeCount,
      voteCount,
    };
  }

  if (category.kind === CATEGORY_KIND.USER_VOTE) {
    return {
      canDelete: false,
      deleteReason:
        "Categorias de voto oficial ficam protegidas aqui; a validação final de votos continua no backend.",
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
