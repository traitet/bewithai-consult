import { Fragment } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listConsultants, getConsultantWeekGrid } from "@/lib/repos/bookings";
import { Avatar } from "@/components/ui/Avatar";
import { userInitials } from "@/lib/repos/users";
import { createBookingAction } from "./actions";

const HOUR_LABELS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

function formatDateTh(d: Date): string {
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default async function BookingsPage(props: PageProps<"/bookings">) {
  const searchParams = await props.searchParams;
  const weekOffset = typeof searchParams.week === "string" ? parseInt(searchParams.week, 10) || 0 : 0;

  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);

  const consultants = await listConsultants();
  const selectedConsultantId =
    typeof searchParams.consultantId === "string" ? searchParams.consultantId : consultants[0]?.id;
  const selectedConsultant = consultants.find((c) => c.id === selectedConsultantId) ?? consultants[0];

  const week = selectedConsultant ? await getConsultantWeekGrid(scope, selectedConsultant.id, weekOffset) : [];

  const weekQuery = (offset: number) =>
    `?consultantId=${selectedConsultantId}&week=${offset}`;

  return (
    <AppShell title="นัดหมาย (Bookings)">
      <p className="mb-4 text-[12.5px] text-text-faint">
        นัดปรึกษากับ Consultant ทั้ง 3 ท่าน ได้ในเวลา 08:00–22:00 น. ทุกวัน (จันทร์–อาทิตย์)
      </p>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {consultants.map((c) => (
                <Link
                  key={c.id}
                  href={`?consultantId=${c.id}&week=0`}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                    c.id === selectedConsultantId ? "border-blue bg-blue/10" : "border-border bg-surface"
                  }`}
                >
                  <Avatar name={c.name} initials={userInitials(c.name)} avatarUrl={c.avatarUrl} size={22} />
                  <span className={`text-[12.5px] font-medium ${c.id === selectedConsultantId ? "text-blue" : "text-text-dim"}`}>
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-[11px] text-text-faint">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm border border-teal bg-teal/10" /> ว่าง
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-blue" /> จองแล้ว
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-surface-alt" /> ไม่ว่าง
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Link href={weekQuery(weekOffset - 1)} className="rounded border border-border px-2 py-1 text-[11px] text-text-dim">
                  ←
                </Link>
                <Link href={weekQuery(weekOffset + 1)} className="rounded border border-border px-2 py-1 text-[11px] text-text-dim">
                  →
                </Link>
              </div>
            </div>
          </div>

          {selectedConsultant ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface p-4">
              <div className="grid grid-cols-8 gap-1.5">
                <div />
                {week.map((day) => (
                  <div key={day.label} className="text-center">
                    <div className="text-[10.5px] font-semibold uppercase text-text-faint">{day.label.slice(0, 3)}</div>
                    <div className="text-[12px] font-medium text-text">{formatDateTh(day.date)}</div>
                  </div>
                ))}
                {HOUR_LABELS.map((hourLabel, rowIdx) => (
                  <Fragment key={hourLabel}>
                    <div className="pt-1 text-[10.5px] text-text-faint">{hourLabel}</div>
                    {week.map((day) => {
                      const slot = day.slots[rowIdx];
                      const style =
                        slot.status === "AVAILABLE"
                          ? "border border-teal bg-teal/10 text-teal"
                          : slot.status === "BOOKED"
                            ? "bg-blue text-white"
                            : "bg-surface-alt text-text-faint";
                      return (
                        <div key={`${day.label}-${hourLabel}`} className={`flex h-12 items-center justify-center rounded-md px-1 text-center text-[10px] font-medium ${style}`}>
                          {slot.status === "AVAILABLE" ? "ว่าง" : slot.label}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-text-faint">ยังไม่มี Consultant</div>
          )}
        </div>

        {companyId ? (
          <form
            action={createBookingAction}
            className="flex w-80 flex-shrink-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
          >
            <h2 className="font-heading text-[14px] font-semibold text-text">นัดหมายใหม่</h2>
            <input type="hidden" name="companyId" value={companyId} />

            <Field label="Consultant">
              <select name="consultantId" defaultValue={selectedConsultantId} required className="input">
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="วันที่">
              <input name="date" type="date" required className="input" />
            </Field>
            <Field label="เวลาเริ่ม (08:00–22:00)">
              <input name="time" type="time" required min="08:00" max="21:30" className="input" />
            </Field>
            <Field label="ระยะเวลา">
              <select name="durationMinutes" defaultValue="60" className="input">
                <option value="30">30 นาที</option>
                <option value="60">1 ชั่วโมง</option>
                <option value="90">1 ชั่วโมง 30 นาที</option>
              </select>
            </Field>
            <Field label="หัวข้อที่ต้องการปรึกษา">
              <input name="topic" required className="input" placeholder="เช่น ทบทวนความคืบหน้าโครงการ" />
            </Field>

            <button type="submit" className="mt-1 rounded-lg bg-gradient-to-br from-blue to-teal py-2.5 text-[12.5px] font-semibold text-white">
              ยืนยันการนัดหมาย
            </button>
          </form>
        ) : (
          <div className="flex w-80 flex-shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface p-5 text-[12px] text-text-faint">
            <span className="font-heading text-[13px] font-semibold text-text">ทุกบริษัท</span>
            เลือกบริษัทจากด้านบนเพื่อสร้างนัดหมายใหม่
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
