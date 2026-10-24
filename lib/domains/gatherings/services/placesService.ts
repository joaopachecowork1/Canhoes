import type { PlaceSuggestionDto } from "@/lib/api/types";
import { logger } from "@/lib/logger";

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
};

/**
 * Pesquisa restaurantes, bares e locais no Google Places (New API).
 * Se a chave de API não estiver configurada ou a chamada falhar, retorna uma lista vazia sem quebrar a app.
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestionDto[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    logger.warn("Google Places API key is not configured.");
    return [];
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: cleanQuery,
        languageCode: "pt-PT",
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn("Google Places API returned non-OK status", { status: response.status, errorText });
      return [];
    }

    const data = (await response.json()) as GooglePlacesResponse;
    const places = data.places ?? [];

    return places.map((place) => ({
      id: place.id,
      name: place.displayName?.text || cleanQuery,
      address: place.formattedAddress || "",
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      mapUrl: place.googleMapsUri || null,
    }));
  } catch (error) {
    logger.warn("Failed to fetch suggestions from Google Places API", { error });
    return [];
  }
}

/**
 * Monta o URL da Google Maps Static API com estilo de mapa escuro condizente com a Caderneta.
 */
export function getStaticMapUrl(latitude: number, longitude: number): string | null {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return null;

  const center = `${latitude},${longitude}`;
  const styles = [
    "element:geometry|color:0x1b1129",
    "element:labels.text.stroke|color:0x1b1129",
    "element:labels.text.fill|color:0xddd2f0",
    "feature:administrative|element:geometry|stroke:0x5b3f8c",
    "feature:road|element:geometry|color:0x2c1d42",
    "feature:road|element:geometry.stroke|color:0x3d275c",
    "feature:water|element:geometry|color:0x0f081b",
    "feature:poi|element:geometry|color:0x231538",
  ];

  const params = new URLSearchParams({
    center,
    zoom: "15",
    size: "600x260",
    scale: "2",
    maptype: "roadmap",
    markers: `color:0xff6b6b|${center}`,
    key: apiKey,
  });

  const styleParams = styles.map((s) => `style=${encodeURIComponent(s)}`).join("&");
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&${styleParams}`;
}
