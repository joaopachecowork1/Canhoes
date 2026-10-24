import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AwardCategoryDto, EventCategoryDto, PagedResult } from "@/lib/api/types";

/*
 * Categorias dos prémios. `kind` diz em que os membros votam: 0 = uma nomeação aprovada da categoria,
 * 1 = uma pessoa do evento (`CATEGORY_KIND.USER_VOTE`).
 */

/** Categorias ativas de um evento, pela ordem de apresentação (a lista que os membros veem). */
export async function getActiveCategories(
  eventId: string,
  skip: number,
  take: number,
): Promise<PagedResult<EventCategoryDto>> {
  const where = { eventId, isActive: true };
  const [categories, total] = await Promise.all([
    prisma.awardCategory.findMany({ where, orderBy: { sortOrder: "asc" }, skip, take }),
    prisma.awardCategory.count({ where }),
  ]);

  return {
    items: categories.map((category) => ({
      id: category.id,
      eventId: category.eventId,
      name: category.name,
      kind: category.kind,
      isActive: category.isActive,
      description: category.description,
    })),
    total,
    skip,
    take,
    hasMore: skip + take < total,
  };
}

/** Uma categoria tal como vem da BD. */
type CategoryRow = Prisma.AwardCategoryGetPayload<object>;

/** A vista de admin de uma categoria. `voteRules` é texto livre guardado numa coluna JSON. */
function toCategoryDto(category: CategoryRow): AwardCategoryDto {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    kind: category.kind,
    description: category.description,
    voteQuestion: category.voteQuestion,
    voteRules: typeof category.voteRules === "string" ? category.voteRules : null,
  };
}

/** Texto sem espaços nas pontas, `null` quando apagado, `undefined` (fica como está) quando não foi enviado. */
function trimmedOrNull(value: string | null | undefined) {
  return value === undefined ? undefined : (value?.trim() ?? null);
}

/** Todas as categorias do evento, ativas ou não, para o admin. */
export async function getAdminCategories(eventId: string): Promise<AwardCategoryDto[]> {
  const categories = await prisma.awardCategory.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return categories.map(toCategoryDto);
}

/** Cria uma categoria ativa; sem `sortOrder` vai para o fim da lista. */
export async function createCategory(
  eventId: string,
  data: {
    name: string;
    sortOrder?: number | null;
    kind: number;
    description?: string | null;
    voteQuestion?: string | null;
    voteRules?: string | null;
  },
): Promise<AwardCategoryDto> {
  // A maior ordem atual, para a nova categoria ficar a seguir.
  const maxSort = await prisma.awardCategory.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });

  const category = await prisma.awardCategory.create({
    data: {
      eventId,
      name: data.name.trim(),
      description: trimmedOrNull(data.description) ?? null,
      kind: data.kind,
      sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      isActive: true,
      voteQuestion: trimmedOrNull(data.voteQuestion) ?? null,
      voteRules: data.voteRules ?? Prisma.JsonNull,
    },
  });
  return toCategoryDto(category);
}

/** Atualiza os campos indicados de uma categoria deste evento; null quando não existe aqui. */
export async function updateCategory(
  eventId: string,
  categoryId: string,
  data: Partial<{
    name: string;
    sortOrder: number;
    isActive: boolean;
    kind: number;
    description: string | null;
    voteQuestion: string | null;
    voteRules: string | null;
  }>,
): Promise<AwardCategoryDto | null> {
  const existing = await prisma.awardCategory.findFirst({
    where: { id: categoryId, eventId },
    select: { id: true },
  });
  if (!existing) return null;

  // O Prisma deixa os campos `undefined` como estão, por isso só muda o que o admin enviou.
  const updated = await prisma.awardCategory.update({
    where: { id: categoryId },
    data: {
      name: data.name?.trim(),
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      kind: data.kind,
      description: trimmedOrNull(data.description),
      voteQuestion: trimmedOrNull(data.voteQuestion),
      voteRules: data.voteRules === undefined ? undefined : (data.voteRules ?? Prisma.JsonNull),
    },
  });
  return toCategoryDto(updated);
}

export type DeleteCategoryResult = "NOT_FOUND" | "HAS_DEPENDENTS" | "DELETED";

/** Apaga uma categoria deste evento; distingue se não foi encontrada ou se tem dependências. */
export async function deleteCategory(eventId: string, categoryId: string): Promise<DeleteCategoryResult> {
  const existing = await prisma.awardCategory.findFirst({
    where: { id: categoryId, eventId },
    select: { id: true },
  });
  if (!existing) return "NOT_FOUND";

  // Uma categoria com nomeados ou votos não se apaga, para não perder dados.
  const [nomineeCount, voteCount] = await Promise.all([
    prisma.nominee.count({ where: { eventId, categoryId } }),
    prisma.vote.count({ where: { categoryId } }),
  ]);

  if (nomineeCount > 0 || voteCount > 0) return "HAS_DEPENDENTS";

  await prisma.awardCategory.delete({ where: { id: categoryId } });
  return "DELETED";
}
