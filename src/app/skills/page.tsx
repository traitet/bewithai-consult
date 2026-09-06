import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listSkillDirectory } from "@/lib/repos/skills";
import { listAiTools } from "@/lib/repos/consultants";
import { setMySkillLevelAction } from "./actions";

const LEVEL_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];

function LevelDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`h-2 w-2 rounded-sm ${n <= level ? "bg-teal" : "bg-surface-alt"}`} />
        ))}
      </div>
      {level > 0 && <span className="text-[10.5px] text-text-faint">L{level}</span>}
    </div>
  );
}

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);

  if (!companyId) {
    return (
      <AppShell title="Skill Directory">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-dim">
          Pick a company from the switcher above to view its skill directory.
        </div>
      </AppShell>
    );
  }

  const [directory, tools] = await Promise.all([listSkillDirectory(scope, companyId), listAiTools()]);
  const myRow = directory.find((r) => r.userId === session.userId);

  return (
    <AppShell title="Skill Directory">
      <div className="mb-5 flex items-center gap-6 rounded-2xl border border-border bg-surface p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">Levels</span>
        {LEVEL_LABELS.slice(1).map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <LevelDots level={i + 1} />
            <span className="text-[11px] text-text-faint">{label}</span>
          </div>
        ))}
      </div>

      {session.companyId && (
        <div className="mb-5 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-heading text-[13px] font-semibold text-text">Self-report your level</h2>
          <div className="flex flex-wrap gap-4">
            {tools.map((tool) => (
              <form key={tool.id} action={setMySkillLevelAction} className="flex items-center gap-2 rounded-lg border border-border p-2 pl-3">
                <input type="hidden" name="aiToolId" value={tool.id} />
                <span className="text-[12px] font-medium text-text">{tool.name}</span>
                <select name="level" defaultValue={myRow?.levels[tool.id] ?? ""} className="input py-1.5 text-[12px]">
                  <option value="" disabled>
                    Level
                  </option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      L{n} — {LEVEL_LABELS[n]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded-md bg-gradient-to-br from-blue to-teal px-2.5 py-1.5 text-[11px] font-semibold text-white">
                  Save
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              {tools.map((tool) => (
                <th key={tool.id} className="px-5 py-3 font-semibold">
                  {tool.name}
                </th>
              ))}
              <th className="px-5 py-3 font-semibold">Overall</th>
            </tr>
          </thead>
          <tbody>
            {directory.map((row) => (
              <tr key={row.userId} className="border-b border-border-soft last:border-0">
                <td className="px-5 py-3.5 font-medium text-text">{row.name}</td>
                <td className="px-5 py-3.5 text-text-dim">{row.role.replace(/_/g, " ")}</td>
                {tools.map((tool) => (
                  <td key={tool.id} className="px-5 py-3.5">
                    <LevelDots level={row.levels[tool.id] ?? 0} />
                  </td>
                ))}
                <td className="px-5 py-3.5">
                  <LevelDots level={row.overallLevel} />
                </td>
              </tr>
            ))}
            {directory.length === 0 && (
              <tr>
                <td colSpan={3 + tools.length} className="px-5 py-8 text-center text-text-faint">
                  No employees found for this company.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
