import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
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
});
