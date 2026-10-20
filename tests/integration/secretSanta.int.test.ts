import { describe, expect, it, vi } from "vitest";

import { POST as draw } from "@/app/api/v1/events/[eventId]/admin/secret-santa/draw/route";
import { POST as reveal } from "@/app/api/v1/events/[eventId]/admin/secret-santa/reveal/route";
import { GET as getOverview } from "@/app/api/v1/events/[eventId]/secret-santa/overview/route";
import type { EventSecretSantaOverviewDto } from "@/lib/api/types";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, createUser, signInAs } from "./helpers";

async function setupDraw(memberCount: number) {
  const event = await createEvent({ phase: "DRAW" });
  const members = [];
  for (let index = 0; index < memberCount; index++) members.push(await createMember(event.id, `Membro ${index}`));
  const admin = await createUser({ isAdmin: true });
  return { event, members, admin };
}

async function overviewOf(eventId: string, user: { id: string; isAdmin: boolean }) {
  signInAs(user);
  const response = await callRoute(getOverview, { eventId });
  expect(response.status).toBe(200);
  return response.body as EventSecretSantaOverviewDto;
}

describe("secret santa", () => {
  it("assigns everyone a different person, never themselves", async () => {
    const { event, members, admin } = await setupDraw(6);
    signInAs(admin);

    expect((await callRoute(draw, { eventId: event.id }, { method: "POST", body: {} })).status).toBe(200);

    const assignments = await prisma.secretSantaAssignment.findMany();
    expect(assignments).toHaveLength(6);
    expect(new Set(assignments.map((pair) => pair.giverUserId))).toEqual(new Set(members.map((member) => member.id)));
    expect(new Set(assignments.map((pair) => pair.receiverUserId)).size).toBe(6);
    expect(assignments.every((pair) => pair.giverUserId !== pair.receiverUserId)).toBe(true);
  });

  it("hides the pairs from members until the admin reveals them", async () => {
    const { event, members, admin } = await setupDraw(3);
    signInAs(admin);
    await callRoute(draw, { eventId: event.id }, { method: "POST", body: {} });

    expect(await overviewOf(event.id, members[0])).toMatchObject({ hasDraw: false, assignedUser: null });

    signInAs(admin);
    expect((await callRoute(reveal, { eventId: event.id }, { method: "POST" })).status).toBe(200);

    const overview = await overviewOf(event.id, members[0]);
    expect(overview.hasAssignment).toBe(true);
    expect(overview.assignedUser?.id).not.toBe(members[0].id);
  });

  it("can be redrawn until revealed, and not after", async () => {
    const { event, admin } = await setupDraw(4);
    signInAs(admin);

    await callRoute(draw, { eventId: event.id }, { method: "POST", body: {} });
    await callRoute(draw, { eventId: event.id }, { method: "POST", body: {} });
    expect(await prisma.secretSantaDraw.count()).toBe(1);
    expect(await prisma.secretSantaAssignment.count()).toBe(4);

    await callRoute(reveal, { eventId: event.id }, { method: "POST" });
    const redraw = await callRoute(draw, { eventId: event.id }, { method: "POST", body: {} });
    expect(redraw).toMatchObject({ status: 409, body: { code: "DRAW_REVEALED" } });
  });

  it("keeps a revealed draw even when the redraw checked it a moment too early", async () => {
    const { event, admin } = await setupDraw(4);
    signInAs(admin);
    await callRoute(draw, { eventId: event.id }, { method: "POST", body: {} });
    await callRoute(reveal, { eventId: event.id }, { method: "POST" });
    const revealedPairs = await prisma.secretSantaAssignment.findMany({ orderBy: { giverUserId: "asc" } });

    // The reveal lands between the redraw's check and its write: the check still sees an open draw.
    vi.spyOn(prisma.secretSantaDraw, "findFirst").mockResolvedValueOnce(null);
    const redraw = await callRoute(draw, { eventId: event.id }, { method: "POST", body: {} });
    vi.restoreAllMocks();

    expect(redraw).toMatchObject({ status: 409, body: { code: "DRAW_REVEALED" } });
    expect(await prisma.secretSantaAssignment.findMany({ orderBy: { giverUserId: "asc" } })).toEqual(revealedPairs);
  });

  it("needs at least two participants and a draw before revealing", async () => {
    const { event, admin } = await setupDraw(1);
    signInAs(admin);

    expect((await callRoute(reveal, { eventId: event.id }, { method: "POST" })).status).toBe(409);
    expect((await callRoute(draw, { eventId: event.id }, { method: "POST", body: {} })).status).toBe(400);
  });
});
