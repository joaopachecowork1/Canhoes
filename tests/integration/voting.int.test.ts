import { describe, expect, it } from "vitest";

import { POST as propose } from "@/app/api/v1/events/[eventId]/proposals/route";
import { POST as castVote } from "@/app/api/v1/events/[eventId]/votes/route";
import { GET as getVotingBoard } from "@/app/api/v1/events/[eventId]/voting/route";
import type { EventVotingBoardDto } from "@/lib/api/types";
import { prisma } from "@/lib/prisma";

import { addMember, callRoute, createEvent, createMember, createUser, signInAs } from "./helpers";

async function setupBallot() {
  const event = await createEvent({ phase: "VOTING" });
  const ana = await createMember(event.id, "Ana");
  const rui = await createMember(event.id, "Rui");
  const boss = await createUser({ name: "Chefe" });
  await addMember(event.id, boss.id, "admin");
  const moment = await prisma.awardCategory.create({
    data: { eventId: event.id, name: "Momento", sortOrder: 1, kind: 0, isActive: true },
  });
  const person = await prisma.awardCategory.create({
    data: { eventId: event.id, name: "Membro do ano", sortOrder: 2, kind: 1, isActive: true },
  });
  await prisma.awardCategory.create({
    data: { eventId: event.id, name: "Antiga", sortOrder: 3, kind: 0, isActive: false },
  });
  const dinner = await prisma.nominee.create({
    data: {
      eventId: event.id,
      categoryId: moment.id,
      title: "O jantar",
      submissionKind: "nominees",
      submittedByUserId: ana.id,
      status: "approved",
    },
  });
  const pending = await prisma.nominee.create({
    data: {
      eventId: event.id,
      categoryId: moment.id,
      title: "Pendente",
      submissionKind: "nominees",
      submittedByUserId: ana.id,
      status: "pending",
    },
  });
  signInAs(ana);
  return { event, ana, rui, boss, moment, person, dinner, pending, params: { eventId: event.id } };
}

const vote = (eventId: string, categoryId: string, selectionId: string) =>
  callRoute(castVote, { eventId }, { method: "POST", body: { categoryId, selectionId } });

describe("voting board", () => {
  it("offers approved nominees and non-admin members of active categories", async () => {
    const { params } = await setupBallot();

    const board = (await callRoute(getVotingBoard, params)).body as EventVotingBoardDto;

    expect(board.canVote).toBe(true);
    expect(
      board.categories.map((category) => [category.title, category.options.map((option) => option.label)]),
    ).toEqual([
      ["Momento", ["O jantar"]],
      ["Membro do ano", ["Ana", "Rui"]],
    ]);
  });

  it("records and changes votes, and shows the current choice", async () => {
    const { params, moment, person, dinner, rui, ana } = await setupBallot();

    expect((await vote(params.eventId, moment.id, dinner.id)).status).toBe(200);
    expect((await vote(params.eventId, person.id, ana.id)).status).toBe(200);
    expect((await vote(params.eventId, person.id, rui.id)).status).toBe(200);

    const board = (await callRoute(getVotingBoard, params)).body as EventVotingBoardDto;
    expect(board.categories.map((category) => category.myOptionId)).toEqual([dinner.id, rui.id]);
    expect(await prisma.vote.count({ where: { targetUserId: { not: null } } })).toBe(1);
  });

  it("refuses options the board does not offer", async () => {
    const { params, moment, person, pending, boss } = await setupBallot();

    expect((await vote(params.eventId, moment.id, pending.id)).body).toMatchObject({ code: "INVALID_SELECTION" });
    expect((await vote(params.eventId, person.id, boss.id)).body).toMatchObject({ code: "INVALID_SELECTION" });
    expect((await vote(params.eventId, "missing", pending.id)).body).toMatchObject({ code: "CATEGORY_NOT_FOUND" });
  });

  it("refuses votes once the voting phase has ended", async () => {
    const { event, params, moment, dinner } = await setupBallot();
    await prisma.eventPhase.updateMany({
      where: { eventId: event.id, type: "VOTING" },
      data: { endDateUtc: new Date(Date.now() - 1000) },
    });

    expect(((await callRoute(getVotingBoard, params)).body as EventVotingBoardDto).canVote).toBe(false);
    expect((await vote(params.eventId, moment.id, dinner.id)).status).toBe(409);
  });
});

describe("category proposals", () => {
  it("records a trimmed proposal as pending", async () => {
    const event = await createEvent({ phase: "PROPOSALS" });
    signInAs(await createMember(event.id));

    const response = await callRoute(
      propose,
      { eventId: event.id },
      { method: "POST", body: { name: " Melhor sticker ", description: " O mais usado " } },
    );

    expect(response.body).toMatchObject({ name: "Melhor sticker", description: "O mais usado", status: "pending" });
    expect(await prisma.categoryProposal.findFirst({ select: { kind: true } })).toEqual({ kind: 0 });
  });
});
