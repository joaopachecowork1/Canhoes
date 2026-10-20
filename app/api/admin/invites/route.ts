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
});

export const POST = apiRoute(async (request) => {
  const admin = await requireAdmin();
  const { email, eventId } = await readJson(request, inviteSchema);
  return json(await createInvitation({ email, eventId, invitedByUserId: admin.id }));
});
