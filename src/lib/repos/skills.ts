import { db } from "@/lib/db/client";
import { skillRecords, users, aiTools } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

export type SkillDirectoryRow = {
  userId: string;
  name: string;
  role: string;
  levels: Record<string, number>; // aiToolId -> level
  overallLevel: number;
};

export async function listSkillDirectory(scope: Scope, companyId: string): Promise<SkillDirectoryRow[]> {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const employees = await db.select().from(users).where(eq(users.companyId, companyId));
  const records = await db.select().from(skillRecords).where(eq(skillRecords.companyId, companyId));

  return employees
    .map((u) => {
      const mine = records.filter((r) => r.userId === u.id);
      const levels: Record<string, number> = {};
      for (const r of mine) levels[r.aiToolId] = r.level;
      const overallLevel = mine.length ? Math.max(...mine.map((r) => r.level)) : 0;
      return { userId: u.id, name: u.name, role: u.role, levels, overallLevel };
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
