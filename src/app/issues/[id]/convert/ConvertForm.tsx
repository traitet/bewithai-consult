"use client";

import { useActionState } from "react";
import { convertIssueAction, type ConvertState } from "./actions";

const initialState: ConvertState = { error: null };

export function ConvertForm({
  issueId,
  defaultTitle,
  defaultDescription,
  consultants,
  aiTools,
}: {
  issueId: string;
  defaultTitle: string;
  defaultDescription: string;
  consultants: { id: string; name: string }[];
  aiTools: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(convertIssueAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <input type="hidden" name="issueId" value={issueId} />

      <Field label="Project title">
        <input name="title" defaultValue={defaultTitle} required className="input" />
      </Field>
      <Field label="Project description">
        <textarea name="description" defaultValue={defaultDescription} required rows={4} className="input resize-none" />
      </Field>
      <Field label="Assign consultant">
        <select name="consultantId" className="input">
          <option value="">Unassigned</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="AI tools used">
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          {aiTools.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-[12.5px] text-text">
              <input type="checkbox" name="aiToolIds" value={t.id} />
              {t.name}
            </label>
          ))}
        </div>
      </Field>

      {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-lg bg-gradient-to-br from-blue to-teal px-5 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create Project & Start Approval"}
      </button>
    </form>
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
