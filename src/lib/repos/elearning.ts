import { db } from "@/lib/db/client";
import { courses, enrollments, completions, aiTools } from "@/lib/db/schema";
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

export async function completeCourse(scope: Scope, courseId: string, score: number) {
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
