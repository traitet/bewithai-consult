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

export async function cancelBooking(scope: Scope, bookingId: string) {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!row) throw new Error("Booking not found");
  if (scope.companyId !== null && scope.companyId !== row.companyId) {
    throw new Error("Forbidden: not your company's booking");
  }
  await db.update(bookings).set({ status: "CANCELLED" }).where(eq(bookings.id, bookingId));
}
