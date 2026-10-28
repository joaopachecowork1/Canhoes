import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type VercelConfig = { crons?: { path: string; schedule: string }[] };
const config = JSON.parse(readFileSync("vercel.json", "utf-8")) as VercelConfig;
const crons = config.crons ?? [];

describe("vercel.json crons", () => {
  it("schedules the cleanup of expired stories", () => {
    expect(crons.map(({ path }) => path)).toContain("/api/cron/stories-cleanup");
  });

  // Que a rota responde a GET e recusa quem não traz o segredo prova-o storyCleanup.int.test.ts, a chamá-la.
  it.each(crons.map(({ path }) => [path] as const))("%s points at a route that exists", (path) => {
    expect(existsSync(`app${path}/route.ts`)).toBe(true);
  });

  it.each(crons.map((cron) => [cron.path, cron.schedule] as const))(
    "%s runs once a day, the most the Hobby plan accepts",
    (_path, schedule) => {
      expect(schedule).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
    },
  );
});
