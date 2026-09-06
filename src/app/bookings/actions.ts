"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { createBooking, cancelBooking } from "@/lib/repos/bookings";

export async function createBookingAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);

  const companyId = String(formData.get("companyId") ?? "");
  const consultantId = String(formData.get("consultantId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const durationMinutes = Number(formData.get("durationMinutes") ?? 60);
  const topic = String(formData.get("topic") ?? "").trim();

  if (!companyId || !consultantId || !date || !time || !topic) {
    throw new Error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
  }

  const startAt = new Date(`${date}T${time}:00`);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  await createBooking(scope, { companyId, consultantId, startAt, endAt, topic });
  revalidatePath("/bookings");
}

export async function cancelBookingAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const scope = scopeFromSession(session);
  const bookingId = String(formData.get("bookingId") ?? "");

  await cancelBooking(scope, bookingId);
  revalidatePath("/bookings");
}
