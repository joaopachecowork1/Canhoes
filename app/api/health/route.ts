import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestampUtc: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
    });
  } catch {
    // 503 so the container health check and the host's load balancer see the outage.
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
