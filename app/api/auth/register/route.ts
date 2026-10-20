import { enforceRateLimit } from "@/lib/api/rateLimit";
import { z } from "zod";

import { apiRoute, json, readJson } from "@/lib/api/route";
import { registerWithInvitation } from "@/lib/domains/auth/services/invitations";

const registerSchema = z.object({
  token: z.string().min(1, "O link de convite está incompleto."),
  password: z.string().min(8, "A password tem de ter pelo menos 8 caracteres."),
  displayName: z.string().trim().min(1, "Indica o teu nome."),
});

/** POST /auth/register: cria a conta a partir de um convite (token, password e nome) */
export const POST = apiRoute(async (request) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "strict");

  // Valida o corpo do pedido.
  const registration = await readJson(request, registerSchema);

  return json(await registerWithInvitation(registration), 201);
});
