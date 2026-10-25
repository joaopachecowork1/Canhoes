import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildInvitationEmailHtml, sendInvitationEmail } from "./emailService";

describe("emailService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns sent: false with NO_API_KEY when RESEND_API_KEY is not defined", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendInvitationEmail({
      to: "amigo@example.com",
      inviteUrl: "https://canhoes.pt/canhoes/register?token=abc",
      role: "participant",
    });

    expect(result).toEqual({ sent: false, reason: "NO_API_KEY" });
  });

  it("calls Resend API and returns sent: true when API returns 200", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "Canhões do Ano <noreply@canhoes.pt>";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg_123" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendInvitationEmail({
      to: "amigo@example.com",
      inviteUrl: "https://canhoes.pt/canhoes/register?token=abc",
      role: "participant",
      eventName: "Canhões do Ano 2026",
    });

    expect(result).toEqual({ sent: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_123",
        }),
        body: expect.stringContaining("não é uma burla"),
      }),
    );
  });

  it("handles Resend API error response without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test_123";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ message: "Forbidden" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendInvitationEmail({
      to: "amigo@example.com",
      inviteUrl: "https://canhoes.pt/canhoes/register?token=abc",
      role: "admin",
    });

    expect(result).toEqual({ sent: false, reason: "Forbidden" });
  });

  describe("buildInvitationEmailHtml", () => {
    const base = { inviteUrl: "https://canhoes.lol/canhoes/register?token=abc", role: "participant" as const };

    it("usa as cores da caderneta e o link do convite no botão", () => {
      const html = buildInvitationEmailHtml({ ...base, eventName: "Canhões do Ano 2026" });

      expect(html).toContain("#170d22");
      expect(html).toContain("#2fbf71");
      expect(html).toContain(`href="${base.inviteUrl}"`);
    });

    it("mostra um papel diferente para admins", () => {
      const member = buildInvitationEmailHtml({ ...base, eventName: "X" });
      const admin = buildInvitationEmailHtml({ ...base, role: "admin", eventName: "X" });

      expect(admin).not.toBe(member);
      expect(admin).toContain("Admin");
    });

    it("escapa o nome do evento", () => {
      const html = buildInvitationEmailHtml({ ...base, eventName: "<script>alert(1)</script>" });

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });
});
