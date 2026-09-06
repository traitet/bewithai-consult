import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { getProjectDetail } from "@/lib/repos/projects";
import { getCaseStudyByProjectId } from "@/lib/repos/case-studies";
import { Badge } from "@/components/ui/Badge";
import { approveStepAction, rejectStepAction } from "./actions";
import { submitCaseStudyAction } from "@/app/success-stories/actions";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/types";

const PUBLISHABLE_STATUSES = ["APPROVED", "IN_PROGRESS", "COMPLETED"];

export default async function ProjectDetailPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);

  const detail = await getProjectDetail(scope, id);
  if (!detail) notFound();
  const { project, issue, orgUnit, benefit, steps } = detail;
  const existingCaseStudy = await getCaseStudyByProjectId(scope, project.id);

  return (
    <AppShell title={project.title}>
      <div className="flex items-center gap-2 pb-4">
        <Badge value={project.status} />
        <span className="text-[12px] text-text-faint">{orgUnit?.name}</span>
      </div>

      <div className="flex gap-6">
        <div className="flex flex-1 flex-col gap-5">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">Project Information</h2>
            <p className="mb-4 text-[12.5px] leading-relaxed text-text-dim">{project.description}</p>
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <InfoRow label="Consultant" value={detail.consultantName ?? "Unassigned"} />
              <InfoRow label="Department" value={orgUnit?.name ?? "—"} />
            </div>
            {issue && (
              <div className="mt-4 rounded-lg bg-surface-alt p-3 text-[12px] text-text-dim">
                Linked issue: <span className="font-medium text-text">{issue.title}</span> ·{" "}
                <Badge value={issue.priority} />
              </div>
            )}
          </section>

          {benefit && (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">Benefit Summary</h2>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Before" value={`${benefit.beforeHoursPerWeek} hrs/wk`} />
                <Metric label="After" value={`${benefit.afterHoursPerWeek} hrs/wk`} />
                <Metric
                  label="Saved / Year"
                  value={`${Math.round(Math.max(0, benefit.beforeHoursPerWeek - benefit.afterHoursPerWeek) * 52)} hrs`}
                  accent
                />
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">Success Story</h2>
            {existingCaseStudy ? (
              <div className="flex items-center gap-3">
                <Badge
                  value={existingCaseStudy.status}
                  label={
                    existingCaseStudy.status === "PENDING_APPROVAL"
                      ? "Awaiting manager approval"
                      : existingCaseStudy.status === "PUBLISHED"
                        ? "Published"
                        : "Not approved"
                  }
                />
                <Link href={`/success-stories/${existingCaseStudy.id}`} className="text-[12px] font-semibold text-blue">
                  View →
                </Link>
              </div>
            ) : PUBLISHABLE_STATUSES.includes(project.status) ? (
              <form action={submitCaseStudyAction} className="flex flex-col gap-3">
                <input type="hidden" name="projectId" value={project.id} />
                <p className="text-[11.5px] text-text-faint">
                  Share this as inspiration for colleagues. Your manager reviews it before it&rsquo;s visible to
                  anyone else.
                </p>
                <input name="title" required placeholder="Success story title" className="input" />
                <textarea name="summary" required rows={3} placeholder="What did you do, and what changed?" className="input resize-none" />
                <button type="submit" className="self-start rounded-lg bg-gradient-to-br from-blue to-teal px-4 py-2 text-[12px] font-semibold text-white">
                  Submit for Approval
                </button>
              </form>
            ) : (
              <p className="text-[12px] text-text-faint">
                Available once this project is approved, in progress, or completed.
              </p>
            )}
          </section>
        </div>

        <div className="w-96 flex-shrink-0">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-heading text-[14px] font-semibold text-text">Approval Workflow</h2>
            <div className="flex flex-col gap-5">
              {steps.map((step, index) => (
                <ApprovalStepRow
                  key={step.id}
                  step={step}
                  projectId={project.id}
                  isLast={index === steps.length - 1}
                  isCurrentStep={detail.workflow?.status === "PENDING" && step.stepNumber === detail.workflow.currentStep}
                />
              ))}
              {steps.length === 0 && (
                <p className="text-[12.5px] text-text-faint">No approval workflow on this project yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-text-faint">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg p-2.5 ${accent ? "bg-teal/10" : ""}`}>
      <span className={`text-[11px] ${accent ? "text-teal" : "text-text-faint"}`}>{label}</span>
      <span className={`font-heading text-[18px] font-semibold ${accent ? "text-teal" : "text-text"}`}>{value}</span>
    </div>
  );
}

function ApprovalStepRow({
  step,
  projectId,
  isLast,
  isCurrentStep,
}: {
  step: {
    id: string;
    stepNumber: number;
    roleRequired: string;
    decision: string;
    approverName: string | null;
    targetHoursPerWeek: number | null;
    comment: string | null;
  };
  projectId: string;
  isLast: boolean;
  isCurrentStep: boolean;
}) {
  const roleLabel = ROLE_LABELS[step.roleRequired as Role] ?? step.roleRequired;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6.5 w-6.5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
            step.decision === "APPROVED" ? "bg-green" : step.decision === "REJECTED" ? "bg-red" : "bg-amber"
          }`}
          style={{ height: 26, width: 26 }}
        >
          {step.decision === "APPROVED" ? "✓" : step.decision === "REJECTED" ? "✕" : step.stepNumber}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className="flex-1 pb-2">
        <div className="text-[12.5px] font-semibold text-text">{roleLabel}</div>
        <div className="mt-0.5 text-[11.5px] text-text-dim">
          {step.approverName ?? "Unassigned"}
          {step.decision !== "PENDING" && ` · ${step.decision === "APPROVED" ? "Approved" : "Rejected"}`}
        </div>

        {step.decision === "APPROVED" && step.targetHoursPerWeek != null && (
          <div className="mt-2 rounded-lg bg-surface-alt p-2.5 text-[11.5px] text-text-dim">
            Target reduction: <b className="text-text">{step.targetHoursPerWeek} hrs/week</b>
            {step.comment && <div className="mt-1 italic">&ldquo;{step.comment}&rdquo;</div>}
          </div>
        )}

        {step.decision === "REJECTED" && step.comment && (
          <div className="mt-2 rounded-lg bg-red/10 p-2.5 text-[11.5px] text-text-dim">{step.comment}</div>
        )}

        {step.decision === "PENDING" && !isCurrentStep && (
          <div className="mt-2 text-[11.5px] text-text-faint">Awaiting an earlier approval step</div>
        )}

        {step.decision === "PENDING" && isCurrentStep && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-amber/35 bg-surface-alt p-3">
            <form action={approveStepAction} className="flex flex-col gap-2">
              <input type="hidden" name="stepId" value={step.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-text-faint">Confirm target time-reduction (hrs/week)</span>
                <input name="targetHoursPerWeek" type="number" step="0.1" min="0.1" required className="input" />
              </label>
              <input name="comment" placeholder="Optional comment" className="input" />
              <button type="submit" className="rounded-md bg-gradient-to-br from-blue to-teal py-1.5 text-[11.5px] font-semibold text-white">
                Approve
              </button>
            </form>
            <form action={rejectStepAction} className="flex gap-2">
              <input type="hidden" name="stepId" value={step.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input name="comment" placeholder="Reason for rejecting" required className="input flex-1" />
              <button type="submit" className="rounded-md bg-red px-3 text-[11.5px] font-semibold text-white">
                Reject
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
