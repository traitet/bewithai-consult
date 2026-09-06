import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listProjects } from "@/lib/repos/projects";
import { Badge } from "@/components/ui/Badge";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);

  if (!companyId) {
    return (
      <AppShell title="Projects">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-dim">
          Pick a company from the switcher above to view its projects.
        </div>
      </AppShell>
    );
  }

  const rows = await listProjects(scope, companyId);

  return (
    <AppShell title="Projects">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-5 py-3 font-semibold">Project</th>
              <th className="px-5 py-3 font-semibold">Department</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border-soft last:border-0">
                <td className="px-5 py-3.5">
                  <Link href={`/projects/${row.id}`} className="font-semibold text-text hover:text-blue">
                    {row.title}
                  </Link>
                  <div className="text-[11px] text-text-faint">from: {row.issueTitle}</div>
                </td>
                <td className="px-5 py-3.5 text-text-dim">{row.orgUnitName}</td>
                <td className="px-5 py-3.5">
                  <Badge value={row.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-text-faint">
                  No projects yet — convert an issue into one from the Issues page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
