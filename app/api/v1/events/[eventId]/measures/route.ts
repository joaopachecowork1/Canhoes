import { requireEventAccess, requireProposalsOpen, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createMeasureProposal, getMeasures } from "@/lib/domains/members/services/measures";
import { CreateMeasureProposalSchema } from "@/lib/zod/nomination";

export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  return json(await getMeasures(eventId));
});

export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const user = await requireUser();
  await requireProposalsOpen(eventId, user);
  const { text } = await readJson(request, CreateMeasureProposalSchema);
  return json(await createMeasureProposal(eventId, user.id, text));
});
