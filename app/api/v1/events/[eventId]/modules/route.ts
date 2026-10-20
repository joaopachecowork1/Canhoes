import { z } from "zod";

import { notFound } from "@/lib/api/httpError";
import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { updateEventModules } from "@/lib/domains/admin/services/state";
import { getEventOverview } from "@/lib/domains/event/services/event";

const moduleVisibilitySchema = z
  .object({
    feed: z.boolean().optional(),
    secretSanta: z.boolean().optional(),
    wishlist: z.boolean().optional(),
    categories: z.boolean().optional(),
    voting: z.boolean().optional(),
    gala: z.boolean().optional(),
    stickers: z.boolean().optional(),
    measures: z.boolean().optional(),
    nominees: z.boolean().optional(),
  })
  .strict()
  .refine((modules) => Object.keys(modules).length > 0, {
    message: "At least one module is required.",
  });

const updateModulesSchema = z.object({ modules: moduleVisibilitySchema }).strict();

export const PATCH = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const admin = await requireAdmin();
  const { modules } = await readJson(request, updateModulesSchema);
  await updateEventModules(eventId, modules);

  const overview = await getEventOverview(eventId, admin.id, admin.isAdmin);
  if (!overview) throw notFound("Event not found.");
  return json(overview);
});
