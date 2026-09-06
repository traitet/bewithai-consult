// Note: deliberately no `import "server-only"` here — this module is also
// imported by standalone scripts (seed, migrations) that run outside the
// Next.js request lifecycle, where that package's guard misfires. The real
// protection against leaking this into a client bundle is that Drizzle
// (better-sqlite3) fails to bundle for the browser at all, and nothing
// under src/lib/repos/* is ever imported from a "use client" file.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";
import fs from "node:fs";

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
  const filePath = url.replace(/^file:/, "");
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath);
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

/**
 * Raw Drizzle client. Do NOT import this outside src/lib/db and
 * src/lib/repos/* — every query that touches a tenant-owned table must go
 * through a repo function that takes an explicit scope (see tenant-db.ts).
 */
export const db = drizzle(sqlite, { schema });
export { sqlite };
