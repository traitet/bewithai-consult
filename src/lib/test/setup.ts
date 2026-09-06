import fs from "node:fs";
import path from "node:path";

// Point every test at its own throwaway SQLite file, never the dev database
// (data/dev.db). Must run before anything imports src/lib/db/client.ts.
const TEST_DB_PATH = path.resolve(process.cwd(), "data/test.db");
for (const suffix of ["", "-wal", "-shm"]) {
  if (fs.existsSync(TEST_DB_PATH + suffix)) fs.unlinkSync(TEST_DB_PATH + suffix);
}
process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
process.env.AUTH_SECRET ??= "test-secret-not-for-production-use-only-in-vitest-runs";

const { sqlite } = await import("@/lib/db/client");
const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
const { drizzle } = await import("drizzle-orm/better-sqlite3");

migrate(drizzle(sqlite), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
