"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { createIssue } from "@/lib/repos/issues";
import { ISSUE_PRIORITIES, type IssuePriority } from "@/lib/types";

export async function createIssueAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const companyId = String(formData.get("companyId") ?? "");
  const orgUnitId = String(formData.get("orgUnitId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "MEDIUM");
  const priority = (ISSUE_PRIORITIES as readonly string[]).includes(priorityRaw)
    ? (priorityRaw as IssuePriority)
    : "MEDIUM";

  if (!companyId || !orgUnitId || !title || !description) {
    throw new Error("Title, description, company and department are all required.");
  }

  await createIssue(scope, { companyId, orgUnitId, title, description, priority });
  revalidatePath("/issues");
}
