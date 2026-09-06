import { db } from "@/lib/db/client";
import { issues, orgUnits, users, companies } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";
import type { IssuePriority } from "@/lib/types";

/**
 * `companyId: null` means "every company" — only reachable for a
 * company-independent scope (consultant/superadmin, see
 * isCompanyIndependentRole). A company user must always pass their own
 * companyId; this throws otherwise, same as before.
 */
export async function listIssues(scope: Scope, companyId: string | null) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }
  return db
    .select({
      id: issues.id,
      title: issues.title,
      priority: issues.priority,
      status: issues.status,
      createdAt: issues.createdAt,
      orgUnitName: orgUnits.name,
      createdByName: users.name,
      companyName: companies.name,
    })
    .from(issues)
    .innerJoin(orgUnits, eq(issues.orgUnitId, orgUnits.id))
    .innerJoin(users, eq(issues.createdById, users.id))
    .innerJoin(companies, eq(issues.companyId, companies.id))
    .where(companyId ? eq(issues.companyId, companyId) : undefined)
    .orderBy(desc(issues.createdAt));
}

export async function getIssue(scope: Scope, issueId: string) {
  const [row] = await db.select().from(issues).where(eq(issues.id, issueId));
  if (!row) return null;
  if (scope.companyId !== null && scope.companyId !== row.companyId) {
    throw new Error("Forbidden: not your company's issue");
  }
  return row;
}

export async function createIssue(
  scope: Scope,
  input: {
    companyId: string;
    orgUnitId: string;
    title: string;
    description: string;
    priority: IssuePriority;
  }
) {
  if (scope.companyId !== null && scope.companyId !== input.companyId) {
    throw new Error("Forbidden: cannot create an issue for another company");
  }
  const [row] = await db
    .insert(issues)
    .values({
      companyId: input.companyId,
      orgUnitId: input.orgUnitId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: "OPEN",
      createdById: scope.userId,
    })
    .returning();
  return row;
}

export async function markIssueConverted(scope: Scope, issueId: string) {
  const issue = await getIssue(scope, issueId);
  if (!issue) throw new Error("Issue not found");
  await db.update(issues).set({ status: "CONVERTED" }).where(eq(issues.id, issueId));
}
