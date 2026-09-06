import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { listTeamForDivisionManager, DEFAULT_ANNUAL_TARGET_HOURS } from "@/lib/repos/team";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/types";
import { setAnnualTargetAction } from "./actions";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "DIVISION_MANAGER") redirect("/dashboard");

  const scope = scopeFromSession(session);
  const members = await listTeamForDivisionManager(scope, session.userId);

  return (
    <AppShell title="My Team">
      <p className="mb-4 text-[12.5px] text-text-faint">
        Set each person&rsquo;s annual benefit-hours target — the AI-adoption time savings they&rsquo;re expected to
        reach this year. Default is {DEFAULT_ANNUAL_TARGET_HOURS} hrs/year (15% of a 2,000 hour work year).
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Annual Target</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border-soft last:border-0">
                <td className="px-5 py-3.5 font-medium text-text">{m.name}</td>
                <td className="px-5 py-3.5 text-text-dim">{ROLE_LABELS[m.role as Role] ?? m.role}</td>
                <td className="px-5 py-3.5">
                  <form action={setAnnualTargetAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={m.id} />
                    <input
                      name="annualTargetHours"
                      type="number"
                      min="0"
                      step="10"
                      defaultValue={m.annualTargetHours}
                      className="input w-24"
                    />
                    <span className="text-[11px] text-text-faint">hrs/yr</span>
                    <button type="submit" className="rounded-md border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-text-dim hover:border-blue hover:text-blue">
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-text-faint">
                  No one reports up through your division yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
