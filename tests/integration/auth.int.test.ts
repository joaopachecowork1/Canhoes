import bcrypt from "bcryptjs";
import type { Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";

import { POST as invite } from "@/app/api/admin/invites/route";
import { POST as register } from "@/app/api/auth/register/route";
import { authOptions } from "@/lib/domains/auth/services/auth";
import { resolveDevelopmentAdmin, resolveUser } from "@/lib/domains/auth/services/authService";
import { prisma } from "@/lib/prisma";

import { addMember, callRoute, createEvent, createMember, createUser, signInAs } from "./helpers";

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

    expect((await callRoute(register, {}, { method: "POST", body: registration(token) })).body).toMatchObject({
      code: "INVITATION_USED",
    });
  });

  it("lets only one of two simultaneous registrations use the same invitation", async () => {
    const { token } = await inviteAsAdmin("race@example.test");

    const results = await Promise.all([
      callRoute(register, {}, { method: "POST", body: registration(token) }),
      callRoute(register, {}, { method: "POST", body: registration(token) }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([201, 400]);
  });

  it("refuses unknown and expired invitations, and short passwords", async () => {
    const { token } = await inviteAsAdmin("late@example.test");
    await prisma.userInvitation.update({ where: { token }, data: { expiresAtUtc: new Date(Date.now() - 1000) } });

    expect((await callRoute(register, {}, { method: "POST", body: registration("nope") })).body).toMatchObject({
      code: "INVALID_INVITATION",
    });
    expect((await callRoute(register, {}, { method: "POST", body: registration(token) })).body).toMatchObject({
      code: "INVITATION_EXPIRED",
    });
    expect(
      (await callRoute(register, {}, { method: "POST", body: { ...registration(token), password: "curta" } })).status,
    ).toBe(400);
  });

  it("refuses to invite an email that already has access, and replaces a previous invitation", async () => {
    const existing = await createMember((await createEvent()).id);
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

describe("an invitation without an event", () => {
  it("joins the active event when the account is created, so the member shows up in the roster", async () => {
    const event = await createEvent();
    const { token } = await inviteAsAdmin("sem-evento@example.test");

    expect((await callRoute(register, {}, { method: "POST", body: registration(token) })).status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "sem-evento@example.test" } });
    expect(await prisma.eventMember.findFirst({ where: { userId: user.id } })).toMatchObject({
      eventId: event.id,
      role: "participant",
    });
  });
});

describe("a member who was removed from the event", () => {
  it("can be invited again and is back in the event after registering", async () => {
    const event = await createEvent();
    const removed = await createUser({ name: "Rui" });

    const { response, token } = await inviteAsAdmin(removed.email, event.id);
    expect(response.status).toBe(200);
    expect((await callRoute(register, {}, { method: "POST", body: registration(token) })).status).toBe(201);

    expect(await prisma.eventMember.count({ where: { eventId: event.id, userId: removed.id } })).toBe(1);
    expect(await prisma.user.count({ where: { email: removed.email } })).toBe(1);
  });
});

describe("email and password sign-in", () => {
  const authorize = (email: string, password: string, ip = "unknown") =>
    credentialsProvider("credentials").options.authorize(
      { email, password },
      { headers: { "x-forwarded-for": ip }, body: {}, method: "POST", query: {} },
    );

  it("accepts the right password for an email in any case, and refuses everything else", async () => {
    const ana = await prisma.user.create({
      data: {
        email: "ana@example.test",
        externalId: "credentials:ana",
        displayName: "Ana",
        isAdmin: false,
        passwordHash: await bcrypt.hash("segredo123", 4),
      },
    });
    await addMember((await createEvent()).id, ana.id);
    await createUser({ name: "Sem password" });

    expect(await authorize("ANA@example.test", "segredo123")).toMatchObject({ email: "ana@example.test", name: "Ana" });
    expect(await authorize("ana@example.test", "errada")).toBeNull();
    expect(await authorize("ninguem@example.test", "segredo123")).toBeNull();
    expect(await authorize("", "")).toBeNull();
  });

  const createPasswordUser = async (email: string, { isMember = true } = {}) => {
    const user = await prisma.user.create({
      data: {
        email,
        externalId: `credentials:${email}`,
        displayName: email,
        isAdmin: false,
        passwordHash: await bcrypt.hash("segredo123", 4),
      },
    });
    if (isMember) await addMember((await createEvent()).id, user.id);
    return user;
  };

  it("refuses the right password to an account that belongs to no event, but not to an admin", async () => {
    await createPasswordUser("removido@example.test", { isMember: false });
    const admin = await createPasswordUser("chefe@example.test", { isMember: false });
    await prisma.user.update({ where: { id: admin.id }, data: { isAdmin: true } });

    expect(await authorize("removido@example.test", "segredo123")).toBeNull();
    expect(await authorize("chefe@example.test", "segredo123")).toMatchObject({ email: "chefe@example.test" });
  });

  it("stops guessing passwords: after ten attempts from one IP even the right one is refused", async () => {
    await createPasswordUser("bia@example.test");
    // Different emails, so only the IP counter can be what stops the eleventh attempt.
    for (let attempt = 0; attempt < 10; attempt++)
      await authorize(`palpite${attempt}@example.test`, "errada", "198.51.100.7");

    expect(await authorize("bia@example.test", "segredo123", "198.51.100.7")).toBeNull();
    expect(await authorize("bia@example.test", "segredo123", "198.51.100.8")).toMatchObject({
      email: "bia@example.test",
    });
  });

  it("stops guessing one account's password even when every attempt claims a different IP", async () => {
    await createPasswordUser("carla@example.test");
    await createPasswordUser("duarte@example.test");
    for (let attempt = 0; attempt < 10; attempt++)
      await authorize("Carla@example.test", "errada", `198.51.100.${100 + attempt}`);

    expect(await authorize("carla@example.test", "segredo123", "198.51.100.200")).toBeNull();
    expect(await authorize("duarte@example.test", "segredo123", "198.51.100.201")).toMatchObject({
      email: "duarte@example.test",
    });
  });

  it("does not spend a shared IP's budget on attempts already refused for their account", async () => {
    await createPasswordUser("elisa@example.test");
    await createPasswordUser("filipe@example.test");
    for (let attempt = 0; attempt < 10; attempt++)
      await authorize("elisa@example.test", "errada", `198.51.100.${150 + attempt}`);
    // Twelve more against the locked account, all from the house's one address.
    for (let attempt = 0; attempt < 12; attempt++) await authorize("elisa@example.test", "errada", "198.51.100.210");

    expect(await authorize("filipe@example.test", "segredo123", "198.51.100.210")).toMatchObject({
      email: "filipe@example.test",
    });
  });
});

describe("session tokens", () => {
  const jwt = (token: JWT, account: Account | null = null, user = { id: "", email: token.email }) =>
    authOptions.callbacks?.jwt?.({ token, account, user }) ?? Promise.resolve(token);

  const googleAccount: Account = { provider: "google", providerAccountId: "google-123", type: "oauth" };

  it("creates the user on the first Google sign-in and re-reads the admin flag on every request", async () => {
    const token = await jwt({ email: "nova@example.test", name: "Nova" }, googleAccount);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "nova@example.test" } });
    expect(token).toMatchObject({
      sub: user.id,
      dbUserId: user.id,
      externalId: "google-123",
      isAdmin: false,
      authMode: "google",
    });

    await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    expect(await jwt(token)).toMatchObject({ isAdmin: true });
  });

  it("ties a credentials sign-in to its database user", async () => {
    const user = await createUser({ name: "Ana" });
    const token = await jwt(
      { email: user.email },
      { provider: "credentials", providerAccountId: user.id, type: "credentials" },
      { id: user.id, email: user.email },
    );
    expect(token).toMatchObject({ dbUserId: user.id, name: "Ana", authMode: "credentials" });
  });

  it("keeps a development sign-in tied to its user and labels the session", async () => {
    const user = await createUser({ isAdmin: true });
    const token = await jwt(
      { email: user.email },
      { provider: "development", providerAccountId: user.id, type: "credentials" },
      { id: user.id, email: user.email },
    );
    expect(token).toMatchObject({ dbUserId: user.id, isAdmin: true, authMode: "development" });

    const session = await authOptions.callbacks?.session?.({
      session: { user: { id: "", isAdmin: false }, expires: "2099-01-01" } satisfies Session,
      token: { sub: user.id },
      user: { id: user.id, email: "", emailVerified: null },
      newSession: undefined,
      trigger: "update",
    });
    expect(session).toMatchObject({ user: { id: user.id, isAdmin: false }, authMode: "google" });
  });

  it("lets Google in only through the invitation policy", async () => {
    const signIn = (email: string | null, provider = "google") =>
      authOptions.callbacks?.signIn?.({
        user: { id: "x", email },
        account: { provider, providerAccountId: "g-1", type: "oauth" },
      });

    expect(await signIn("ana@example.test", "credentials")).toBe(true);
    expect(await signIn(null)).toBe(false);
    expect(await signIn("stranger@example.test")).toBe(false);
  });

  it("keeps an anonymous token without admin rights, and ignores providers it does not know", async () => {
    expect(await jwt({})).toMatchObject({ isAdmin: false });

    const user = await createUser();
    const token = await jwt({ email: user.email }, { provider: "github", providerAccountId: "gh-1", type: "oauth" });
    expect(token).toMatchObject({ externalId: "gh-1", dbUserId: user.id });
    expect(token.authMode).toBeUndefined();
  });

  it("sends NextAuth's own log lines to the app logger without failing", () => {
    const log = authOptions.logger;
    expect(() => {
      log?.error?.("OAUTH_CALLBACK_ERROR", new Error("boom") as never);
      log?.error?.("SIGNIN_OAUTH_ERROR", { error: new Error("denied"), providerId: "google" } as never);
      log?.warn?.("NEXTAUTH_URL");
      log?.debug?.("adapter_error", { detail: 1 });
    }).not.toThrow();
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
    expect(await prisma.user.findUniqueOrThrow({ where: { id: created.id }, select: { displayName: true } })).toEqual({
      displayName: "Ana",
    });
  });

  it("makes the development user an admin", async () => {
    expect(await resolveDevelopmentAdmin("dev:dev@example.test", "dev@example.test", "Dev")).toMatchObject({
      isAdmin: true,
    });
    expect(await resolveDevelopmentAdmin("dev:dev@example.test", "dev@example.test", "Dev")).toMatchObject({
      isAdmin: true,
    });
  });
});
