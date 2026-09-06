"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { addComment, rateCaseStudy, submitCaseStudy, approveCaseStudy, rejectCaseStudy } from "@/lib/repos/case-studies";

export async function addCommentAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const caseStudyId = String(formData.get("caseStudyId") ?? "");
  const body = String(formData.get("body") ?? "");

  await addComment(scope, caseStudyId, body);
  revalidatePath(`/success-stories/${caseStudyId}`);
}

export async function rateCaseStudyAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const caseStudyId = String(formData.get("caseStudyId") ?? "");
  const rating = Number(formData.get("rating"));

  await rateCaseStudy(scope, caseStudyId, rating);
  revalidatePath(`/success-stories/${caseStudyId}`);
}

export async function submitCaseStudyAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const projectId = String(formData.get("projectId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  if (!title || !summary) throw new Error("Title and summary are required.");

  const caseStudy = await submitCaseStudy(scope, { projectId, title, summary, imageUrl: imageUrl || null });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/success-stories/${caseStudy.id}`);
}

export async function approveCaseStudyAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const caseStudyId = String(formData.get("caseStudyId") ?? "");
  const comment = String(formData.get("comment") ?? "");

  await approveCaseStudy(scope, caseStudyId, comment || undefined);
  revalidatePath(`/success-stories/${caseStudyId}`);
  revalidatePath("/success-stories");
}

export async function rejectCaseStudyAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const caseStudyId = String(formData.get("caseStudyId") ?? "");
  const comment = String(formData.get("comment") ?? "");

  await rejectCaseStudy(scope, caseStudyId, comment);
  revalidatePath(`/success-stories/${caseStudyId}`);
}
