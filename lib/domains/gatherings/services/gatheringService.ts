import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/api/httpError";
import { loadUsersById } from "@/lib/usersById";
import { PERSON_COLORS } from "@/lib/personColors";
import type {
  EventGatheringDto,
  EventGatheringRsvpDto,
  EventGatheringRsvpStatus,
  EventGatheringStatus,
} from "@/lib/api/types";

/** Carrega os dados detalhados de encontros e devolve mapa indexado por gatheringId. */
export async function loadGatheringsForPosts(
  postIds: string[],
  userId: string,
): Promise<Map<string, EventGatheringDto>> {
  if (postIds.length === 0) return new Map();

  const gatherings = await prisma.eventGathering.findMany({
    where: { postId: { in: postIds } },
    include: {
      dateOptions: {
        orderBy: { sortOrder: "asc" },
        include: { votes: true },
      },
      rsvps: true,
    },
  });

  if (gatherings.length === 0) return new Map();

  // Carrega utilizadores que deram RSVP
  const rsvpUserIds = [...new Set(gatherings.flatMap((g) => g.rsvps.map((r) => r.userId)))];
  const users = await loadUsersById(rsvpUserIds, (where) =>
    prisma.user.findMany({ where, select: { id: true, displayName: true, color: true } }),
  );

  const map = new Map<string, EventGatheringDto>();

  for (const g of gatherings) {
    const myRsvpRecord = g.rsvps.find((r) => r.userId === userId);

    const rsvps: EventGatheringRsvpDto[] = g.rsvps.map((r) => {
      const user = users.get(r.userId);
      return {
        userId: r.userId,
        userName: user?.displayName ?? "Membro",
        userColor: user?.color ?? PERSON_COLORS[0],
        status: r.status as EventGatheringRsvpStatus,
        note: r.note,
        updatedAtUtc: r.updatedAtUtc.toISOString(),
      };
    });

    const dateOptions = g.dateOptions.map((opt) => ({
      id: opt.id,
      dateText: opt.dateText,
      sortOrder: opt.sortOrder,
      voteCount: opt.votes.length,
      hasVoted: opt.votes.some((v) => v.userId === userId),
    }));

    const dto: EventGatheringDto = {
      id: g.id,
      eventId: g.eventId,
      title: g.title,
      description: g.description,
      location: g.location,
      status: g.status as EventGatheringStatus,
      confirmedDate: g.confirmedDate,
      postId: g.postId,
      createdAtUtc: g.createdAtUtc.toISOString(),
      dateOptions,
      rsvps,
      myRsvp: (myRsvpRecord?.status as EventGatheringRsvpStatus) ?? null,
      myRsvpNote: myRsvpRecord?.note ?? null,
    };

    if (g.postId) {
      map.set(g.postId, dto);
    }
  }

  return map;
}

/** Alterna a disponibilidade de um membro para uma opção de data (múltipla escolha). */
export async function toggleGatheringDateVote(
  gatheringId: string,
  optionId: string,
  userId: string,
): Promise<EventGatheringDto> {
  const gathering = await prisma.eventGathering.findUnique({
    where: { id: gatheringId },
    select: { id: true, status: true },
  });
  if (!gathering) throw notFound("Gathering not found");

  const option = await prisma.eventGatheringDateOption.findFirst({
    where: { id: optionId, gatheringId },
    select: { id: true },
  });
  if (!option) throw notFound("Date option not found");

  // Se já votou nesta opção, remove; se ainda não votou, adiciona
  const removed = await prisma.eventGatheringDateVote.deleteMany({
    where: { optionId, userId },
  });

  if (removed.count === 0) {
    await prisma.eventGatheringDateVote.create({
      data: {
        gatheringId,
        optionId,
        userId,
      },
    });
  }

  return getGatheringDetails(gatheringId, userId);
}

/** Confirma a data oficial do encontro e transita para o modo RSVP. */
export async function confirmGatheringDate(
  gatheringId: string,
  dateText: string,
  userId: string,
): Promise<EventGatheringDto> {
  const gathering = await prisma.eventGathering.findUnique({
    where: { id: gatheringId },
    select: { id: true },
  });
  if (!gathering) throw notFound("Gathering not found");

  await prisma.eventGathering.update({
    where: { id: gatheringId },
    data: {
      status: "CONFIRMED",
      confirmedDate: dateText.trim(),
    },
  });

  return getGatheringDetails(gatheringId, userId);
}

/** Submete ou atualiza o RSVP de um membro para o encontro. */
export async function submitGatheringRsvp(
  gatheringId: string,
  userId: string,
  status: EventGatheringRsvpStatus,
  note?: string | null,
): Promise<EventGatheringDto> {
  const gathering = await prisma.eventGathering.findUnique({
    where: { id: gatheringId },
    select: { id: true },
  });
  if (!gathering) throw notFound("Gathering not found");

  await prisma.eventGatheringRsvp.upsert({
    where: { gatheringId_userId: { gatheringId, userId } },
    create: {
      gatheringId,
      userId,
      status,
      note: note?.trim() || null,
    },
    update: {
      status,
      note: note?.trim() || null,
    },
  });

  return getGatheringDetails(gatheringId, userId);
}
