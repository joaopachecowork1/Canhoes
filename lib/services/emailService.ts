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

/** Escapa os caracteres que o HTML interpreta, para o nome do evento não partir o email. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const ROLE_LABELS = {
  participant: "Participante de pleno direito",
  admin: "Admin (grandes poderes, grandes responsabilidades)",
} as const;

/**
 * Monta o HTML do convite no tema "Caderneta de Cromos" (roxo-noite e verde-relva). Os clientes de email
 * não leem variáveis CSS nem gradientes, por isso as cores de `app/globals.css` vão copiadas em hex.
 */
export function buildInvitationEmailHtml({
  inviteUrl,
  role,
  eventName = "Canhões do Ano 2026",
}: {
  inviteUrl: string;
  role: "participant" | "admin";
  eventName?: string;
}) {
  const safeEventName = escapeHtml(eventName);
  const roleLabel = ROLE_LABELS[role];

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Convite para ${safeEventName}</title>
  <style>
    body { font-family: 'Atkinson Hyperlegible', Arial, Helvetica, sans-serif; background-color: #170d22; color: #f6f1ff; margin: 0; padding: 24px 12px; }
    .card { max-width: 540px; margin: 0 auto; background-color: #24163a; border: 1px solid #3d2d5c; border-radius: 16px; padding: 32px 24px; }
    .header { text-align: center; margin-bottom: 24px; }
    .badge { display: inline-block; background-color: #2f2050; color: #ffb547; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; border: 1px dashed #ffb547; text-transform: uppercase; letter-spacing: 0.05em; }
    h1 { font-family: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; font-size: 30px; line-height: 1.15; font-weight: 700; margin: 16px 0 8px; color: #f6f1ff; letter-spacing: 0.01em; }
    p { font-size: 16px; line-height: 1.6; color: #ddd2f0; margin: 12px 0; }
    .role { background-color: #2f2050; border-radius: 12px; padding: 12px 16px; text-align: center; color: #f6f1ff; font-weight: bold; }
    .btn-container { text-align: center; margin: 32px 0 24px; }
    .btn { display: inline-block; background-color: #2fbf71; color: #0d1f14 !important; text-decoration: none; font-weight: bold; font-size: 18px; padding: 14px 32px; border-radius: 12px; }
    .small { font-size: 14px; text-align: center; color: #b8a6d6; }
    .footer { font-size: 13px; color: #b8a6d6; border-top: 1px solid #3d2d5c; padding-top: 20px; margin-top: 24px; word-break: break-all; }
    .link { color: #5fe39a; text-decoration: underline; }
  </style>
</head>
<body bgcolor="#170d22">
  <div class="card">
    <div class="header">
      <span class="badge">Cromo novo à vista</span>
      <h1>Foste escolhido para a caderneta!</h1>
    </div>
    <p>Olá! 👋</p>
    <p>Alguém com muito bom gosto (ou pouca memória) achou que mereces um lugar nos <strong>${safeEventName}</strong>. Entras como:</p>
    <p class="role">${roleLabel}</p>
    <p>Lá dentro podes postar disparates no feed, propor categorias de prémios, tirar o teu amigo secreto e votar na gala em quem merece (ou em quem te deve dinheiro).</p>

    <div class="btn-container">
      <a href="${inviteUrl}" class="btn">Colar o meu cromo</a>
    </div>

    <p class="small">
      Cria conta com palavra-passe ou entra com o Google. Não pedimos cartão de crédito, morada nem NIF. Prometido.
    </p>

    <div class="footer">
      O botão fez birra? Acontece aos melhores. Copia este endereço para o navegador:<br>
      <a href="${inviteUrl}" class="link">${inviteUrl}</a>
      <br><br>
      Não estavas à espera deste convite? Ignora o email, ninguém vai ficar chateado.
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
    const loggedUrl =
      process.env.NODE_ENV === "production"
        ? input.inviteUrl.replace(/token=[^&]+/, "token=[REDACTED]")
        : input.inviteUrl;
    logger.info("Resend API key not configured. Invitation email skipped (logged):", {
      to: input.to,
      inviteUrl: loggedUrl,
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
        subject: `🏆 Foste convidado para ${eventName} (não é uma burla)`,
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
