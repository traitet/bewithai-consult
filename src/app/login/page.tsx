"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { LogoMark } from "@/components/icons";

const initialState: LoginState = { error: null };

const DEMO_ACCOUNTS = [
  { label: "Consultant (sees all companies)", email: "traitet@bewithai.dev" },
  { label: "Section Manager — Acme Mfg", email: "pranee@acme.dev" },
  { label: "Department Manager — Acme Mfg", email: "warit@acme.dev" },
  { label: "Member — Acme Mfg", email: "kanya@acme.dev" },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <LogoMark />
          <span className="font-heading text-[19px] font-semibold text-text">bewithai</span>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-text-dim" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none focus:border-blue"
              placeholder="you@company.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-text-dim" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none focus:border-blue"
              placeholder="password123"
            />
          </div>

          {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-lg bg-gradient-to-br from-blue to-teal py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 border-t border-border-soft pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
            Local demo accounts (password: password123)
          </p>
          <ul className="flex flex-col gap-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="text-[11.5px] text-text-dim">
                <span className="font-mono">{a.email}</span> — {a.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
