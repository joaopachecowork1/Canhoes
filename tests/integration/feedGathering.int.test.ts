import { describe, expect, it } from "vitest";

import { POST as createPost } from "@/app/api/v1/events/[eventId]/feed/posts/route";
import type { EventFeedPostFullDto } from "@/lib/api/types";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, signInAs } from "./helpers";

/** Publica um post como um membro do evento e devolve a resposta. */
async function publish(eventId: string, body: Record<string, unknown>) {
  return callRoute(createPost, { eventId }, { method: "POST", body: { text: "Jantar?", ...body } });
}

async function memberOf(eventId: string) {
  const member = await createMember(eventId);
  signInAs(member);
  return member;
}

describe("a post with a gathering", () => {
  it("opens a poll on the dates, tidies the place and pins the post", async () => {
    const event = await createEvent();
    await memberOf(event.id);

    const { status, body } = await publish(event.id, {
      gatheringTitle: "  Jantar de Natal  ",
      gatheringDescription: "  Cada um leva uma sobremesa  ",
      gatheringLocation: "  Taberna do Zé ",
      gatheringLocationAddress: " Rua A, 1 ",
      gatheringLatitude: 38.7,
      gatheringLongitude: -9.1,
      gatheringMapUrl: " https://maps.example.test/x ",
      gatheringPlaceId: " place-1 ",
      gatheringDates: ["Sexta 12", "Sábado 13"],
    });

    const post = body as EventFeedPostFullDto;
    expect(status).toBe(201);
    expect(post.isPinned).toBe(true);
    const gathering = await prisma.eventGathering.findFirstOrThrow({
      where: { postId: post.id },
      include: { dateOptions: { orderBy: { sortOrder: "asc" } } },
    });
    expect(gathering).toMatchObject({
      title: "Jantar de Natal",
      description: "Cada um leva uma sobremesa",
      status: "POLLING",
      location: "Taberna do Zé",
      locationAddress: "Rua A, 1",
      latitude: 38.7,
      longitude: -9.1,
      mapUrl: "https://maps.example.test/x",
      placeId: "place-1",
    });
    expect(gathering.dateOptions.map(({ dateText }) => dateText)).toEqual(["Sexta 12", "Sábado 13"]);
  });

  it("is already confirmed when it comes without dates to vote on", async () => {
    const event = await createEvent();
    await memberOf(event.id);

    const { body } = await publish(event.id, { gatheringTitle: "Jantar", gatheringDates: [] });

    const gathering = await prisma.eventGathering.findFirstOrThrow({
      where: { postId: (body as EventFeedPostFullDto).id },
    });
    expect(gathering).toMatchObject({ status: "CONFIRMED", location: null, mapUrl: null, latitude: null });
  });

  it("pins each new gathering after the ones already pinned", async () => {
    const event = await createEvent();
    await memberOf(event.id);

    const first = (await publish(event.id, { gatheringTitle: "Um" })).body as EventFeedPostFullDto;
    const second = (await publish(event.id, { gatheringTitle: "Dois" })).body as EventFeedPostFullDto;

    const orders = await prisma.hubPost.findMany({
      where: { id: { in: [first.id, second.id] } },
      orderBy: { number: "asc" },
    });
    expect(orders.map(({ pinnedOrder }) => pinnedOrder)).toEqual([0, 1]);
  });

  it("is just an ordinary post, not pinned, when the title is blank", async () => {
    const event = await createEvent();
    await memberOf(event.id);

    const { body } = await publish(event.id, { gatheringTitle: "   ", gatheringDates: ["Sexta"] });

    expect((body as EventFeedPostFullDto).isPinned).toBe(false);
    expect(await prisma.eventGathering.count()).toBe(0);
  });
});
