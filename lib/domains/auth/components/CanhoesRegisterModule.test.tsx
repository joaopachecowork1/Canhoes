import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { recordRequests } from "@/tests/component/api";
import { router, setNavigation } from "@/tests/component/navigation";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { signOutUser } from "@/tests/component/session";

import { CanhoesRegisterModule } from "./CanhoesRegisterModule";

function renderRegister(search = "token=abc") {
  signOutUser();
  setNavigation({ pathname: "/canhoes/register", search });
  return renderWithProviders(<CanhoesRegisterModule />);
}

async function fillForm(password = "uma-password") {
  await userEvent.type(screen.getByLabelText("Nome visível (Alcunha)"), "Ana");
  await userEvent.type(screen.getByLabelText("Palavra-passe"), password);
}

const submitButton = () => screen.getByRole("button", { name: "Criar conta" });

describe("CanhoesRegisterModule", () => {
  afterEach(() => vi.useRealTimers());

  it("creates the account and sends the user to the login", async () => {
    const recorder = recordRequests();
    server.use(
      http.post("*/api/auth/register", async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json({ email: "ana@canhoes.pt", displayName: "Ana" }, { status: 201 });
      }),
    );
    renderRegister();

    await fillForm();
    await userEvent.click(submitButton());

    expect(await screen.findByText("Conta criada com sucesso!")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toEqual({ token: "abc", password: "uma-password", displayName: "Ana" });
    await userEvent.click(screen.getByRole("button", { name: "Ir para o login" }));
    expect(router.push).toHaveBeenCalledWith("/canhoes/login");
  });

  it("redirects to the login by itself after a few seconds", async () => {
    server.use(
      http.post("*/api/auth/register", () => HttpResponse.json({ email: "a", displayName: "Ana" }, { status: 201 })),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderRegister();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("Nome visível (Alcunha)"), "Ana");
    await user.type(screen.getByLabelText("Palavra-passe"), "uma-password");
    await user.click(submitButton());
    await screen.findByText("Conta criada com sucesso!");
    expect(router.push).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(router.push).toHaveBeenCalledWith("/canhoes/login");
  });

  it("shows the server's reason when the invitation is refused", async () => {
    server.use(
      http.post("*/api/auth/register", () =>
        HttpResponse.json({ code: "INVITATION_USED", message: "Este convite já foi usado." }, { status: 400 }),
      ),
    );
    renderRegister();

    await fillForm();
    await userEvent.click(submitButton());

    expect(await screen.findByText(/Este convite já foi usado/)).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it("needs a password of eight characters", async () => {
    renderRegister();
    await fillForm("curta");
    expect(submitButton()).toBeDisabled();
  });

  it("locks the form when the link has no token", () => {
    renderRegister("");

    expect(screen.getByText("Este link de convite está incompleto. Pede um novo a um admin.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome visível (Alcunha)")).toBeDisabled();
  });
});
