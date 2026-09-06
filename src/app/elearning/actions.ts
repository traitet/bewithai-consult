"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { enrollInCourse, updateProgress, completeCourse } from "@/lib/repos/elearning";

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
  await completeCourse(scope, courseId, score);
  revalidatePath("/elearning");
  revalidatePath("/skills");
}
