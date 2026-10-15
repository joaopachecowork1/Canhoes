#!/usr/bin/env node
// Local PostgreSQL helpers. Works with Docker or Podman, on Linux, macOS and Windows.
//
//   node scripts/db.mjs up                             start PostgreSQL, wait until it accepts connections and
//                                                      create the <db>_test database for the integration tests
//   node scripts/db.mjs down                           stop the compose stack (data stays in the volume)
//   node scripts/db.mjs backup                         write a pg_dump to backups/
//   node scripts/db.mjs restore <file>                 restore a pg_dump (drops existing objects first)
//   node scripts/db.mjs baseline --existing-database   mark the baseline migration as applied
//
// The engine is `docker` when available, otherwise `podman`; CONTAINER_ENGINE overrides it.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; compose falls back to the defaults in docker-compose.yml.
}

const POSTGRES_CONTAINER = "canhoes-postgres";
const dbUser = process.env.POSTGRES_USER || "canhoes";
const dbName = process.env.POSTGRES_DB || "canhoes";
const engine = process.env.CONTAINER_ENGINE || (isCommandAvailable("docker") ? "docker" : "podman");

function isCommandAvailable(command) {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

// Checked over TCP: on a new volume the image first runs a temporary server on the Unix socket only,
// and a socket check would pass before the real server (the one published on 5433) is up.
function isPostgresReady() {
  const result = spawnSync(engine, ["exec", POSTGRES_CONTAINER, "pg_isready", "-h", "127.0.0.1", "-U", dbUser, "-d", dbName], { stdio: "ignore" });
  return result.status === 0;
}

function ensureTestDatabase() {
  const testDatabase = `${dbName}_test`;
  const query = `SELECT 1 FROM pg_database WHERE datname = '${testDatabase}'`;
  const result = spawnSync(engine, ["exec", POSTGRES_CONTAINER, "psql", "-h", "127.0.0.1", "-U", dbUser, "-d", dbName, "-tAc", query], { encoding: "utf8" });
  if (result.stdout.trim() === "1") return;
  run(engine, ["exec", POSTGRES_CONTAINER, "createdb", "-h", "127.0.0.1", "-U", dbUser, testDatabase]);
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function up() {
  run(engine, ["compose", "up", "-d", "postgres"]);
  for (let attempt = 0; attempt < 60; attempt++) {
    if (isPostgresReady()) {
      ensureTestDatabase();
      console.log(`PostgreSQL is ready on localhost:5433 (databases ${dbName} and ${dbName}_test).`);
      return;
    }
    await sleep(1000);
  }
  throw new Error("PostgreSQL did not become ready within 60 seconds.");
}

function down() {
  run(engine, ["compose", "down"]);
}

function backup() {
  const backupDir = path.resolve("backups");
  mkdirSync(backupDir, { recursive: true });
  const fileName = `canhoes-${timestamp()}.dump`;
  const containerFile = `/tmp/${fileName}`;
  const outputFile = path.join(backupDir, fileName);

  run(engine, ["exec", POSTGRES_CONTAINER, "pg_dump", "-U", dbUser, "-d", dbName, "-Fc", "-f", containerFile]);
  run(engine, ["cp", `${POSTGRES_CONTAINER}:${containerFile}`, outputFile]);
  console.log(outputFile);
}

function restore(backupFile) {
  if (!backupFile) throw new Error("Usage: npm run db:restore -- <backup file>");
  const resolvedFile = path.resolve(backupFile);
  if (!existsSync(resolvedFile)) throw new Error(`Backup not found: ${resolvedFile}`);
  const containerFile = "/tmp/canhoes-restore.dump";

  run(engine, ["cp", resolvedFile, `${POSTGRES_CONTAINER}:${containerFile}`]);
  run(engine, ["exec", POSTGRES_CONTAINER, "pg_restore", "--clean", "--if-exists", "--no-owner", "-U", dbUser, "-d", dbName, containerFile]);
}

function baseline(flag) {
  if (flag !== "--existing-database") {
    throw new Error("Baseline is only for a verified existing database. Use npm run db:migrate for a new database.");
  }
  run("npx", ["prisma", "migrate", "resolve", "--applied", "00000000000000_baseline"]);
}

const [action, argument] = process.argv.slice(2);
const actions = {
  up,
  down,
  backup,
  restore: () => restore(argument),
  baseline: () => baseline(argument),
};

if (!(action in actions)) {
  console.error("Usage: node scripts/db.mjs <up|down|backup|restore <file>|baseline --existing-database>");
  process.exit(1);
}

try {
  await actions[action]();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
