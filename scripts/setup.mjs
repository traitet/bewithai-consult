// One-time local setup: `npm run setup`
// - copies .env.example -> .env if missing
// - runs the DB migration
// - seeds demo data
import fs from "node:fs";
import { execSync } from "node:child_process";

if (!fs.existsSync(".env")) {
  fs.copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
} else {
  console.log(".env already exists, leaving it as-is");
}

console.log("\n> Applying database migrations...");
execSync("npx drizzle-kit migrate", { stdio: "inherit" });

console.log("\n> Seeding demo data...");
execSync("npx tsx src/lib/db/seed.ts", { stdio: "inherit" });

console.log("\nSetup complete. Run: npm run dev");
