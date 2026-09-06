import { db } from "@/lib/db/client";
import { companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

/** Only consultants may list every company — enforced by the caller checking scope.role, and again here as a second guard. */
export async function listAllCompanies(scope: Scope) {
  if (scope.companyId !== null) {
    throw new Error("Forbidden: company users cannot list all companies");
  }
  return db.select().from(companies).orderBy(companies.name);
}

export async function getCompany(scope: Scope, companyId: string) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }
  const [row] = await db.select().from(companies).where(eq(companies.id, companyId));
  return row ?? null;
}
