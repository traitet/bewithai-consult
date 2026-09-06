"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { updateOwnProfile } from "@/lib/repos/users";

export async function updateProfileAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const name = String(formData.get("name") ?? "");
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();

  await updateOwnProfile(scope, { name, avatarUrl: avatarUrl || null });
  revalidatePath("/profile");
}
