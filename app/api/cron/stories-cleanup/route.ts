import { requireCronSecret } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { logger } from "@/lib/logger";
import { cleanupExpiredStories } from "@/lib/domains/stories/services/storyCleanup";

// Sem Fluid compute, o limite de uma função da Vercel Hobby é 10 s; a limpeza por lotes precisa de mais.
export const maxDuration = 60;

/** GET /api/cron/stories-cleanup: a Vercel chama-o uma vez por dia para apagar as stories expiradas (ficheiros e linhas) */
export const GET = apiRoute(async (request) => {
  // Só o cron conhece o segredo; sem sessão de utilizador.
  requireCronSecret(request);

  const result = await cleanupExpiredStories();
  logger.info("Stories cleanup finished", result);
  // Um 500 faz a falha aparecer nos registos do cron; as linhas que falharam ficam para o dia seguinte.
  return json(result, result.failed > 0 ? 500 : 200);
});
