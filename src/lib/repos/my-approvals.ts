import { db } from "@/lib/db/client";
import { approvalSteps, approvalWorkflows, projects, issues, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

/** Steps assigned to this user that are actionable right now (their turn, workflow still pending). */
export async function listPendingApprovalsForUser(scope: Scope) {
  const steps = await db.select().from(approvalSteps).where(eq(approvalSteps.approverUserId, scope.userId));
  const pendingSteps = steps.filter((s) => s.decision === "PENDING");
  if (pendingSteps.length === 0) return [];

  const workflows = await db.select().from(approvalWorkflows);
  const workflowById = new Map(workflows.map((w) => [w.id, w]));

  const actionable = pendingSteps.filter((s) => {
    const wf = workflowById.get(s.workflowId);
    return wf && wf.status === "PENDING" && wf.currentStep === s.stepNumber;
  });

  const results = [];
  for (const step of actionable) {
    const wf = workflowById.get(step.workflowId)!;
    const [project] = await db.select().from(projects).where(eq(projects.id, wf.projectId));
    if (!project) continue;
    const [company] = await db.select().from(companies).where(eq(companies.id, project.companyId));
    results.push({ step, project, companyName: company?.name ?? "" });
  }
  return results;
}

/** Every decision this user has ever made (approved or rejected), most recent first. */
export async function listMyApprovalHistory(scope: Scope) {
  const steps = await db.select().from(approvalSteps).where(eq(approvalSteps.approverUserId, scope.userId));
  const decided = steps.filter((s) => s.decision !== "PENDING" && s.decidedAt);

  const workflows = await db.select().from(approvalWorkflows);
  const workflowById = new Map(workflows.map((w) => [w.id, w]));

  const results = [];
  for (const step of decided) {
    const wf = workflowById.get(step.workflowId);
    if (!wf) continue;
    const [project] = await db.select().from(projects).where(eq(projects.id, wf.projectId));
    if (!project) continue;
    results.push({ step, project });
  }
  return results.sort((a, b) => (b.step.decidedAt?.getTime() ?? 0) - (a.step.decidedAt?.getTime() ?? 0));
}

/** Workflow status of every project that started from an issue this user submitted — "where is my request?" */
export async function listMyRequestsStatus(scope: Scope) {
  const myIssues = await db.select().from(issues).where(eq(issues.createdById, scope.userId));
  const myIssueIds = new Set(myIssues.map((i) => i.id));
  if (myIssueIds.size === 0) return [];

  const allProjects = await db.select().from(projects);
  const myProjects = allProjects.filter((p) => myIssueIds.has(p.issueId));

  const workflows = await db.select().from(approvalWorkflows);
  const allSteps = await db.select().from(approvalSteps);

  return myProjects.map((project) => {
    const workflow = workflows.find((w) => w.projectId === project.id);
    const steps = workflow ? allSteps.filter((s) => s.workflowId === workflow.id).sort((a, b) => a.stepNumber - b.stepNumber) : [];
    const currentStep = workflow ? steps.find((s) => s.stepNumber === workflow.currentStep) : null;
    return { project, workflow: workflow ?? null, currentStepRole: currentStep?.roleRequired ?? null };
  });
}
