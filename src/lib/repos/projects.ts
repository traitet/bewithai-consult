import { db } from "@/lib/db/client";
import { projects, issues, orgUnits, approvalWorkflows, approvalSteps, benefitSummaries, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";
import { resolveApprovalChain } from "@/lib/repos/org-units";
import { APPROVAL_CHAIN } from "@/lib/types";

export async function listProjects(scope: Scope, companyId: string) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }
  return db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      createdAt: projects.createdAt,
      issueTitle: issues.title,
      orgUnitName: orgUnits.name,
    })
    .from(projects)
    .innerJoin(issues, eq(projects.issueId, issues.id))
    .innerJoin(orgUnits, eq(projects.orgUnitId, orgUnits.id))
    .where(eq(projects.companyId, companyId))
    .orderBy(desc(projects.createdAt));
}

export async function getProject(scope: Scope, projectId: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!row) return null;
  if (scope.companyId !== null && scope.companyId !== row.companyId) {
    throw new Error("Forbidden: not your company's project");
  }
  return row;
}

export async function getProjectDetail(scope: Scope, projectId: string) {
  const project = await getProject(scope, projectId);
  if (!project) return null;

  const [issue] = await db.select().from(issues).where(eq(issues.id, project.issueId));
  const [orgUnit] = await db.select().from(orgUnits).where(eq(orgUnits.id, project.orgUnitId));
  const [benefit] = await db.select().from(benefitSummaries).where(eq(benefitSummaries.projectId, projectId));
  const [workflow] = await db
    .select()
    .from(approvalWorkflows)
    .where(eq(approvalWorkflows.projectId, projectId));

  let steps: (typeof approvalSteps.$inferSelect & { approverName: string | null })[] = [];
  if (workflow) {
    const rows = await db
      .select({
        id: approvalSteps.id,
        workflowId: approvalSteps.workflowId,
        stepNumber: approvalSteps.stepNumber,
        roleRequired: approvalSteps.roleRequired,
        approverUserId: approvalSteps.approverUserId,
        decision: approvalSteps.decision,
        targetHoursPerWeek: approvalSteps.targetHoursPerWeek,
        comment: approvalSteps.comment,
        decidedAt: approvalSteps.decidedAt,
        approverName: users.name,
      })
      .from(approvalSteps)
      .leftJoin(users, eq(approvalSteps.approverUserId, users.id))
      .where(eq(approvalSteps.workflowId, workflow.id))
      .orderBy(approvalSteps.stepNumber);
    steps = rows;
  }

  let consultantName: string | null = null;
  if (project.consultantId) {
    const [c] = await db.select().from(users).where(eq(users.id, project.consultantId));
    consultantName = c?.name ?? null;
  }

  return { project, issue, orgUnit, benefit: benefit ?? null, workflow: workflow ?? null, steps, consultantName };
}

/**
 * Creates a project from an issue, plus its PROJECT_APPROVAL workflow with
 * one step per level of the org unit's approval chain (Section ->
 * Department -> Division), each pre-assigned to that unit's manager.
 * Fails loudly if any level in the chain has no manager assigned yet —
 * an approval step with no approver is a design defect the caller (a
 * Settings/org-hierarchy screen) must fix first, not something to paper
 * over here.
 */
export async function createProjectFromIssue(
  scope: Scope,
  input: {
    companyId: string;
    issueId: string;
    orgUnitId: string;
    title: string;
    description: string;
    consultantId?: string;
    aiToolIds: string[];
  }
) {
  if (scope.companyId !== null && scope.companyId !== input.companyId) {
    throw new Error("Forbidden: cannot create a project for another company");
  }

  const chain = await resolveApprovalChain(scope, input.orgUnitId);
  const relevantChain = chain.filter((c) => APPROVAL_CHAIN.includes(c.role));
  const missing = relevantChain.filter((c) => !c.managerUserId);
  if (missing.length > 0) {
    throw new Error(
      `Cannot start approval: ${missing.map((m) => `${m.unitName} has no ${m.role.replace("_", " ").toLowerCase()}`).join(", ")}. Assign a manager in Settings first.`
    );
  }

  return db.transaction((tx) => {
    const [project] = tx
      .insert(projects)
      .values({
        companyId: input.companyId,
        issueId: input.issueId,
        orgUnitId: input.orgUnitId,
        title: input.title,
        description: input.description,
        consultantId: input.consultantId,
        aiToolIds: input.aiToolIds.join(","),
        status: "PENDING_APPROVAL",
      })
      .returning()
      .all();

    tx.update(issues).set({ status: "CONVERTED" }).where(eq(issues.id, input.issueId)).run();

    const [workflow] = tx
      .insert(approvalWorkflows)
      .values({ projectId: project.id, kind: "PROJECT_APPROVAL", status: "PENDING", currentStep: 1 })
      .returning()
      .all();

    relevantChain.forEach((step, index) => {
      tx.insert(approvalSteps)
        .values({
          workflowId: workflow.id,
          stepNumber: index + 1,
          roleRequired: step.role,
          approverUserId: step.managerUserId!,
          decision: "PENDING",
        })
        .run();
    });

    return project;
  });
}
