import { db } from "@/lib/db/client";
import { caseStudies, caseStudyComments, caseStudyRatings, projects, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";
import { getProject } from "@/lib/repos/projects";
import { resolveApprovalChain } from "@/lib/repos/org-units";

const PUBLISHABLE_STATUSES = ["APPROVED", "IN_PROGRESS", "COMPLETED"];

/**
 * Submits a project as a success story. It stays PENDING_APPROVAL — invisible
 * to everyone but the submitter and the approver — until the submitter's
 * direct manager (the lowest level in their org unit's chain that has a
 * manager: Section Manager if the unit has one, else Department Manager)
 * approves it. See approveCaseStudy/rejectCaseStudy.
 *
 * A manager submitting their OWN project never becomes their own approver —
 * that escalates to the next manager up the chain (e.g. a Section Manager's
 * submission goes to the Department Manager). If every level up to Division
 * is the submitter themselves, submission is refused rather than silently
 * self-approving.
 */
export async function submitCaseStudy(
  scope: Scope,
  input: { projectId: string; title: string; summary: string; imageUrl?: string | null }
) {
  const project = await getProject(scope, input.projectId);
  if (!project) throw new Error("Project not found");
  if (!PUBLISHABLE_STATUSES.includes(project.status)) {
    throw new Error("Only approved, in-progress, or completed projects can be shared as a success story");
  }

  const [existing] = await db.select().from(caseStudies).where(eq(caseStudies.projectId, project.id));
  if (existing) throw new Error("This project has already been submitted as a success story");

  const chain = await resolveApprovalChain(scope, project.orgUnitId);
  const directManager = chain.find((c) => c.managerUserId && c.managerUserId !== scope.userId);
  if (!directManager) {
    throw new Error("Cannot submit: no manager above you is assigned to approve this yet.");
  }

  const [row] = await db
    .insert(caseStudies)
    .values({
      companyId: project.companyId,
      projectId: project.id,
      title: input.title,
      summary: input.summary,
      imageUrl: input.imageUrl ?? null,
      submittedById: scope.userId,
      status: "PENDING_APPROVAL",
      approverUserId: directManager.managerUserId,
    })
    .returning();
  return row;
}

export async function approveCaseStudy(scope: Scope, caseStudyId: string, comment?: string) {
  const [row] = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId));
  if (!row) throw new Error("Success story not found");
  assertCanDecide(scope, row);

  await db
    .update(caseStudies)
    .set({ status: "PUBLISHED", decidedAt: new Date(), decisionComment: comment ?? null })
    .where(eq(caseStudies.id, caseStudyId));
}

export async function rejectCaseStudy(scope: Scope, caseStudyId: string, comment: string) {
  const [row] = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId));
  if (!row) throw new Error("Success story not found");
  assertCanDecide(scope, row);
  if (!comment.trim()) throw new Error("A comment is required to reject.");

  await db
    .update(caseStudies)
    .set({ status: "REJECTED", decidedAt: new Date(), decisionComment: comment })
    .where(eq(caseStudies.id, caseStudyId));
}

function assertCanDecide(scope: Scope, row: typeof caseStudies.$inferSelect) {
  if (scope.companyId !== null && scope.companyId !== row.companyId) {
    throw new Error("Forbidden: not your company's success story");
  }
  if (row.status !== "PENDING_APPROVAL") {
    throw new Error("This success story has already been decided.");
  }
  const isApprover = row.approverUserId === scope.userId;
  const isConsultantOverride = scope.companyId === null;
  if (!isApprover && !isConsultantOverride) {
    throw new Error("Forbidden: you are not this story's approver");
  }
}

/** Published stories only — the company-wide browse list. `companyId: null` means "every company" (company-independent scope only). */
export async function listCaseStudies(scope: Scope, companyId: string | null) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const rows = await db
    .select({
      id: caseStudies.id,
      title: caseStudies.title,
      summary: caseStudies.summary,
      imageUrl: caseStudies.imageUrl,
      submittedAt: caseStudies.submittedAt,
      projectTitle: projects.title,
      publishedByName: users.name,
      publishedByEmail: users.email,
      companyId: caseStudies.companyId,
    })
    .from(caseStudies)
    .innerJoin(projects, eq(caseStudies.projectId, projects.id))
    .innerJoin(users, eq(caseStudies.submittedById, users.id))
    .where(
      companyId
        ? and(eq(caseStudies.companyId, companyId), eq(caseStudies.status, "PUBLISHED"))
        : eq(caseStudies.status, "PUBLISHED")
    )
    .orderBy(desc(caseStudies.submittedAt));

  const withStats = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      ...(await getCaseStudyStats(row.id)),
    }))
  );
  return withStats;
}

/** Stories awaiting this user's decision (as their assigned approver, or any pending story for a consultant). `companyId: null` means "every company" (company-independent scope only). */
export async function listPendingApprovalsFor(scope: Scope, companyId: string | null) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }
  const rows = await db
    .select({
      id: caseStudies.id,
      title: caseStudies.title,
      submittedAt: caseStudies.submittedAt,
      approverUserId: caseStudies.approverUserId,
      submittedByName: users.name,
    })
    .from(caseStudies)
    .innerJoin(users, eq(caseStudies.submittedById, users.id))
    .where(
      companyId
        ? and(eq(caseStudies.companyId, companyId), eq(caseStudies.status, "PENDING_APPROVAL"))
        : eq(caseStudies.status, "PENDING_APPROVAL")
    );

  if (scope.companyId === null) return rows; // consultants see every pending story
  return rows.filter((r) => r.approverUserId === scope.userId);
}

async function getCaseStudyStats(caseStudyId: string) {
  const ratings = await db.select().from(caseStudyRatings).where(eq(caseStudyRatings.caseStudyId, caseStudyId));
  const comments = await db.select().from(caseStudyComments).where(eq(caseStudyComments.caseStudyId, caseStudyId));
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
  return {
    avgRating: Math.round(avgRating * 10) / 10,
    ratingCount: ratings.length,
    commentCount: comments.length,
  };
}

export async function getCaseStudyByProjectId(scope: Scope, projectId: string) {
  const [row] = await db.select().from(caseStudies).where(eq(caseStudies.projectId, projectId));
  if (!row) return null;
  if (scope.companyId !== null && scope.companyId !== row.companyId) {
    throw new Error("Forbidden: not your company's success story");
  }
  return row;
}

export async function getCaseStudyDetail(scope: Scope, caseStudyId: string) {
  const [caseStudy] = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId));
  if (!caseStudy) return null;
  if (scope.companyId !== null && scope.companyId !== caseStudy.companyId) {
    throw new Error("Forbidden: not your company's success story");
  }
  if (
    caseStudy.status === "PENDING_APPROVAL" &&
    scope.companyId !== null &&
    scope.userId !== caseStudy.submittedById &&
    scope.userId !== caseStudy.approverUserId
  ) {
    throw new Error("Forbidden: this success story is still awaiting approval");
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, caseStudy.projectId));
  const [publisher] = await db.select().from(users).where(eq(users.id, caseStudy.submittedById));

  const comments = await db
    .select({
      id: caseStudyComments.id,
      body: caseStudyComments.body,
      createdAt: caseStudyComments.createdAt,
      authorName: users.name,
    })
    .from(caseStudyComments)
    .innerJoin(users, eq(caseStudyComments.userId, users.id))
    .where(eq(caseStudyComments.caseStudyId, caseStudyId))
    .orderBy(desc(caseStudyComments.createdAt));

  const ratings = await db.select().from(caseStudyRatings).where(eq(caseStudyRatings.caseStudyId, caseStudyId));
  const myRating = ratings.find((r) => r.userId === scope.userId)?.rating ?? null;
  const stats = await getCaseStudyStats(caseStudyId);

  return { caseStudy, project, publisher, comments, myRating, ...stats };
}

export async function addComment(scope: Scope, caseStudyId: string, body: string) {
  const detail = await getCaseStudyDetail(scope, caseStudyId); // also enforces the company/visibility check
  if (!detail) throw new Error("Success story not found");
  if (!body.trim()) throw new Error("Comment cannot be empty");

  await db.insert(caseStudyComments).values({ caseStudyId, userId: scope.userId, body: body.trim() });
}

export async function rateCaseStudy(scope: Scope, caseStudyId: string, rating: number) {
  const detail = await getCaseStudyDetail(scope, caseStudyId);
  if (!detail) throw new Error("Success story not found");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be an integer from 1 to 5");
  }

  const [existing] = await db
    .select()
    .from(caseStudyRatings)
    .where(and(eq(caseStudyRatings.caseStudyId, caseStudyId), eq(caseStudyRatings.userId, scope.userId)));

  if (existing) {
    await db.update(caseStudyRatings).set({ rating }).where(eq(caseStudyRatings.id, existing.id));
  } else {
    await db.insert(caseStudyRatings).values({ caseStudyId, userId: scope.userId, rating });
  }
}
