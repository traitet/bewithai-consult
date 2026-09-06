import { db } from "@/lib/db/client";
import { approvalSteps, approvalWorkflows, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

async function loadStepContext(stepId: string) {
  const [step] = await db.select().from(approvalSteps).where(eq(approvalSteps.id, stepId));
  if (!step) throw new Error("Approval step not found");
  const [workflow] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, step.workflowId));
  if (!workflow) throw new Error("Workflow not found");
  const [project] = await db.select().from(projects).where(eq(projects.id, workflow.projectId));
  if (!project) throw new Error("Project not found");
  return { step, workflow, project };
}

function assertCanDecide(scope: Scope, step: { approverUserId: string | null; stepNumber: number }, workflow: { currentStep: number; status: string }) {
  if (workflow.status !== "PENDING") {
    throw new Error("This workflow is already decided");
  }
  if (step.stepNumber !== workflow.currentStep) {
    throw new Error("It is not this step's turn yet");
  }
  const isAssignedApprover = step.approverUserId === scope.userId;
  const isConsultantOverride = scope.companyId === null; // consultants may act on behalf of an absent manager
  if (!isAssignedApprover && !isConsultantOverride) {
    throw new Error("Forbidden: you are not this step's approver");
  }
}

export async function approveStep(
  scope: Scope,
  stepId: string,
  input: { targetHoursPerWeek: number; comment?: string }
) {
  const { step, workflow, project } = await loadStepContext(stepId);
  if (scope.companyId !== null && scope.companyId !== project.companyId) {
    throw new Error("Forbidden: not your company's approval");
  }
  assertCanDecide(scope, step, workflow);

  const isFinalStep = await isLastStep(workflow.id, step.stepNumber);

  await db
    .update(approvalSteps)
    .set({
      decision: "APPROVED",
      targetHoursPerWeek: input.targetHoursPerWeek,
      comment: input.comment ?? null,
      decidedAt: new Date(),
    })
    .where(eq(approvalSteps.id, stepId));

  if (isFinalStep) {
    await db.update(approvalWorkflows).set({ status: "APPROVED" }).where(eq(approvalWorkflows.id, workflow.id));
    await db.update(projects).set({ status: "APPROVED" }).where(eq(projects.id, project.id));
  } else {
    await db
      .update(approvalWorkflows)
      .set({ currentStep: workflow.currentStep + 1 })
      .where(eq(approvalWorkflows.id, workflow.id));
  }
}

export async function rejectStep(scope: Scope, stepId: string, comment: string) {
  const { step, workflow, project } = await loadStepContext(stepId);
  if (scope.companyId !== null && scope.companyId !== project.companyId) {
    throw new Error("Forbidden: not your company's approval");
  }
  assertCanDecide(scope, step, workflow);

  await db
    .update(approvalSteps)
    .set({ decision: "REJECTED", comment, decidedAt: new Date() })
    .where(eq(approvalSteps.id, stepId));
  await db.update(approvalWorkflows).set({ status: "REJECTED" }).where(eq(approvalWorkflows.id, workflow.id));
  await db.update(projects).set({ status: "REJECTED" }).where(eq(projects.id, project.id));
}

async function isLastStep(workflowId: string, stepNumber: number): Promise<boolean> {
  const steps = await db.select().from(approvalSteps).where(eq(approvalSteps.workflowId, workflowId));
  const maxStep = Math.max(...steps.map((s) => s.stepNumber));
  return stepNumber === maxStep;
}
