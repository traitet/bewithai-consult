import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listIssues } from "@/lib/repos/issues";
import { listOrgUnits } from "@/lib/repos/org-units";
import { Badge } from "@/components/ui/Badge";
import { createIssueAction } from "./actions";
import { ISSUE_PRIORITIES } from "@/lib/types";
import Link from "next/link";

export default async function IssuesPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);
  const showingAllCompanies = companyId === null;

  const [issueRows, orgUnitRows] = await Promise.all([
    listIssues(scope, companyId),
    companyId ? listOrgUnits(scope, companyId) : Promise.resolve([]),
  ]);

  return (
    <AppShell title="Issues">
      <div className="flex gap-6">
        <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
                <th className="px-5 py-3 font-semibold">Title</th>
                {showingAllCompanies && <th className="px-5 py-3 font-semibold">Company</th>}
                <th className="px-5 py-3 font-semibold">Department</th>
                <th className="px-5 py-3 font-semibold">Submitted by</th>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {issueRows.map((row) => (
                <tr key={row.id} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3.5 text-text">{row.title}</td>
                  {showingAllCompanies && <td className="px-5 py-3.5 text-text-dim">{row.companyName}</td>}
                  <td className="px-5 py-3.5 text-text-dim">{row.orgUnitName}</td>
                  <td className="px-5 py-3.5 text-text-dim">{row.createdByName}</td>
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
              {issueRows.length === 0 && (
                <tr>
                  <td colSpan={showingAllCompanies ? 7 : 6} className="px-5 py-8 text-center text-text-faint">
                    No issues yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
