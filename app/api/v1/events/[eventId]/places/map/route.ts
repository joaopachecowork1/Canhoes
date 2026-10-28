import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { apiRoute } from "@/lib/api/route";
import { getStaticMapUrl } from "@/lib/domains/gatherings/services/placesService";

function parseCoordinates(latParam: string | null, lngParam: string | null): { lat: number; lng: number } | null {
  if (!latParam || !lngParam) return null;

  const lat = Number(latParam);
  const lng = Number(lngParam);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/** GET /v1/events/:eventId/places/map?lat=...&lng=...: proxy seguro com cache da imagem estática de mapa */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Cada pedido que chega ao Google é pago, por isso um cliente não pode pedi-los em ciclo.
  enforceRateLimit(request, "standard");
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const coords = parseCoordinates(request.nextUrl.searchParams.get("lat"), request.nextUrl.searchParams.get("lng"));
  if (!coords) {
    return new Response(null, { status: 400 });
  }

  const staticUrl = getStaticMapUrl(coords.lat, coords.lng);
  if (!staticUrl) {
    return new Response(null, { status: 404 });
  }

  try {
    const res = await fetch(staticUrl, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return new Response(null, { status: res.status });
    }

    const imageBuffer = await res.arrayBuffer();
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
});
