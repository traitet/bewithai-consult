"use server";

import { redirect } from "next/navigation";
import { findUserByEmailForLogin } from "@/lib/repos/users";
import { verifyPassword, createSessionCookie } from "@/lib/auth";
import type { Role } from "@/lib/types";

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await findUserByEmailForLogin(email);
  if (!user) {
    return { error: "No account with that email." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "Incorrect password." };
  }

  await createSessionCookie({
    userId: user.id,
    companyId: user.companyId,
    role: user.role as Role,
    name: user.name,
    email: user.email,
  });

  redirect("/dashboard");
}
