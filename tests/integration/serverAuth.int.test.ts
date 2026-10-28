import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { describe, expect, it, vi } from "vitest";

import { getRequestUser } from "@/lib/domains/auth/services/serverAuth";

import { createUser } from "./helpers";

/** Faz o `getServerSession` (simulado em setup/perFile.ts) devolver esta sessão. */
function sessionOf(user: { id?: string; email?: string } | null) {
  vi.mocked(getServerSession).mockResolvedValue(user ? { user, expires: "2099-01-01T00:00:00.000Z" } : null);
}

describe("getRequestUser", () => {
  it("is nobody without a session, or with a session that says nothing about who it is", async () => {
    sessionOf(null);
    expect(await getRequestUser()).toBeNull();

    sessionOf({});
    expect(await getRequestUser()).toBeNull();
  });

  it("finds the profile by the user id the session carries", async () => {
    const user = await createUser({ isAdmin: true, name: "Ana" });
    sessionOf({ id: user.id });

    expect(await getRequestUser()).toEqual({ id: user.id, email: user.email, displayName: "Ana", isAdmin: true });
  });

  it("finds it by email, whatever its case, when the id is not a database id", async () => {
    const user = await createUser();
    sessionOf({ id: "dev-user", email: user.email.toUpperCase() });

    expect((await getRequestUser())?.id).toBe(user.id);
  });

  it("falls back to the email when the id points at nobody", async () => {
    const user = await createUser();
    sessionOf({ id: randomUUID(), email: user.email });

    expect((await getRequestUser())?.id).toBe(user.id);
  });

  it("is nobody when neither the id nor the email belong to a user", async () => {
    sessionOf({ id: randomUUID(), email: "ninguem@canhoes.pt" });
    expect(await getRequestUser()).toBeNull();

    sessionOf({ id: randomUUID() });
    expect(await getRequestUser()).toBeNull();
  });
});
