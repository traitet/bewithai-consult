"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { setMySkillLevel } from "@/lib/repos/skills";

export async function setMySkillLevelAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const aiToolId = String(formData.get("aiToolId") ?? "");
  const level = Number(formData.get("level"));

  await setMySkillLevel(scope, aiToolId, level);
  revalidatePath("/skills");
}
