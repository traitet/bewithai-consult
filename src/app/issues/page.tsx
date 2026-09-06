import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listIssues } from "@/lib/repos/issues";
import { listOrgUnits } from "@/lib/repos/org-units";
import { OrgUnitFilter } from "@/components/ui/OrgUnitFilter";
import { Badge } from "@/components/ui/Badge";
import { createIssueAction } from "./actions";
import { ISSUE_PRIORITIES } from "@/lib/types";
import Link from "next/link";

const LEVEL_ORDER = ["DIVISION", "DEPARTMENT", "SECTION"];
const PRIORITY_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

type IssueRow = Awaited<ReturnType<typeof listIssues>>[number];
const SORTERS: Record<string, (a: IssueRow, b: IssueRow) => number> = {
  title: (a, b) => a.title.localeCompare(b.title),
  department: (a, b) => a.orgUnitName.localeCompare(b.orgUnitName),
  submittedBy: (a, b) => a.createdByName.localeCompare(b.createdByName),
  createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  workload: (a, b) => a.totalHoursPerYear - b.totalHoursPerYear,
  priority: (a, b) => (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0),
  status: (a, b) => a.status.localeCompare(b.status),
};
const DEFAULT_SORT = "createdAt";

export default async function IssuesPage(props: PageProps<"/issues">) {
  const searchParams = await props.searchParams;
  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const orgUnitId = typeof searchParams.orgUnitId === "string" ? searchParams.orgUnitId : null;
  const sort = typeof searchParams.sort === "string" && SORTERS[searchParams.sort] ? searchParams.sort : DEFAULT_SORT;
  const dir = searchParams.dir === "asc" ? "asc" : "desc";

  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);
  const showingAllCompanies = companyId === null;

  const [issueRows, orgUnitRows] = await Promise.all([
    listIssues(scope, companyId, { orgUnitId, search }),
    companyId ? listOrgUnits(scope, companyId) : Promise.resolve([]),
  ]);
  const sortedOrgUnits = [...orgUnitRows].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));

  const sortedIssues = [...issueRows].sort((a, b) => {
    const cmp = SORTERS[sort](a, b);
    return dir === "asc" ? cmp : -cmp;
  });

  const baseParams = new URLSearchParams();
  if (search) baseParams.set("q", search);
  if (orgUnitId) baseParams.set("orgUnitId", orgUnitId);

  function sortHref(field: string) {
    const params = new URLSearchParams(baseParams);
    const nextDir = sort === field && dir === "asc" ? "desc" : "asc";
    params.set("sort", field);
    params.set("dir", nextDir);
    return `/issues?${params.toString()}`;
  }

  function SortHeader({ field, label }: { field: string; label: string }) {
    return (
      <Link href={sortHref(field)} className="flex items-center gap-1 hover:text-blue">
        {label}
        {sort === field && <span>{dir === "asc" ? "▲" : "▼"}</span>}
      </Link>
    );
  }

  return (
    <AppShell title="ปัญหา (Issues)">
      <div className="flex gap-6">
        <div className="flex flex-1 flex-col gap-4">
          <form method="get" className="flex items-center gap-2">
            <input name="q" defaultValue={search} placeholder="ค้นหาปัญหา หรือชื่อผู้แจ้ง..." className="input w-72" />
            {companyId && (
              <div className="w-72">
                <OrgUnitFilter orgUnits={sortedOrgUnits} selectedOrgUnitId={orgUnitId} />
              </div>
            )}
            <button type="submit" className="rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-text-dim">
              ค้นหา
            </button>
            {(search || orgUnitId) && (
              <Link href="/issues" className="text-[12px] text-text-faint hover:text-blue">
                ล้างตัวกรอง
              </Link>
            )}
          </form>

          <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-surface">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3 font-semibold">
                    <SortHeader field="title" label="Title" />
                  </th>
                  {showingAllCompanies && <th className="px-5 py-3 font-semibold">Company</th>}
                  <th className="px-5 py-3 font-semibold">
                    <SortHeader field="department" label="Department" />
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    <SortHeader field="submittedBy" label="Submitted by" />
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    <SortHeader field="createdAt" label="วันที่แจ้ง" />
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    <SortHeader field="workload" label="ภาระงาน (ชม./ปี)" />
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    <SortHeader field="priority" label="Priority" />
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    <SortHeader field="status" label="Status" />
                  </th>
                  <th className="px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {sortedIssues.map((row) => (
                  <tr key={row.id} className="border-b border-border-soft last:border-0">
                    <td className="px-5 py-3.5">
                      <Link href={`/issues/${row.id}`} className="font-medium text-text hover:text-blue">
                        {row.title}
                      </Link>
                    </td>
                    {showingAllCompanies && <td className="px-5 py-3.5 text-text-dim">{row.companyName}</td>}
                    <td className="px-5 py-3.5 text-text-dim">{row.orgUnitName}</td>
                    <td className="px-5 py-3.5 text-text-dim">{row.createdByName}</td>
                    <td className="px-5 py-3.5 text-text-dim">{new Date(row.createdAt).toLocaleDateString("th-TH")}</td>
                    <td className="px-5 py-3.5 text-text-dim">
                      {row.totalHoursPerYear > 0 ? row.totalHoursPerYear.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge value={row.priority} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge value={row.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      {row.status !== "CONVERTED" && !showingAllCompanies && (
                        <Link href={`/issues/${row.id}/convert`} className="text-[12px] font-semibold text-blue">
                          Convert to Project →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedIssues.length === 0 && (
                  <tr>
                    <td colSpan={showingAllCompanies ? 9 : 8} className="px-5 py-8 text-center text-text-faint">
                      {search || orgUnitId ? "ไม่พบปัญหาที่ตรงกับตัวกรอง" : "No issues yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {companyId ? (
          <form
            action={createIssueAction}
            className="flex w-80 flex-shrink-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
          >
            <h2 className="font-heading text-[14px] font-semibold text-text">Submit New Issue</h2>
            <input type="hidden" name="companyId" value={companyId} />

            <Field label="Title">
              <input name="title" required className="input" placeholder="What's the problem?" />
            </Field>
            <Field label="Description">
              <textarea name="description" required rows={4} className="input resize-none" placeholder="Describe the manual process and how much time it costs..." />
            </Field>
            <Field label="Department">
              <select name="orgUnitId" required className="input">
                {orgUnitRows
                  .filter((u) => u.level === "DEPARTMENT" || u.level === "SECTION")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue="MEDIUM" className="input">
                {ISSUE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p[0] + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </Field>

            <button type="submit" className="mt-1 rounded-lg bg-gradient-to-br from-blue to-teal py-2.5 text-[12.5px] font-semibold text-white">
              Submit Issue
            </button>
          </form>
        ) : (
          <div className="flex w-80 flex-shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface p-5 text-[12px] text-text-faint">
            <span className="font-heading text-[13px] font-semibold text-text">All Companies</span>
            Showing issues across every client company. Pick one from the switcher above to submit a new issue.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-dim">{label}</span>
      {children}
    </label>
  );
}
