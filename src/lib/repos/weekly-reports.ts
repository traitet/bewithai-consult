import { db } from "@/lib/db/client";
import { weeklyProgressReports, projects, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";
import { getProject, updateProjectProgress } from "@/lib/repos/projects";
import { getWeekEndingSunday, listWeekEndings, isWeekPastDue } from "@/lib/weeklyReport";

export async function listWeeklyReports(scope: Scope, projectId: string) {
  const project = await getProject(scope, projectId);
  if (!project) throw new Error("Project not found");
  return db
    .select({
      id: weeklyProgressReports.id,
      weekEnding: weeklyProgressReports.weekEnding,
      progressPct: weeklyProgressReports.progressPct,
      summary: weeklyProgressReports.summary,
      submittedAt: weeklyProgressReports.submittedAt,
      submittedByName: users.name,
    })
    .from(weeklyProgressReports)
    .innerJoin(users, eq(weeklyProgressReports.submittedById, users.id))
    .where(eq(weeklyProgressReports.projectId, projectId))
    .orderBy(desc(weeklyProgressReports.weekEnding));
}

export type WeeklyReportStatus = {
  hasPlan: boolean;
  currentWeekEnding: Date | null;
  currentWeekSubmitted: boolean;
  isOverdue: boolean;
  missedWeeks: Date[];
};

/**
 * Compliance snapshot for one project: has this week's report been filed,
 * and which past weeks (since the delivery plan's start date) were skipped
 * past their Sunday deadline. Only meaningful once a delivery plan exists
 * (targetStartDate is set at final approval — see projects.ts) and the
 * project isn't already done.
 */
export async function getWeeklyReportStatus(scope: Scope, projectId: string): Promise<WeeklyReportStatus> {
  const project = await getProject(scope, projectId);
  if (!project) throw new Error("Project not found");
  if (!project.targetStartDate || project.progressPct >= 100) {
    return { hasPlan: false, currentWeekEnding: null, currentWeekSubmitted: false, isOverdue: false, missedWeeks: [] };
  }

  const now = new Date();
  const currentWeekEnding = getWeekEndingSunday(now);
  const expectedWeeks = listWeekEndings(project.targetStartDate, now);
  const reports = await db.select().from(weeklyProgressReports).where(eq(weeklyProgressReports.projectId, projectId));
  const reportedWeekTimes = new Set(reports.map((r) => r.weekEnding.getTime()));

  const missedWeeks = expectedWeeks.filter((w) => isWeekPastDue(w, now) && !reportedWeekTimes.has(w.getTime()));
  const currentWeekSubmitted = reportedWeekTimes.has(currentWeekEnding.getTime());

  return { hasPlan: true, currentWeekEnding, currentWeekSubmitted, isOverdue: missedWeeks.length > 0, missedWeeks };
}

/** Every project (within scope) that has missed at least one week's report deadline — the manager tracking list. */
export async function listOverdueWeeklyReports(scope: Scope, companyId: string | null) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }
  const rows = await db
    .select()
    .from(projects)
    .where(companyId ? eq(projects.companyId, companyId) : undefined);

  const trackable = rows.filter((p) => p.targetStartDate && p.progressPct < 100);
  const results: { project: typeof rows[number]; status: WeeklyReportStatus }[] = [];
  for (const project of trackable) {
    const status = await getWeeklyReportStatus(scope, project.id);
    if (status.isOverdue) results.push({ project, status });
  }
  return results;
}

export async function submitWeeklyReport(
  scope: Scope,
  projectId: string,
  input: { progressPct: number; summary: string }
) {
  const project = await getProject(scope, projectId);
  if (!project) throw new Error("Project not found");
  if (!input.summary.trim()) throw new Error("Please describe this week's progress.");
  const clampedProgress = Math.max(0, Math.min(100, Math.round(input.progressPct)));
  const weekEnding = getWeekEndingSunday(new Date());

  const [existing] = await db
    .select()
    .from(weeklyProgressReports)
    .where(and(eq(weeklyProgressReports.projectId, projectId), eq(weeklyProgressReports.weekEnding, weekEnding)));

  if (existing) {
    await db
      .update(weeklyProgressReports)
      .set({ progressPct: clampedProgress, summary: input.summary.trim(), submittedById: scope.userId, submittedAt: new Date() })
      .where(eq(weeklyProgressReports.id, existing.id));
  } else {
    await db.insert(weeklyProgressReports).values({
      projectId,
      weekEnding,
      progressPct: clampedProgress,
      summary: input.summary.trim(),
      submittedById: scope.userId,
    });
  }

  await updateProjectProgress(scope, projectId, clampedProgress);
}
