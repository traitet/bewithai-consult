import { db } from "@/lib/db/client";
import { users, aiTools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Consultants are global (companyId null) — every company user is allowed to see the 3 names to pick one for their project, so this is intentionally not scope-gated. */
export async function listConsultants() {
  return db.select().from(users).where(eq(users.role, "CONSULTANT"));
}

export async function listAiTools() {
  return db.select().from(aiTools);
}
