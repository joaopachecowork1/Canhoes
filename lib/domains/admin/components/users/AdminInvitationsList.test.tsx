import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import type { UserInvitationDto } from "@/lib/api/types";

import { AdminInvitationsList } from "./AdminInvitationsList";

const mockInvitations: UserInvitationDto[] = [
  {
    id: "inv-1",
    email: "joao@example.com",
    role: "admin",
    createdAtUtc: new Date().toISOString(),
    expiresAtUtc: new Date(Date.now() + 7 * 86400000).toISOString(),
    usedAtUtc: null,
    status: "pending",
    inviteUrl: "https://canhoes.pt/canhoes/register?token=tok-1",
  },
  {
    id: "inv-2",
    email: "maria@example.com",
    role: "participant",
    createdAtUtc: new Date().toISOString(),
    expiresAtUtc: new Date(Date.now() + 7 * 86400000).toISOString(),
    usedAtUtc: new Date().toISOString(),
    status: "used",
    inviteUrl: "https://canhoes.pt/canhoes/register?token=tok-2",
  },
];

describe("AdminInvitationsList", () => {
  it("renders empty state when there are no invitations", async () => {
    server.use(
      http.get("*/api/admin/invites", () => {
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    expect(await screen.findByText("Nenhum convite gerado até ao momento.")).toBeInTheDocument();
  });

  it("renders the list of invitations with badges and emails", async () => {
    server.use(
      http.get("*/api/admin/invites", () => {
        return HttpResponse.json(mockInvitations);
      }),
    );

    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    expect(await screen.findByText("joao@example.com")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getAllByText("Aceite").length).toBeGreaterThan(0);
  });

  it("allows resending an invitation", async () => {
    let resent = false;
    server.use(
      http.get("*/api/admin/invites", () => {
        return HttpResponse.json(mockInvitations);
      }),
      http.post("*/api/admin/invites/inv-1", () => {
        resent = true;
        return HttpResponse.json({ emailSent: true });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    expect(await screen.findByText("joao@example.com")).toBeInTheDocument();

    const resendBtn = screen.getByRole("button", { name: "Reenviar email" });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(resent).toBe(true);
    });
  });

  it("shows an expired invitation as expired, with the link still to copy and resend", async () => {
    server.use(
      http.get("*/api/admin/invites", () =>
        HttpResponse.json([{ ...mockInvitations[0], id: "inv-3", email: "tarde@example.com", status: "expired" }]),
      ),
    );
    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    expect(await screen.findByText("Expirado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar email" })).toBeEnabled();
  });

  it("says it is loading, and offers a retry when the list cannot be loaded", async () => {
    let attempts = 0;
    server.use(
      http.get("*/api/admin/invites", async () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.json({ message: "falhou" }, { status: 500 });
        return HttpResponse.json(mockInvitations);
      }),
    );
    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    expect(screen.getByText("A carregar...")).toBeInTheDocument();
    expect(await screen.findByText("Não foi possível carregar os convites.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("joao@example.com")).toBeInTheDocument();
  });

  it("copies the invitation link", async () => {
    server.use(http.get("*/api/admin/invites", () => HttpResponse.json(mockInvitations)));
    const user = userEvent.setup();
    const copy = vi.spyOn(navigator.clipboard, "writeText");
    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    await user.click(await screen.findByRole("button", { name: "Copiar link" }));

    expect(copy).toHaveBeenCalledWith("https://canhoes.pt/canhoes/register?token=tok-1");
    expect(await screen.findByText("Link de convite copiado!")).toBeInTheDocument();
  });

  it.each([
    [
      "with the reason",
      { emailSent: false, emailReason: "NO_API_KEY" },
      /o email não foi enviado \(NO_API_KEY\)\. Copia o link e envia-o tu\.$/,
    ],
    ["without a reason", { emailSent: false }, /o email não foi enviado\. Copia o link e envia-o tu\.$/],
  ])("warns that the email did not go out, %s", async (_label, answer, expected) => {
    server.use(
      http.get("*/api/admin/invites", () => HttpResponse.json(mockInvitations)),
      http.post("*/api/admin/invites/inv-1", () => HttpResponse.json(answer)),
    );
    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Reenviar email" }));

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it("says so when the invitation cannot be resent", async () => {
    server.use(
      http.get("*/api/admin/invites", () => HttpResponse.json(mockInvitations)),
      http.post("*/api/admin/invites/inv-1", () => HttpResponse.error()),
    );
    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Reenviar email" }));

    expect(await screen.findByText(/Não foi possível reenviar o email\./)).toBeInTheDocument();
  });

  it("revokes an invitation only after confirming, and says so", async () => {
    const revoked = vi.fn();
    server.use(
      http.get("*/api/admin/invites", () => HttpResponse.json(mockInvitations)),
      http.delete("*/api/admin/invites/inv-1", () => {
        revoked();
        return HttpResponse.json({ success: true });
      }),
    );
    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Revogar" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Revogar convite")).toBeInTheDocument();
    expect(revoked).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Convite revogado com sucesso.")).toBeInTheDocument();
    expect(revoked).toHaveBeenCalledOnce();
  });

  it("says so when the invitation cannot be revoked", async () => {
    server.use(
      http.get("*/api/admin/invites", () => HttpResponse.json(mockInvitations)),
      http.delete("*/api/admin/invites/inv-1", () => HttpResponse.error()),
    );
    renderWithProviders(<AdminInvitationsList eventId="event-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Revogar" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText(/Não foi possível revogar o convite\./)).toBeInTheDocument();
  });
});
