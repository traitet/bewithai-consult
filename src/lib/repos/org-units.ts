import { db } from "@/lib/db/client";
import { orgUnits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

export async function listOrgUnits(scope: Scope, companyId: string) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }
  return db.select().from(orgUnits).where(eq(orgUnits.companyId, companyId));
}

export async function getOrgUnit(scope: Scope, orgUnitId: string) {
  const [row] = await db.select().from(orgUnits).where(eq(orgUnits.id, orgUnitId));
  if (!row) return null;
  if (scope.companyId !== null && scope.companyId !== row.companyId) {
    throw new Error("Forbidden: not your company's org unit");
  }
  return row;
}

/**
 * Walks an org unit up to its Division, resolving the manager at each of
 * Section -> Department -> Division. Any missing manager along the way
 * means a project in that unit cannot be submitted for approval yet (see
 * src/lib/repos/approvals.ts) — that failure is intentional, not a bug:
 * every approval step needs a real approver.
 */
export async function resolveApprovalChain(
  scope: Scope,
  orgUnitId: string
): Promise<{ role: "SECTION_MANAGER" | "DEPARTMENT_MANAGER" | "DIVISION_MANAGER"; unitName: string; managerUserId: string | null }[]> {
  const all = await listOrgUnits(scope, (await getOrgUnit(scope, orgUnitId))!.companyId);
  const byId = new Map(all.map((u) => [u.id, u]));

  const chain: { role: "SECTION_MANAGER" | "DEPARTMENT_MANAGER" | "DIVISION_MANAGER"; unitName: string; managerUserId: string | null }[] = [];
  let current = byId.get(orgUnitId);

  // Walk from the unit up to the Division, collecting one entry per level.
  const levelToRole = {
    SECTION: "SECTION_MANAGER",
    DEPARTMENT: "DEPARTMENT_MANAGER",
    DIVISION: "DIVISION_MANAGER",
  } as const;

  while (current) {
    chain.push({
      role: levelToRole[current.level as keyof typeof levelToRole],
      unitName: current.name,
      managerUserId: current.managerUserId,
    });
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  // The walk above starts at the given unit and goes up to the Division, so
  // `chain` is already in Section -> Department -> Division order (a unit
  // that starts at Department, with no Section, simply has no
  // SECTION_MANAGER step — nothing further to reverse here).
  return chain;
}
