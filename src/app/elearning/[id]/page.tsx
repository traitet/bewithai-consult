import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { listCourses, myEnrollments, getMyCompletion } from "@/lib/repos/elearning";
import { enrollAction, updateProgressAction, completeCourseAction, submitPreTestAction } from "../actions";
import { AiToolIcon } from "@/components/icons";
import { getCourseContent } from "@/lib/courseContent";
import { QuizForm } from "./QuizForm";

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
  const completion = enrollment ? await getMyCompletion(scope, course.id) : null;
  const content = getCourseContent(course.title);

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

          <section className="mb-5 rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-4 font-heading text-[14px] font-semibold text-text">เนื้อหาบทเรียน</h2>
            {content ? (
              <div className="flex flex-col gap-4">
                {content.chapters.map((chapter, i) => (
                  <div key={i} className="rounded-lg border border-border-soft p-4">
                    <h3 className="mb-2.5 text-[13px] font-semibold text-text">{chapter.title}</h3>
                    <ul className="flex flex-col gap-1.5">
                      {chapter.points.map((point, pi) => (
                        <li key={pi} className="flex gap-2 text-[12px] leading-relaxed text-text-dim">
                          <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-blue" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-text-faint">เนื้อหาคอร์สนี้กำลังจัดเตรียม</p>
            )}
          </section>

          {enrollment && enrollment.preTestScore !== null && content && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="mb-1 font-heading text-[14px] font-semibold text-text">แบบทดสอบก่อนเรียน (Pre-test)</h2>
              <p className="text-[12.5px] text-text-dim">
                คะแนนพื้นฐานก่อนเรียน: <span className="font-semibold text-text">{enrollment.preTestScore}%</span> (ใช้เป็นข้อมูลอ้างอิงเท่านั้น ไม่มีผลต่อการผ่านคอร์ส)
              </p>
            </section>
          )}
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

            {session.companyId && enrollment && enrollment.preTestScore === null && content && (
              <div className="flex flex-col gap-3">
                <p className="text-[11.5px] text-text-faint">ก่อนเริ่มเรียน ลองทำแบบทดสอบสั้น ๆ นี้เพื่อประเมินความรู้พื้นฐานของคุณ</p>
                <QuizForm courseId={course.id} questions={content.preTest} action={submitPreTestAction} mode="pre" />
              </div>
            )}

            {session.companyId && enrollment && enrollment.preTestScore !== null && enrollment.status !== "COMPLETED" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
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
                </div>

                {content && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-alt p-3">
                    <span className="text-[11px] font-semibold text-text">แบบทดสอบหลังเรียน (Post-test)</span>
                    <QuizForm courseId={course.id} questions={content.postTest} action={completeCourseAction} mode="post" />
                  </div>
                )}
              </div>
            )}

            {enrollment && enrollment.status === "COMPLETED" && (
              <div className="flex flex-col gap-2">
                <div className="rounded-lg border border-green/30 bg-green/10 py-3 text-center text-[12px] font-semibold text-green">
                  ✓ เรียนจบแล้ว
                </div>
                {completion && (
                  <div className="flex flex-col gap-1 text-[11.5px] text-text-dim">
                    <span>คะแนน post-test: <span className="font-semibold text-text">{completion.score}%</span></span>
                    {completion.satisfactionRating != null && (
                      <span>ความพึงพอใจ: <span className="font-semibold text-text">{completion.satisfactionRating}/5</span></span>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
