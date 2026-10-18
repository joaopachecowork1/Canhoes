import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AwardCategoryDto,
  EventCategoryDto,
  PagedResult,
} from "@/lib/api/types";

/*
 * Award categories. `kind` says what members vote for: 0 = an approved nomination of the category,
 * 1 = a person of the event (`KindUserVote`).
 */

/** Active categories of an event, in display order (the member-facing list). */
export async function getActiveCategories(
  eventId: string,
  skip: number,
  take: number
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

/** Every category of the event, active or not, for the admin. */
export async function getAdminCategories(eventId: string): Promise<AwardCategoryDto[]> {
  const categories = await prisma.awardCategory.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    kind: c.kind,
    description: c.description,
    voteQuestion: c.voteQuestion,
    voteRules: c.voteRules as string | null,
  }));
}

/** Creates an active category; without `sortOrder` it goes to the end of the list. */
export async function createCategory(
  eventId: string,
  data: { name: string; sortOrder?: number | null; kind: number; description?: string | null; voteQuestion?: string | null; voteRules?: string | null }
): Promise<AwardCategoryDto> {
  const maxSort = await prisma.awardCategory.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });
  const nextSort = data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1;

  const category = await prisma.awardCategory.create({
    data: {
      eventId,
      name: data.name.trim(),
      description: data.description?.trim() ?? null,
      kind: data.kind,
      sortOrder: nextSort,
      isActive: true,
      voteQuestion: data.voteQuestion?.trim() ?? null,
      voteRules: data.voteRules ?? Prisma.JsonNull,
    },
  });

  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    kind: category.kind,
    description: category.description,
    voteQuestion: category.voteQuestion,
    voteRules: typeof category.voteRules === "string" ? category.voteRules : JSON.stringify(category.voteRules),
  };
}

/** Updates the given fields of a category of this event; null when it does not exist here. */
export async function updateCategory(
  eventId: string,
  categoryId: string,
  data: Partial<{ name: string; sortOrder: number; isActive: boolean; kind: number; description: string | null; voteQuestion: string | null; voteRules: string | null }>
): Promise<AwardCategoryDto | null> {
  const existing = await prisma.awardCategory.findFirst({ where: { id: categoryId, eventId } });
  if (!existing) return null;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.kind !== undefined) updateData.kind = data.kind;
  if (data.description !== undefined) updateData.description = data.description?.trim() ?? null;
  if (data.voteQuestion !== undefined) updateData.voteQuestion = data.voteQuestion?.trim() ?? null;
  if (data.voteRules !== undefined) updateData.voteRules = data.voteRules ?? Prisma.JsonNull;

  const updated = await prisma.awardCategory.update({
    where: { id: categoryId },
    data: updateData,
  });

  return {
    id: updated.id,
    name: updated.name,
    sortOrder: updated.sortOrder,
    isActive: updated.isActive,
    kind: updated.kind,
    description: updated.description,
    voteQuestion: updated.voteQuestion,
    voteRules: typeof updated.voteRules === "string" ? updated.voteRules : JSON.stringify(updated.voteRules),
  };
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
