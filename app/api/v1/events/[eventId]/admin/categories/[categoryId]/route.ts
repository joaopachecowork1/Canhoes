import { z } from "zod";

import { HttpError, notFound } from "@/lib/api/httpError";
import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, noContent, readJson } from "@/lib/api/route";
import { deleteCategory, updateCategory } from "@/lib/domains/admin/services/categories";

const updateCategorySchema = z.object({
  name: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  kind: z.coerce.number().int().optional(),
  description: z.string().nullable().optional(),
  voteQuestion: z.string().nullable().optional(),
  voteRules: z.string().nullable().optional(),
});

type CategoryParams = { eventId: string; categoryId: string };

/** PUT /v1/events/:eventId/admin/categories/:categoryId: atualiza uma categoria */
export const PUT = apiRoute<CategoryParams>(async (request, { eventId, categoryId }) => {
  // Só administradores.
  await requireAdmin();

  // Valida o corpo do pedido.
  const changes = await readJson(request, updateCategorySchema);

  const updated = await updateCategory(eventId, categoryId, changes);
  if (!updated) throw notFound("Category not found.");
  return json(updated);
});

/** DELETE /v1/events/:eventId/admin/categories/:categoryId: apaga uma categoria sem nomeados nem votos */
export const DELETE = apiRoute<CategoryParams>(async (_request, { eventId, categoryId }) => {
  // Só administradores.
  await requireAdmin();

  const deleted = await deleteCategory(eventId, categoryId);
  if (!deleted) {
    throw new HttpError(409, "CONFLICT", "Category has dependent nominees or votes and cannot be deleted.");
  }
  return noContent();
});
