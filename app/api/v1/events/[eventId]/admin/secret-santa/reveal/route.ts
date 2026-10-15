import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { revealSecretSantaDraw } from "@/lib/domains/admin/services/secretSanta";

export const POST = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  await requireAdmin();
  return json(await revealSecretSantaDraw(eventId));
});
