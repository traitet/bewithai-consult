import { db } from "@/lib/db/client";
import { bookings, consultantUnavailability, users, projects, companies } from "@/lib/db/schema";
import { eq, and, gte, lt, ne } from "drizzle-orm";
import type { Scope } from "@/lib/db/tenant-db";

export async function listConsultants() {
  return db.select().from(users).where(eq(users.role, "CONSULTANT"));
}

/**
 * Upcoming bookings visible to this scope. Company users only ever see
 * their OWN company's bookings, with full detail (who/what project) — never
 * another company's. Consultants/superadmins see every company's bookings.
 * (A stricter "busy-only" cross-company view was scoped for later; for now
 * a company user simply never queries outside their own company at all.)
 */
export async function listUpcomingBookings(scope: Scope, companyId: string | null) {
  if (scope.companyId !== null && scope.companyId !== companyId) {
    throw new Error("Forbidden: not your company");
  }

  const rows = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      topic: bookings.topic,
      status: bookings.status,
      consultantName: users.name,
      companyName: companies.name,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.consultantId, users.id))
    .innerJoin(companies, eq(bookings.companyId, companies.id))
    .where(companyId ? eq(bookings.companyId, companyId) : undefined)
    .orderBy(bookings.startAt);

  return rows;
}

export async function listConsultantUnavailability(consultantId?: string) {
  const rows = await db.select().from(consultantUnavailability);
  return consultantId ? rows.filter((r) => r.consultantId === consultantId) : rows;
}

/** True if the given [startAt, endAt) window is free for this consultant (no overlapping confirmed booking or unavailability block). */
async function isSlotFree(consultantId: string, startAt: Date, endAt: Date): Promise<boolean> {
  const existingBookings = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.consultantId, consultantId), ne(bookings.status, "CANCELLED")));
  const overlapsBooking = existingBookings.some((b) => b.startAt < endAt && b.endAt > startAt);
  if (overlapsBooking) return false;

  const blocks = await db.select().from(consultantUnavailability).where(eq(consultantUnavailability.consultantId, consultantId));
  const overlapsBlock = blocks.some((b) => b.startAt < endAt && b.endAt > startAt);
  return !overlapsBlock;
}

export async function createBooking(
  scope: Scope,
  input: { companyId: string; consultantId: string; projectId?: string; startAt: Date; endAt: Date; topic: string }
) {
  if (scope.companyId !== null && scope.companyId !== input.companyId) {
    throw new Error("Forbidden: cannot book for another company");
  }
  if (input.endAt <= input.startAt) throw new Error("End time must be after start time");
  if (input.startAt.getHours() < 8 || input.endAt.getHours() > 22 || (input.endAt.getHours() === 22 && input.endAt.getMinutes() > 0)) {
    throw new Error("Consultants are only bookable between 08:00 and 22:00");
  }

  const free = await isSlotFree(input.consultantId, input.startAt, input.endAt);
  if (!free) throw new Error("That consultant is already booked or unavailable at that time");

  const [row] = await db
    .insert(bookings)
    .values({
      companyId: input.companyId,
      consultantId: input.consultantId,
      projectId: input.projectId ?? null,
      requestedById: scope.userId,
      startAt: input.startAt,
      endAt: input.endAt,
      topic: input.topic,
      status: "CONFIRMED",
    })
    .returning();
  return row;
}

const GRID_HOURS = [8, 10, 12, 14, 16, 18, 20]; // 2-hour slots covering 08:00-22:00
const DAY_LABELS_TH = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

export type WeekSlot = {
  hour: number;
  status: "AVAILABLE" | "BOOKED" | "UNAVAILABLE";
  label?: string; // shown only when the viewer is allowed to see whose/what it is
};
export type WeekDay = { date: Date; label: string; slots: WeekSlot[] };

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * A consultant's week as a grid of 2-hour slots. Per the confirmed privacy
 * rule: a company user sees ONLY "unavailable" for another company's
 * booking (no company/project/topic detail) — full detail is visible only
 * for their own company's bookings, and consultants/superadmins see
 * everything.
 */
export async function getConsultantWeekGrid(
  scope: Scope,
  consultantId: string,
  weekOffset: number
): Promise<WeekDay[]> {
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  const allBookings = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.consultantId, consultantId), ne(bookings.status, "CANCELLED")));
  const weekBookings = allBookings.filter((b) => b.startAt >= monday && b.startAt < sunday);

  const allBlocks = await db.select().from(consultantUnavailability).where(eq(consultantUnavailability.consultantId, consultantId));
  const weekBlocks = allBlocks.filter((b) => b.startAt >= monday && b.startAt < sunday);

  const requesterNames = new Map<string, string>();
  for (const b of weekBookings) {
    if (!requesterNames.has(b.requestedById)) {
      const [u] = await db.select().from(users).where(eq(users.id, b.requestedById));
      if (u) requesterNames.set(b.requestedById, u.name);
    }
  }

  return Array.from({ length: 7 }, (_, dayIdx) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayIdx);

    const slots: WeekSlot[] = GRID_HOURS.map((hour) => {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 2, 0, 0, 0);

      const blockHit = weekBlocks.find((b) => b.startAt < slotEnd && b.endAt > slotStart);
      if (blockHit) return { hour, status: "UNAVAILABLE", label: blockHit.reason ?? "ไม่ว่าง" };

      const bookingHit = weekBookings.find((b) => b.startAt < slotEnd && b.endAt > slotStart);
      if (bookingHit) {
        const isOwnCompany = scope.companyId === null || scope.companyId === bookingHit.companyId;
        return {
          hour,
          status: "BOOKED",
          label: isOwnCompany ? requesterNames.get(bookingHit.requestedById) ?? "จองแล้ว" : "ไม่ว่าง",
        };
      }

      return { hour, status: "AVAILABLE" };
    });

    return { date, label: DAY_LABELS_TH[dayIdx], slots };
  });
}

export async function cancelBooking(scope: Scope, bookingId: string) {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!row) throw new Error("Booking not found");
  if (scope.companyId !== null && scope.companyId !== row.companyId) {
    throw new Error("Forbidden: not your company's booking");
  }
  await db.update(bookings).set({ status: "CANCELLED" }).where(eq(bookings.id, bookingId));
}
