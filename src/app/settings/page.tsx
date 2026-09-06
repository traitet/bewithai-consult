import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { listAllCompanies } from "@/lib/repos/companies";
import { listOrgUnits } from "@/lib/repos/org-units";
import { listConsultants, listAiTools } from "@/lib/repos/consultants";
import { listSkillLevelDefs } from "@/lib/repos/skills";
import { isCompanyIndependentRole } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { userInitials } from "@/lib/repos/users";

const LEVEL_LABEL_TH: Record<string, string> = { DIVISION: "ฝ่าย", DEPARTMENT: "แผนก", SECTION: "หน่วยงาน" };
const LEVEL_INDENT: Record<string, string> = { DIVISION: "", DEPARTMENT: "— ", SECTION: "—— " };
const STATUS_LABEL_TH: Record<string, string> = { ACTIVE: "ใช้งานอยู่", ONBOARDING: "กำลังเริ่มใช้งาน", INACTIVE: "ปิดใช้งาน" };

export default async function SettingsPage(props: PageProps<"/settings">) {
  const searchParams = await props.searchParams;

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

  const selectedCompanyId = typeof searchParams.companyId === "string" ? searchParams.companyId : allCompanies[0]?.id;
  const selectedCompany = allCompanies.find((c) => c.id === selectedCompanyId) ?? allCompanies[0];
  const orgUnitRows = selectedCompany ? await listOrgUnits(scope, selectedCompany.id) : [];
  const sortedOrgUnits = [...orgUnitRows].sort((a, b) => {
    const order = { DIVISION: 0, DEPARTMENT: 1, SECTION: 2 } as const;
    return order[a.level as keyof typeof order] - order[b.level as keyof typeof order] || a.name.localeCompare(b.name);
  });

  return (
    <AppShell title="ตั้งค่า & ข้อมูลหลัก (Settings & Master Data)">
      <p className="mb-5 text-[12px] text-text-faint">
        หน้านี้จำกัดสิทธิ์เฉพาะ Consultant และ Super Admin — เวอร์ชันนี้แสดงข้อมูลอย่างเดียว (การแก้ไขจะเพิ่มในเวอร์ชันถัดไป)
      </p>

      <section className="mb-5 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">บริษัทลูกค้า (Companies)</h2>
        <div className="grid grid-cols-3 gap-3">
          {allCompanies.map((c) => (
            <Link
              key={c.id}
              href={`?companyId=${c.id}`}
              className={`flex flex-col gap-1.5 rounded-xl border p-3.5 ${
                c.id === selectedCompanyId ? "border-blue bg-blue/5" : "border-border-soft"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-text">{c.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    c.status === "ACTIVE" ? "bg-green/10 text-green" : "bg-amber/10 text-amber"
                  }`}
                >
                  {STATUS_LABEL_TH[c.status] ?? c.status}
                </span>
              </div>
              <span className="text-[11px] text-text-faint">{c.industry}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-5">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">
            โครงสร้างองค์กร — {selectedCompany?.name ?? "—"}
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
            {sortedOrgUnits.length === 0 && <p className="text-[12px] text-text-faint">ไม่มีข้อมูล</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">Consultant (ข้อมูลหลัก)</h2>
          <div className="flex flex-col gap-2">
            {allConsultants.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border-soft px-3 py-2.5">
                <Avatar name={c.name} initials={userInitials(c.name)} avatarUrl={c.avatarUrl} size={28} />
                <span className="flex-1 text-[12.5px] font-medium text-text">{c.name}</span>
                <span className="text-[11px] text-text-faint">
                  {c.workStartHour ?? 8}:00–{c.workEndHour ?? 22}:00 น. · ทุกวัน
                </span>
              </div>
            ))}
          </div>
        </section>

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

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-[11.5px] text-text-faint">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="8" width="12" height="9" rx="1.5" />
          <path d="M7 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        ข้อมูลถูกแยกตามบริษัทอย่างเคร่งครัด บริษัทหนึ่งจะไม่สามารถเห็นข้อมูลของอีกบริษัทได้ ยกเว้น Consultant ทั้ง 3 ท่านที่เห็นข้ามบริษัทได้
      </div>
    </AppShell>
  );
}
