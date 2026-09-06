import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { getCompanyReport, type DeptReportRow } from "@/lib/repos/reports";
import { getDashboardStats } from "@/lib/repos/dashboard";

const LEVEL_LABEL_TH: Record<string, string> = { DIVISION: "ฝ่าย", DEPARTMENT: "แผนก", SECTION: "หน่วยงาน" };
const LEVEL_INDENT: Record<string, string> = { DIVISION: "", DEPARTMENT: "— ", SECTION: "—— " };

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);

  const stats = await getDashboardStats(scope, companyId);
  const report = companyId ? await getCompanyReport(scope, companyId) : [];
  const deptRows = report.filter((r) => r.level === "DEPARTMENT");

  return (
    <AppShell title="รายงาน (Reports)">
      <div className="mb-5 grid grid-cols-4 gap-4">
        <StatCard label="โปรเจกต์ทั้งหมด" value={String(stats.totalProjects)} />
        <StatCard label="โปรเจกต์ที่กำลังดำเนินการ" value={String(stats.activeProjects)} />
        <StatCard label="ชั่วโมงที่ประหยัดได้ / ปี" value={stats.totalBenefitHoursPerYear.toLocaleString()} highlight />
        <StatCard label="Skill เฉลี่ย" value={stats.avgSkillLevel ? `L${stats.avgSkillLevel}` : "—"} />
      </div>

      {companyId ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4">
            <ChartCard title="ชั่วโมงที่ประหยัดได้ตามแผนก" rows={deptRows} valueFn={(r) => r.benefitHoursPerYear} format={(v) => v.toLocaleString()} />
            <ChartCard title="จำนวนโปรเจกต์ตามแผนก" rows={deptRows} valueFn={(r) => r.projectCount} format={(v) => String(v)} />
            <ChartCard title="Skill เฉลี่ยตามแผนก" rows={deptRows} valueFn={(r) => r.avgSkillLevel} maxOverride={4} format={(v) => (v ? `L${v}` : "—")} />
            <ChartCard title="อัตราจบคอร์ส E-Learning ตามแผนก" rows={deptRows} valueFn={(r) => r.elearningCompletionPct} maxOverride={100} format={(v) => `${v}%`} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3 font-semibold">หน่วยงาน</th>
                  <th className="px-5 py-3 font-semibold">ระดับ</th>
                  <th className="px-5 py-3 font-semibold">พนักงาน</th>
                  <th className="px-5 py-3 font-semibold">ปัญหา</th>
                  <th className="px-5 py-3 font-semibold">โปรเจกต์</th>
                  <th className="px-5 py-3 font-semibold">ชม.ที่ประหยัดได้/ปี</th>
                  <th className="px-5 py-3 font-semibold">Skill เฉลี่ย</th>
                  <th className="px-5 py-3 font-semibold">E-Learning สำเร็จ</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row) => (
                  <tr key={row.orgUnitId} className="border-b border-border-soft last:border-0">
                    <td className="px-5 py-3.5 font-medium text-text">
                      {LEVEL_INDENT[row.level]}
                      {row.name}
                    </td>
                    <td className="px-5 py-3.5 text-text-dim">{LEVEL_LABEL_TH[row.level] ?? row.level}</td>
                    <td className="px-5 py-3.5 text-text-dim">{row.employeeCount}</td>
                    <td className="px-5 py-3.5 text-text-dim">{row.issueCount}</td>
                    <td className="px-5 py-3.5 text-text-dim">{row.projectCount}</td>
                    <td className="px-5 py-3.5 text-text-dim">{row.benefitHoursPerYear.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-text-dim">{row.avgSkillLevel ? `L${row.avgSkillLevel}` : "—"}</td>
                    <td className="px-5 py-3.5 text-text-dim">{row.elearningCompletionPct}%</td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-text-faint">
                      ไม่มีข้อมูลหน่วยงานสำหรับบริษัทนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-dim">
          เลือกบริษัทจากด้านบนเพื่อดูรายงานแยกตามฝ่าย/แผนก/หน่วยงาน (ตัวเลขสรุปด้านบนคือภาพรวมทุกบริษัท)
        </div>
      )}
    </AppShell>
  );
}

function ChartCard({
  title,
  rows,
  valueFn,
  format,
  maxOverride,
}: {
  title: string;
  rows: DeptReportRow[];
  valueFn: (r: DeptReportRow) => number;
  format: (v: number) => string;
  maxOverride?: number;
}) {
  const max = maxOverride ?? Math.max(1, ...rows.map(valueFn));
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-heading text-[13px] font-semibold text-text">{title}</h2>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const value = valueFn(r);
          return (
            <div key={r.orgUnitId} className="flex items-center gap-2.5">
              <span className="w-28 truncate text-[11.5px] text-text-dim">{r.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-surface-alt">
                <div className="h-full rounded bg-gradient-to-r from-blue to-teal" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
              </div>
              <span className="w-14 text-right text-[11.5px] font-semibold text-text">{format(value)}</span>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-[11.5px] text-text-faint">ไม่มีข้อมูลแผนก</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 ${
        highlight ? "border-teal/35 bg-gradient-to-br from-blue/10 to-teal/10" : "border-border bg-surface"
      }`}
    >
      <span className="text-[12px] font-medium text-text-dim">{label}</span>
      <span className="font-heading text-[22px] font-semibold text-text">{value}</span>
    </div>
  );
}
