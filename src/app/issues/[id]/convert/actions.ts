"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { getIssue } from "@/lib/repos/issues";
import { createProjectFromIssue } from "@/lib/repos/projects";

export type ConvertState = { error: string | null };

export async function convertIssueAction(_prev: ConvertState, formData: FormData): Promise<ConvertState> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const issueId = String(formData.get("issueId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const consultantId = String(formData.get("consultantId") ?? "") || undefined;
  const aiToolIds = formData.getAll("aiToolIds").map(String);

  const issue = await getIssue(scope, issueId);
  if (!issue) return { error: "Issue not found." };
  if (issue.status === "CONVERTED") return { error: "This issue was already converted to a project." };
  if (!title || !description) return { error: "Title and description are required." };

  let project;
  try {
    project = await createProjectFromIssue(scope, {
      companyId: issue.companyId,
      issueId: issue.id,
      orgUnitId: issue.orgUnitId,
      title,
      description,
      consultantId,
      aiToolIds,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the project." };
  }

  redirect(`/projects/${project.id}`);
}
