import { db } from "@/lib/db/client";
import { completions, enrollments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";
import { listEmployeePerformance, type EmployeePerformanceRow } from "@/lib/repos/performance";

/**
 * Gamification scoring — fixed, transparent weights so employees can see
 * exactly how points are earned. All figures already exist elsewhere in
 * the app (performance.ts, e-learning completions); this just turns them
 * into one comparable score:
 *   - 1 point per hour/year of benefit credited (real time saved)
 *   - +50 bonus for meeting/exceeding this year's annual target
 *   - 25 points per AI-skill level reached (0-4)
 *   - 40 points per completed e-learning course
 *   - 150 points per published success-story case study
 */
export const LEADERBOARD_POINTS = {
  PER_BENEFIT_HOUR: 1,
  TARGET_MET_BONUS: 50,
  PER_SKILL_LEVEL: 25,
  PER_COMPLETED_COURSE: 40,
  PER_PUBLISHED_CASE_STUDY: 150,
} as const;

export type LeaderboardRow = EmployeePerformanceRow & {
  rank: number;
  completedCourses: number;
  targetMet: boolean;
  score: number;
};

export async function listLeaderboard(scope: Scope, companyId: string | null): Promise<LeaderboardRow[]> {
  const performanceRows = await listEmployeePerformance(scope, companyId);

  const completionRows = await db
    .select({ userId: enrollments.userId })
    .from(completions)
    .innerJoin(enrollments, eq(completions.enrollmentId, enrollments.id));
  const completedCoursesByUser = new Map<string, number>();
  for (const c of completionRows) {
    completedCoursesByUser.set(c.userId, (completedCoursesByUser.get(c.userId) ?? 0) + 1);
  }

  const scored = performanceRows
    .map((r) => {
      const completedCourses = completedCoursesByUser.get(r.userId) ?? 0;
      const targetMet = r.annualTargetHours > 0 && r.benefitHoursPerYear >= r.annualTargetHours;
      const score =
        r.benefitHoursPerYear * LEADERBOARD_POINTS.PER_BENEFIT_HOUR +
        (targetMet ? LEADERBOARD_POINTS.TARGET_MET_BONUS : 0) +
        r.overallSkillLevel * LEADERBOARD_POINTS.PER_SKILL_LEVEL +
        completedCourses * LEADERBOARD_POINTS.PER_COMPLETED_COURSE +
        r.caseStudyCount * LEADERBOARD_POINTS.PER_PUBLISHED_CASE_STUDY;
      return { ...r, completedCourses, targetMet, score };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return scored.map((r, i) => ({ ...r, rank: i + 1 }));
}
