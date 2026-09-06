"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { approveStep, rejectStep } from "@/lib/repos/approvals";
import { updateProjectProgress } from "@/lib/repos/projects";

export async function updateProgressAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const projectId = String(formData.get("projectId") ?? "");
  const progressPct = Number(formData.get("progressPct") ?? 0);

  await updateProjectProgress(scope, projectId, progressPct);
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
