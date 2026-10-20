import { requireProposalsOpen, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createNomination } from "@/lib/domains/members/services/nominations";
import { CreateNomineeSchema } from "@/lib/zod/nomination";

export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const user = await requireUser();
  await requireProposalsOpen(eventId, user);
  const nomination = await readJson(request, CreateNomineeSchema);
  return json(await createNomination(eventId, user.id, nomination));
});
