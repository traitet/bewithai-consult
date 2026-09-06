import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listLeaderboard, LEADERBOARD_POINTS } from "@/lib/repos/leaderboard";
import { Avatar } from "@/components/ui/Avatar";
import { userInitials } from "@/lib/repos/users";

const RANK_STYLES: Record<number, string> = {
  1: "border-[#e0b038] bg-[#fdf6e3]",
  2: "border-[#b9c0c9] bg-[#f4f6f8]",
  3: "border-[#cf8a4f] bg-[#fbf1e8]",
};
const RANK_BADGE: Record<number, string> = {
  1: "bg-[#e0b038] text-white",
  2: "bg-[#9aa4af] text-white",
  3: "bg-[#cf8a4f] text-white",
};

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);
  const showingAllCompanies = companyId === null;

  const rows = await listLeaderboard(scope, companyId);
  const myRow = rows.find((r) => r.userId === session.userId);

  return (
    <AppShell title="อันดับ (Leaderboard)">
      <div className="mb-5 rounded-2xl border border-border bg-surface p-4 text-[12px] text-text-faint">
        คะแนนคำนวณจาก: {LEADERBOARD_POINTS.PER_BENEFIT_HOUR} คะแนน/ชม.ที่ประหยัดได้ต่อปี ·{" "}
        โบนัส {LEADERBOARD_POINTS.TARGET_MET_BONUS} คะแนนเมื่อถึงเป้าหมายประจำปี ·{" "}
        {LEADERBOARD_POINTS.PER_SKILL_LEVEL} คะแนน/ระดับทักษะ AI · {LEADERBOARD_POINTS.PER_COMPLETED_COURSE} คะแนน/หลักสูตรที่เรียนจบ ·{" "}
        {LEADERBOARD_POINTS.PER_PUBLISHED_CASE_STUDY} คะแนน/เรื่องราวความสำเร็จที่เผยแพร่
      </div>

      {myRow && myRow.rank > 10 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-blue/35 bg-blue/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue text-[12px] font-bold text-white">
              #{myRow.rank}
            </span>
            <span className="text-[12.5px] font-semibold text-text">อันดับของคุณ</span>
          </div>
          <span className="text-[13px] font-bold text-blue">{myRow.score.toLocaleString()} คะแนน</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.userId}
            className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
              RANK_STYLES[row.rank] ?? (row.userId === session.userId ? "border-blue/40 bg-blue/5" : "border-border bg-surface")
            }`}
          >
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${
                RANK_BADGE[row.rank] ?? "bg-surface-alt text-text-dim"
              }`}
            >
              {row.rank}
            </span>
            <Avatar name={row.name} initials={userInitials(row.name)} avatarUrl={row.avatarUrl} size={34} />
            <div className="flex flex-1 flex-col">
              <span className="text-[12.5px] font-semibold text-text">
                {row.name}
                {row.userId === session.userId && <span className="ml-1.5 text-[11px] font-normal text-blue">(คุณ)</span>}
              </span>
              <span className="text-[11px] text-text-faint">
                {row.departmentName ?? row.divisionName ?? "—"}
                {showingAllCompanies && row.orgUnitName ? ` · ${row.orgUnitName}` : ""}
              </span>
            </div>

            <div className="hidden flex-shrink-0 items-center gap-4 text-[11px] text-text-faint sm:flex">
              <Stat label="ชม./ปี" value={row.benefitHoursPerYear} highlight={row.targetMet} />
              <Stat label="ระดับสกิล" value={row.overallSkillLevel} />
              <Stat label="คอร์สจบ" value={row.completedCourses} />
              <Stat label="Success Story" value={row.caseStudyCount} />
            </div>

            <span className="w-20 flex-shrink-0 text-right text-[14px] font-bold text-text">{row.score.toLocaleString()}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-[12.5px] text-text-faint">
            ยังไม่มีข้อมูลสำหรับจัดอันดับ
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-[12px] font-semibold ${highlight ? "text-green" : "text-text-dim"}`}>{value}</span>
      <span>{label}</span>
    </div>
  );
}
