import { z } from "zod";

import { requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { setUserColor } from "@/lib/domains/members/services/members";
import { PERSON_COLORS } from "@/lib/personColors";

const colorSchema = z.object({ color: z.enum(PERSON_COLORS) }).strict();

/** PUT /v1/me/color: guarda a cor escolhida pelo utilizador */
export const PUT = apiRoute(async (request) => {
  // Exige sessão iniciada.
  const user = await requireUser();

  // Valida o corpo do pedido.
  const { color } = await readJson(request, colorSchema);

  return json(await setUserColor(user.id, color));
});
