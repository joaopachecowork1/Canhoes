import bcrypt from "bcryptjs";
import type { Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";

import { POST as invite } from "@/app/api/admin/invites/route";
import { POST as register } from "@/app/api/auth/register/route";
import { authOptions } from "@/lib/domains/auth/services/auth";
import { resolveDevelopmentAdmin, resolveUser } from "@/lib/domains/auth/services/authService";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createUser, signInAs } from "./helpers";

const tokenFrom = (inviteUrl: string) => new URL(inviteUrl, "http://localhost").searchParams.get("token") ?? "";

async function inviteAsAdmin(email: string, eventId: string | null = null) {
  signInAs(await createUser({ isAdmin: true }));
  const response = await callRoute(invite, {}, { method: "POST", body: { email, eventId } });
  return { response, token: tokenFrom((response.body as { inviteUrl: string }).inviteUrl) };
}

const registration = (token: string) => ({ token, password: "uma-password", displayName: "Ana" });

describe("invitations", () => {
  it("registers an invited email once and joins the invitation's event", async () => {
    const event = await createEvent();
    const { token } = await inviteAsAdmin(" Ana@Example.test ", event.id);

    const registered = await callRoute(register, {}, { method: "POST", body: registration(token) });
    expect(registered).toEqual({ status: 201, body: { email: "ana@example.test", displayName: "Ana" } });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ana@example.test" } });
    expect(await bcrypt.compare("uma-password", user.passwordHash ?? "")).toBe(true);
    expect(await prisma.eventMember.count({ where: { eventId: event.id, userId: user.id } })).toBe(1);

    expect((await callRoute(register, {}, { method: "POST", body: registration(token) })).body).toMatchObject({ code: "INVITATION_USED" });
  });

  it("refuses unknown and expired invitations, and short passwords", async () => {
    const { token } = await inviteAsAdmin("late@example.test");
    await prisma.userInvitation.update({ where: { token }, data: { expiresAtUtc: new Date(Date.now() - 1000) } });

    expect((await callRoute(register, {}, { method: "POST", body: registration("nope") })).body).toMatchObject({ code: "INVALID_INVITATION" });
    expect((await callRoute(register, {}, { method: "POST", body: registration(token) })).body).toMatchObject({ code: "INVITATION_EXPIRED" });
    expect((await callRoute(register, {}, { method: "POST", body: { ...registration(token), password: "curta" } })).status).toBe(400);
  });

  it("refuses to invite an email that already has an account, and replaces a previous invitation", async () => {
    const existing = await createUser();
    expect((await inviteAsAdmin(existing.email)).response.body).toMatchObject({ code: "USER_ALREADY_EXISTS" });

    const first = await inviteAsAdmin("again@example.test");
    const second = await inviteAsAdmin("again@example.test");
    expect(second.token).not.toBe(first.token);
    expect(await prisma.userInvitation.count({ where: { email: "again@example.test" } })).toBe(1);
  });
});

function credentialsProvider(id: string) {
  const provider = authOptions.providers.find((candidate) => candidate.id === id);
  // next-auth keeps our authorize() in `options`; the top-level one is its default stub.
  if (provider?.type !== "credentials") throw new Error(`No credentials provider "${id}".`);
  return provider;
}

describe("email and password sign-in", () => {
  const authorize = (email: string, password: string) =>
    credentialsProvider("credentials").options.authorize({ email, password }, { headers: {}, body: {}, method: "POST", query: {} });

  it("accepts the right password for an email in any case, and refuses everything else", async () => {
    await prisma.user.create({
      data: { email: "ana@example.test", externalId: "credentials:ana", displayName: "Ana", isAdmin: false, passwordHash: await bcrypt.hash("segredo123", 4) },
    });
    await createUser({ name: "Sem password" });

    expect(await authorize("ANA@example.test", "segredo123")).toMatchObject({ email: "ana@example.test", name: "Ana" });
    expect(await authorize("ana@example.test", "errada")).toBeNull();
    expect(await authorize("ninguem@example.test", "segredo123")).toBeNull();
    expect(await authorize("", "")).toBeNull();
  });
});

describe("session tokens", () => {
  const jwt = (token: JWT, account: Account | null = null, user = { id: "", email: token.email }) =>
    authOptions.callbacks?.jwt?.({ token, account, user }) ?? Promise.resolve(token);

  const googleAccount: Account = { provider: "google", providerAccountId: "google-123", type: "oauth" };

  it("creates the user on the first Google sign-in and re-reads the admin flag on every request", async () => {
    const token = await jwt({ email: "nova@example.test", name: "Nova" }, googleAccount);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "nova@example.test" } });
    expect(token).toMatchObject({ sub: user.id, dbUserId: user.id, externalId: "google-123", isAdmin: false, authMode: "google" });

    await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    expect(await jwt(token)).toMatchObject({ isAdmin: true });
  });

  it("ties a credentials sign-in to its database user", async () => {
    const user = await createUser({ name: "Ana" });
    const token = await jwt({ email: user.email }, { provider: "credentials", providerAccountId: user.id, type: "credentials" }, { id: user.id, email: user.email });
    expect(token).toMatchObject({ dbUserId: user.id, name: "Ana", authMode: "credentials" });
  });

  it("copies the user id, admin flag and sign-in mode into the session", async () => {
    const session = await authOptions.callbacks?.session?.({
      session: { user: { id: "", isAdmin: false }, expires: "2099-01-01" } satisfies Session,
      token: { dbUserId: "user-1", isAdmin: true, authMode: "credentials" },
      user: { id: "user-1", email: "", emailVerified: null },
      newSession: undefined,
      trigger: "update",
    });
    expect(session).toMatchObject({ user: { id: "user-1", isAdmin: true }, authMode: "credentials" });
  });
});

describe("resolving users", () => {
  it("finds a user by external id or email and keeps the latest display name", async () => {
    const created = await resolveUser("ext-1", "ana@example.test", null);
    expect(created).toMatchObject({ displayName: "ana@example.test", isAdmin: false });

    const renamed = await resolveUser("other", "ana@example.test", "Ana");
    expect(renamed.id).toBe(created.id);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: created.id }, select: { displayName: true } })).toEqual({ displayName: "Ana" });
  });

  it("makes the development user an admin", async () => {
    expect(await resolveDevelopmentAdmin("dev:dev@example.test", "dev@example.test", "Dev")).toMatchObject({ isAdmin: true });
    expect(await resolveDevelopmentAdmin("dev:dev@example.test", "dev@example.test", "Dev")).toMatchObject({ isAdmin: true });
  });
});
