import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

/**
 * Server-side fetch client for Canhoes API.
 * Calls the local Next.js route handlers (self-referencing).
 */
export async function canhoesServerFetch<T>(path: string): Promise<T | null> {
  const baseUrl = process.env.CANHOES_INTERNAL_URL || "http://localhost:3000";
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${baseUrl}/api/v1/${normalizedPath}`;

  // Forward cookies for authentication
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return null;
      throw new Error(`API error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    logger.error(`Error fetching ${path} on server:`, error);
    return null;
  }
}
