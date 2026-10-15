import { describe, expect, it } from "vitest";

import { PUT as updateCategoryProposal } from "@/app/api/v1/events/[eventId]/admin/category-proposals/[proposalId]/route";
import { PUT as updateMeasureProposal } from "@/app/api/v1/events/[eventId]/admin/measure-proposals/[proposalId]/route";
import { PUT as updatePhase } from "@/app/api/v1/events/[eventId]/admin/phase/route";
import { POST as postVote } from "@/app/api/v1/events/[eventId]/votes/route";
import { prisma } from "@/lib/prisma";

import { callRoute, createMember, createUser, signInAs } from "./helpers";

/** An event as a fresh production database has it: the seed creates the PROPOSALS phase only. */
async function createSeededEvent() {
  const event = await prisma.event.create({ data: { name: "Canhões 2026", isActive: true } });
  await prisma.eventPhase.create({
    data: { eventId: event.id, type: "PROPOSALS", startDateUtc: new Date(), endDateUtc: new Date(Date.now() + 86_400_000), isActive: true },
  });
  await prisma.canhoesEventState.create({ data: { eventId: event.id, phase: "nominations", nominationsVisible: true, resultsVisible: false } });
  return event;
}

async function signInAsAdmin() {
  const admin = await createUser({ isAdmin: true });
  signInAs(admin);
  return admin;
}

describe("phase changes", () => {
  it("create a phase the event does not have yet, so members can vote on a fresh database", async () => {
    const event = await createSeededEvent();
    const member = await createMember(event.id, "Ana");
    const category = await prisma.awardCategory.create({ data: { eventId: event.id, name: "Momento", sortOrder: 1, kind: 0, isActive: true } });
    const nominee = await prisma.nominee.create({
      data: { eventId: event.id, categoryId: category.id, title: "O jantar", submissionKind: "nominees", submittedByUserId: member.id, status: "approved" },
    });

    await signInAsAdmin();
    const response = await callRoute(updatePhase, { eventId: event.id }, { method: "PUT", body: { phaseType: "VOTING" } });
    expect(response.status).toBe(200);
    const phases = await prisma.eventPhase.findMany({ where: { eventId: event.id }, select: { type: true, isActive: true } });
    expect(phases).toEqual(expect.arrayContaining([{ type: "PROPOSALS", isActive: false }, { type: "VOTING", isActive: true }]));

    signInAs(member);
    const vote = await callRoute(postVote, { eventId: event.id }, { method: "POST", body: { categoryId: category.id, selectionId: nominee.id } });
    expect(vote.status).toBe(200);
  });

  it("reuse the existing phase when it is opened again", async () => {
    const event = await createSeededEvent();
    await signInAsAdmin();
    for (const phaseType of ["VOTING", "PROPOSALS", "VOTING"]) {
      await callRoute(updatePhase, { eventId: event.id }, { method: "PUT", body: { phaseType } });
    }
    expect(await prisma.eventPhase.count({ where: { eventId: event.id } })).toBe(2);
    expect(await prisma.eventPhase.count({ where: { eventId: event.id, isActive: true } })).toBe(1);
  });

  it("reject unknown phase types", async () => {
    const event = await createSeededEvent();
    await signInAsAdmin();
    const response = await callRoute(updatePhase, { eventId: event.id }, { method: "PUT", body: { phaseType: "PARTY" } });
    expect(response.status).toBe(400);
    expect(await prisma.eventPhase.count({ where: { eventId: event.id } })).toBe(1);
  });
});

describe("approving proposals", () => {
  it("turns a measure proposal into one gala measure, even when approved twice", async () => {
    const event = await createSeededEvent();
    const member = await createMember(event.id);
    const proposal = await prisma.measureProposal.create({
      data: { eventId: event.id, text: "Quem chegar atrasado paga a primeira ronda", proposedByUserId: member.id, status: "pending" },
    });

    await signInAsAdmin();
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await callRoute(updateMeasureProposal, { eventId: event.id, proposalId: proposal.id }, { method: "PUT", body: { status: "approved" } });
      expect(response.status).toBe(200);
    }

    const measures = await prisma.galaMeasure.findMany({ where: { eventId: event.id } });
    expect(measures).toHaveLength(1);
    expect(measures[0]).toMatchObject({ text: "Quem chegar atrasado paga a primeira ronda", isActive: true });
  });

  it("creates one category for a category proposal, even when approved twice", async () => {
    const event = await createSeededEvent();
    const member = await createMember(event.id);
    const proposal = await prisma.categoryProposal.create({
      data: { eventId: event.id, name: "Melhor desculpa", proposedByUserId: member.id, status: "pending" },
    });

    await signInAsAdmin();
    for (let attempt = 0; attempt < 2; attempt++) {
      await callRoute(updateCategoryProposal, { eventId: event.id, proposalId: proposal.id }, { method: "PUT", body: { status: "approved" } });
    }

    expect(await prisma.awardCategory.count({ where: { eventId: event.id, name: "Melhor desculpa" } })).toBe(1);
  });
});
