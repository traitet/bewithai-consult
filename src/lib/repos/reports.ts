import { db } from "@/lib/db/client";
import { orgUnits, issues, projects, benefitSummaries, skillRecords, enrollments, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

export type DeptReportRow = {
  orgUnitId: string;
  name: string;
  level: string;
  employeeCount: number;
  issueCount: number;
  projectCount: number;
  benefitHoursPerYear: number;
  avgSkillLevel: number;
  elearningCompletionPct: number;
};

/** Per-department (and division/section) rollup for a single company — the drill-down table on the Reports page. */
export async function getCompanyReport(scope: Scope, companyId: string): Promise<DeptReportRow[]> {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const units = await db.select().from(orgUnits).where(eq(orgUnits.companyId, companyId));
  const employees = await db.select().from(users).where(eq(users.companyId, companyId));
  const issueRows = await db.select().from(issues).where(eq(issues.companyId, companyId));
  const projectRows = await db.select().from(projects).where(eq(projects.companyId, companyId));
  const skillRows = await db.select().from(skillRecords).where(eq(skillRecords.companyId, companyId));
  const enrollmentRows = await db.select().from(enrollments).where(eq(enrollments.companyId, companyId));
  const benefits = await db.select().from(benefitSummaries);
  const benefitByProjectId = new Map(benefits.map((b) => [b.projectId, b]));

  // Every descendant (inclusive) of a unit, so a Division's numbers roll up its Departments/Sections.
  function descendantIds(rootId: string): string[] {
    const ids = [rootId];
    let frontier = [rootId];
    while (frontier.length > 0) {
      const children = units.filter((u) => u.parentId && frontier.includes(u.parentId)).map((u) => u.id);
      ids.push(...children);
      frontier = children;
    }
    return ids;
  }

  return units
    .map((unit) => {
      const ids = new Set(descendantIds(unit.id));
      const unitEmployees = employees.filter((e) => e.orgUnitId && ids.has(e.orgUnitId));
      const employeeIds = new Set(unitEmployees.map((e) => e.id));

      const unitIssues = issueRows.filter((i) => ids.has(i.orgUnitId));
      const unitProjects = projectRows.filter((p) => ids.has(p.orgUnitId));

      const benefitHoursPerYear = unitProjects.reduce((sum, p) => {
        const b = benefitByProjectId.get(p.id);
        if (!b) return sum;
        return sum + Math.max(0, b.beforeHoursPerWeek - b.afterHoursPerWeek) * 52;
      }, 0);

      const unitSkills = skillRows.filter((s) => employeeIds.has(s.userId));
      const avgSkillLevel = unitSkills.length ? unitSkills.reduce((s, r) => s + r.level, 0) / unitSkills.length : 0;

      const unitEnrollments = enrollmentRows.filter((e) => employeeIds.has(e.userId));
      const completed = unitEnrollments.filter((e) => e.status === "COMPLETED").length;
      const elearningCompletionPct = unitEnrollments.length ? Math.round((completed / unitEnrollments.length) * 100) : 0;

      return {
        orgUnitId: unit.id,
        name: unit.name,
        level: unit.level,
        employeeCount: unitEmployees.length,
        issueCount: unitIssues.length,
        projectCount: unitProjects.length,
        benefitHoursPerYear: Math.round(benefitHoursPerYear),
        avgSkillLevel: Math.round(avgSkillLevel * 10) / 10,
        elearningCompletionPct,
      };
    })
    .sort((a, b) => {
      const order = { DIVISION: 0, DEPARTMENT: 1, SECTION: 2 } as const;
      return order[a.level as keyof typeof order] - order[b.level as keyof typeof order] || a.name.localeCompare(b.name);
    });
}
