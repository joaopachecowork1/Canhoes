import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/storage/localStorage";
import type { EventFeedPostFullDto, PagedResult } from "@/lib/api/types";
import { POST_SELECT, toFeedPosts } from "./feedPostLoader";

/*
 * Posts do feed ("mural"): a lista paginada, criar um post com imagens e sondagem, fixar e
 * apagar. As reações estão em `feedReactions.ts` e os comentários em `feedComments.ts`.
 */

/** Uma página do feed do evento para este utilizador: fixados primeiro, depois os mais recentes, com autor, contagens, reações do utilizador e resultados das sondagens. */
export async function getFeedPosts(
  eventId: string,
  userId: string,
  skip = 0,
  take = 15,
): Promise<PagedResult<EventFeedPostFullDto>> {
  const where = { eventId };

  // Fixados primeiro (pela sua ordem), depois os mais recentes.
  const [total, rows] = await Promise.all([
    prisma.hubPost.count({ where }),
    prisma.hubPost.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { pinnedOrder: "asc" }, { createdAtUtc: "desc" }],
      skip,
      take,
      select: POST_SELECT,
    }),
  ]);

  return { items: await toFeedPosts(rows, userId), total, skip, take, hasMore: skip + take < total };
}

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type CreateGatheringInPostArgs = {
  tx: PrismaTransaction;
  eventId: string;
  userId: string;
  postId: string;
  data: {
    gatheringTitle?: string | null;
    gatheringDescription?: string | null;
    gatheringLocation?: string | null;
    gatheringLocationAddress?: string | null;
    gatheringLatitude?: number | null;
    gatheringLongitude?: number | null;
    gatheringMapUrl?: string | null;
    gatheringPlaceId?: string | null;
    gatheringDates?: string[] | null;
  };
};

type GatheringData = CreateGatheringInPostArgs["data"];

function toGatheringCoordinates(data: GatheringData) {
  return {
    latitude: data.gatheringLatitude ?? null,
    longitude: data.gatheringLongitude ?? null,
  };
}

function toGatheringLocationData(data: GatheringData) {
  return {
    location: data.gatheringLocation?.trim() || null,
    locationAddress: data.gatheringLocationAddress?.trim() || null,
    mapUrl: data.gatheringMapUrl?.trim() || null,
    placeId: data.gatheringPlaceId?.trim() || null,
    ...toGatheringCoordinates(data),
  };
}

type GatheringCreateInput = {
  eventId: string;
  userId: string;
  postId: string;
  data: GatheringData;
  dates: string[];
};

function toGatheringCreateData({ eventId, userId, postId, data, dates }: GatheringCreateInput) {
  const hasDates = dates.length > 0;
  return {
    eventId,
    createdById: userId,
    title: data.gatheringTitle?.trim() || "",
    description: data.gatheringDescription?.trim() || null,
    status: (hasDates ? "POLLING" : "CONFIRMED") as "POLLING" | "CONFIRMED",
    postId,
    dateOptions: {
      create: dates.map((dateText, i) => ({ dateText: dateText.trim(), sortOrder: i })),
    },
    ...toGatheringLocationData(data),
  };
}

async function createGatheringInPost({ tx, eventId, userId, postId, data }: CreateGatheringInPostArgs) {
  if (!data.gatheringTitle?.trim()) return;
  const dates = (data.gatheringDates ?? []).filter((d) => d.trim().length > 0);
  await tx.eventGathering.create({
    data: toGatheringCreateData({ eventId, userId, postId, data, dates }),
  });
}

async function createPollInPost(
  tx: PrismaTransaction,
  postId: string,
  question?: string | null,
  options?: string[] | null,
) {
  if (!question) return;
  await tx.hubPostPoll.create({
    data: {
      postId,
      question: question.trim(),
      options: {
        create: (options ?? []).map((opt, i) => ({ text: opt.trim(), sortOrder: i })),
      },
    },
  });
}

async function linkMediaToPost(tx: PrismaTransaction, postId: string, userId: string, mediaUrls: string[]) {
  if (mediaUrls.length === 0) return;
  await tx.hubPostMedia.updateMany({
    where: { url: { in: mediaUrls }, uploadedByUserId: userId, postId: null },
    data: { postId },
  });
}

async function getGatheringPinOrder(tx: PrismaTransaction, eventId: string, isGathering: boolean) {
  if (!isGathering) return null;
  const lastPinned = await tx.hubPost.findFirst({
    where: { eventId, isPinned: true },
    orderBy: { pinnedOrder: "desc" },
    select: { pinnedOrder: true },
  });
  return (lastPinned?.pinnedOrder ?? -1) + 1;
}

/** Cria um post (e a sua sondagem ou encontro) e associa-lhe as imagens que o autor enviou. */
export async function createFeedPost(
  eventId: string,
  userId: string,
  data: {
    text: string;
    mediaUrl?: string | null;
    mediaUrls?: string[] | null;
    pollQuestion?: string | null;
    pollOptions?: string[] | null;
    gatheringTitle?: string | null;
    gatheringDescription?: string | null;
    gatheringLocation?: string | null;
    gatheringDates?: string[] | null;
  },
): Promise<EventFeedPostFullDto> {
  const post = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "Id" FROM "Events" WHERE "Id" = ${eventId} FOR UPDATE`;
    const { _max } = await tx.hubPost.aggregate({ where: { eventId }, _max: { number: true } });

    const isGathering = Boolean(data.gatheringTitle?.trim());
    const pinnedOrder = await getGatheringPinOrder(tx, eventId, isGathering);

    const p = await tx.hubPost.create({
      data: {
        number: (_max.number ?? 0) + 1,
        eventId,
        authorUserId: userId,
        text: data.text.trim(),
        mediaUrl: data.mediaUrl ?? null,
        mediaUrlsJson: data.mediaUrls ?? [],
        isPinned: isGathering,
        pinnedOrder,
      },
    });

    await createGatheringInPost({ tx, eventId, userId, postId: p.id, data });
    await createPollInPost(tx, p.id, data.pollQuestion, data.pollOptions);
    const mediaUrls = data.mediaUrls ?? (data.mediaUrl ? [data.mediaUrl] : []);
    await linkMediaToPost(tx, p.id, userId, mediaUrls);

    return p;
  });

  const [created] = await toFeedPosts([post], userId);
  return created;
}

/** Apaga um post deste evento e as suas imagens; false quando não existe. */
export async function deleteFeedPost(eventId: string, postId: string): Promise<boolean> {
  const post = await prisma.hubPost.findFirst({
    where: { id: postId, eventId },
    include: { media: { select: { url: true } } },
  });
  if (!post) return false;

  // Apaga primeiro o post e só depois os ficheiros, para nunca ficar um post a apontar para imagens que já não existem.
  await prisma.hubPost.delete({ where: { id: postId } });
  await Promise.all(post.media.map((media) => deleteUpload(media.url)));
  return true;
}

export { MAX_IMAGES_PER_POST, saveFeedImages } from "./feedMedia";
