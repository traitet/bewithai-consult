import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { getDashboardStats, getBenefitTrend, getTopSkillsSummary, getRecentActivity } from "@/lib/repos/dashboard";

const STATUS_LABEL_TH: Record<string, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING_APPROVAL: "#c2760c",
  APPROVED: "#1877f2",
  IN_PROGRESS: "#42a5f5",
  COMPLETED: "#31a24c",
};

function StatCard({
  label,
  value,
  sub,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border p-4 ${
        highlight ? "border-teal/35 bg-gradient-to-br from-blue/10 to-teal/10" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-text-dim">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue/10 text-blue">{icon}</div>
      </div>
      <span className="font-heading text-[26px] font-semibold text-text">{value}</span>
      {sub && <span className="text-[11px] text-text-faint">{sub}</span>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);

  const [stats, trend, topSkills, activity] = await Promise.all([
    getDashboardStats(scope, companyId),
    getBenefitTrend(scope, companyId),
    getTopSkillsSummary(scope, companyId),
    getRecentActivity(scope, companyId),
  ]);

  const maxTrend = Math.max(1, ...trend.map((t) => t.value));
  const chartW = 520;
  const chartH = 130;
  const points = trend.map((t, i) => {
    const x = (i / (trend.length - 1)) * chartW;
    const y = chartH - (t.value / maxTrend) * (chartH - 12);
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${chartW},${chartH} L0,${chartH} Z`;

  const statusEntries = Object.entries(stats.statusBreakdown);
  let cumulativePct = 0;
  const donutStops = statusEntries.map(([status, count]) => {
    const pct = stats.totalProjects ? (count / stats.totalProjects) * 100 : 0;
    const stop = `${STATUS_COLOR[status]} ${cumulativePct}% ${cumulativePct + pct}%`;
    cumulativePct += pct;
    return stop;
  });

  return (
    <AppShell title="แดชบอร์ด (Dashboard)">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-5 gap-4">
          <StatCard
            label="ปัญหาที่เปิดอยู่"
            value={String(stats.openIssues)}
            sub="Open / In Review"
            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17V3"/><path d="M4 3.5c1.4-.9 2.8-.9 4.2 0 1.4.9 2.8.9 4.2 0 1.4-.9 2.8-.9 4.2 0v7c-1.4-.9-2.8-.9-4.2 0-1.4.9-2.8.9-4.2 0-1.4-.9-2.8-.9-4.2 0"/></svg>}
          />
          <StatCard
            label="โปรเจกต์ที่ดำเนินการอยู่"
            value={String(stats.activeProjects)}
            sub={`จากทั้งหมด ${stats.totalProjects}`}
            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5 2.5 6.5 10 10.5l7.5-4Z"/><path d="M2.5 10.5 10 14.5l7.5-4"/></svg>}
          />
          <StatCard
            label="ชั่วโมงที่ประหยัดได้ / ปี"
            value={stats.totalBenefitHoursPerYear.toLocaleString()}
            sub="รวมทุกโปรเจกต์"
            highlight
            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>}
          />
          <StatCard
            label="Consultant"
            value={String(stats.consultantCount)}
            sub="ทีมงาน bewithai"
            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="6.5" r="2.7"/><path d="M2.8 16c.5-2.6 2.4-4 4.7-4s4.2 1.4 4.7 4"/><circle cx="14.2" cy="7.3" r="2.1"/></svg>}
          />
          <StatCard
            label="Skill เฉลี่ย"
            value={stats.avgSkillLevel ? `L${stats.avgSkillLevel}` : "—"}
            sub="จากพนักงานที่ประเมินแล้ว"
            icon={<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="6.5"/><circle cx="10" cy="10" r="2"/></svg>}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-[14px] font-semibold text-text">แนวโน้มชั่วโมงที่ประหยัดได้</h2>
              <span className="text-[11px] text-text-faint">ปี {new Date().getFullYear()}</span>
            </div>
            <svg width="100%" height={chartH + 10} viewBox={`0 0 ${chartW} ${chartH + 10}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="dashTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#42a5f5" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#42a5f5" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#dashTrendFill)" />
              <path d={linePath} fill="none" stroke="#1877f2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#1877f2" />
              ))}
            </svg>
            <div className="mt-1 flex justify-between px-0.5">
              {trend.map((t) => (
                <span key={t.month} className="text-[10px] text-text-faint">
                  {t.month}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-heading text-[14px] font-semibold text-text">สัดส่วนสถานะโปรเจกต์</h2>
            <div className="flex items-center gap-5">
              <div
                className="relative h-28 w-28 flex-shrink-0 rounded-full"
                style={{ background: stats.totalProjects ? `conic-gradient(${donutStops.join(", ")})` : "var(--surface-alt)" }}
              >
                <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-surface">
                  <span className="font-heading text-[18px] font-semibold text-text">{stats.totalProjects}</span>
                  <span className="text-[9px] text-text-faint">โปรเจกต์</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {statusEntries.map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                    <span className="text-[11.5px] text-text-dim">{STATUS_LABEL_TH[status] ?? status}</span>
                    <span className="ml-auto text-[11.5px] font-semibold text-text">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-heading text-[14px] font-semibold text-text">ทักษะและ AI Tools ยอดนิยม</h2>
            <div className="flex flex-col gap-3">
              {topSkills.map((s) => (
                <div key={s.toolName} className="flex items-center gap-3">
                  <span className="w-32 text-[12px] text-text-dim">{s.toolName}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-surface-alt">
                    <div className="h-full rounded bg-gradient-to-r from-blue to-teal" style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="w-9 text-right text-[12px] font-semibold text-text">{s.pct}%</span>
                </div>
              ))}
              {topSkills.every((s) => s.pct === 0) && (
                <p className="text-[12px] text-text-faint">ยังไม่มีข้อมูลทักษะ</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">กิจกรรมล่าสุด</h2>
            <div className="flex flex-col">
              {activity.map((a, i) => (
                <div key={a.id} className={`flex gap-2.5 py-2.5 ${i !== activity.length - 1 ? "border-b border-border-soft" : ""}`}>
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-text">{a.text}</span>
                    <span className="text-[10.5px] text-text-faint">{formatRelativeTh(a.timestamp)}</span>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-[12px] text-text-faint">ยังไม่มีกิจกรรม</p>}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function formatRelativeTh(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} วันที่แล้ว`;
}
