import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listInvites } from "@/app/api/admin/invites/route";
import { DELETE as revokeInvite, POST as resendInvite } from "@/app/api/admin/invites/[inviteId]/route";
import type { UserInvitationDto } from "@/lib/api/types";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createUser, signInAs } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  // Nenhum destes testes pode enviar um email a sério, mesmo com uma chave no ambiente.
  vi.stubEnv("RESEND_API_KEY", "");
  signInAs(await createUser({ isAdmin: true }));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

/** Cria um convite com o estado pedido: pendente, usado ou expirado. */
async function seedInvitation(
  email: string,
  {
    eventId = null,
    role = "participant",
    state = "pending",
  }: { eventId?: string | null; role?: string; state?: "pending" | "used" | "expired" } = {},
) {
  const inviter = await createUser({ isAdmin: true });
  return prisma.userInvitation.create({
    data: {
      email,
      token: randomUUID().replaceAll("-", ""),
      invitedByUserId: inviter.id,
      eventId,
      role: role as "participant" | "admin",
      isAdmin: role === "admin",
      expiresAtUtc: new Date(Date.now() + (state === "expired" ? -DAY_MS : 3 * DAY_MS)),
      usedAtUtc: state === "used" ? new Date() : null,
    },
  });
}

describe("listing the invitations", () => {
  it("tells pending, used and expired apart and gives each one's link and role", async () => {
    await seedInvitation("pendente@canhoes.pt", { role: "admin" });
    await seedInvitation("usado@canhoes.pt", { state: "used" });
    await seedInvitation("expirado@canhoes.pt", { state: "expired" });

    const { status, body } = await callRoute(listInvites, {});

    const byEmail = Object.fromEntries((body as UserInvitationDto[]).map((invite) => [invite.email, invite]));
    expect(status).toBe(200);
    expect(byEmail["pendente@canhoes.pt"]).toMatchObject({ status: "pending", role: "admin", usedAtUtc: null });
    expect(byEmail["usado@canhoes.pt"]).toMatchObject({ status: "used", role: "participant" });
    expect(byEmail["usado@canhoes.pt"]?.usedAtUtc).not.toBeNull();
    expect(byEmail["expirado@canhoes.pt"]?.status).toBe("expired");
    expect(byEmail["pendente@canhoes.pt"]?.inviteUrl).toMatch(/\/canhoes\/register\?token=[a-f0-9]+$/);
  });

  it("shows the most recent first", async () => {
    await seedInvitation("primeiro@canhoes.pt");
    await seedInvitation("segundo@canhoes.pt");

    const { body } = await callRoute(listInvites, {});

    expect((body as UserInvitationDto[]).map(({ email }) => email)).toEqual([
      "segundo@canhoes.pt",
      "primeiro@canhoes.pt",
    ]);
  });

  it("filtered by event keeps that event's invitations and those that belong to no event", async () => {
    const event = await createEvent();
    const otherEvent = await createEvent();
    await seedInvitation("deste@canhoes.pt", { eventId: event.id });
    await seedInvitation("de-outro@canhoes.pt", { eventId: otherEvent.id });
    await seedInvitation("sem-evento@canhoes.pt");

    const { body } = await callRoute(listInvites, {}, { query: `?eventId=${event.id}` });

    expect((body as UserInvitationDto[]).map(({ email }) => email).sort()).toEqual([
      "deste@canhoes.pt",
      "sem-evento@canhoes.pt",
    ]);
  });
});

describe("resending an invitation", () => {
  it("renews the deadline for another seven days and reports that no email went out", async () => {
    const event = await createEvent();
    const invitation = await seedInvitation("reenvio@canhoes.pt", { eventId: event.id });

    const { status, body } = await callRoute(resendInvite, { inviteId: invitation.id }, { method: "POST" });

    expect(status).toBe(200);
    expect(body).toEqual({ emailSent: false, emailReason: "NO_API_KEY" });
    const renewed = await prisma.userInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
    expect(renewed.expiresAtUtc.getTime() - Date.now()).toBeGreaterThan(6.9 * DAY_MS);
  });

  it("brings an expired invitation back to life for another seven days", async () => {
    const invitation = await seedInvitation("expirado@canhoes.pt", { state: "expired" });
    expect(invitation.expiresAtUtc.getTime()).toBeLessThan(Date.now());

    const { status } = await callRoute(resendInvite, { inviteId: invitation.id }, { method: "POST" });

    expect(status).toBe(200);
    const renewed = await prisma.userInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
    expect(renewed.expiresAtUtc.getTime() - Date.now()).toBeGreaterThan(6.9 * DAY_MS);
  });

  it("does not resend one that was already used, nor one that does not exist", async () => {
    const used = await seedInvitation("usado@canhoes.pt", { state: "used" });

    const alreadyUsed = await callRoute(resendInvite, { inviteId: used.id }, { method: "POST" });
    const unknown = await callRoute(resendInvite, { inviteId: randomUUID() }, { method: "POST" });

    expect(alreadyUsed).toMatchObject({ status: 400, body: { code: "INVITATION_USED" } });
    expect(unknown).toMatchObject({ status: 400, body: { code: "INVALID_INVITATION" } });
  });
});

describe("revoking an invitation", () => {
  it("removes it, so its link stops working", async () => {
    const invitation = await seedInvitation("revogado@canhoes.pt");

    const { status, body } = await callRoute(revokeInvite, { inviteId: invitation.id }, { method: "DELETE" });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(await prisma.userInvitation.count()).toBe(0);
  });

  it("answers 400 for one that does not exist", async () => {
    const { status, body } = await callRoute(revokeInvite, { inviteId: randomUUID() }, { method: "DELETE" });

    expect(status).toBe(400);
    expect(body).toMatchObject({ code: "INVALID_INVITATION" });
  });
});
