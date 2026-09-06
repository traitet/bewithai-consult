import { db } from "@/lib/db/client";
import { users, orgUnits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

/** Default annual benefit-hours target: 15% of a 2,000 hour work year. Kept here so the number has one home. */
export const DEFAULT_ANNUAL_TARGET_HOURS = 300;

/** Walks a user's org unit up to find which Division it belongs to (a user may be assigned directly at the Division level, in which case that's the answer). */
async function findDivisionForOrgUnit(orgUnitId: string) {
  const all = await db.select().from(orgUnits);
  const byId = new Map(all.map((u) => [u.id, u]));
  let current = byId.get(orgUnitId);
  while (current && current.level !== "DIVISION") {
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return current ?? null;
}

/**
 * Members of every Division the given Division Manager owns, for the
 * "set annual target" screen. A consultant may pass `divisionManagerId` to
 * look at any division manager's team.
 */
export async function listTeamForDivisionManager(scope: Scope, divisionManagerId: string) {
  if (scope.companyId !== null && scope.userId !== divisionManagerId) {
    throw new Error("Forbidden: you can only view your own team");
  }

  const myDivisions = await db.select().from(orgUnits).where(eq(orgUnits.managerUserId, divisionManagerId));
  if (myDivisions.length === 0) return [];

  const divisionIds = new Set(myDivisions.map((d) => d.id));
  const allUnits = await db.select().from(orgUnits);
  const unitToDivision = new Map<string, string>();
  for (const unit of allUnits) {
    const division = await findDivisionForOrgUnit(unit.id);
    if (division && divisionIds.has(division.id)) unitToDivision.set(unit.id, division.id);
  }

  const allUsers = await db.select().from(users);
  return allUsers.filter((u) => u.orgUnitId && unitToDivision.has(u.orgUnitId) && u.id !== divisionManagerId);
}

export async function setAnnualTargetHours(scope: Scope, targetUserId: string, hours: number) {
  if (!Number.isFinite(hours) || hours < 0) throw new Error("Target hours must be a non-negative number");

  const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!targetUser) throw new Error("User not found");
  if (scope.companyId !== null && scope.companyId !== targetUser.companyId) {
    throw new Error("Forbidden: not your company's employee");
  }

  const isConsultant = scope.companyId === null;
  if (!isConsultant) {
    if (scope.role !== "DIVISION_MANAGER") {
      throw new Error("Forbidden: only a Division Manager can set an employee's annual target");
    }
    if (!targetUser.orgUnitId) throw new Error("This user has no department assigned");
    const division = await findDivisionForOrgUnit(targetUser.orgUnitId);
    if (!division || division.managerUserId !== scope.userId) {
      throw new Error("Forbidden: this employee is outside the division you manage");
    }
  }

  await db.update(users).set({ annualTargetHours: Math.round(hours) }).where(eq(users.id, targetUserId));
}
