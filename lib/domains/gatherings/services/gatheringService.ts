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
      locationAddress: g.locationAddress,
      latitude: g.latitude,
      longitude: g.longitude,
      mapUrl: g.mapUrl,
      placeId: g.placeId,
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

/** Obtém os detalhes completos de um encontro pelo seu ID. */
async function getGatheringDetails(gatheringId: string, userId: string): Promise<EventGatheringDto> {
  const gathering = await prisma.eventGathering.findUnique({
    where: { id: gatheringId },
    include: {
      dateOptions: {
        orderBy: { sortOrder: "asc" },
        include: { votes: true },
      },
      rsvps: true,
    },
  });

  if (!gathering) throw notFound("Gathering not found");

  const rsvpUserIds = [...new Set(gathering.rsvps.map((r) => r.userId))];
  const users = await loadUsersById(rsvpUserIds, (where) =>
    prisma.user.findMany({ where, select: { id: true, displayName: true, color: true } }),
  );

  const myRsvpRecord = gathering.rsvps.find((r) => r.userId === userId);

  return {
    id: gathering.id,
    eventId: gathering.eventId,
    title: gathering.title,
    description: gathering.description,
    location: gathering.location,
    locationAddress: gathering.locationAddress,
    latitude: gathering.latitude,
    longitude: gathering.longitude,
    mapUrl: gathering.mapUrl,
    placeId: gathering.placeId,
    status: gathering.status as EventGatheringStatus,
    confirmedDate: gathering.confirmedDate,
    postId: gathering.postId,
    createdAtUtc: gathering.createdAtUtc.toISOString(),
    dateOptions: gathering.dateOptions.map((opt) => ({
      id: opt.id,
      dateText: opt.dateText,
      sortOrder: opt.sortOrder,
      voteCount: opt.votes.length,
      hasVoted: opt.votes.some((v) => v.userId === userId),
    })),
    rsvps: gathering.rsvps.map((r) => {
      const user = users.get(r.userId);
      return {
        userId: r.userId,
        userName: user?.displayName ?? "Membro",
        userColor: user?.color ?? PERSON_COLORS[0],
        status: r.status as EventGatheringRsvpStatus,
        note: r.note,
        updatedAtUtc: r.updatedAtUtc.toISOString(),
      };
    }),
    myRsvp: (myRsvpRecord?.status as EventGatheringRsvpStatus) ?? null,
    myRsvpNote: myRsvpRecord?.note ?? null,
  };
}

/** Um encontro dentro do evento a que o pedido diz pertencer; procurá-lo pelos dois impede de mexer num encontro de outro evento. */
type GatheringRef = { eventId: string; gatheringId: string };

/** Garante que o encontro existe dentro do evento; um encontro de outro evento conta como inexistente. */
async function assertGatheringInEvent({ eventId, gatheringId }: GatheringRef) {
  const gathering = await prisma.eventGathering.findFirst({
    where: { id: gatheringId, eventId },
    select: { id: true },
  });
  if (!gathering) throw notFound("Gathering not found");
}

/** Alterna a disponibilidade de um membro para uma opção de data (múltipla escolha). */
export async function toggleGatheringDateVote(
  ref: GatheringRef,
  optionId: string,
  userId: string,
): Promise<EventGatheringDto> {
  await assertGatheringInEvent(ref);
  const { gatheringId } = ref;

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
    // Um P2002 (violação de unicidade) é um duplo toque em simultâneo: já está feito, ignora-se.
    try {
      await prisma.eventGatheringDateVote.create({
        data: {
          gatheringId,
          optionId,
          userId,
        },
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }

  return getGatheringDetails(gatheringId, userId);
}

/** Confirma a data oficial do encontro e transita para o modo RSVP. */
export async function confirmGatheringDate(
  ref: GatheringRef,
  dateText: string,
  userId: string,
): Promise<EventGatheringDto> {
  await assertGatheringInEvent(ref);
  const { gatheringId } = ref;

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
  ref: GatheringRef,
  userId: string,
  status: EventGatheringRsvpStatus,
  note?: string | null,
): Promise<EventGatheringDto> {
  await assertGatheringInEvent(ref);
  const { gatheringId } = ref;

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
