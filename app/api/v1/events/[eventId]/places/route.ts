import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { searchPlaces } from "@/lib/domains/gatherings/services/placesService";

/** GET /v1/events/:eventId/places?query=...: pesquisa restaurantes e locais para convites */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const query = request.nextUrl.searchParams.get("query") ?? "";
  const places = await searchPlaces(query);

  return json(places);
});
