"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { approveStep, rejectStep } from "@/lib/repos/approvals";
import { updateProjectProgress, updateProjectPlan } from "@/lib/repos/projects";
import { addBenefitImpact, removeBenefitImpact } from "@/lib/repos/benefit";

export async function updateProgressAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const projectId = String(formData.get("projectId") ?? "");
  const progressPct = Number(formData.get("progressPct") ?? 0);

  await updateProjectProgress(scope, projectId, progressPct);
  revalidatePath(`/projects/${projectId}`);
}

export async function updatePlanAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const projectId = String(formData.get("projectId") ?? "");
  const targetCompletionDate = String(formData.get("targetCompletionDate") ?? "");

  if (!targetCompletionDate) throw new Error("Pick a target completion date.");
  await updateProjectPlan(scope, projectId, new Date(targetCompletionDate));
  revalidatePath(`/projects/${projectId}`);
}

export async function addBenefitImpactAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const phase = String(formData.get("phase") ?? "");
  const frequencyUnit = String(formData.get("frequencyUnit") ?? "");
  const frequencyCount = Number(formData.get("frequencyCount") ?? 0);
  const minutesPerOccurrence = Number(formData.get("minutesPerOccurrence") ?? 0);

  if (!userId) throw new Error("Pick who this applies to.");
  await addBenefitImpact(scope, projectId, { userId, phase, frequencyUnit, frequencyCount, minutesPerOccurrence });
  revalidatePath(`/projects/${projectId}`);
}

export async function removeBenefitImpactAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const projectId = String(formData.get("projectId") ?? "");
  const impactId = String(formData.get("impactId") ?? "");

  await removeBenefitImpact(scope, projectId, impactId);
  revalidatePath(`/projects/${projectId}`);
}

export async function approveStepAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const stepId = String(formData.get("stepId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const targetHoursPerWeek = Number(formData.get("targetHoursPerWeek"));
  const comment = String(formData.get("comment") ?? "");

  if (!stepId || Number.isNaN(targetHoursPerWeek) || targetHoursPerWeek <= 0) {
    throw new Error("Enter a valid target time-reduction (hours/week).");
  }

  await approveStep(scope, stepId, { targetHoursPerWeek, comment: comment || undefined });
  revalidatePath(`/projects/${projectId}`);
}

export async function rejectStepAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const stepId = String(formData.get("stepId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const comment = String(formData.get("comment") ?? "");

  if (!stepId || !comment.trim()) {
    throw new Error("A comment is required to reject.");
  }

  await rejectStep(scope, stepId, comment);
  revalidatePath(`/projects/${projectId}`);
}
