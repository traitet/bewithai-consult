import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listElearningProgressReport, listCourses } from "@/lib/repos/elearning";
import { Avatar } from "@/components/ui/Avatar";
import { userInitials } from "@/lib/repos/users";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  NOT_STARTED: { label: "ยังไม่เริ่ม", className: "text-text-faint" },
  ENROLLED: { label: "ลงทะเบียนแล้ว", className: "text-amber" },
  IN_PROGRESS: { label: "กำลังเรียน", className: "text-blue" },
  COMPLETED: { label: "เรียนจบแล้ว", className: "text-green" },
};

export default async function ElearningReportPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "MEMBER") redirect("/elearning");

  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);
  const showingAllCompanies = companyId === null;

  const [rows, courseRows] = await Promise.all([listElearningProgressReport(scope, companyId), listCourses()]);

  const completionRateByCourse = courseRows.map((course) => {
    const relevant = rows.map((r) => r.courses.find((c) => c.courseId === course.id)).filter(Boolean);
    const completed = relevant.filter((c) => c!.status === "COMPLETED").length;
    const rate = relevant.length > 0 ? Math.round((completed / relevant.length) * 100) : 0;
    return { course, completed, total: relevant.length, rate };
  });

  return (
    <AppShell title="รายงานความคืบหน้าการเรียนออนไลน์">
      <Link href="/elearning" className="mb-4 inline-block text-[12px] text-text-faint hover:text-blue">
        ← กลับไปหน้าเรียนออนไลน์
      </Link>

      <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-5">
        {completionRateByCourse.map(({ course, completed, total, rate }) => (
          <div key={course.id} className="rounded-xl border border-border bg-surface p-3.5">
            <p className="mb-1.5 text-[11px] font-semibold text-text-dim">{course.title}</p>
            <p className="text-[18px] font-bold text-text">{rate}%</p>
            <p className="text-[10.5px] text-text-faint">
              จบแล้ว {completed}/{total} คน
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-text-faint">
              <th className="px-4 py-3 font-semibold">พนักงาน</th>
              {showingAllCompanies && <th className="px-4 py-3 font-semibold">บริษัท</th>}
              {courseRows.map((course) => (
                <th key={course.id} className="px-4 py-3 font-semibold">
                  {course.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="border-b border-border-soft last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/members/${row.userId}`} className="flex items-center gap-2.5 hover:text-blue">
                    <Avatar name={row.name} initials={userInitials(row.name)} avatarUrl={row.avatarUrl} size={26} />
                    <span className="font-medium text-text">{row.name}</span>
                  </Link>
                </td>
                {showingAllCompanies && <td className="px-4 py-3 text-text-dim">{row.companyName}</td>}
                {row.courses.map((c) => {
                  const style = STATUS_STYLE[c.status] ?? STATUS_STYLE.NOT_STARTED;
                  return (
                    <td key={c.courseId} className="px-4 py-3">
                      <span className={`font-medium ${style.className}`}>{style.label}</span>
                      {c.status !== "NOT_STARTED" && c.status !== "COMPLETED" && (
                        <span className="ml-1 text-[10.5px] text-text-faint">({c.progressPct}%)</span>
                      )}
                      {c.status === "COMPLETED" && c.postTestScore != null && (
                        <span className="ml-1 text-[10.5px] text-text-faint">({c.postTestScore}%)</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={(showingAllCompanies ? 2 : 1) + courseRows.length} className="px-4 py-8 text-center text-text-faint">
                  ไม่มีข้อมูลพนักงานในมุมมองนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
