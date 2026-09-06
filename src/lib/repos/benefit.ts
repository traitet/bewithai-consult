import { db } from "@/lib/db/client";
import { benefitImpacts, benefitSummaries, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";
import { computeHoursPerWeek, isFrequencyUnit, type FrequencyUnit } from "@/lib/workload";
import { getProject } from "@/lib/repos/projects";

export const BENEFIT_PHASES = ["BEFORE", "AFTER"] as const;
export type BenefitPhase = (typeof BENEFIT_PHASES)[number];

function isBenefitPhase(value: string): value is BenefitPhase {
  return (BENEFIT_PHASES as readonly string[]).includes(value);
}

/** Every person recorded in a project's detailed before/after breakdown, with their computed hours/week. */
export async function listBenefitImpacts(scope: Scope, projectId: string) {
  const project = await getProject(scope, projectId);
  if (!project) throw new Error("Project not found");

  const rows = await db
    .select({
      id: benefitImpacts.id,
      userId: benefitImpacts.userId,
      userName: users.name,
      phase: benefitImpacts.phase,
      frequencyUnit: benefitImpacts.frequencyUnit,
      frequencyCount: benefitImpacts.frequencyCount,
      minutesPerOccurrence: benefitImpacts.minutesPerOccurrence,
    })
    .from(benefitImpacts)
    .innerJoin(users, eq(benefitImpacts.userId, users.id))
    .where(eq(benefitImpacts.projectId, projectId))
    .orderBy(benefitImpacts.createdAt);

  return rows.map((r) => ({ ...r, hoursPerWeek: computeHoursPerWeek({ ...r, frequencyUnit: r.frequencyUnit as FrequencyUnit }) }));
}

/** Recomputes benefit_summaries.before/afterHoursPerWeek as the sum of the detailed breakdown — keeps every
 * downstream reader (dashboard, reports, performance, members) correct with no changes on their end. */
async function resyncBenefitSummary(projectId: string) {
  const impacts = await db.select().from(benefitImpacts).where(eq(benefitImpacts.projectId, projectId));

  const totalFor = (phase: BenefitPhase) =>
    Math.round(
      impacts
        .filter((i) => i.phase === phase)
        .reduce((sum, i) => sum + computeHoursPerWeek({ ...i, frequencyUnit: i.frequencyUnit as FrequencyUnit }), 0) * 100
    ) / 100;

  const beforeHoursPerWeek = totalFor("BEFORE");
  const afterHoursPerWeek = totalFor("AFTER");

  const [existing] = await db.select().from(benefitSummaries).where(eq(benefitSummaries.projectId, projectId));
  if (existing) {
    await db.update(benefitSummaries).set({ beforeHoursPerWeek, afterHoursPerWeek }).where(eq(benefitSummaries.projectId, projectId));
  } else {
    await db.insert(benefitSummaries).values({ projectId, beforeHoursPerWeek, afterHoursPerWeek, status: "DRAFT" });
  }
}

export async function addBenefitImpact(
  scope: Scope,
  projectId: string,
  input: { userId: string; phase: string; frequencyUnit: string; frequencyCount: number; minutesPerOccurrence: number }
) {
  const project = await getProject(scope, projectId);
  if (!project) throw new Error("Project not found");
  if (!isBenefitPhase(input.phase)) throw new Error("Invalid phase");
  if (!isFrequencyUnit(input.frequencyUnit)) throw new Error("Invalid frequency unit");
  if (input.frequencyCount <= 0 || input.minutesPerOccurrence <= 0) {
    throw new Error("Frequency and time per occurrence must be greater than zero");
  }

  const [affected] = await db.select().from(users).where(eq(users.id, input.userId));
  if (!affected || affected.companyId !== project.companyId) {
    throw new Error("The affected person must belong to the same company as the project");
  }

  await db.insert(benefitImpacts).values({
    projectId,
    userId: input.userId,
    phase: input.phase,
    frequencyUnit: input.frequencyUnit,
    frequencyCount: input.frequencyCount,
    minutesPerOccurrence: input.minutesPerOccurrence,
  });
  await resyncBenefitSummary(projectId);
}

export async function removeBenefitImpact(scope: Scope, projectId: string, impactId: string) {
  const project = await getProject(scope, projectId);
  if (!project) throw new Error("Project not found");
  await db.delete(benefitImpacts).where(and(eq(benefitImpacts.id, impactId), eq(benefitImpacts.projectId, projectId)));
  await resyncBenefitSummary(projectId);
}
