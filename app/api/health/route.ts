import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/health: verifica a ligação à base de dados, para a health check do contentor. */
export async function GET() {
  const start = Date.now();

  try {
    // Uma query trivial chega para provar que a base de dados responde.
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestampUtc: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
    });
  } catch {
    // 503 para a health check do contentor e o balanceador do anfitrião verem a falha.
    return NextResponse.json(
      {
        status: "degraded",
        database: "disconnected",
        timestampUtc: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
      },
      { status: 503 },
    );
  }
}
