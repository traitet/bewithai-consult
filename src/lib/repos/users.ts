import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

/** Used only by the login flow, before a Scope exists — deliberately not scope-gated. Never call this from anywhere else. */
export async function findUserByEmailForLogin(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email));
  return row ?? null;
}

export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Managers eligible for a given org unit's approval role, scoped to the same company. */
export async function listCompanyUsers(scope: Scope) {
  if (scope.companyId === null) {
    throw new Error("Forbidden: pass an explicit company for a consultant-scoped listing");
  }
  return db.select().from(users).where(eq(users.companyId, scope.companyId));
}

export async function getOwnProfile(scope: Scope) {
  const [row] = await db.select().from(users).where(eq(users.id, scope.userId));
  return row ?? null;
}

/** A user may only ever edit their own record — there is no admin-edits-anyone path here by design. */
export async function updateOwnProfile(scope: Scope, input: { name: string; avatarUrl?: string | null }) {
  if (!input.name.trim()) throw new Error("Name cannot be empty");
  await db
    .update(users)
    .set({ name: input.name.trim(), avatarUrl: input.avatarUrl ?? undefined })
    .where(eq(users.id, scope.userId));
}
