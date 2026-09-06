"use server";

import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCompanyIndependentRole } from "@/lib/types";

const COOKIE_NAME = "bewithai_viewing_company";

/**
 * Consultants (session.companyId === null) can narrow their view to one
 * client company at a time, or clear it to see the "All Companies"
 * aggregate. This is a UI convenience only — it never widens what a
 * company user can see (they don't have this cookie honored at all, see
 * effectiveCompanyId below).
 */
export async function getViewingCompanyId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setViewingCompany(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!isCompanyIndependentRole(session.role)) {
    throw new Error("Only consultants/admins can switch company view");
  }
  const companyId = formData.get("companyId");
  const store = await cookies();
  if (!companyId || companyId === "ALL") {
    store.delete(COOKIE_NAME);
  } else {
    store.set(COOKIE_NAME, String(companyId), { path: "/", httpOnly: true, sameSite: "lax" });
  }
  redirect("/dashboard");
}

/** The companyId to use for scoping a consultant's *read* views (not writes — writes always require an explicit companyId). Company users always see their own company; this never applies to them. */
export async function effectiveViewingCompanyId(session: {
  companyId: string | null;
}): Promise<string | null> {
  if (session.companyId !== null) return session.companyId;
  return getViewingCompanyId();
}
