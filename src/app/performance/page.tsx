import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listEmployeePerformance, groupByDepartment } from "@/lib/repos/performance";
import { listOrgUnits } from "@/lib/repos/org-units";
import { OrgUnitFilter } from "@/components/ui/OrgUnitFilter";
import { Avatar } from "@/components/ui/Avatar";
import { userInitials } from "@/lib/repos/users";

const LEVEL_ORDER = ["DIVISION", "DEPARTMENT", "SECTION"];

export default async function PerformancePage(props: PageProps<"/performance">) {
  const searchParams = await props.searchParams;
  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const orgUnitId = typeof searchParams.orgUnitId === "string" ? searchParams.orgUnitId : null;

  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);

  const [rows, orgUnitRows] = await Promise.all([
    listEmployeePerformance(scope, companyId, { orgUnitId, search }),
    companyId ? listOrgUnits(scope, companyId) : Promise.resolve([]),
  ]);
  const sortedOrgUnits = [...orgUnitRows].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  const groups = groupByDepartment(rows);

  return (
    <AppShell title="ผลงานพนักงาน (Performance)">
      <form method="get" className="mb-5 flex items-center gap-3">
        <input name="q" defaultValue={search} placeholder="ค้นหาชื่อพนักงาน..." className="input w-72" />
        {companyId && (
          <div className="w-72">
            <OrgUnitFilter orgUnits={sortedOrgUnits} selectedOrgUnitId={orgUnitId} />
          </div>
        )}
        <button type="submit" className="rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-text-dim">
          ค้นหา
        </button>
        {(search || orgUnitId) && (
          <Link href="/performance" className="text-[12px] text-text-faint hover:text-blue">
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-heading text-[13px] font-semibold text-text">สรุปยอดรวมรายฝ่าย / แผนก</h2>
        </div>
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-5 py-3 font-semibold">ฝ่าย / แผนก</th>
              <th className="px-5 py-3 font-semibold">พนักงาน</th>
              <th className="px-5 py-3 font-semibold">โปรเจกต์รวม</th>
              <th className="px-5 py-3 font-semibold">ปัญหารวม</th>
              <th className="px-5 py-3 font-semibold">Success Story รวม</th>
              <th className="px-5 py-3 font-semibold">Skill เฉลี่ย</th>
              <th className="px-5 py-3 font-semibold">ชม.ที่ลดได้/ปี</th>
              <th className="px-5 py-3 font-semibold">เป้าหมายรวม/ปี</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const attainmentPct = g.totalTargetHours ? Math.round((g.totalBenefitHoursPerYear / g.totalTargetHours) * 100) : 0;
              return (
                <tr key={g.key} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-text">{g.departmentName ?? g.divisionName ?? g.key}</span>
                    {g.divisionName && g.departmentName && (
                      <span className="ml-1.5 text-[11px] text-text-faint">({g.divisionName})</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-text-dim">{g.employeeCount}</td>
                  <td className="px-5 py-3.5 text-text-dim">{g.totalProjects}</td>
                  <td className="px-5 py-3.5 text-text-dim">{g.totalIssues}</td>
                  <td className="px-5 py-3.5 text-text-dim">{g.totalCaseStudies}</td>
                  <td className="px-5 py-3.5 text-text-dim">{g.avgSkillLevel ? `L${g.avgSkillLevel}` : "—"}</td>
                  <td className="px-5 py-3.5 font-medium text-teal">{g.totalBenefitHoursPerYear.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-text-dim">
                    {g.totalTargetHours.toLocaleString()}
                    <span className={`ml-1.5 text-[10.5px] font-semibold ${attainmentPct >= 100 ? "text-green" : "text-amber"}`}>
                      ({attainmentPct}%)
                    </span>
                  </td>
                </tr>
              );
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-6 text-center text-text-faint">
                  ไม่มีข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-heading text-[13px] font-semibold text-text">รายบุคคล ({rows.length} คน)</h2>
        </div>
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-5 py-3 font-semibold">ชื่อ</th>
              <th className="px-5 py-3 font-semibold">หน่วยงาน</th>
              <th className="px-5 py-3 font-semibold">โปรเจกต์</th>
              <th className="px-5 py-3 font-semibold">ปัญหาที่แจ้ง</th>
              <th className="px-5 py-3 font-semibold">Skill สูงสุด</th>
              <th className="px-5 py-3 font-semibold">Success Story</th>
              <th className="px-5 py-3 font-semibold">ชม.ที่ลดได้/ปี</th>
              <th className="px-5 py-3 font-semibold">เป้าหมาย/ปี</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const attainmentPct = row.annualTargetHours ? Math.round((row.benefitHoursPerYear / row.annualTargetHours) * 100) : 0;
              return (
                <tr key={row.userId} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={row.name} initials={userInitials(row.name)} avatarUrl={row.avatarUrl} size={26} />
                      <span className="font-medium text-text">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-text-dim">{row.orgUnitName ?? "—"}</td>
                  <td className="px-5 py-3.5 text-text-dim">{row.projectCount}</td>
                  <td className="px-5 py-3.5 text-text-dim">{row.issueCount}</td>
                  <td className="px-5 py-3.5 text-text-dim">{row.overallSkillLevel ? `L${row.overallSkillLevel}` : "—"}</td>
                  <td className="px-5 py-3.5 text-text-dim">{row.caseStudyCount}</td>
                  <td className="px-5 py-3.5 font-medium text-teal">{row.benefitHoursPerYear.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-dim">{row.annualTargetHours.toLocaleString()}</span>
                      <span className={`text-[10.5px] font-semibold ${attainmentPct >= 100 ? "text-green" : "text-amber"}`}>
                        {attainmentPct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/members/${row.userId}`} className="text-[11.5px] font-semibold text-blue">
                      ดูรายละเอียด →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-text-faint">
                  ไม่พบพนักงานที่ตรงกับตัวกรอง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
