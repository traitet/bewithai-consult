import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { listCourses, myEnrollments } from "@/lib/repos/elearning";
import { enrollAction, updateProgressAction, completeCourseAction } from "../actions";
import { AiToolIcon } from "@/components/icons";

const LEVEL_LABELS = ["", "L1 เริ่มต้น", "L2 ปานกลาง", "L3 ชำนาญ", "L4 เชี่ยวชาญ"];

export default async function CourseDetailPage(props: PageProps<"/elearning/[id]">) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);

  const [courses, myEnrollmentRows] = await Promise.all([listCourses(), myEnrollments(scope)]);
  const course = courses.find((c) => c.id === id);
  if (!course) notFound();
  const enrollment = myEnrollmentRows.find((e) => e.courseId === id);

  // Placeholder outline — real step-by-step Thai content (10 บท x 10 step) is still being written; this shows the planned structure.
  const chapterOutline = Array.from({ length: 10 }, (_, i) => `บทที่ ${i + 1}: ${course.title} — ส่วนที่ ${i + 1}`);

  return (
    <AppShell title={course.title}>
      <div className="flex gap-6">
        <div className="flex-1 flex-col gap-5">
          <section className="mb-5 rounded-2xl border border-border bg-surface p-6">
            <div className="mb-3 flex items-center gap-3">
              <AiToolIcon name={course.aiToolName} size={44} />
              <span className="text-[11px] font-semibold text-text-faint">{course.aiToolName}</span>
            </div>
            <h1 className="mb-2 font-heading text-[20px] font-semibold text-text">{course.title}</h1>
            <p className="mb-4 text-[13px] text-text-dim">{course.description}</p>
            <div className="flex gap-6 text-[12px] text-text-faint">
              <span>ระยะเวลา: {course.durationHours} ชม.</span>
              <span>ปลดล็อก: {LEVEL_LABELS[course.unlocksLevel]}</span>
              <span>เกณฑ์ผ่าน post-test: {course.passingScore}%</span>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">เนื้อหาบทเรียน (10 บท)</h2>
            <p className="mb-4 text-[11.5px] text-text-faint">
              เวอร์ชันนี้แสดงโครงเนื้อหา — เนื้อหาแบบ step-by-step เต็มรูปแบบ (10 step ต่อบท พร้อมรูปประกอบ) กำลังทยอยเพิ่มเข้ามา
            </p>
            <div className="flex flex-col gap-2">
              {chapterOutline.map((title, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border-soft px-3 py-2.5">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-alt text-[11px] font-semibold text-text-faint">
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] text-text-dim">{title}</span>
                  <span className="ml-auto text-[10.5px] text-text-faint">เร็วๆ นี้</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="w-80 flex-shrink-0">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[13px] font-semibold text-text">สถานะการเรียนของฉัน</h2>

            {!session.companyId && <p className="text-[12px] text-text-faint">มุมมองนี้สำหรับพนักงานบริษัทลูกค้าเท่านั้น</p>}

            {session.companyId && !enrollment && (
              <form action={enrollAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <button type="submit" className="w-full rounded-lg bg-gradient-to-br from-blue to-teal py-2.5 text-[12px] font-semibold text-white">
                  ลงทะเบียนเรียน
                </button>
              </form>
            )}

            {session.companyId && enrollment && enrollment.status !== "COMPLETED" && (
              <div className="flex flex-col gap-3">
                <div className="h-2 w-full overflow-hidden rounded bg-surface-alt">
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
                <form action={completeCourseAction} className="flex flex-col gap-2 rounded-lg border border-border bg-surface-alt p-3">
                  <span className="text-[11px] text-text-faint">จบคอร์สและกรอกคะแนน post-test</span>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input name="score" type="number" min="0" max="100" placeholder="คะแนน (0-100)" required className="input py-1.5 text-[11.5px]" />
                  <button type="submit" className="rounded-md bg-green py-1.5 text-[11px] font-semibold text-white">
                    ส่งคะแนนและจบคอร์ส
                  </button>
                </form>
              </div>
            )}

            {enrollment && enrollment.status === "COMPLETED" && (
              <div className="rounded-lg border border-green/30 bg-green/10 py-3 text-center text-[12px] font-semibold text-green">
                ✓ เรียนจบแล้ว
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
