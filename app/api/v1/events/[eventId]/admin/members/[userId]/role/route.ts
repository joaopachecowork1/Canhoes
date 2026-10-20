import { z } from "zod";

import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { setAdminRole } from "@/lib/domains/admin/services/members";

const roleSchema = z.object({
  isAdmin: z.boolean(),
  confirmSelfDemotion: z.boolean().optional().default(false),
});

/** PATCH /v1/events/:eventId/admin/members/:userId/role: promove ou despromove um administrador */
export const PATCH = apiRoute<{ eventId: string; userId: string }>(async (request, { eventId, userId }) => {
  // Só administradores.
  const admin = await requireAdmin();

  // Valida o corpo do pedido.
  const change = await readJson(request, roleSchema);

  const user = await setAdminRole({ actorUserId: admin.id, eventId, targetUserId: userId, ...change });
  return json({ user });
});
