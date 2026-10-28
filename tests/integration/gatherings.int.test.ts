import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { POST as confirmDate } from "@/app/api/v1/events/[eventId]/gatherings/[gatheringId]/confirm-date/route";
import { POST as submitRsvp } from "@/app/api/v1/events/[eventId]/gatherings/[gatheringId]/rsvp/route";
import { POST as voteDate } from "@/app/api/v1/events/[eventId]/gatherings/[gatheringId]/vote-date/route";
import { GET as getPosts } from "@/app/api/v1/events/[eventId]/feed/posts/route";
import type { EventFeedPostFullDto, EventGatheringDto, PagedResult } from "@/lib/api/types";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, createUser, signInAs } from "./helpers";

type Params = { eventId: string; gatheringId: string };

/** Cria um encontro do evento com duas datas candidatas, opcionalmente ligado a um post do mural. */
async function createGathering(eventId: string, createdById: string, { withPost = false } = {}) {
  const post = withPost
    ? await prisma.hubPost.create({ data: { eventId, authorUserId: createdById, text: "Jantar?", isPinned: false } })
    : null;
  const gathering = await prisma.eventGathering.create({
    data: {
      eventId,
      createdById,
      title: "Jantar de Natal",
      postId: post?.id ?? null,
      dateOptions: {
        create: [
          { dateText: "Sexta 12", sortOrder: 0 },
          { dateText: "Sábado 13", sortOrder: 1 },
        ],
      },
    },
    include: { dateOptions: { orderBy: { sortOrder: "asc" } } },
  });
  return { gathering, post, friday: gathering.dateOptions[0]!, saturday: gathering.dateOptions[1]! };
}

const vote = (params: Params, optionId: string) => callRoute(voteDate, params, { method: "POST", body: { optionId } });
const rsvp = (params: Params, body: unknown) => callRoute(submitRsvp, params, { method: "POST", body });

describe("voting on the dates of a gathering", () => {
  it("adds the vote on the first tap and takes it back on the second", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    const { gathering, friday } = await createGathering(event.id, member.id);
    signInAs(member);
    const params = { eventId: event.id, gatheringId: gathering.id };

    const first = (await vote(params, friday.id)).body as EventGatheringDto;
    expect(first.dateOptions[0]).toMatchObject({ voteCount: 1, hasVoted: true });

    const second = (await vote(params, friday.id)).body as EventGatheringDto;
    expect(second.dateOptions[0]).toMatchObject({ voteCount: 0, hasVoted: false });
  });

  it("counts every member's votes but only marks the one that is mine", async () => {
    const event = await createEvent();
    const ana = await createMember(event.id);
    const rui = await createMember(event.id);
    const { gathering, friday, saturday } = await createGathering(event.id, ana.id);
    const params = { eventId: event.id, gatheringId: gathering.id };

    signInAs(ana);
    await vote(params, friday.id);
    await vote(params, saturday.id);
    signInAs(rui);
    const seenByRui = (await vote(params, friday.id)).body as EventGatheringDto;

    expect(seenByRui.dateOptions.map(({ voteCount, hasVoted }) => [voteCount, hasVoted])).toEqual([
      [2, true],
      [1, false],
    ]);
  });

  it("answers 404 for a date that is not one of the gathering's, and for a gathering that does not exist", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    const { gathering } = await createGathering(event.id, member.id);
    const { friday: foreignOption } = await createGathering(event.id, member.id);
    signInAs(member);
    const params = { eventId: event.id, gatheringId: gathering.id };

    expect((await vote(params, foreignOption.id)).status).toBe(404);
    expect((await vote({ ...params, gatheringId: randomUUID() }, foreignOption.id)).status).toBe(404);
  });
});

describe("answering whether I am going", () => {
  it("records the answer with a trimmed note and shows who answered", async () => {
    const event = await createEvent();
    const member = await createMember(event.id, "Ana");
    const { gathering } = await createGathering(event.id, member.id);
    signInAs(member);

    const { status, body } = await rsvp(
      { eventId: event.id, gatheringId: gathering.id },
      { status: "GOING", note: "  levo a sobremesa  " },
    );

    const result = body as EventGatheringDto;
    expect(status).toBe(200);
    expect(result).toMatchObject({ myRsvp: "GOING", myRsvpNote: "levo a sobremesa" });
    expect(result.rsvps.map(({ userName, status: answer }) => [userName, answer])).toEqual([["Ana", "GOING"]]);
  });

  it("changes the previous answer instead of adding another, and an empty note clears it", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    const { gathering } = await createGathering(event.id, member.id);
    signInAs(member);
    const params = { eventId: event.id, gatheringId: gathering.id };

    await rsvp(params, { status: "GOING", note: "talvez" });
    const changed = (await rsvp(params, { status: "MAYBE", note: "   " })).body as EventGatheringDto;

    expect(changed).toMatchObject({ myRsvp: "MAYBE", myRsvpNote: null });
    expect(changed.rsvps).toHaveLength(1);
  });

  it("names a member without a display name as a generic member", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    await prisma.user.update({ where: { id: member.id }, data: { displayName: null } });
    const { gathering } = await createGathering(event.id, member.id);
    signInAs(member);

    const { body } = await rsvp({ eventId: event.id, gatheringId: gathering.id }, { status: "NOT_GOING" });

    expect((body as EventGatheringDto).rsvps[0]?.userName).toBe("Membro");
  });

  it("answers 404 for a gathering that does not exist", async () => {
    const event = await createEvent();
    signInAs(await createMember(event.id));

    expect((await rsvp({ eventId: event.id, gatheringId: randomUUID() }, { status: "GOING" })).status).toBe(404);
  });
});

describe("confirming the date", () => {
  it("lets an admin confirm it, which turns the gathering into a confirmed one", async () => {
    const event = await createEvent();
    const admin = await createUser({ isAdmin: true });
    const { gathering } = await createGathering(event.id, admin.id);
    signInAs(admin);

    const { status, body } = await callRoute(
      confirmDate,
      { eventId: event.id, gatheringId: gathering.id },
      { method: "POST", body: { dateText: "  Sábado 13 às 20h  " } },
    );

    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "CONFIRMED", confirmedDate: "Sábado 13 às 20h" });
  });

  it("does not let an ordinary member confirm it", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    const { gathering } = await createGathering(event.id, member.id);
    signInAs(member);

    const { status } = await callRoute(
      confirmDate,
      { eventId: event.id, gatheringId: gathering.id },
      { method: "POST", body: { dateText: "Sábado" } },
    );

    expect(status).toBe(403);
    expect((await prisma.eventGathering.findUniqueOrThrow({ where: { id: gathering.id } })).status).toBe("POLLING");
  });

  it("answers 404 for a gathering that does not exist", async () => {
    const event = await createEvent();
    signInAs(await createUser({ isAdmin: true }));

    const { status } = await callRoute(
      confirmDate,
      { eventId: event.id, gatheringId: randomUUID() },
      { method: "POST", body: { dateText: "Sábado" } },
    );

    expect(status).toBe(404);
  });
});

describe("a gathering of another event", () => {
  it("cannot be reached by using one's own event in the URL", async () => {
    const event = await createEvent();
    const otherEvent = await createEvent();
    const member = await createMember(event.id);
    const admin = await createUser({ isAdmin: true });
    const { gathering, friday } = await createGathering(otherEvent.id, admin.id);
    const params = { eventId: event.id, gatheringId: gathering.id };

    signInAs(member);
    expect((await vote(params, friday.id)).status).toBe(404);
    expect((await rsvp(params, { status: "GOING" })).status).toBe(404);
    signInAs(admin);
    const confirmed = await callRoute(confirmDate, params, { method: "POST", body: { dateText: "Sábado" } });
    expect(confirmed.status).toBe(404);

    expect(await prisma.eventGatheringDateVote.count()).toBe(0);
    expect(await prisma.eventGatheringRsvp.count()).toBe(0);
    expect((await prisma.eventGathering.findUniqueOrThrow({ where: { id: gathering.id } })).status).toBe("POLLING");
  });
});

describe("a gathering in the mural", () => {
  it("comes with the post, with my answer and the votes on each date", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    const { gathering, post, saturday } = await createGathering(event.id, member.id, { withPost: true });
    signInAs(member);
    const params = { eventId: event.id, gatheringId: gathering.id };
    await vote(params, saturday.id);
    await rsvp(params, { status: "GOING" });

    const { body } = await callRoute(getPosts, { eventId: event.id });

    const page = body as PagedResult<EventFeedPostFullDto>;
    const shown = page.items.find((item) => item.id === post!.id);
    expect(shown?.gathering).toMatchObject({ id: gathering.id, title: "Jantar de Natal", myRsvp: "GOING" });
    expect(shown?.gathering?.dateOptions.map(({ voteCount }) => voteCount)).toEqual([0, 1]);
  });
});
