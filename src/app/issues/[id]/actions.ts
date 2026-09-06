"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { addIssueImpact, removeIssueImpact } from "@/lib/repos/issues";

export async function addIssueImpactAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const issueId = String(formData.get("issueId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const frequencyUnit = String(formData.get("frequencyUnit") ?? "");
  const frequencyCount = Number(formData.get("frequencyCount") ?? 0);
  const minutesPerOccurrence = Number(formData.get("minutesPerOccurrence") ?? 0);

  if (!userId) throw new Error("Pick who is affected.");
  await addIssueImpact(scope, issueId, { userId, frequencyUnit, frequencyCount, minutesPerOccurrence });
  revalidatePath(`/issues/${issueId}`);
  revalidatePath("/issues");
}

export async function removeIssueImpactAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const issueId = String(formData.get("issueId") ?? "");
  const impactId = String(formData.get("impactId") ?? "");

  await removeIssueImpact(scope, issueId, impactId);
  revalidatePath(`/issues/${issueId}`);
  revalidatePath("/issues");
}
