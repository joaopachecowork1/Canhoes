import { describe, expect, it } from "vitest";

import { POST as postProposal } from "@/app/api/v1/events/[eventId]/proposals/route";
import { GET as getResults } from "@/app/api/v1/events/[eventId]/results/route";
import { POST as postVote } from "@/app/api/v1/events/[eventId]/votes/route";
import { KindUserVote } from "@/lib/domains/admin/services/constants";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, createUser, signInAs, type PhaseType } from "./helpers";

async function createCategory(eventId: string, { kind = 0, name = "Melhor momento", sortOrder = 0 } = {}) {
  return prisma.awardCategory.create({ data: { eventId, name, sortOrder, kind, isActive: true } });
}

async function createNominee(eventId: string, categoryId: string, submittedByUserId: string, { status = "approved", title = "O jantar" } = {}) {
  return prisma.nominee.create({
    data: { eventId, categoryId, title, submissionKind: "text", imageUrl: `/uploads/${title}.png`, submittedByUserId, status },
  });
}

async function setupEvent(phase: PhaseType) {
  const event = await createEvent({ phase });
  const member = await createMember(event.id, "Ana");
  signInAs(member);
  return { event, member };
}

describe("category proposals", () => {
  it.each(["DRAW", "VOTING", "RESULTS"] as const)("are refused during %s", async (phase) => {
    const { event } = await setupEvent(phase);
    const response = await callRoute(postProposal, { eventId: event.id }, { method: "POST", body: { name: "Nova" } });
    expect(response).toMatchObject({ status: 409, body: { code: "PROPOSALS_CLOSED" } });
    expect(await prisma.categoryProposal.count()).toBe(0);
  });

  it("are accepted during PROPOSALS", async () => {
    const { event } = await setupEvent("PROPOSALS");
    const response = await callRoute(postProposal, { eventId: event.id }, { method: "POST", body: { name: "Nova" } });
    expect(response.status).toBe(200);
    expect(await prisma.categoryProposal.count()).toBe(1);
  });

  it("are refused when the admin hid nominations", async () => {
    const event = await createEvent({ phase: "PROPOSALS", nominationsVisible: false });
    signInAs(await createMember(event.id));
    const response = await callRoute(postProposal, { eventId: event.id }, { method: "POST", body: { name: "Nova" } });
    expect(response.status).toBe(409);
  });
});

describe("votes", () => {
  it.each(["DRAW", "PROPOSALS", "RESULTS"] as const)("are refused during %s", async (phase) => {
    const { event, member } = await setupEvent(phase);
    const category = await createCategory(event.id);
    const nominee = await createNominee(event.id, category.id, member.id);
    const response = await callRoute(postVote, { eventId: event.id }, { method: "POST", body: { categoryId: category.id, selectionId: nominee.id } });
    expect(response.status).toBe(403);
    expect(await prisma.vote.count()).toBe(0);
  });

  it("are refused once the voting window has ended", async () => {
    const { event, member } = await setupEvent("VOTING");
    await prisma.eventPhase.updateMany({ where: { eventId: event.id, type: "VOTING" }, data: { endDateUtc: new Date(Date.now() - 1000) } });
    const category = await createCategory(event.id);
    const nominee = await createNominee(event.id, category.id, member.id);
    const response = await callRoute(postVote, { eventId: event.id }, { method: "POST", body: { categoryId: category.id, selectionId: nominee.id } });
    expect(response).toMatchObject({ status: 409, body: { code: "VOTING_CLOSED" } });
  });

  it("count once per member and category, the last choice wins", async () => {
    const { event, member } = await setupEvent("VOTING");
    const category = await createCategory(event.id);
    const first = await createNominee(event.id, category.id, member.id, { title: "Primeiro" });
    const second = await createNominee(event.id, category.id, member.id, { title: "Segundo" });

    for (const nominee of [first, second]) {
      const response = await callRoute(postVote, { eventId: event.id }, { method: "POST", body: { categoryId: category.id, selectionId: nominee.id } });
      expect(response.status).toBe(200);
    }
    expect(await prisma.vote.findMany({ select: { nomineeId: true } })).toEqual([{ nomineeId: second.id }]);
  });

  it("reject nominees that are pending, from another category or from another event", async () => {
    const { event, member } = await setupEvent("VOTING");
    const category = await createCategory(event.id);
    const otherCategory = await createCategory(event.id, { name: "Outra" });
    const otherEvent = await createEvent({ phase: "VOTING" });
    const otherEventCategory = await createCategory(otherEvent.id);
    const invalid = [
      await createNominee(event.id, category.id, member.id, { status: "pending" }),
      await createNominee(event.id, otherCategory.id, member.id),
      await createNominee(otherEvent.id, otherEventCategory.id, member.id),
    ];

    for (const nominee of invalid) {
      const response = await callRoute(postVote, { eventId: event.id }, { method: "POST", body: { categoryId: category.id, selectionId: nominee.id } });
      expect(response).toMatchObject({ status: 400, body: { code: "INVALID_SELECTION" } });
    }
    const crossEvent = await callRoute(postVote, { eventId: event.id }, { method: "POST", body: { categoryId: otherEventCategory.id, selectionId: invalid[2].id } });
    expect(crossEvent).toMatchObject({ status: 404, body: { code: "CATEGORY_NOT_FOUND" } });
    expect(await prisma.vote.count()).toBe(0);
  });

  it("in person categories only accept members of the event", async () => {
    const { event } = await setupEvent("VOTING");
    const category = await createCategory(event.id, { kind: KindUserVote });
    const colleague = await createMember(event.id, "Bruno");
    const outsider = await createUser();

    const refused = await callRoute(postVote, { eventId: event.id }, { method: "POST", body: { categoryId: category.id, selectionId: outsider.id } });
    expect(refused.status).toBe(400);
    const accepted = await callRoute(postVote, { eventId: event.id }, { method: "POST", body: { categoryId: category.id, selectionId: colleague.id } });
    expect(accepted.status).toBe(200);
    expect(await prisma.userVote.count()).toBe(1);
  });
});

describe("results", () => {
  it("stay hidden from members until RESULTS", async () => {
    const { event } = await setupEvent("VOTING");
    expect((await callRoute(getResults, { eventId: event.id })).status).toBe(403);
  });

  it("show nominee titles, images and vote counts, and member names", async () => {
    const { event, member } = await setupEvent("RESULTS");
    const nomineeCategory = await createCategory(event.id);
    const personCategory = await createCategory(event.id, { kind: KindUserVote, name: "Pessoa do ano", sortOrder: 1 });
    const winner = await createNominee(event.id, nomineeCategory.id, member.id, { title: "Vencedor" });
    const bruno = await createMember(event.id, "Bruno");
    await prisma.vote.createMany({
      data: [member.id, bruno.id].map((userId) => ({ eventId: event.id, categoryId: nomineeCategory.id, userId, nomineeId: winner.id })),
    });
    await prisma.userVote.create({ data: { eventId: event.id, categoryId: personCategory.id, voterUserId: member.id, targetUserId: bruno.id } });

    const response = await callRoute(getResults, { eventId: event.id });

    expect(response).toEqual({
      status: 200,
      body: [
        {
          categoryId: nomineeCategory.id,
          categoryName: "Melhor momento",
          totalVotes: 2,
          top: [{ nomineeId: winner.id, title: "Vencedor", imageUrl: "/uploads/Vencedor.png", voteCount: 2 }],
        },
        {
          categoryId: personCategory.id,
          categoryName: "Pessoa do ano",
          totalVotes: 1,
          top: [{ nomineeId: bruno.id, title: "Bruno", imageUrl: null, voteCount: 1 }],
        },
      ],
    });
  });
});
