import { describe, expect, it } from "vitest";

import { PUT as activateEvent } from "@/app/api/v1/events/[eventId]/admin/activate/route";
import { GET as getBootstrap } from "@/app/api/v1/events/[eventId]/admin/bootstrap/route";
import { DELETE as deleteCategory, PUT as updateCategory } from "@/app/api/v1/events/[eventId]/admin/categories/[categoryId]/route";
import { GET as getCategories, POST as createCategory } from "@/app/api/v1/events/[eventId]/admin/categories/route";
import { DELETE as deleteCategoryProposal, PUT as updateCategoryProposal } from "@/app/api/v1/events/[eventId]/admin/category-proposals/[proposalId]/route";
import { GET as getCategoryProposals } from "@/app/api/v1/events/[eventId]/admin/category-proposals/route";
import { DELETE as deleteMeasureProposal, PUT as updateMeasureProposal } from "@/app/api/v1/events/[eventId]/admin/measure-proposals/[proposalId]/route";
import { GET as getMeasureProposals } from "@/app/api/v1/events/[eventId]/admin/measure-proposals/route";
import { PATCH as setRole } from "@/app/api/v1/events/[eventId]/admin/members/[userId]/role/route";
import { GET as getMembers } from "@/app/api/v1/events/[eventId]/admin/members/paged/route";
import { POST as approveNomination } from "@/app/api/v1/events/[eventId]/admin/nominations/[nomineeId]/approve/route";
import { POST as rejectNomination } from "@/app/api/v1/events/[eventId]/admin/nominations/[nomineeId]/reject/route";
import { POST as setNominationCategory } from "@/app/api/v1/events/[eventId]/admin/nominations/[nomineeId]/set-category/route";
import { GET as getNominations } from "@/app/api/v1/events/[eventId]/admin/nominations/paged/route";
import { PUT as updatePhase } from "@/app/api/v1/events/[eventId]/admin/phase/route";
import { GET as getOfficialResults } from "@/app/api/v1/events/[eventId]/admin/official-results/paged/route";
import { PUT as updateState } from "@/app/api/v1/events/[eventId]/admin/state/route";
import { GET as getVotes } from "@/app/api/v1/events/[eventId]/admin/votes/paged/route";
import type {
  AdminNomineesPagedDto,
  AdminVotesPagedDto,
  AwardCategoryDto,
  EventAdminBootstrapDto,
  EventAdminStateDto,
  PagedResult,
  AdminCategoryResultDto,
  PublicUserDto,
} from "@/lib/api/types";
import { prisma } from "@/lib/prisma";

import { addMember, callRoute, createEvent, createMember, createUser, signInAs } from "./helpers";

async function setupAdmin() {
  const event = await createEvent();
  const admin = await createUser({ isAdmin: true, name: "Admin" });
  await addMember(event.id, admin.id, "admin");
  signInAs(admin);
  return { event, admin, params: { eventId: event.id } };
}

function createNominee(eventId: string, submittedByUserId: string, title: string, categoryId: string | null = null) {
  return prisma.nominee.create({ data: { eventId, categoryId, title, submissionKind: "nominees", submittedByUserId, status: "pending" } });
}

describe("admin categories", () => {
  it("creates categories at the end of the list, edits them and lists them in order", async () => {
    const { params } = await setupAdmin();

    const first = (await callRoute(createCategory, params, { method: "POST", body: { name: " Momento " } })).body as AwardCategoryDto;
    const second = (await callRoute(createCategory, params, { method: "POST", body: { name: "Membro", kind: 1, description: " Quem? " } })).body as AwardCategoryDto;
    expect([first.sortOrder, second.sortOrder]).toEqual([1, 2]);
    expect(second).toMatchObject({ name: "Membro", kind: 1, description: "Quem?", isActive: true });

    const updated = await callRoute(updateCategory, { ...params, categoryId: second.id }, { method: "PUT", body: { sortOrder: 0, isActive: false, voteQuestion: " Quem? " } });
    expect(updated.body).toMatchObject({ sortOrder: 0, isActive: false, voteQuestion: "Quem?" });

    const list = (await callRoute(getCategories, params)).body as AwardCategoryDto[];
    expect(list.map((category) => category.name)).toEqual(["Membro", "Momento"]);
  });

  it("refuses to delete a category with nominations, and answers 404 for another event's", async () => {
    const { event, admin, params } = await setupAdmin();
    const category = (await callRoute(createCategory, params, { method: "POST", body: { name: "Momento" } })).body as AwardCategoryDto;
    const empty = (await callRoute(createCategory, params, { method: "POST", body: { name: "Vazia" } })).body as AwardCategoryDto;
    await createNominee(event.id, admin.id, "O jantar", category.id);
    const otherEvent = await createEvent();

    expect((await callRoute(deleteCategory, { ...params, categoryId: category.id }, { method: "DELETE" })).status).toBe(409);
    expect((await callRoute(deleteCategory, { ...params, categoryId: empty.id }, { method: "DELETE" })).status).toBe(204);
    expect((await callRoute(updateCategory, { eventId: otherEvent.id, categoryId: category.id }, { method: "PUT", body: { name: "X" } })).status).toBe(404);
  });
});

describe("admin nominations", () => {
  it("lists nominations with the submitter, then approves, rejects and moves them", async () => {
    const { event, params } = await setupAdmin();
    const ana = await createMember(event.id, "Ana");
    const category = await prisma.awardCategory.create({ data: { eventId: event.id, name: "Momento", sortOrder: 1, kind: 0, isActive: true } });
    const dinner = await createNominee(event.id, ana.id, "O jantar");
    const trip = await createNominee(event.id, ana.id, "A viagem");

    const list = (await callRoute(getNominations, params)).body as AdminNomineesPagedDto;
    expect(list).toMatchObject({ total: 2, hasMore: false });
    expect(list.nominations.every((nominee) => nominee.submittedByName === "Ana")).toBe(true);

    expect((await callRoute(approveNomination, { ...params, nomineeId: dinner.id }, { method: "POST" })).body).toMatchObject({ status: "approved" });
    expect((await callRoute(rejectNomination, { ...params, nomineeId: trip.id }, { method: "POST" })).body).toMatchObject({ status: "rejected" });
    const moved = await callRoute(setNominationCategory, { ...params, nomineeId: dinner.id }, { method: "POST", body: { categoryId: category.id } });
    expect(moved.body).toMatchObject({ categoryId: category.id });

    expect((await callRoute(approveNomination, { ...params, nomineeId: "missing" }, { method: "POST" })).status).toBe(404);
  });
});

describe("admin proposals", () => {
  it("approving a category proposal creates the category once", async () => {
    const { event, params } = await setupAdmin();
    const ana = await createMember(event.id, "Ana");
    const proposal = await prisma.categoryProposal.create({ data: { eventId: event.id, name: "Melhor sticker", kind: 0, proposedByUserId: ana.id, status: "pending" } });
    const proposalParams = { ...params, proposalId: proposal.id };

    const list = (await callRoute(getCategoryProposals, params)).body as PagedResult<{ name: string }>;
    expect(list.items.map((item) => item.name)).toEqual(["Melhor sticker"]);

    await callRoute(updateCategoryProposal, proposalParams, { method: "PUT", body: { name: "Sticker do ano", status: "approved" } });
    await callRoute(updateCategoryProposal, proposalParams, { method: "PUT", body: { status: "approved" } });
    expect(await prisma.awardCategory.findMany({ where: { eventId: event.id }, select: { name: true } })).toEqual([{ name: "Sticker do ano" }]);

    expect((await callRoute(deleteCategoryProposal, proposalParams, { method: "DELETE" })).status).toBe(204);
    expect((await callRoute(deleteCategoryProposal, proposalParams, { method: "DELETE" })).status).toBe(404);
  });

  it("edits or rejects proposals without creating anything, and answers 404 for unknown ones", async () => {
    const { event, params } = await setupAdmin();
    const ana = await createMember(event.id, "Ana");
    const category = await prisma.categoryProposal.create({ data: { eventId: event.id, name: "Sticker", kind: 0, proposedByUserId: ana.id, status: "pending" } });
    const measure = await prisma.measureProposal.create({ data: { eventId: event.id, text: "Paga", proposedByUserId: ana.id, status: "pending" } });

    const rejected = await callRoute(updateCategoryProposal, { ...params, proposalId: category.id }, { method: "PUT", body: { description: " Repetida ", status: "rejected" } });
    expect(rejected.body).toMatchObject({ status: "rejected", description: "Repetida" });
    const edited = await callRoute(updateMeasureProposal, { ...params, proposalId: measure.id }, { method: "PUT", body: { text: " Quem perder paga " } });
    expect(edited.body).toMatchObject({ text: "Quem perder paga", status: "pending" });

    expect(await prisma.awardCategory.count()).toBe(0);
    expect(await prisma.galaMeasure.count()).toBe(0);
    for (const handler of [updateCategoryProposal, updateMeasureProposal]) {
      expect((await callRoute(handler, { ...params, proposalId: "missing" }, { method: "PUT", body: {} })).status).toBe(404);
    }
    expect((await callRoute(deleteMeasureProposal, { ...params, proposalId: "missing" }, { method: "DELETE" })).status).toBe(404);
  });

  it("lists and deletes measure proposals", async () => {
    const { event, params } = await setupAdmin();
    const ana = await createMember(event.id, "Ana");
    const proposal = await prisma.measureProposal.create({ data: { eventId: event.id, text: "Quem perder paga", proposedByUserId: ana.id, status: "pending" } });

    const list = (await callRoute(getMeasureProposals, params)).body as PagedResult<{ text: string }>;
    expect(list.items.map((item) => item.text)).toEqual(["Quem perder paga"]);
    expect((await callRoute(deleteMeasureProposal, { ...params, proposalId: proposal.id }, { method: "DELETE" })).status).toBe(204);
  });
});

describe("admin members", () => {
  it("lists admins first, then by name, and promotes a member", async () => {
    const { event, params } = await setupAdmin();
    const rui = await createMember(event.id, "Rui");
    await createMember(event.id, "Ana");

    const list = (await callRoute(getMembers, params)).body as PagedResult<PublicUserDto>;
    expect(list.items.map((member) => member.displayName)).toEqual(["Admin", "Ana", "Rui"]);

    const promoted = await callRoute(setRole, { ...params, userId: rui.id }, { method: "PATCH", body: { isAdmin: true } });
    expect(promoted.body).toEqual({ user: { id: rui.id, isAdmin: true } });
  });

  it("refuses to change the role of someone outside the event", async () => {
    const { params } = await setupAdmin();
    const outsider = await createUser({ name: "Fora" });

    const response = await callRoute(setRole, { ...params, userId: outsider.id }, { method: "PATCH", body: { isAdmin: true } });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await prisma.user.findUnique({ where: { id: outsider.id }, select: { isAdmin: true } })).toEqual({ isAdmin: false });
  });
});

describe("admin votes and results", () => {
  it("shows each nominee vote with names, newest first", async () => {
    const { event, params } = await setupAdmin();
    const ana = await createMember(event.id, "Ana");
    const category = await prisma.awardCategory.create({ data: { eventId: event.id, name: "Momento", sortOrder: 1, kind: 0, isActive: true } });
    const nominee = await createNominee(event.id, ana.id, "O jantar", category.id);
    await prisma.vote.create({ data: { eventId: event.id, categoryId: category.id, nomineeId: nominee.id, userId: ana.id } });

    const votes = (await callRoute(getVotes, params)).body as AdminVotesPagedDto;
    expect(votes).toMatchObject({ total: 1, votes: [{ categoryName: "Momento", nomineeName: "O jantar", userName: "Ana" }] });
  });

  it("answers an empty page without votes", async () => {
    const { params } = await setupAdmin();
    expect((await callRoute(getVotes, params)).body).toMatchObject({ total: 0, votes: [], hasMore: false });
  });

  it("tallies member votes per category, most voted first, with the participation rate", async () => {
    const { event, admin, params } = await setupAdmin();
    const ana = await createMember(event.id, "Ana");
    const rui = await createMember(event.id, "Rui");
    const category = await prisma.awardCategory.create({ data: { eventId: event.id, name: "Membro do ano", sortOrder: 1, kind: 1, isActive: true } });
    await prisma.userVote.createMany({
      data: [
        { eventId: event.id, categoryId: category.id, voterUserId: ana.id, targetUserId: rui.id },
        { eventId: event.id, categoryId: category.id, voterUserId: admin.id, targetUserId: rui.id },
        { eventId: event.id, categoryId: category.id, voterUserId: rui.id, targetUserId: ana.id },
      ],
    });

    const results = (await callRoute(getOfficialResults, params)).body as PagedResult<AdminCategoryResultDto>;
    expect(results.items[0]).toMatchObject({ categoryName: "Membro do ano", totalVotes: 3, participationRate: 1 });
    expect(results.items[0]?.nominees.map((nominee) => [nominee.nomineeId, nominee.title, nominee.voteCount])).toEqual([[rui.id, "Rui", 2], [ana.id, "Ana", 1]]);
    expect(results.items[0]?.nominees[0]?.voterNames.sort()).toEqual(["Admin", "Ana"]);
  });
});

describe("admin event state", () => {
  it("saves module switches and reports what members see", async () => {
    const { params } = await setupAdmin();

    const state = (await callRoute(updateState, params, { method: "PUT", body: { moduleVisibility: { stickers: false }, resultsVisible: true } })).body as EventAdminStateDto;

    expect(state).toMatchObject({ resultsVisible: true, moduleVisibility: { stickers: false, feed: true } });
    expect(state.effectiveModules.stickers).toBe(false);
  });

  it("creates the state of an event that has none, with the defaults", async () => {
    const { event, params } = await setupAdmin();
    await prisma.canhoesEventState.delete({ where: { eventId: event.id } });

    const state = (await callRoute(updateState, params, { method: "PUT", body: { nominationsVisible: false } })).body as EventAdminStateDto;
    expect(state).toMatchObject({ nominationsVisible: false, resultsVisible: false });
  });

  it("opens results only in the results phase", async () => {
    const { params } = await setupAdmin();

    const results = (await callRoute(updatePhase, params, { method: "PUT", body: { phaseType: "RESULTS" } })).body as EventAdminStateDto;
    expect(results).toMatchObject({ activePhase: { type: "RESULTS" }, resultsVisible: true, nominationsVisible: false });
    const proposals = (await callRoute(updatePhase, params, { method: "PUT", body: { phaseType: "PROPOSALS" } })).body as EventAdminStateDto;
    expect(proposals).toMatchObject({ resultsVisible: false, nominationsVisible: true });
  });

  it("loads the panel with every event and the counters", async () => {
    const { event, params } = await setupAdmin();
    await createMember(event.id, "Ana");
    await prisma.awardCategory.create({ data: { eventId: event.id, name: "Membro", sortOrder: 1, kind: 1, isActive: true } });

    const bootstrap = (await callRoute(getBootstrap, params)).body as EventAdminBootstrapDto;
    expect(bootstrap.counts).toEqual({ membersTotal: 2, categoriesTotal: 1, officialResultsCategoriesCount: 1 });
    expect(bootstrap.events.map((summary) => summary.id)).toContain(event.id);
  });

  it("activates one event and deactivates the others", async () => {
    const { event } = await setupAdmin();
    const other = await createEvent();

    expect((await callRoute(activateEvent, { eventId: other.id }, { method: "PUT" })).body).toMatchObject({ id: other.id, isActive: true });
    expect(await prisma.event.findUnique({ where: { id: event.id }, select: { isActive: true } })).toEqual({ isActive: false });
    expect((await callRoute(activateEvent, { eventId: "missing" }, { method: "PUT" })).status).toBe(404);
  });
});
