import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CredentialsLoginForm } from "./CredentialsLoginForm";

describe("CredentialsLoginForm", () => {
  it("only submits once email and password are filled", async () => {
    const onSubmit = vi.fn();
    render(<CredentialsLoginForm isSigningIn={false} onSubmit={onSubmit} />);
    const submit = screen.getByRole("button", { name: "Entrar com Email" });

    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Email"), "ana@canhoes.pt");
    await userEvent.type(screen.getByLabelText("Palavra-passe"), "segredo123");
    await userEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith("ana@canhoes.pt", "segredo123");
  });

  it("locks the form while signing in", () => {
    render(<CredentialsLoginForm isSigningIn onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "A entrar..." })).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });
});
