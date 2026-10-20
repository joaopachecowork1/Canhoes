import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { vi } from "vitest";

import { prisma } from "@/lib/prisma";

export type PhaseType = "DRAW" | "PROPOSALS" | "VOTING" | "RESULTS";

const DAY_MS = 86_400_000;

type TestUser = { id: string; isAdmin: boolean };

/** Makes `getServerSession` (mocked in setup/perFile.ts) return this user, or no session for null. */
export function signInAs(user: TestUser | null) {
  vi.mocked(getServerSession).mockResolvedValue(
    user
      ? { user: { id: user.id, isAdmin: user.isAdmin }, expires: new Date(Date.now() + DAY_MS).toISOString() }
      : null,
  );
}

type RouteHandler<Params> = (request: NextRequest, context: { params: Promise<Params> }) => Promise<Response>;

/**
 * Calls a route handler the way Next.js does. Each call gets its own client IP (unless `ip` is given)
 * so the in-memory rate limiter (keyed by IP) never interferes between tests.
 */
export async function callRoute<Params>(
  handler: RouteHandler<Params>,
  params: Params,
  { method = "GET", body, ip, query = "" }: { method?: string; body?: unknown; ip?: string; query?: string } = {},
) {
  const request = new NextRequest(`http://localhost/api/test${query}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": ip ?? randomIp() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await handler(request, { params: Promise.resolve(params) });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as unknown) : null };
}

/** A random client IP, so calls made outside `callRoute` do not share one rate-limit counter. */
export function randomIp() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 254) + 1).join(".");
}

export async function createUser({ isAdmin = false, name }: { isAdmin?: boolean; name?: string } = {}) {
  const id = randomUUID();
  return prisma.user.create({
    data: {
      id,
      externalId: `ext-${id}`,
      email: `${id}@example.test`,
      displayName: name ?? `User ${id.slice(0, 4)}`,
      isAdmin,
    },
  });
}

/** An event with all four phases (only `phase` active, open from yesterday to tomorrow) and its state row. */
export async function createEvent({
  phase = "PROPOSALS",
  nominationsVisible = true,
}: { phase?: PhaseType; nominationsVisible?: boolean } = {}) {
  const event = await prisma.event.create({ data: { name: `Event ${randomUUID().slice(0, 6)}`, isActive: true } });
  const now = Date.now();
  await prisma.eventPhase.createMany({
    data: (["DRAW", "PROPOSALS", "VOTING", "RESULTS"] as const).map((type) => ({
      eventId: event.id,
      type,
      startDateUtc: new Date(now - DAY_MS),
      endDateUtc: new Date(now + DAY_MS),
      isActive: type === phase,
    })),
  });
  await prisma.canhoesEventState.create({
    data: { eventId: event.id, phase, nominationsVisible, resultsVisible: phase === "RESULTS" },
  });
  return event;
}

export async function addMember(eventId: string, userId: string, role = "participant") {
  return prisma.eventMember.create({ data: { eventId, userId, role, joinedAtUtc: new Date() } });
}

/** A non-admin user who belongs to the event. */
export async function createMember(eventId: string, name?: string) {
  const user = await createUser({ name });
  await addMember(eventId, user.id);
  return user;
}
