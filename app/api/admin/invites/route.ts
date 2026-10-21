import { z } from "zod";

import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createInvitation } from "@/lib/domains/auth/services/invitations";

const inviteSchema = z.object({
  email: z.string().trim().min(1, "Indica um email."),
  eventId: z
    .string()
    .nullish()
    .transform((eventId) => eventId?.trim() || null),
  role: z.enum(["participant", "admin"]).default("participant"),
});

/** POST /admin/invites: cria um convite para um email, opcionalmente ligado a um evento */
export const POST = apiRoute(async (request) => {
  // Só administradores.
  const admin = await requireAdmin();

  // Valida o corpo do pedido.
  const { email, eventId, role } = await readJson(request, inviteSchema);

  return json(await createInvitation({ email, eventId, invitedByUserId: admin.id, role }));
});
