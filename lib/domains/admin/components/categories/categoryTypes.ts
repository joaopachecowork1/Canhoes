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

/** Texto mostrado ao utilizador para cada tipo de categoria. */
export const CATEGORY_KIND_LABELS: Record<number, string> = {
  [CATEGORY_KIND.NOMINEE]: messages.categories.CategoryProposalForm.kindNominees,
  [CATEGORY_KIND.USER_VOTE]: messages.categories.CategoryProposalForm.kindMember,
};

/** Valores do campo "tipo" no formulário (texto), traduzidos depois para `CATEGORY_KIND`. */
export const CATEGORY_KIND_FORM_LABELS = {
  STICKER: "Sticker",
  USER_VOTE: "UserVote",
} as const;

/** Estado do formulário de categoria; tudo em texto, como vem dos campos. */
export type CategoryFormState = {
  description: string;
  isActive: boolean;
  kind: string;
  name: string;
  sortOrder: string;
  voteQuestion: string;
  voteRules: string;
};

/** Quanto uma categoria já está em uso e se pode ser apagada (com o motivo, se não puder). */
export type CategoryUsage = {
  canDelete: boolean;
  deleteReason: string | null;
  nomineeCount: number;
  voteCount: number;
};

/** Estado da gaveta do editor: criar uma nova ou editar uma existente. */
export type CategorySheetState = { mode: "create" } | { category: AwardCategoryDto; mode: "edit" };

/** Formulário vazio para uma categoria nova, já com a próxima ordem. */
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

/** Preenche o formulário com os dados de uma categoria existente. */
export function buildCategoryForm(category: AwardCategoryDto): CategoryFormState {
  return {
    description: category.description ?? "",
    isActive: category.isActive,
    kind:
      category.kind === CATEGORY_KIND.USER_VOTE
        ? CATEGORY_KIND_FORM_LABELS.USER_VOTE
        : CATEGORY_KIND_FORM_LABELS.STICKER,
    name: category.name,
    sortOrder: String(category.sortOrder),
    voteQuestion: category.voteQuestion ?? "",
    voteRules: category.voteRules ?? "",
  };
}

/** Aparar o texto; vazio passa a `null`. */
function normalizeOptionalText(value: string): string | null {
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

/** Lê a ordem como inteiro; `null` se não for um número. */
function parseSortOrder(value: string): number | null {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

/** Converte o tipo do formulário no tipo da API; qualquer valor desconhecido é "nomeados". */
function parseCategoryKind(value: string): CategoryKind {
  return value === CATEGORY_KIND_FORM_LABELS.USER_VOTE ? CATEGORY_KIND.USER_VOTE : CATEGORY_KIND.NOMINEE;
}

/** Corpo comum a criar e editar; a pergunta e as regras de voto só existem nas categorias de voto em membros. */
function buildCategoryPayload(form: Readonly<CategoryFormState>) {
  const kind = parseCategoryKind(form.kind);

  return {
    name: form.name.trim(),
    sortOrder: parseSortOrder(form.sortOrder),
    kind,
    description: normalizeOptionalText(form.description),
    voteQuestion: kind === CATEGORY_KIND.USER_VOTE ? normalizeOptionalText(form.voteQuestion) : null,
    voteRules: kind === CATEGORY_KIND.USER_VOTE ? normalizeOptionalText(form.voteRules) : null,
  };
}

/** Corpo do pedido para criar uma categoria a partir do formulário. */
export function buildCreateCategoryPayload(form: Readonly<CategoryFormState>): CreateAwardCategoryRequest {
  return buildCategoryPayload(form);
}

/** Corpo do pedido para editar uma categoria a partir do formulário (inclui `isActive`). */
export function buildUpdateCategoryPayload(form: Readonly<CategoryFormState>): UpdateAwardCategoryRequest {
  return {
    ...buildCategoryPayload(form),
    isActive: form.isActive,
  };
}

/** Texto "N nomeados" no singular ou plural; `null` quando não há nenhum. */
function formatKnownDependencyCount(count: number, variants: Readonly<{ one: string; other: string }>): string | null {
  if (count === 0) return null;
  return formatMessage(count === 1 ? variants.one : variants.other, { count });
}

/**
 * Decide se a UI pode oferecer apagar a categoria. A API continua a ser a autoridade,
 * porque as associações podem mudar entre este resumo e o pedido de apagar.
 */
export function buildCategoryUsage(category: AwardCategoryDto, nomineeCount: number, voteCount: number): CategoryUsage {
  const dependencyCount = nomineeCount + voteCount;

  // com nomeados ou votos, apagar fica bloqueado e o motivo lista o que existe
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

  // as categorias de voto em membros são protegidas mesmo sem uso
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

/** Ordem do catálogo: primeiro a ordem definida, depois o nome. */
export function sortCategories(categories: AwardCategoryDto[]) {
  return [...categories].sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.name.localeCompare(right.name, "pt-PT"),
  );
}

/** Conta ocorrências por id de categoria, ignorando valores vazios. */
function countByCategory(categoryIds: (string | null)[]) {
  const counts = new Map<string, number>();
  for (const categoryId of categoryIds) {
    if (categoryId) counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }
  return counts;
}

/** Para cada categoria, quantos nomeados e votos tem e se pode ser apagada. */
export function buildCategoryUsageById(
  categories: AwardCategoryDto[],
  nominations: Pick<AdminNomineeDto, "categoryId">[],
  votes: Pick<AdminVoteAuditRowDto, "categoryId">[],
): Record<string, CategoryUsage> {
  const nomineeCounts = countByCategory(nominations.map((nominee) => nominee.categoryId));
  const voteCounts = countByCategory(votes.map((vote) => vote.categoryId));

  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      buildCategoryUsage(category, nomineeCounts.get(category.id) ?? 0, voteCounts.get(category.id) ?? 0),
    ]),
  );
}
