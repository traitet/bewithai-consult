import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listUpcomingBookings, listConsultants } from "@/lib/repos/bookings";
import { Badge } from "@/components/ui/Badge";
import { createBookingAction, cancelBookingAction } from "./actions";

function formatThaiDateTime(d: Date): string {
  return new Date(d).toLocaleString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);
  const showingAllCompanies = companyId === null;

  const [bookingRows, consultants] = await Promise.all([
    listUpcomingBookings(scope, companyId),
    listConsultants(),
  ]);

  return (
    <AppShell title="นัดหมาย (Bookings)">
      <p className="mb-4 text-[12.5px] text-text-faint">
        นัดปรึกษากับ Consultant ทั้ง 3 ท่าน ได้ในเวลา 08:00–22:00 น. ทุกวัน (จันทร์–อาทิตย์)
      </p>
      <div className="flex gap-6">
        <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-faint">
                <th className="px-5 py-3 font-semibold">วันเวลา</th>
                <th className="px-5 py-3 font-semibold">Consultant</th>
                {showingAllCompanies && <th className="px-5 py-3 font-semibold">บริษัท</th>}
                <th className="px-5 py-3 font-semibold">หัวข้อ</th>
                <th className="px-5 py-3 font-semibold">สถานะ</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {bookingRows.map((row) => (
                <tr key={row.id} className="border-b border-border-soft last:border-0">
                  <td className="px-5 py-3.5 text-text">{formatThaiDateTime(row.startAt)}</td>
                  <td className="px-5 py-3.5 text-text-dim">{row.consultantName}</td>
                  {showingAllCompanies && <td className="px-5 py-3.5 text-text-dim">{row.companyName}</td>}
                  <td className="px-5 py-3.5 text-text-dim">{row.topic}</td>
                  <td className="px-5 py-3.5">
                    <Badge value={row.status} label={row.status === "CONFIRMED" ? "ยืนยันแล้ว" : "ยกเลิกแล้ว"} />
                  </td>
                  <td className="px-5 py-3.5">
                    {row.status === "CONFIRMED" && (
                      <form action={cancelBookingAction}>
                        <input type="hidden" name="bookingId" value={row.id} />
                        <button type="submit" className="text-[11.5px] font-semibold text-red">
                          ยกเลิก
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {bookingRows.length === 0 && (
                <tr>
                  <td colSpan={showingAllCompanies ? 6 : 5} className="px-5 py-8 text-center text-text-faint">
                    ยังไม่มีนัดหมาย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {companyId ? (
          <form
            action={createBookingAction}
            className="flex w-80 flex-shrink-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
          >
            <h2 className="font-heading text-[14px] font-semibold text-text">นัดหมายใหม่</h2>
            <input type="hidden" name="companyId" value={companyId} />

            <Field label="Consultant">
              <select name="consultantId" required className="input">
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
            กำลังแสดงนัดหมายของทุกบริษัท เลือกบริษัทจากด้านบนเพื่อสร้างนัดหมายใหม่
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
