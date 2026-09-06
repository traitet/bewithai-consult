import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { listPendingApprovalsForUser, listMyApprovalHistory, listMyRequestsStatus } from "@/lib/repos/my-approvals";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/types";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);

  const [pending, history, myRequests] = await Promise.all([
    listPendingApprovalsForUser(scope),
    listMyApprovalHistory(scope),
    listMyRequestsStatus(scope),
  ]);

  return (
    <AppShell title="การอนุมัติ (Approvals)">
      {pending.length > 0 && (
        <section className="mb-5 rounded-2xl border border-amber/35 bg-amber/5 p-5">
          <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">รอฉันอนุมัติ ({pending.length})</h2>
          <div className="flex flex-col gap-2">
            {pending.map(({ step, project, companyName }) => (
              <Link
                key={step.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 hover:border-blue"
              >
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-semibold text-text">{project.title}</span>
                  <span className="text-[11px] text-text-faint">
                    {companyName} · ขั้นตอน: {ROLE_LABELS[step.roleRequired as Role] ?? step.roleRequired}
                  </span>
                </div>
                <span className="text-[11.5px] font-semibold text-blue">พิจารณา →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-5 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">ประวัติการอนุมัติของฉัน ({history.length})</h2>
        <div className="overflow-hidden rounded-lg border border-border-soft">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-border-soft bg-surface-alt text-[11px] uppercase tracking-wide text-text-faint">
                <th className="px-4 py-2.5 font-semibold">โปรเจกต์</th>
                <th className="px-4 py-2.5 font-semibold">ผลการพิจารณา</th>
                <th className="px-4 py-2.5 font-semibold">เป้าหมายลดเวลา</th>
                <th className="px-4 py-2.5 font-semibold">วันที่</th>
              </tr>
            </thead>
            <tbody>
              {history.map(({ step, project }) => (
                <tr key={step.id} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/projects/${project.id}`} className="font-medium text-text hover:text-blue">
                      {project.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge value={step.decision} label={step.decision === "APPROVED" ? "อนุมัติ" : "ไม่อนุมัติ"} />
                  </td>
                  <td className="px-4 py-2.5 text-text-dim">{step.targetHoursPerWeek != null ? `${step.targetHoursPerWeek} ชม./สัปดาห์` : "—"}</td>
                  <td className="px-4 py-2.5 text-text-dim">{step.decidedAt ? new Date(step.decidedAt).toLocaleDateString("th-TH") : "—"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-faint">
                    ยังไม่มีประวัติการอนุมัติ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">สถานะคำขอของฉัน ({myRequests.length})</h2>
        <p className="mb-3 text-[11.5px] text-text-faint">โปรเจกต์ที่แปลงมาจากปัญหาที่ฉันแจ้ง — กำลังรออนุมัติขั้นตอนไหนอยู่</p>
        <div className="flex flex-col gap-2">
          {myRequests.map(({ project, workflow, currentStepRole }) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between rounded-lg border border-border-soft px-4 py-3 hover:border-blue"
            >
              <span className="text-[12.5px] font-medium text-text">{project.title}</span>
              <div className="flex items-center gap-2">
                {workflow?.status === "PENDING" && currentStepRole && (
                  <span className="text-[11px] text-text-faint">
                    รออนุมัติจาก: {ROLE_LABELS[currentStepRole as Role] ?? currentStepRole}
                  </span>
                )}
                <Badge value={project.status} />
              </div>
            </Link>
          ))}
          {myRequests.length === 0 && <p className="text-[12px] text-text-faint">ยังไม่มีคำขอที่เกี่ยวข้อง</p>}
        </div>
      </section>
    </AppShell>
  );
}
