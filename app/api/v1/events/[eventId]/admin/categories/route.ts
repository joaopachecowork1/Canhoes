import { z } from "zod";

import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createCategory, getAdminCategories } from "@/lib/domains/admin/services/categories";

const createCategorySchema = z.object({
  name: z.string({ error: "Name is required." }).trim().min(1, "Name is required."),
  sortOrder: z.number().int().nullish(),
  kind: z.coerce.number().int().default(0),
  description: z.string().nullish(),
  voteQuestion: z.string().nullish(),
  voteRules: z.string().nullish(),
});

/** GET /v1/events/:eventId/admin/categories: lista as categorias do evento */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  return json(await getAdminCategories(eventId));
});

/** POST /v1/events/:eventId/admin/categories: cria uma categoria */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  // Valida o corpo do pedido.
  const category = await readJson(request, createCategorySchema);

  const created = await createCategory(eventId, {
    name: category.name,
    kind: category.kind,
    sortOrder: category.sortOrder ?? null,
    description: category.description ?? null,
    voteQuestion: category.voteQuestion ?? null,
    voteRules: category.voteRules ?? null,
  });
  return json(created, 201);
});
