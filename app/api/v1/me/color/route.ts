import { z } from "zod";

import { requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { setUserColor } from "@/lib/domains/members/services/members";
import { PERSON_COLORS } from "@/lib/personColors";

const colorSchema = z.object({ color: z.enum(PERSON_COLORS) }).strict();

export const PUT = apiRoute(async (request) => {
  const user = await requireUser();
  const { color } = await readJson(request, colorSchema);
  return json(await setUserColor(user.id, color));
});
