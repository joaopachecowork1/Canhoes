import { logger } from "@/lib/logger";

export type SendInvitationEmailInput = {
  to: string;
  inviteUrl: string;
  role: "participant" | "admin";
  eventName?: string;
};

export type SendEmailResult = {
  sent: boolean;
  reason?: string;
};

function buildInvitationEmailHtml({
  inviteUrl,
  role,
  eventName = "Canhões do Ano 2026",
}: {
  inviteUrl: string;
  role: "participant" | "admin";
  eventName?: string;
}) {
  const roleLabel = role === "admin" ? "Administrador" : "Membro Participante";

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Convite para ${eventName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e12; color: #f1f3f5; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background-color: #161922; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .badge { display: inline-block; background-color: rgba(94, 187, 99, 0.15); color: #72e07b; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; border: 1px solid rgba(94, 187, 99, 0.3); text-transform: uppercase; letter-spacing: 0.05em; }
    h1 { font-size: 22px; font-weight: 700; margin: 16px 0 8px; color: #ffffff; }
    p { font-size: 15px; line-height: 1.6; color: #a1a7b5; margin: 12px 0; }
    .btn-container { text-align: center; margin: 32px 0 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%); color: #ffffff !important; text-decoration: none; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 12px; border: 1px solid #40916c; box-shadow: 0 4px 14px rgba(45, 106, 79, 0.4); }
    .footer { font-size: 12px; color: #646b7a; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: 24px; word-break: break-all; }
    .link { color: #5ebb63; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">Convite Oficial</span>
      <h1>${eventName}</h1>
    </div>
    <p>Olá,</p>
    <p>Foste convidado para te juntares aos <strong>${eventName}</strong> com o perfil de <strong>${roleLabel}</strong>!</p>
    <p>Aqui poderás acompanhar as publicações do grupo, sugerir e votar nas categorias dos prémios, participar no amigo secreto e votar na grande gala do ano.</p>
    
    <div class="btn-container">
      <a href="${inviteUrl}" class="btn">Aceitar Convite e Entrar</a>
    </div>

    <p style="font-size: 13px; text-align: center; color: #8e95a5;">
      Podes criar a tua conta com palavra-passe ou entrar diretamente com a tua conta Google.
    </p>

    <div class="footer">
      Se o botão acima não funcionar, copia e cola este endereço no teu navegador:<br>
      <a href="${inviteUrl}" class="link">${inviteUrl}</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/** Extrai a mensagem de erro legível da resposta HTTP da API Resend. */
function parseResendError(status: number, errorData: string): string {
  try {
    const parsed = JSON.parse(errorData);
    if (parsed.message) return String(parsed.message);
  } catch {
    // Non-JSON response
  }
  return errorData.trim() ? `HTTP_${status}: ${errorData.trim()}` : `HTTP_${status}`;
}

/** Envia um email de convite através da API Resend, com degradação graciosa caso a chave não esteja configurada. */
export async function sendInvitationEmail(input: SendInvitationEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    logger.info("Resend API key not configured. Invitation email skipped (logged):", {
      to: input.to,
      inviteUrl: input.inviteUrl,
    });
    return { sent: false, reason: "NO_API_KEY" };
  }

  const from = process.env.EMAIL_FROM?.trim() || "Canhões do Ano <noreply@canhoes.lol>";
  const eventName = input.eventName || "Canhões do Ano 2026";
  const html = buildInvitationEmailHtml({
    inviteUrl: input.inviteUrl,
    role: input.role,
    eventName,
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `Convite: ${eventName}`,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const reason = parseResendError(response.status, errorText);
      logger.warn("Failed to send invitation email via Resend:", {
        status: response.status,
        error: reason,
        to: input.to,
      });
      return { sent: false, reason };
    }

    logger.info("Invitation email sent successfully via Resend:", { to: input.to });
    return { sent: true };
  } catch (error) {
    logger.error("Unexpected error sending invitation email via Resend:", error, { to: input.to });
    return { sent: false, reason: "NETWORK_ERROR" };
  }
}
