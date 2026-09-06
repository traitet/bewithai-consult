"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { enrollInCourse, updateProgress, completeCourse, submitPreTest } from "@/lib/repos/elearning";

export async function enrollAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const courseId = String(formData.get("courseId") ?? "");
  await enrollInCourse(scope, courseId);
  revalidatePath("/elearning");
}

export async function updateProgressAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const courseId = String(formData.get("courseId") ?? "");
  const progressPct = Number(formData.get("progressPct") ?? 0);
  await updateProgress(scope, courseId, progressPct);
  revalidatePath("/elearning");
}

export async function completeCourseAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const courseId = String(formData.get("courseId") ?? "");
  const score = Number(formData.get("score") ?? 0);
  const satisfactionRatingRaw = formData.get("satisfactionRating");
  const satisfactionRating = satisfactionRatingRaw ? Number(satisfactionRatingRaw) : undefined;
  const satisfactionComment = String(formData.get("satisfactionComment") ?? "").trim() || undefined;

  await completeCourse(scope, courseId, score, { satisfactionRating, satisfactionComment });
  revalidatePath("/elearning");
  revalidatePath("/skills");
}

export async function submitPreTestAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const courseId = String(formData.get("courseId") ?? "");
  const score = Number(formData.get("score") ?? 0);
  await submitPreTest(scope, courseId, score);
  revalidatePath("/elearning");
}
