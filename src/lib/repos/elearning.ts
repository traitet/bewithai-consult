import { db } from "@/lib/db/client";
import { courses, enrollments, completions, aiTools, users, companies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

export async function listCourses() {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      durationHours: courses.durationHours,
      unlocksLevel: courses.unlocksLevel,
      passingScore: courses.passingScore,
      aiToolId: courses.aiToolId,
      aiToolName: aiTools.name,
    })
    .from(courses)
    .innerJoin(aiTools, eq(courses.aiToolId, aiTools.id));
}

export async function myEnrollments(scope: Scope) {
  if (scope.companyId === null) return [];
  return db.select().from(enrollments).where(eq(enrollments.userId, scope.userId));
}

export async function getMyCompletion(scope: Scope, courseId: string) {
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, scope.userId), eq(enrollments.courseId, courseId)));
  if (!enrollment) return null;
  const [completion] = await db.select().from(completions).where(eq(completions.enrollmentId, enrollment.id));
  return completion ?? null;
}

export async function enrollInCourse(scope: Scope, courseId: string) {
  if (scope.companyId === null) throw new Error("ต้องเป็นพนักงานของบริษัทลูกค้าจึงจะลงทะเบียนเรียนได้");

  const [existing] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, scope.userId), eq(enrollments.courseId, courseId)));
  if (existing) return existing;

  const [row] = await db
    .insert(enrollments)
    .values({ companyId: scope.companyId, userId: scope.userId, courseId, status: "ENROLLED", progressPct: 0 })
    .returning();
  return row;
}

export async function submitPreTest(scope: Scope, courseId: string, score: number) {
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, scope.userId), eq(enrollments.courseId, courseId)));
  if (!enrollment) throw new Error("ยังไม่ได้ลงทะเบียนเรียนคอร์สนี้");

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  await db.update(enrollments).set({ preTestScore: clamped }).where(eq(enrollments.id, enrollment.id));
}

export async function updateProgress(scope: Scope, courseId: string, progressPct: number) {
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, scope.userId), eq(enrollments.courseId, courseId)));
  if (!enrollment) throw new Error("ยังไม่ได้ลงทะเบียนเรียนคอร์สนี้");

  const clamped = Math.max(0, Math.min(100, Math.round(progressPct)));
  await db
    .update(enrollments)
    .set({ progressPct: clamped, status: clamped >= 100 ? "COMPLETED" : "IN_PROGRESS" })
    .where(eq(enrollments.id, enrollment.id));
}

export async function completeCourse(
  scope: Scope,
  courseId: string,
  score: number,
  feedback?: { satisfactionRating?: number; satisfactionComment?: string }
) {
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, scope.userId), eq(enrollments.courseId, courseId)));
  if (!enrollment) throw new Error("ยังไม่ได้ลงทะเบียนเรียนคอร์สนี้");

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) throw new Error("ไม่พบคอร์สนี้");

  await db.update(enrollments).set({ progressPct: 100, status: "COMPLETED" }).where(eq(enrollments.id, enrollment.id));

  const [existingCompletion] = await db.select().from(completions).where(eq(completions.enrollmentId, enrollment.id));
  if (!existingCompletion) {
    await db.insert(completions).values({
      enrollmentId: enrollment.id,
      score,
      levelBefore: 0,
      levelAfter: score >= course.passingScore ? course.unlocksLevel : 0,
      satisfactionRating: feedback?.satisfactionRating,
      satisfactionComment: feedback?.satisfactionComment,
    });
  }

  // Business rule confirmed by the client: passing the post-test auto-raises
  // the employee's skill level for that course's AI tool (source=COURSE).
  if (score >= course.passingScore) {
    const { skillRecords } = await import("@/lib/db/schema");
    const [existingSkill] = await db
      .select()
      .from(skillRecords)
      .where(and(eq(skillRecords.userId, scope.userId), eq(skillRecords.aiToolId, course.aiToolId)));
    if (existingSkill) {
      if (course.unlocksLevel > existingSkill.level) {
        await db
          .update(skillRecords)
          .set({ level: course.unlocksLevel, source: "COURSE", updatedAt: new Date() })
          .where(eq(skillRecords.id, existingSkill.id));
      }
    } else if (scope.companyId) {
      await db
        .insert(skillRecords)
        .values({ companyId: scope.companyId, userId: scope.userId, aiToolId: course.aiToolId, level: course.unlocksLevel, source: "COURSE" });
    }
  }
}

/** For a manager: their direct reports' course progress. Reuses the same "direct reports" notion as My Team (division-wide). */
export async function listTeamProgress(scope: Scope, memberUserIds: string[]) {
  if (memberUserIds.length === 0) return [];
  const all = await db.select().from(enrollments);
  return all.filter((e) => memberUserIds.includes(e.userId));
}

export type ElearningProgressRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  companyName: string;
  courses: {
    courseId: string;
    courseTitle: string;
    status: "NOT_STARTED" | "ENROLLED" | "IN_PROGRESS" | "COMPLETED";
    progressPct: number;
    preTestScore: number | null;
    postTestScore: number | null;
    satisfactionRating: number | null;
  }[];
};

/**
 * Every employee (within scope) x every course, for the manager-facing
 * "who has/hasn't finished their AI training" report.
 * `companyId: null` means "every company" — only reachable for a
 * company-independent scope, matching every other list* function here.
 */
export async function listElearningProgressReport(scope: Scope, companyId: string | null): Promise<ElearningProgressRow[]> {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const employees = companyId
    ? await db.select().from(users).where(eq(users.companyId, companyId))
    : (await db.select().from(users)).filter((u) => u.companyId !== null);
  const companyRows = await db.select().from(companies);
  const companyNameById = new Map(companyRows.map((c) => [c.id, c.name]));

  const courseRows = await listCourses();
  const allEnrollments = await db.select().from(enrollments);
  const allCompletions = await db.select().from(completions);
  const completionByEnrollmentId = new Map(allCompletions.map((c) => [c.enrollmentId, c]));

  return employees.map((e) => ({
    userId: e.id,
    name: e.name,
    avatarUrl: e.avatarUrl,
    companyName: e.companyId ? (companyNameById.get(e.companyId) ?? "") : "",
    courses: courseRows.map((course) => {
      const enrollment = allEnrollments.find((en) => en.userId === e.id && en.courseId === course.id);
      const completion = enrollment ? completionByEnrollmentId.get(enrollment.id) : undefined;
      return {
        courseId: course.id,
        courseTitle: course.title,
        status: (enrollment?.status as ElearningProgressRow["courses"][number]["status"]) ?? "NOT_STARTED",
        progressPct: enrollment?.progressPct ?? 0,
        preTestScore: enrollment?.preTestScore ?? null,
        postTestScore: completion?.score ?? null,
        satisfactionRating: completion?.satisfactionRating ?? null,
      };
    }),
  }));
}
