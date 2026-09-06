import { db } from "@/lib/db/client";
import { issues, projects, benefitSummaries, users, skillRecords, aiTools, approvalSteps, approvalWorkflows, bookings, caseStudies } from "@/lib/db/schema";
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

const MONTH_LABELS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/**
 * Monthly benefit-hours trend for the current year. Each project's full
 * annualized benefit is attributed to the month the project was created in
 * (we don't track month-by-month usage, only a before/after snapshot per
 * project) — a real-data approximation, not fabricated numbers.
 */
export async function getBenefitTrend(scope: Scope, companyId: string | null) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }
  const projectRows = companyId
    ? await db.select().from(projects).where(eq(projects.companyId, companyId))
    : await db.select().from(projects);
  const benefits = await db.select().from(benefitSummaries);
  const benefitByProjectId = new Map(benefits.map((b) => [b.projectId, b]));

  const currentYear = new Date().getFullYear();
  const monthly = Array(12).fill(0);
  for (const p of projectRows) {
    const b = benefitByProjectId.get(p.id);
    if (!b) continue;
    const created = new Date(p.createdAt);
    if (created.getFullYear() !== currentYear) continue;
    const yearlyHours = Math.max(0, b.beforeHoursPerWeek - b.afterHoursPerWeek) * 52;
    monthly[created.getMonth()] += yearlyHours;
  }

  return monthly.map((value, i) => ({ month: MONTH_LABELS_TH[i], value: Math.round(value) }));
}

/** Average proficiency per AI tool, as a % of the max level (L4). */
export async function getTopSkillsSummary(scope: Scope, companyId: string | null) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }
  const tools = await db.select().from(aiTools);
  const skillRows = companyId
    ? await db.select().from(skillRecords).where(eq(skillRecords.companyId, companyId))
    : await db.select().from(skillRecords);

  return tools
    .map((tool) => {
      const mine = skillRows.filter((s) => s.aiToolId === tool.id);
      const pct = mine.length ? Math.round((mine.reduce((s, r) => s + r.level, 0) / mine.length / 4) * 100) : 0;
      return { toolName: tool.name, pct };
    })
    .sort((a, b) => b.pct - a.pct);
}

export type ActivityItem = { id: string; text: string; timestamp: Date; kind: "issue" | "approval" | "booking" | "success" };

/** A merged, timestamp-sorted feed of the most recent real events across modules. */
export async function getRecentActivity(scope: Scope, companyId: string | null, limit = 6): Promise<ActivityItem[]> {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const issueRows = companyId
    ? await db.select().from(issues).where(eq(issues.companyId, companyId))
    : await db.select().from(issues);
  const issueById = new Map(issueRows.map((i) => [i.id, i]));
  const userRows = await db.select().from(users);
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const items: ActivityItem[] = [];

  for (const i of issueRows) {
    items.push({
      id: `issue-${i.id}`,
      text: `${userById.get(i.createdById)?.name ?? "พนักงาน"} แจ้งปัญหาใหม่: "${i.title}"`,
      timestamp: new Date(i.createdAt),
      kind: "issue",
    });
  }

  const projectRows = companyId
    ? await db.select().from(projects).where(eq(projects.companyId, companyId))
    : await db.select().from(projects);
  const projectById = new Map(projectRows.map((p) => [p.id, p]));
  const workflowRows = await db.select().from(approvalWorkflows);
  const relevantWorkflowIds = new Set(workflowRows.filter((w) => projectById.has(w.projectId)).map((w) => w.id));
  const stepRows = await db.select().from(approvalSteps);
  for (const s of stepRows) {
    if (!relevantWorkflowIds.has(s.workflowId) || s.decision === "PENDING" || !s.decidedAt) continue;
    const workflow = workflowRows.find((w) => w.id === s.workflowId);
    const project = workflow ? projectById.get(workflow.projectId) : null;
    if (!project) continue;
    const roleLabelTh: Record<string, string> = {
      SECTION_MANAGER: "หัวหน้าหน่วยงาน",
      DEPARTMENT_MANAGER: "ผู้จัดการแผนก",
      DIVISION_MANAGER: "ผู้จัดการฝ่าย",
    };
    items.push({
      id: `step-${s.id}`,
      text: `${roleLabelTh[s.roleRequired] ?? s.roleRequired}${s.decision === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ"} ${project.title}`,
      timestamp: new Date(s.decidedAt),
      kind: "approval",
    });
  }

  const bookingRows = companyId
    ? await db.select().from(bookings).where(eq(bookings.companyId, companyId))
    : await db.select().from(bookings);
  for (const b of bookingRows) {
    if (b.status !== "CONFIRMED") continue;
    items.push({
      id: `booking-${b.id}`,
      text: `${userById.get(b.consultantId)?.name ?? "Consultant"} มีนัดหมายใหม่กับ ${userById.get(b.requestedById)?.name ?? "พนักงาน"}`,
      timestamp: new Date(b.createdAt),
      kind: "booking",
    });
  }

  const caseStudyRows = companyId
    ? await db.select().from(caseStudies).where(eq(caseStudies.companyId, companyId))
    : await db.select().from(caseStudies);
  for (const c of caseStudyRows) {
    if (c.status !== "PUBLISHED" || !c.decidedAt) continue;
    items.push({
      id: `case-${c.id}`,
      text: `เผยแพร่ Success Story ใหม่: "${c.title}"`,
      timestamp: new Date(c.decidedAt),
      kind: "success",
    });
  }

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}
