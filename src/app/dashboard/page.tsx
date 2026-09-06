import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { getDashboardStats } from "@/lib/repos/dashboard";

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border p-4 ${
        highlight ? "border-teal/35 bg-gradient-to-br from-blue/10 to-teal/10" : "border-border bg-surface"
      }`}
    >
      <span className="text-[12px] font-medium text-text-dim">{label}</span>
      <span className="font-heading text-[26px] font-semibold text-text">{value}</span>
      {sub && <span className="text-[11px] text-text-faint">{sub}</span>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null; // AppShell redirects; this satisfies TS below
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);
  const stats = await getDashboardStats(scope, companyId);

  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Open Issues" value={String(stats.openIssues)} sub="open or in review" />
          <StatCard label="Active Projects" value={`${stats.activeProjects}`} sub={`of ${stats.totalProjects} total`} />
          <StatCard
            label="Benefit Hours / Year"
            value={stats.totalBenefitHoursPerYear.toLocaleString()}
            sub="saved across all projects"
            highlight
          />
          <StatCard label="Consultants" value={String(stats.consultantCount)} sub="bewithai staff" />
          <StatCard label="Avg. Skill Level" value={stats.avgSkillLevel ? `L${stats.avgSkillLevel}` : "—"} sub="across assessed staff" />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-heading text-[14px] font-semibold text-text">Project Status Breakdown</h2>
          <div className="flex flex-col gap-2.5">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-40 text-[12px] text-text-dim">{status.replace(/_/g, " ")}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-surface-alt">
                  <div
                    className="h-full rounded bg-gradient-to-r from-blue to-teal"
                    style={{
                      width: `${stats.totalProjects ? (count / stats.totalProjects) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-[12px] font-semibold text-text">{count}</span>
              </div>
            ))}
            {stats.totalProjects === 0 && (
              <p className="text-[12.5px] text-text-faint">No projects yet — create one from an issue to see it here.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
