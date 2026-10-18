import { requireProposalsOpen, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createProposal } from "@/lib/domains/voting/services/voting";
import { CreateEventProposalSchema } from "@/lib/zod/voting";

export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const user = await requireUser();
  await requireProposalsOpen(eventId, user);
  const { name, description, kind } = await readJson(request, CreateEventProposalSchema);
  return json(await createProposal(eventId, user.id, { name, description, kind }));
});
