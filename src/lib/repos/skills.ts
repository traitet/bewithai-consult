import { db } from "@/lib/db/client";
import { skillRecords, users, aiTools, companies, orgUnits } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

export type SkillDirectoryRow = {
  userId: string;
  name: string;
  role: string;
  companyName?: string;
  orgUnitName: string | null;
  levels: Record<string, number>; // aiToolId -> level
  overallLevel: number;
};

/** A given org unit plus every unit nested under it (Division -> its Departments -> their Sections). */
async function expandOrgUnitIds(orgUnitId: string): Promise<string[]> {
  const all = await db.select().from(orgUnits);
  const ids = [orgUnitId];
  let frontier = [orgUnitId];
  while (frontier.length > 0) {
    const children = all.filter((u) => u.parentId && frontier.includes(u.parentId)).map((u) => u.id);
    ids.push(...children);
    frontier = children;
  }
  return ids;
}

/**
 * `companyId: null` means "every company" — only reachable for a
 * company-independent scope. `orgUnitId`, if given, restricts to that org
 * unit and everything nested under it (e.g. picking a Division includes
 * every Department and Section inside it) — only meaningful alongside a
 * specific `companyId`, since org units aren't shared across companies.
 */
export async function listSkillDirectory(
  scope: Scope,
  companyId: string | null,
  orgUnitId?: string | null
): Promise<SkillDirectoryRow[]> {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const employees = await db
    .select({ id: users.id, name: users.name, role: users.role, companyName: companies.name, orgUnitId: users.orgUnitId })
    .from(users)
    .innerJoin(companies, eq(users.companyId, companies.id))
    .where(companyId ? eq(users.companyId, companyId) : isNotNull(users.companyId));

  const allOrgUnits = companyId ? await db.select().from(orgUnits).where(eq(orgUnits.companyId, companyId)) : [];
  const orgUnitNameById = new Map(allOrgUnits.map((u) => [u.id, u.name]));

  const allowedOrgUnitIds = orgUnitId ? new Set(await expandOrgUnitIds(orgUnitId)) : null;
  const scopedEmployees = allowedOrgUnitIds
    ? employees.filter((u) => u.orgUnitId && allowedOrgUnitIds.has(u.orgUnitId))
    : employees;

  const records = companyId
    ? await db.select().from(skillRecords).where(eq(skillRecords.companyId, companyId))
    : await db.select().from(skillRecords);

  return scopedEmployees
    .map((u) => {
      const mine = records.filter((r) => r.userId === u.id);
      const levels: Record<string, number> = {};
      for (const r of mine) levels[r.aiToolId] = r.level;
      const overallLevel = mine.length ? Math.max(...mine.map((r) => r.level)) : 0;
      return {
        userId: u.id,
        name: u.name,
        role: u.role,
        companyName: u.companyName,
        orgUnitName: u.orgUnitId ? (orgUnitNameById.get(u.orgUnitId) ?? null) : null,
        levels,
        overallLevel,
      };
    })
    .sort((a, b) => b.overallLevel - a.overallLevel || a.name.localeCompare(b.name));
}

export async function listSkillLevelDefs(scope: Scope) {
  const { skillLevelDefs } = await import("@/lib/db/schema");
  return db.select().from(skillLevelDefs).orderBy(skillLevelDefs.level);
}

export async function setMySkillLevel(scope: Scope, aiToolId: string, level: number) {
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new Error("Level must be 1-4");
  if (scope.companyId === null) throw new Error("Only company employees have a skill record here");

  const [existing] = await db
    .select()
    .from(skillRecords)
    .where(and(eq(skillRecords.userId, scope.userId), eq(skillRecords.aiToolId, aiToolId)));

  if (existing) {
    await db.update(skillRecords).set({ level, source: "MANUAL", updatedAt: new Date() }).where(eq(skillRecords.id, existing.id));
  } else {
    await db.insert(skillRecords).values({ companyId: scope.companyId, userId: scope.userId, aiToolId, level, source: "MANUAL" });
  }
}
