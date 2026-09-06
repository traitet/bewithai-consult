import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { listAllCompanies } from "@/lib/repos/companies";
import { listOrgUnits } from "@/lib/repos/org-units";
import { listConsultants, listAiTools } from "@/lib/repos/consultants";
import { listSkillLevelDefs } from "@/lib/repos/skills";
import { isCompanyIndependentRole } from "@/lib/types";

const LEVEL_LABEL_TH: Record<string, string> = { DIVISION: "ฝ่าย", DEPARTMENT: "แผนก", SECTION: "หน่วยงาน" };
const LEVEL_INDENT: Record<string, string> = { DIVISION: "", DEPARTMENT: "— ", SECTION: "—— " };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;
  if (!isCompanyIndependentRole(session.role)) redirect("/dashboard");

  const scope = scopeFromSession(session);
  const [allCompanies, allConsultants, allAiTools, skillLevels] = await Promise.all([
    listAllCompanies(scope),
    listConsultants(),
    listAiTools(),
    listSkillLevelDefs(scope),
  ]);

  const firstCompany = allCompanies[0];
  const orgUnitRows = firstCompany ? await listOrgUnits(scope, firstCompany.id) : [];
  const sortedOrgUnits = [...orgUnitRows].sort((a, b) => {
    const order = { DIVISION: 0, DEPARTMENT: 1, SECTION: 2 } as const;
    return order[a.level as keyof typeof order] - order[b.level as keyof typeof order] || a.name.localeCompare(b.name);
  });

  return (
    <AppShell title="ตั้งค่า & ข้อมูลหลัก (Settings & Master Data)">
      <p className="mb-5 text-[12px] text-text-faint">หน้านี้จำกัดสิทธิ์เฉพาะ Consultant และ Super Admin — เวอร์ชันนี้แสดงข้อมูลอย่างเดียว (การแก้ไขจะเพิ่มในเวอร์ชันถัดไป)</p>

      <div className="grid grid-cols-2 gap-5">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">บริษัทลูกค้า (Companies)</h2>
          <div className="flex flex-col gap-2">
            {allCompanies.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2.5">
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-medium text-text">{c.name}</span>
                  <span className="text-[11px] text-text-faint">{c.industry}</span>
                </div>
                <span className="text-[11px] font-semibold text-text-dim">{c.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">Consultant</h2>
          <div className="flex flex-col gap-2">
            {allConsultants.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2.5">
                <span className="text-[12.5px] font-medium text-text">{c.name}</span>
                <span className="text-[11px] text-text-faint">
                  {c.workStartHour ?? 8}:00–{c.workEndHour ?? 22}:00 น. · ทุกวัน
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">
            โครงสร้างองค์กร — {firstCompany?.name ?? "—"}
          </h2>
          <div className="flex flex-col gap-1.5">
            {sortedOrgUnits.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded px-2 py-1.5 text-[12px]">
                <span className="text-text-dim">
                  {LEVEL_INDENT[u.level]}
                  {u.name}
                </span>
                <span className="text-[10.5px] text-text-faint">{LEVEL_LABEL_TH[u.level] ?? u.level}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">AI Tools</h2>
            <div className="flex flex-wrap gap-2">
              {allAiTools.map((t) => (
                <span key={t.id} className="rounded-md bg-surface-alt px-2.5 py-1.5 text-[12px] font-medium text-text">
                  {t.name}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">ระดับทักษะ (Skill Levels)</h2>
            <div className="flex flex-col gap-2">
              {skillLevels.map((l) => (
                <div key={l.level} className="flex items-center gap-2 text-[12px]">
                  <span className="rounded bg-teal/10 px-1.5 py-0.5 font-semibold text-teal">L{l.level}</span>
                  <span className="font-medium text-text">{l.name}</span>
                  <span className="text-text-faint">— {l.description}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
