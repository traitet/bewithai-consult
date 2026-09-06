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
    <AppShell title="ทีมของฉัน">
      <p className="mb-4 text-[12.5px] text-text-faint">
        ตั้งเป้าหมายลดเวลาทำงาน (benefit hours) ต่อปีของแต่ละคนในทีม — เวลาที่คาดว่าจะประหยัดได้จากการใช้ AI ในปีนี้
        ค่าเริ่มต้นคือ {DEFAULT_ANNUAL_TARGET_HOURS} ชม./ปี (15% ของเวลาทำงาน 2,000 ชม./ปี)
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-5 py-3 font-semibold">ชื่อ</th>
              <th className="px-5 py-3 font-semibold">ตำแหน่ง</th>
              <th className="px-5 py-3 font-semibold">เป้าหมายรายปี</th>
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
                    <span className="text-[11px] text-text-faint">ชม./ปี</span>
                    <button type="submit" className="rounded-md border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-text-dim hover:border-blue hover:text-blue">
                      บันทึก
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-text-faint">
                  ยังไม่มีพนักงานในสายงานที่คุณดูแล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
