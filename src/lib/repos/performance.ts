import { db } from "@/lib/db/client";
import { users, orgUnits, issues, projects, skillRecords, caseStudies, benefitSummaries } from "@/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

export type EmployeePerformanceRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  departmentName: string | null; // the Department this person's unit rolls up to (or the unit itself if it IS a department)
  divisionName: string | null;
  projectCount: number;
  issueCount: number;
  overallSkillLevel: number;
  caseStudyCount: number;
  /** Actual hours saved/year, credited to whoever submitted the originating issue (client-confirmed attribution rule). */
  benefitHoursPerYear: number;
  /** Set by this person's Division Manager (default 300 = 15% of a 2,000 hr work year). */
  annualTargetHours: number;
};

/** A given org unit plus every unit nested under it — used for the org-unit filter. */
async function expandOrgUnitIds(allUnits: { id: string; parentId: string | null }[], rootId: string): Promise<Set<string>> {
  const ids = new Set([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = allUnits.filter((u) => u.parentId && frontier.includes(u.parentId)).map((u) => u.id);
    children.forEach((id) => ids.add(id));
    frontier = children;
  }
  return ids;
}

export async function listEmployeePerformance(
  scope: Scope,
  companyId: string | null,
  opts: { orgUnitId?: string | null; search?: string } = {}
): Promise<EmployeePerformanceRow[]> {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const employees = await db
    .select()
    .from(users)
    .where(companyId ? eq(users.companyId, companyId) : isNotNull(users.companyId));

  const allUnits = companyId
    ? await db.select().from(orgUnits).where(eq(orgUnits.companyId, companyId))
    : await db.select().from(orgUnits);
  const unitById = new Map(allUnits.map((u) => [u.id, u]));

  function ancestorNames(orgUnitId: string | null): { departmentName: string | null; divisionName: string | null } {
    let current = orgUnitId ? unitById.get(orgUnitId) : undefined;
    let departmentName: string | null = null;
    let divisionName: string | null = null;
    while (current) {
      if (current.level === "DEPARTMENT") departmentName = current.name;
      if (current.level === "DIVISION") divisionName = current.name;
      current = current.parentId ? unitById.get(current.parentId) : undefined;
    }
    return { departmentName, divisionName };
  }

  const issueRows = companyId ? await db.select().from(issues).where(eq(issues.companyId, companyId)) : await db.select().from(issues);
  const projectRows = companyId ? await db.select().from(projects).where(eq(projects.companyId, companyId)) : await db.select().from(projects);
  const skillRows = companyId ? await db.select().from(skillRecords).where(eq(skillRecords.companyId, companyId)) : await db.select().from(skillRecords);
  const caseStudyRows = companyId ? await db.select().from(caseStudies).where(eq(caseStudies.companyId, companyId)) : await db.select().from(caseStudies);

  const issueCountByUser = new Map<string, number>();
  for (const i of issueRows) issueCountByUser.set(i.createdById, (issueCountByUser.get(i.createdById) ?? 0) + 1);

  const issueOwnerByProject = new Map<string, string>();
  for (const p of projectRows) {
    const issue = issueRows.find((i) => i.id === p.issueId);
    if (issue) issueOwnerByProject.set(p.id, issue.createdById);
  }
  const projectCountByUser = new Map<string, number>();
  for (const [, ownerId] of issueOwnerByProject) projectCountByUser.set(ownerId, (projectCountByUser.get(ownerId) ?? 0) + 1);
  for (const p of projectRows) {
    if (!p.consultantId) continue;
    projectCountByUser.set(p.consultantId, (projectCountByUser.get(p.consultantId) ?? 0) + 1);
  }

  const skillLevelByUser = new Map<string, number>();
  for (const s of skillRows) {
    const current = skillLevelByUser.get(s.userId) ?? 0;
    if (s.level > current) skillLevelByUser.set(s.userId, s.level);
  }

  const caseStudyCountByUser = new Map<string, number>();
  for (const c of caseStudyRows) caseStudyCountByUser.set(c.submittedById, (caseStudyCountByUser.get(c.submittedById) ?? 0) + 1);

  // Actual benefit hours/year, credited to the issue submitter (confirmed attribution rule).
  const benefits = await db.select().from(benefitSummaries);
  const benefitByProjectId = new Map(benefits.map((b) => [b.projectId, b]));
  const benefitHoursByUser = new Map<string, number>();
  for (const [projectId, ownerId] of issueOwnerByProject) {
    const b = benefitByProjectId.get(projectId);
    if (!b) continue;
    const hoursPerYear = Math.max(0, b.beforeHoursPerWeek - b.afterHoursPerWeek) * 52;
    benefitHoursByUser.set(ownerId, (benefitHoursByUser.get(ownerId) ?? 0) + hoursPerYear);
  }

  let scoped = employees;
  if (opts.orgUnitId) {
    const allowed = await expandOrgUnitIds(allUnits, opts.orgUnitId);
    scoped = scoped.filter((e) => e.orgUnitId && allowed.has(e.orgUnitId));
  }
  if (opts.search?.trim()) {
    const needle = opts.search.trim().toLowerCase();
    scoped = scoped.filter((e) => e.name.toLowerCase().includes(needle));
  }

  return scoped
    .map((e) => {
      const { departmentName, divisionName } = ancestorNames(e.orgUnitId);
      return {
        userId: e.id,
        avatarUrl: e.avatarUrl,
        name: e.name,
        role: e.role,
        orgUnitId: e.orgUnitId,
        orgUnitName: e.orgUnitId ? (unitById.get(e.orgUnitId)?.name ?? null) : null,
        departmentName,
        divisionName,
        projectCount: projectCountByUser.get(e.id) ?? 0,
        issueCount: issueCountByUser.get(e.id) ?? 0,
        overallSkillLevel: skillLevelByUser.get(e.id) ?? 0,
        caseStudyCount: caseStudyCountByUser.get(e.id) ?? 0,
        benefitHoursPerYear: Math.round(benefitHoursByUser.get(e.id) ?? 0),
        annualTargetHours: e.annualTargetHours,
      };
    })
    .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name));
}

export type DeptGroup = {
  key: string;
  divisionName: string | null;
  departmentName: string | null;
  employeeCount: number;
  totalProjects: number;
  totalIssues: number;
  totalCaseStudies: number;
  avgSkillLevel: number;
  totalBenefitHoursPerYear: number;
  totalTargetHours: number;
};

/** Rolls the per-employee rows up into one summary row per Department (falls back to Division for anyone without a department, e.g. a Division Manager sitting directly under the Division). */
export function groupByDepartment(rows: EmployeePerformanceRow[]): DeptGroup[] {
  const groups = new Map<string, EmployeePerformanceRow[]>();
  for (const row of rows) {
    const key = row.departmentName ?? row.divisionName ?? "ไม่ระบุหน่วยงาน";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return Array.from(groups.entries())
    .map(([key, members]) => ({
      key,
      divisionName: members[0].divisionName,
      departmentName: members[0].departmentName,
      employeeCount: members.length,
      totalProjects: members.reduce((s, m) => s + m.projectCount, 0),
      totalIssues: members.reduce((s, m) => s + m.issueCount, 0),
      totalCaseStudies: members.reduce((s, m) => s + m.caseStudyCount, 0),
      avgSkillLevel:
        Math.round((members.reduce((s, m) => s + m.overallSkillLevel, 0) / members.length) * 10) / 10 || 0,
      totalBenefitHoursPerYear: Math.round(members.reduce((s, m) => s + m.benefitHoursPerYear, 0)),
      totalTargetHours: members.reduce((s, m) => s + m.annualTargetHours, 0),
    }))
    .sort((a, b) => b.totalProjects - a.totalProjects);
}
