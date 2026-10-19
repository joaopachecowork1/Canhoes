import { vi, type Mock } from "vitest";
import type { Session } from "next-auth";

type SessionState = { data: Session | null; status: "authenticated" | "unauthenticated" | "loading" };

/** What `next-auth/react` returns in component tests; signed in as Ana unless a test says otherwise. */
export const sessionState: SessionState = { data: null, status: "unauthenticated" };
export const signIn: Mock = vi.fn(async () => ({ ok: true, error: undefined, status: 200, url: null }));
export const signOut: Mock = vi.fn(async () => undefined);
export const updateSession: Mock = vi.fn(async () => sessionState.data);

export function signInAs({ id = "ana", name = "Ana", email = "ana@canhoes.pt", isAdmin = false, color = "teal" } = {}) {
  sessionState.data = { user: { id, name, email, isAdmin, color }, expires: "2099-01-01T00:00:00.000Z" } satisfies Session;
  sessionState.status = "authenticated";
}

export function signOutUser() {
  sessionState.data = null;
  sessionState.status = "unauthenticated";
}

export function resetSession() {
  signInAs();
  [signIn, signOut, updateSession].forEach((spy) => spy.mockClear());
}
