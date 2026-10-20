import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AwardCategoryDto, EventCategoryDto, PagedResult } from "@/lib/api/types";

/*
 * Award categories. `kind` says what members vote for: 0 = an approved nomination of the category,
 * 1 = a person of the event (`CATEGORY_KIND.USER_VOTE`).
 */

/** Active categories of an event, in display order (the member-facing list). */
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

type CategoryRow = Prisma.AwardCategoryGetPayload<object>;

/** The admin's view of a category. `voteRules` is free text stored in a JSON column. */
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

/** Trimmed text, `null` when cleared, `undefined` (left unchanged) when not sent. */
function trimmedOrNull(value: string | null | undefined) {
  return value === undefined ? undefined : (value?.trim() ?? null);
}

/** Every category of the event, active or not, for the admin. */
export async function getAdminCategories(eventId: string): Promise<AwardCategoryDto[]> {
  const categories = await prisma.awardCategory.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return categories.map(toCategoryDto);
}

/** Creates an active category; without `sortOrder` it goes to the end of the list. */
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
  const maxSort = await prisma.awardCategory.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });

  const category = await prisma.awardCategory.create({
    data: {
      eventId,
      name: data.name.trim(),
      description: data.description?.trim() ?? null,
      kind: data.kind,
      sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      isActive: true,
      voteQuestion: data.voteQuestion?.trim() ?? null,
      voteRules: data.voteRules ?? Prisma.JsonNull,
    },
  });
  return toCategoryDto(category);
}

/** Updates the given fields of a category of this event; null when it does not exist here. */
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
  const existing = await prisma.awardCategory.findFirst({ where: { id: categoryId, eventId } });
  if (!existing) return null;

  // Prisma leaves `undefined` fields untouched, so only what the admin sent changes.
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

/** Deletes a category of this event; false when it does not exist here. */
export async function deleteCategory(eventId: string, categoryId: string): Promise<boolean> {
  const existing = await prisma.awardCategory.findFirst({ where: { id: categoryId, eventId } });
  if (!existing) return false;

  const hasDependents = await Promise.all([
    prisma.nominee.count({ where: { eventId, categoryId } }),
    prisma.vote.count({ where: { categoryId } }),
    prisma.userVote.count({ where: { categoryId } }),
  ]);

  if (hasDependents.some((c) => c > 0)) return false;

  await prisma.awardCategory.delete({ where: { id: categoryId } });
  return true;
}
