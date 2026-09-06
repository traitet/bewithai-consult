import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { getMemberProfile } from "@/lib/repos/members";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/lib/labels";
import { userInitials } from "@/lib/repos/users";
import type { Role } from "@/lib/types";

export default async function MemberProfilePage(props: PageProps<"/members/[id]">) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);

  const profile = await getMemberProfile(scope, id);
  if (!profile) notFound();
  const { user, orgUnit, company, skills, submittedIssues, projects } = profile;

  return (
    <AppShell title={user.name}>
      <div className="flex gap-6">
        <div className="w-72 flex-shrink-0">
          <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
            <Avatar name={user.name} initials={userInitials(user.name)} avatarUrl={user.avatarUrl} size={64} />
            <div>
              <p className="font-heading text-[16px] font-semibold text-text">{user.name}</p>
              <p className="text-[12px] text-text-faint">{ROLE_LABELS[user.role as Role] ?? user.role}</p>
            </div>
            <div className="flex flex-col gap-1 border-t border-border-soft pt-3 text-[12px] text-text-dim">
              {company && <span>บริษัท: {company.name}</span>}
              {orgUnit && <span>หน่วยงาน: {orgUnit.name}</span>}
              <span>อีเมล: {user.email}</span>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[13px] font-semibold text-text">ทักษะ (Skills)</h2>
            {skills.length === 0 && <p className="text-[12px] text-text-faint">ยังไม่มีข้อมูลทักษะ</p>}
            <div className="flex flex-col gap-2">
              {skills.map((s) => (
                <div key={s.aiToolName} className="flex items-center justify-between text-[12px]">
                  <span className="text-text">{s.aiToolName}</span>
                  <span className="font-semibold text-teal">L{s.level}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-1 flex-col gap-5">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[13px] font-semibold text-text">โปรเจกต์ที่เกี่ยวข้อง ({projects.length})</h2>
            <div className="flex flex-col gap-2">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2.5 hover:border-blue">
                  <span className="text-[12.5px] font-medium text-text">{p.title}</span>
                  <Badge value={p.status} />
                </Link>
              ))}
              {projects.length === 0 && <p className="text-[12px] text-text-faint">ยังไม่มีโปรเจกต์ที่เกี่ยวข้อง</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[13px] font-semibold text-text">ปัญหาที่แจ้ง ({submittedIssues.length})</h2>
            <div className="flex flex-col gap-2">
              {submittedIssues.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2.5">
                  <span className="text-[12.5px] text-text">{i.title}</span>
                  <Badge value={i.status} />
                </div>
              ))}
              {submittedIssues.length === 0 && <p className="text-[12px] text-text-faint">ยังไม่ได้แจ้งปัญหา</p>}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
