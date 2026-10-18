import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { callRoute, createEvent, createMember, createUser, signInAs } from "./helpers";

/**
 * Authorization matrix over every route handler in app/api, discovered from disk so a new
 * route is covered without touching this file: anonymous callers get 401, outsiders get 403
 * on event routes and members get 403 on admin routes.
 */

const API_ROOT = path.resolve("app/api");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

/** Routes that are public on purpose. */
const PUBLIC_ROUTES = new Set(["auth/[...nextauth]", "auth/register", "health", "telemetry/log", "uploads/[...path]"]);

/** Admin-only routes that do not live under an `admin` folder. */
const ADMIN_ROUTES_OUTSIDE_ADMIN_FOLDER = new Set([
  "v1/events/[eventId]/feed/posts/[postId]",
  "v1/events/[eventId]/feed/posts/[postId]/pin",
  "v1/events/[eventId]/modules",
]);

type Route = { route: string; method: (typeof METHODS)[number] };

function findRouteFolders(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return entry.name === "route.ts" ? [folder] : [];
    return findRouteFolders(path.join(folder, entry.name));
  });
}

async function discoverRoutes(): Promise<Route[]> {
  const routes: Route[] = [];
  for (const folder of findRouteFolders(API_ROOT)) {
    const route = path.relative(API_ROOT, folder).split(path.sep).join("/");
    const handlers: Record<string, unknown> = await import(path.join(folder, "route.ts"));
    for (const method of METHODS) {
      if (typeof handlers[method] === "function") routes.push({ route, method });
    }
  }
  return routes;
}

const allRoutes = await discoverRoutes();
const protectedRoutes = allRoutes.filter(({ route }) => !PUBLIC_ROUTES.has(route));
const eventRoutes = protectedRoutes.filter(({ route }) => route.startsWith("v1/events/[eventId]/"));
const adminRoutes = protectedRoutes.filter(
  ({ route }) => route.split("/").includes("admin") || ADMIN_ROUTES_OUTSIDE_ADMIN_FOLDER.has(route)
);

type Handler = Parameters<typeof callRoute<Record<string, unknown>>>[0];

/** A value for a route segment: the event under test, a file for catch-all segments, else a random id. */
function paramValue(name: string, isCatchAll: boolean, eventId: string) {
  if (isCatchAll) return ["file.png"];
  return name === "eventId" ? eventId : randomUUID();
}

async function call({ route, method }: Route, eventId: string) {
  const handlers: Record<string, Handler> = await import(path.join(API_ROOT, route, "route.ts"));
  const params = Object.fromEntries(
    [...route.matchAll(/\[(\.\.\.)?(\w+)\]/g)].map(([, spread, name]) => [name, paramValue(name, Boolean(spread), eventId)])
  );
  return callRoute(handlers[method], params, { method, body: method === "GET" ? undefined : {} });
}

const label = ({ method, route }: Route) => `${method} /api/${route}`;

describe("authorization matrix", () => {
  let eventId: string;

  beforeEach(async () => {
    eventId = (await createEvent()).id;
  });

  it("discovers the whole API", () => {
    expect(protectedRoutes.length).toBeGreaterThan(50);
    expect(adminRoutes.length).toBeGreaterThan(20);
    expect(eventRoutes.length).toBeGreaterThan(45);
  });

  it.each(protectedRoutes.map((route) => [label(route), route] as const))("%s rejects anonymous callers", async (_, route) => {
    signInAs(null);
    expect((await call(route, eventId)).status).toBe(401);
  });

  it.each(eventRoutes.map((route) => [label(route), route] as const))("%s rejects users outside the event", async (_, route) => {
    signInAs(await createUser());
    const response = await call(route, eventId);
    expect(response.status).toBe(403);
  });

  it.each(adminRoutes.map((route) => [label(route), route] as const))("%s rejects members who are not admins", async (_, route) => {
    signInAs(await createMember(eventId));
    const response = await call(route, eventId);
    expect(response.status).toBe(403);
  });
});
