import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { getIssue } from "@/lib/repos/issues";
import { listConsultants, listAiTools } from "@/lib/repos/consultants";
import { ConvertForm } from "./ConvertForm";

export default async function ConvertIssuePage(props: PageProps<"/issues/[id]/convert">) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);

  const issue = await getIssue(scope, id);
  if (!issue) notFound();

  const [consultants, aiTools] = await Promise.all([listConsultants(), listAiTools()]);

  return (
    <AppShell title="Convert Issue to Project">
      <div className="mx-auto max-w-xl">
        <p className="mb-4 text-[12.5px] text-text-faint">
          From issue: <span className="font-medium text-text-dim">{issue.title}</span>
        </p>
        <ConvertForm
          issueId={issue.id}
          defaultTitle={issue.title}
          defaultDescription={issue.description}
          consultants={consultants}
          aiTools={aiTools}
        />
      </div>
    </AppShell>
  );
}
