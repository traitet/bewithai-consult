import { db } from "@/lib/db/client";
import { issues, projects, benefitSummaries, users, skillRecords } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

/**
 * `companyId` here is the *effective viewing* company (see
 * src/lib/company-context.ts): null means "aggregate across every company",
 * which is only ever reachable for a consultant scope, since AppShell
 * always resolves a company user's own companyId.
 */
export async function getDashboardStats(scope: Scope, companyId: string | null) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const issueRows = companyId
    ? await db.select().from(issues).where(eq(issues.companyId, companyId))
    : await db.select().from(issues);

  const projectRows = companyId
    ? await db.select().from(projects).where(eq(projects.companyId, companyId))
    : await db.select().from(projects);

  const openIssues = issueRows.filter((i) => i.status === "OPEN" || i.status === "IN_REVIEW").length;
  const activeProjects = projectRows.filter((p) => p.status === "APPROVED" || p.status === "IN_PROGRESS").length;

  const projectIds = projectRows.map((p) => p.id);
  let totalBenefitHoursPerYear = 0;
  if (projectIds.length > 0) {
    const benefits = await db.select().from(benefitSummaries);
    for (const b of benefits) {
      if (!projectIds.includes(b.projectId)) continue;
      totalBenefitHoursPerYear += Math.max(0, b.afterHoursPerWeek < b.beforeHoursPerWeek ? (b.beforeHoursPerWeek - b.afterHoursPerWeek) * 52 : 0);
    }
  }

  const consultantCount = (await db.select().from(users).where(eq(users.role, "CONSULTANT"))).length;

  const skillRows = companyId
    ? await db.select().from(skillRecords).where(eq(skillRecords.companyId, companyId))
    : await db.select().from(skillRecords);
  const avgSkillLevel = skillRows.length
    ? skillRows.reduce((sum, s) => sum + s.level, 0) / skillRows.length
    : 0;

  const statusBreakdown = {
    PENDING_APPROVAL: projectRows.filter((p) => p.status === "PENDING_APPROVAL").length,
    APPROVED: projectRows.filter((p) => p.status === "APPROVED").length,
    IN_PROGRESS: projectRows.filter((p) => p.status === "IN_PROGRESS").length,
    COMPLETED: projectRows.filter((p) => p.status === "COMPLETED").length,
  };

  return {
    openIssues,
    activeProjects,
    totalProjects: projectRows.length,
    totalBenefitHoursPerYear: Math.round(totalBenefitHoursPerYear),
    consultantCount,
    avgSkillLevel: Math.round(avgSkillLevel * 10) / 10,
    statusBreakdown,
  };
}
