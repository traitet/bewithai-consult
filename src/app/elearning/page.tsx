import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { listCourses, myEnrollments } from "@/lib/repos/elearning";
import { enrollAction, updateProgressAction } from "./actions";
import { AiToolIcon } from "@/components/icons";

const LEVEL_LABELS = ["", "L1 เริ่มต้น", "L2 ปานกลาง", "L3 ชำนาญ", "L4 เชี่ยวชาญ"];

export default async function ELearningPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);

  const [courseRows, myEnrollmentRows] = await Promise.all([listCourses(), myEnrollments(scope)]);
  const enrollmentByCourse = new Map(myEnrollmentRows.map((e) => [e.courseId, e]));

  return (
    <AppShell title="เรียนออนไลน์">
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <p className="text-[12px] text-text-faint">
          คอร์สเรียนแบบ step-by-step สำหรับ ChatGPT, Claude Cowork, Claude Code และ Co-Pilot พร้อมแบบทดสอบก่อน/หลังเรียน
          และแบบสอบถามความพึงพอใจในแต่ละคอร์ส
        </p>
        {session.role !== "MEMBER" && (
          <Link href="/elearning/report" className="ml-4 flex-shrink-0 text-[12px] font-semibold text-blue hover:underline">
            รายงานความคืบหน้า →
          </Link>
        )}
      </div>

      {!session.companyId && (
        <div className="mb-5 rounded-2xl border border-border bg-surface p-4 text-[12.5px] text-text-dim">
          มุมมองนี้สำหรับ Consultant/Super Admin — ดูรายการคอร์สได้ แต่การลงทะเบียนเรียนสำหรับพนักงานบริษัทลูกค้าเท่านั้น
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {courseRows.map((course) => {
          const enrollment = enrollmentByCourse.get(course.id);
          return (
            <div key={course.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <AiToolIcon name={course.aiToolName} />
                <span className="text-[10.5px] text-text-faint">ปลดล็อก {LEVEL_LABELS[course.unlocksLevel]}</span>
              </div>
              <Link href={`/elearning/${course.id}`} className="font-heading text-[14px] font-semibold text-text hover:text-blue">
                {course.title}
              </Link>
              <p className="text-[12px] text-text-dim">{course.description}</p>
              <span className="text-[11px] text-text-faint">ระยะเวลา {course.durationHours} ชม. · เกณฑ์ผ่าน {course.passingScore}%</span>

              {session.companyId && (
                <>
                  {!enrollment && (
                    <form action={enrollAction}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <button type="submit" className="w-full rounded-lg bg-gradient-to-br from-blue to-teal py-2 text-[12px] font-semibold text-white">
                        ลงทะเบียนเรียน
                      </button>
                    </form>
                  )}

                  {enrollment && enrollment.status !== "COMPLETED" && (
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-alt p-3">
                      <div className="h-2 w-full overflow-hidden rounded bg-border">
                        <div className="h-full rounded bg-gradient-to-r from-blue to-teal" style={{ width: `${enrollment.progressPct}%` }} />
                      </div>
                      <span className="text-[11px] text-text-faint">ความคืบหน้า {enrollment.progressPct}%</span>
                      <form action={updateProgressAction} className="flex gap-2">
                        <input type="hidden" name="courseId" value={course.id} />
                        <input name="progressPct" type="number" min="0" max="100" defaultValue={Math.min(100, enrollment.progressPct + 25)} className="input flex-1 py-1.5 text-[11.5px]" />
                        <button type="submit" className="rounded-md border border-border px-2.5 text-[11px] font-semibold text-text-dim">
                          อัปเดต
                        </button>
                      </form>
                      <Link
                        href={`/elearning/${course.id}`}
                        className="rounded-md bg-green py-1.5 text-center text-[11px] font-semibold text-white"
                      >
                        {enrollment.preTestScore === null ? "ทำแบบทดสอบก่อนเรียน →" : "ทำแบบทดสอบหลังเรียนเพื่อจบคอร์ส →"}
                      </Link>
                    </div>
                  )}

                  {enrollment && enrollment.status === "COMPLETED" && (
                    <div className="rounded-lg border border-green/30 bg-green/10 py-2 text-center text-[11.5px] font-semibold text-green">
                      ✓ เรียนจบแล้ว
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
