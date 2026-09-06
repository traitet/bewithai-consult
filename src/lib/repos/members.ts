import { db } from "@/lib/db/client";
import { users, orgUnits, companies, skillRecords, aiTools, issues, projects, benefitSummaries } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

/** A single employee's public profile view — used when clicking a name anywhere in the app (project owner, issue submitter, etc). */
export async function getMemberProfile(scope: Scope, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  if (scope.companyId !== null && scope.companyId !== user.companyId) {
    throw new Error("Forbidden: not your company's employee");
  }

  const orgUnit = user.orgUnitId ? (await db.select().from(orgUnits).where(eq(orgUnits.id, user.orgUnitId)))[0] : null;
  const company = user.companyId ? (await db.select().from(companies).where(eq(companies.id, user.companyId)))[0] : null;

  const skills = await db
    .select({ level: skillRecords.level, source: skillRecords.source, aiToolName: aiTools.name })
    .from(skillRecords)
    .innerJoin(aiTools, eq(skillRecords.aiToolId, aiTools.id))
    .where(eq(skillRecords.userId, userId));

  const submittedIssues = await db.select().from(issues).where(eq(issues.createdById, userId));

  const projectsAsRequester = await db
    .select({ id: projects.id, title: projects.title, status: projects.status })
    .from(projects)
    .innerJoin(issues, eq(projects.issueId, issues.id))
    .where(eq(issues.createdById, userId));

  const projectsAsConsultant =
    user.role === "CONSULTANT"
      ? await db.select({ id: projects.id, title: projects.title, status: projects.status }).from(projects).where(eq(projects.consultantId, userId))
      : [];

  // Actual benefit hours/year credited to this person (issue-submitter attribution rule).
  let benefitHoursPerYear = 0;
  for (const p of projectsAsRequester) {
    const [b] = await db.select().from(benefitSummaries).where(eq(benefitSummaries.projectId, p.id));
    if (b) benefitHoursPerYear += Math.max(0, b.beforeHoursPerWeek - b.afterHoursPerWeek) * 52;
  }

  return {
    user,
    orgUnit,
    company,
    skills,
    submittedIssues,
    benefitHoursPerYear: Math.round(benefitHoursPerYear),
    annualTargetHours: user.annualTargetHours,
    projects: [...projectsAsRequester, ...projectsAsConsultant].filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    ),
  };
}
