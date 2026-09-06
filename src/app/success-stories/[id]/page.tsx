import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { getCaseStudyDetail } from "@/lib/repos/case-studies";
import { getProjectDetail } from "@/lib/repos/projects";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { addCommentAction, rateCaseStudyAction, approveCaseStudyAction, rejectCaseStudyAction } from "../actions";
import { isCompanyIndependentRole } from "@/lib/types";

export default async function SuccessStoryDetailPage(props: PageProps<"/success-stories/[id]">) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);

  const detail = await getCaseStudyDetail(scope, id);
  if (!detail) notFound();
  const { caseStudy, project, publisher, comments, myRating, avgRating, ratingCount } = detail;

  const isApprover = caseStudy.approverUserId === session.userId || isCompanyIndependentRole(session.role);
  const isPending = caseStudy.status === "PENDING_APPROVAL";
  const isPublished = caseStudy.status === "PUBLISHED";

  const projectDetail = project ? await getProjectDetail(scope, project.id) : null;
  const benefit = projectDetail?.benefit;

  return (
    <AppShell title={caseStudy.title}>
      <div className="mb-4 flex items-center gap-2">
        <Badge
          value={caseStudy.status}
          label={isPending ? "Awaiting manager approval" : isPublished ? "Published" : "Not approved"}
        />
      </div>

      {isPending && isApprover && (
        <section className="mb-5 rounded-2xl border border-amber/35 bg-amber/5 p-5">
          <h2 className="mb-3 font-heading text-[14px] font-semibold text-text">Review this success story</h2>
          <form action={approveCaseStudyAction} className="mb-2 flex gap-2">
            <input type="hidden" name="caseStudyId" value={caseStudy.id} />
            <input name="comment" placeholder="Optional comment" className="input flex-1" />
            <button type="submit" className="rounded-lg bg-gradient-to-br from-blue to-teal px-4 py-2 text-[12px] font-semibold text-white">
              Approve &amp; Publish
            </button>
          </form>
          <form action={rejectCaseStudyAction} className="flex gap-2">
            <input type="hidden" name="caseStudyId" value={caseStudy.id} />
            <input name="comment" placeholder="Reason for rejecting" required className="input flex-1" />
            <button type="submit" className="rounded-lg bg-red px-4 py-2 text-[12px] font-semibold text-white">
              Reject
            </button>
          </form>
        </section>
      )}

      {isPending && !isApprover && (
        <p className="mb-5 text-[12.5px] text-text-faint">
          Waiting on your manager&rsquo;s approval before this is visible to anyone else.
        </p>
      )}

      {caseStudy.status === "REJECTED" && (
        <div className="mb-5 rounded-2xl border border-red/30 bg-red/5 p-4 text-[12.5px] text-text-dim">
          Not approved{caseStudy.decisionComment ? `: "${caseStudy.decisionComment}"` : "."}
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex flex-1 flex-col gap-5">
          <section className="rounded-2xl border border-border bg-surface p-6">
            <p className="mb-4 text-[11.5px] text-text-faint">from project: {project?.title}</p>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-text">{caseStudy.summary}</p>

            {benefit && (
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border-soft pt-5">
                <Metric label="Before" value={`${benefit.beforeHoursPerWeek} hrs/wk`} />
                <Metric label="After" value={`${benefit.afterHoursPerWeek} hrs/wk`} />
                <Metric
                  label="Saved / Year"
                  value={`${Math.round(Math.max(0, benefit.beforeHoursPerWeek - benefit.afterHoursPerWeek) * 52)} hrs`}
                  accent
                />
              </div>
            )}
          </section>

          {isPublished && (
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="mb-4 font-heading text-[14px] font-semibold text-text">
                Comments ({comments.length})
              </h2>
              <form action={addCommentAction} className="mb-5 flex flex-col gap-2">
                <input type="hidden" name="caseStudyId" value={caseStudy.id} />
                <textarea name="body" required rows={3} placeholder="Ask a question or share a thought..." className="input resize-none" />
                <button type="submit" className="self-start rounded-lg bg-gradient-to-br from-blue to-teal px-4 py-2 text-[12px] font-semibold text-white">
                  Post Comment
                </button>
              </form>
              <div className="flex flex-col gap-4">
                {comments.map((c) => (
                  <div key={c.id} className="border-t border-border-soft pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold text-text">{c.authorName}</span>
                      <span className="text-[11px] text-text-faint">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-text-dim">{c.body}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-[12.5px] text-text-faint">No comments yet — be the first.</p>}
              </div>
            </section>
          )}
        </div>

        <div className="w-80 flex-shrink-0 flex-col gap-4">
          {isPublished && (
            <section className="mb-4 rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-3 font-heading text-[13px] font-semibold text-text">Rating</h2>
              <StarRating value={avgRating} readOnly />
              <p className="mb-3 mt-1 text-[11px] text-text-faint">{ratingCount} rating{ratingCount === 1 ? "" : "s"}</p>
              <form action={rateCaseStudyAction} className="flex gap-1.5">
                <input type="hidden" name="caseStudyId" value={caseStudy.id} />
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="submit"
                    name="rating"
                    value={n}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[13px] font-semibold ${
                      myRating === n ? "border-amber bg-amber/10 text-amber" : "border-border text-text-faint hover:border-amber"
                    }`}
                    title={`Rate ${n} star${n === 1 ? "" : "s"}`}
                  >
                    {n}
                  </button>
                ))}
              </form>
              {myRating && <p className="mt-2 text-[11px] text-text-faint">Your rating: {myRating} / 5</p>}
            </section>
          )}

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-heading text-[13px] font-semibold text-text">Created by</h2>
            <p className="text-[12.5px] font-medium text-text">{publisher?.name}</p>
            <a
              href={`mailto:${publisher?.email}?subject=${encodeURIComponent("Your success story: " + caseStudy.title)}`}
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-blue to-teal px-4 py-2 text-[12px] font-semibold text-white"
            >
              Contact {publisher?.name?.split(" ")[0]}
            </a>
          </section>
        </div>
      </div>
    </AppShell>
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
