import { db } from "@/lib/db/client";
import { issues, issueImpacts, orgUnits, users, companies } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";
import type { IssuePriority } from "@/lib/types";
import { computeHoursPerYear, isFrequencyUnit, type FrequencyUnit } from "@/lib/workload";

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
  const rows = await db
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

  const issueIds = rows.map((r) => r.id);
  const impacts = issueIds.length ? await db.select().from(issueImpacts) : [];
  const relevantImpacts = impacts.filter((i) => issueIds.includes(i.issueId));
  const hoursPerYearByIssueId = new Map<string, number>();
  for (const impact of relevantImpacts) {
    const hours = computeHoursPerYear({ ...impact, frequencyUnit: impact.frequencyUnit as FrequencyUnit });
    hoursPerYearByIssueId.set(impact.issueId, (hoursPerYearByIssueId.get(impact.issueId) ?? 0) + hours);
  }

  return rows.map((r) => ({
    ...r,
    totalHoursPerYear: Math.round((hoursPerYearByIssueId.get(r.id) ?? 0) * 10) / 10,
  }));
}

export async function getIssue(scope: Scope, issueId: string) {
  const [row] = await db.select().from(issues).where(eq(issues.id, issueId));
  if (!row) return null;
  if (scope.companyId !== null && scope.companyId !== row.companyId) {
    throw new Error("Forbidden: not your company's issue");
  }
  return row;
}

export async function getIssueDetail(scope: Scope, issueId: string) {
  const issue = await getIssue(scope, issueId);
  if (!issue) return null;

  const [orgUnit] = await db.select().from(orgUnits).where(eq(orgUnits.id, issue.orgUnitId));
  const [createdBy] = await db.select().from(users).where(eq(users.id, issue.createdById));
  const impacts = await listIssueImpacts(scope, issueId);
  const totalHoursPerYear = Math.round(impacts.reduce((sum, i) => sum + i.hoursPerYear, 0) * 10) / 10;

  return { issue, orgUnit: orgUnit ?? null, createdByName: createdBy?.name ?? "", impacts, totalHoursPerYear };
}

/** Every affected person recorded against this issue, with their computed hours/year. */
export async function listIssueImpacts(scope: Scope, issueId: string) {
  const issue = await getIssue(scope, issueId);
  if (!issue) throw new Error("Issue not found");

  const rows = await db
    .select({
      id: issueImpacts.id,
      userId: issueImpacts.userId,
      userName: users.name,
      frequencyUnit: issueImpacts.frequencyUnit,
      frequencyCount: issueImpacts.frequencyCount,
      minutesPerOccurrence: issueImpacts.minutesPerOccurrence,
    })
    .from(issueImpacts)
    .innerJoin(users, eq(issueImpacts.userId, users.id))
    .where(eq(issueImpacts.issueId, issueId))
    .orderBy(issueImpacts.createdAt);

  return rows.map((r) => ({ ...r, hoursPerYear: computeHoursPerYear({ ...r, frequencyUnit: r.frequencyUnit as FrequencyUnit }) }));
}

export async function addIssueImpact(
  scope: Scope,
  issueId: string,
  input: { userId: string; frequencyUnit: string; frequencyCount: number; minutesPerOccurrence: number }
) {
  const issue = await getIssue(scope, issueId);
  if (!issue) throw new Error("Issue not found");
  if (!isFrequencyUnit(input.frequencyUnit)) throw new Error("Invalid frequency unit");
  if (input.frequencyCount <= 0 || input.minutesPerOccurrence <= 0) {
    throw new Error("Frequency and time per occurrence must be greater than zero");
  }

  const [affected] = await db.select().from(users).where(eq(users.id, input.userId));
  if (!affected || affected.companyId !== issue.companyId) {
    throw new Error("The affected person must belong to the same company as the issue");
  }

  await db.insert(issueImpacts).values({
    issueId,
    userId: input.userId,
    frequencyUnit: input.frequencyUnit as FrequencyUnit,
    frequencyCount: input.frequencyCount,
    minutesPerOccurrence: input.minutesPerOccurrence,
  });
}

export async function removeIssueImpact(scope: Scope, issueId: string, impactId: string) {
  const issue = await getIssue(scope, issueId);
  if (!issue) throw new Error("Issue not found");
  await db.delete(issueImpacts).where(and(eq(issueImpacts.id, impactId), eq(issueImpacts.issueId, issueId)));
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
