import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { getIssueDetail } from "@/lib/repos/issues";
import { listCompanyUsers } from "@/lib/repos/users";
import { Badge } from "@/components/ui/Badge";
import { FREQUENCY_LABELS_TH, type FrequencyUnit } from "@/lib/workload";
import { AddImpactForm } from "./AddImpactForm";
import { removeIssueImpactAction } from "./actions";

export default async function IssueDetailPage(props: PageProps<"/issues/[id]">) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);

  const detail = await getIssueDetail(scope, id);
  if (!detail) notFound();
  const { issue, orgUnit, createdByName, impacts, totalHoursPerYear } = detail;

  const companyUsers = await listCompanyUsers(scope, issue.companyId);

  return (
    <AppShell title={issue.title}>
      <div className="flex gap-6">
        <div className="flex flex-1 flex-col gap-5">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <Badge value={issue.priority} />
              <Badge value={issue.status} />
              {issue.status !== "CONVERTED" && (
                <Link href={`/issues/${issue.id}/convert`} className="ml-auto text-[12px] font-semibold text-blue">
                  Convert to Project →
                </Link>
              )}
            </div>
            <p className="mb-4 text-[12.5px] leading-relaxed text-text-dim">{issue.description}</p>
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <InfoRow label="แจ้งโดย" value={createdByName} />
              <InfoRow label="หน่วยงาน" value={orgUnit?.name ?? "—"} />
              <InfoRow label="วันที่แจ้ง" value={new Date(issue.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-[14px] font-semibold text-text">ผู้ได้รับผลกระทบ &amp; เวลาที่เสีย</h2>
              <span className="text-[12.5px] font-semibold text-text">
                รวม <span className="text-blue">{totalHoursPerYear.toLocaleString()}</span> ชม./ปี
              </span>
            </div>
            <p className="mb-3 text-[11.5px] text-text-faint">
              คำนวณจากหลักการ 1 ปีทำงาน 250 วัน วันละ 8 ชม. (รวม 2,000 ชม./ปี)
            </p>

            {impacts.length > 0 && (
              <div className="mb-4 overflow-hidden rounded-lg border border-border-soft">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border-soft bg-surface-alt text-[11px] uppercase tracking-wide text-text-faint">
                      <th className="px-4 py-2.5 font-semibold">พนักงาน</th>
                      <th className="px-4 py-2.5 font-semibold">ความถี่</th>
                      <th className="px-4 py-2.5 font-semibold">เวลาที่เสียต่อครั้ง</th>
                      <th className="px-4 py-2.5 font-semibold">ชม./ปี</th>
                      <th className="px-4 py-2.5 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {impacts.map((impact) => (
                      <tr key={impact.id} className="border-b border-border-soft last:border-0">
                        <td className="px-4 py-2.5 font-medium text-text">{impact.userName}</td>
                        <td className="px-4 py-2.5 text-text-dim">
                          {impact.frequencyCount} {FREQUENCY_LABELS_TH[impact.frequencyUnit as FrequencyUnit]}
                        </td>
                        <td className="px-4 py-2.5 text-text-dim">{impact.minutesPerOccurrence} นาที</td>
                        <td className="px-4 py-2.5 font-semibold text-text">{impact.hoursPerYear.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">
                          <form action={removeIssueImpactAction}>
                            <input type="hidden" name="issueId" value={issue.id} />
                            <input type="hidden" name="impactId" value={impact.id} />
                            <button type="submit" className="text-[11px] font-medium text-text-faint hover:text-red">
                              ลบ
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <AddImpactForm issueId={issue.id} companyUsers={companyUsers} />
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-text-faint">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
