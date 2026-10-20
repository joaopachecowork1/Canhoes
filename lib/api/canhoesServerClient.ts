import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

/**
 * GET feito no servidor à API dos Canhões, chamando os route handlers locais do Next.js (a app chama-se a si própria).
 * Devolve null sem sessão (401/403) ou em caso de erro, que fica registado.
 */
export async function canhoesServerFetch<T>(path: string): Promise<T | null> {
  const baseUrl = process.env.CANHOES_INTERNAL_URL || "http://localhost:3000";
  // Aceita o caminho com ou sem barra inicial.
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${baseUrl}/api/v1/${normalizedPath}`;

  // Reenvia os cookies para o pedido interno ser autenticado como o utilizador atual.
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
      // Sem sessão ou sem permissão não é um erro: a página decide o que mostrar.
      if (res.status === 401 || res.status === 403) return null;
      throw new Error(`API error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    logger.error(`Error fetching ${path} on server:`, error);
    return null;
  }
}
