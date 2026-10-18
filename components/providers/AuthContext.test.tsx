import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { sessionState, signIn, signInAs, signOut, signOutUser, updateSession } from "@/tests/component/session";

import { AuthProvider, useAuth } from "./AuthContext";

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <p>{`user:${auth.user?.name ?? "none"} admin:${String(auth.user?.isAdmin ?? false)} loading:${String(auth.loading)} dev:${String(auth.isDevAuthBypass)}`}</p>
      <button type="button" onClick={auth.loginGoogle}>{"google"}</button>
      <button type="button" onClick={auth.loginDevelopment}>{"dev"}</button>
      <button type="button" onClick={auth.logout}>{"logout"}</button>
      <button type="button" onClick={() => void auth.refreshProfile()}>{"refresh"}</button>
    </div>
  );
}

function renderAuth(isDevLoginAvailable = false) {
  return render(
    <AuthProvider isDevLoginAvailable={isDevLoginAvailable}>
      <AuthProbe />
    </AuthProvider>
  );
}

describe("AuthProvider", () => {
  afterEach(() => sessionStorage.clear());

  it("exposes the signed-in user from the session", () => {
    signInAs({ name: "Ana", isAdmin: true });
    renderAuth();
    expect(screen.getByText("user:Ana admin:true loading:false dev:false")).toBeInTheDocument();
  });

  it("falls back to the email's name when the session has none", () => {
    signInAs({ name: "", email: "rui@canhoes.pt" });
    if (sessionState.data) sessionState.data.user.name = null;
    renderAuth();
    expect(screen.getByText(/user:rui /)).toBeInTheDocument();
  });

  it("starts Google and development sign-ins, logs out and refreshes the profile", async () => {
    renderAuth();

    await userEvent.click(screen.getByRole("button", { name: "google" }));
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/canhoes" });
    await userEvent.click(screen.getByRole("button", { name: "dev" }));
    expect(signIn).toHaveBeenCalledWith("development", { callbackUrl: "/canhoes" });
    await userEvent.click(screen.getByRole("button", { name: "refresh" }));
    expect(updateSession).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/canhoes/login", redirect: true });
    expect(sessionStorage.getItem("skipDevAutoLogin")).toBe("true");
  });

  it("signs in by itself with the development login outside production", async () => {
    signOutUser();
    renderAuth(true);

    expect(screen.getByText(/loading:true/)).toBeInTheDocument();
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("development", { callbackUrl: "/canhoes", redirect: false }));
    await waitFor(() => expect(updateSession).toHaveBeenCalled());
  });

  it("stops loading when the automatic development login fails", async () => {
    signOutUser();
    signIn.mockResolvedValueOnce({ ok: false, error: "nope", status: 401, url: null });
    renderAuth(true);

    expect(await screen.findByText(/loading:false/)).toBeInTheDocument();
  });

  it("does not sign in by itself after a logout", () => {
    signOutUser();
    sessionStorage.setItem("skipDevAutoLogin", "true");
    renderAuth(true);

    expect(signIn).not.toHaveBeenCalled();
  });

  it("refuses to be used outside the provider", () => {
    expect(() => render(<AuthProbe />)).toThrow("useAuth must be used within an AuthProvider");
  });
});
