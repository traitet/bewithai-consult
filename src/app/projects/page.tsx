import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listProjects } from "@/lib/repos/projects";
import { Badge } from "@/components/ui/Badge";

export default async function ProjectsPage(props: PageProps<"/projects">) {
  const searchParams = await props.searchParams;
  const search = typeof searchParams.q === "string" ? searchParams.q : "";

  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);
  const showingAllCompanies = companyId === null;

  const rows = await listProjects(scope, companyId, search);

  return (
    <AppShell title="โปรเจกต์ (Projects)">
      <form method="get" className="mb-4 flex items-center gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="ค้นหาโปรเจกต์, ปัญหาต้นทาง หรือชื่อผู้แจ้ง..."
          className="input w-96"
        />
        <button type="submit" className="rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-text-dim">
          ค้นหา
        </button>
        {search && (
          <Link href="/projects" className="text-[12px] text-text-faint hover:text-blue">
            ล้างการค้นหา
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-5 py-3 font-semibold">โปรเจกต์</th>
              {showingAllCompanies && <th className="px-5 py-3 font-semibold">บริษัท</th>}
              <th className="px-5 py-3 font-semibold">หน่วยงาน</th>
              <th className="px-5 py-3 font-semibold">ผู้แจ้ง</th>
              <th className="px-5 py-3 font-semibold">เวลาที่ใช้ปัจจุบัน</th>
              <th className="px-5 py-3 font-semibold">เป้าหมายลดเวลา</th>
              <th className="px-5 py-3 font-semibold">ความคืบหน้า</th>
              <th className="px-5 py-3 font-semibold">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border-soft last:border-0">
                <td className="px-5 py-3.5">
                  <Link href={`/projects/${row.id}`} className="font-semibold text-text hover:text-blue">
                    {row.title}
                  </Link>
                  <div className="text-[11px] text-text-faint">จาก: {row.issueTitle}</div>
                </td>
                {showingAllCompanies && <td className="px-5 py-3.5 text-text-dim">{row.companyName}</td>}
                <td className="px-5 py-3.5 text-text-dim">{row.orgUnitName}</td>
                <td className="px-5 py-3.5">
                  <Link href={`/members/${row.requestedById}`} className="text-text-dim hover:text-blue">
                    {row.requestedByName}
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-text-dim">
                  {row.afterHoursPerWeek != null ? `${row.afterHoursPerWeek} ชม./สัปดาห์` : "—"}
                </td>
                <td className="px-5 py-3.5 text-text-dim">
                  {row.targetHoursPerWeek != null ? `-${row.targetHoursPerWeek} ชม./สัปดาห์` : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-alt">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue to-teal" style={{ width: `${row.progressPct}%` }} />
                    </div>
                    <span className="text-[11px] text-text-faint">{row.progressPct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <Badge value={row.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={showingAllCompanies ? 8 : 7} className="px-5 py-8 text-center text-text-faint">
                  {search ? "ไม่พบโปรเจกต์ที่ตรงกับคำค้นหา" : "ยังไม่มีโปรเจกต์ — แปลงจากปัญหาที่หน้า Issues"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
