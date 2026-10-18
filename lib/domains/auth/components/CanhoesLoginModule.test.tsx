import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { router, setNavigation } from "@/tests/component/navigation";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { signIn, signOutUser } from "@/tests/component/session";

import { CanhoesLoginModule } from "./CanhoesLoginModule";

async function logInWithEmail(email = "ana@canhoes.pt", password = "segredo123") {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Palavra-passe"), password);
  await userEvent.click(screen.getByRole("button", { name: "Entrar com Email" }));
}

describe("CanhoesLoginModule", () => {
  it("sends a signed-in user to the event", async () => {
    renderWithProviders(<CanhoesLoginModule />);
    await screen.findByRole("button", { name: "Continuar com Google" });
    expect(router.replace).toHaveBeenCalledWith("/canhoes");
  });

  it("signs in with email and password and goes to the event", async () => {
    signOutUser();
    renderWithProviders(<CanhoesLoginModule />);

    await logInWithEmail();

    expect(signIn).toHaveBeenCalledWith("credentials", { email: "ana@canhoes.pt", password: "segredo123", redirect: false });
    expect(router.push).toHaveBeenCalledWith("/canhoes");
  });

  it("says when the credentials are wrong", async () => {
    signOutUser();
    signIn.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin", status: 401, url: null });
    renderWithProviders(<CanhoesLoginModule />);

    await logInWithEmail();

    expect(await screen.findByText("Email ou palavra-passe errados.")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("explains a NextAuth error from the URL", () => {
    signOutUser();
    setNavigation({ pathname: "/canhoes/login", search: "error=AccessDenied" });
    renderWithProviders(<CanhoesLoginModule />);

    expect(screen.getByText(/Esta conta ainda não foi convidada/)).toBeInTheDocument();
  });

  it("starts the Google sign-in", async () => {
    signOutUser();
    renderWithProviders(<CanhoesLoginModule />);

    await userEvent.click(screen.getByRole("button", { name: "Continuar com Google" }));

    expect(signIn).toHaveBeenCalledWith("google", expect.objectContaining({ callbackUrl: expect.any(String) }));
    screen.getAllByRole("button", { name: "A entrar..." }).forEach((button) => expect(button).toBeDisabled());
  });
});
