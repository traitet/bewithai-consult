"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { setAnnualTargetHours } from "@/lib/repos/team";

export async function setAnnualTargetAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const userId = String(formData.get("userId") ?? "");
  const hours = Number(formData.get("annualTargetHours"));

  await setAnnualTargetHours(scope, userId, hours);
  revalidatePath("/team");
}
