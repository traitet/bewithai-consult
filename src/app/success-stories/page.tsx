import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { scopeFromSession } from "@/lib/db/tenant-db";
import { effectiveViewingCompanyId } from "@/lib/company-context";
import { listCaseStudies, listPendingApprovalsFor } from "@/lib/repos/case-studies";
import { StarRating } from "@/components/ui/StarRating";

export default async function SuccessStoriesPage() {
  const session = await getSession();
  if (!session) return null;
  const scope = scopeFromSession(session);
  const companyId = await effectiveViewingCompanyId(session);

  if (!companyId) {
    return (
      <AppShell title="Success Stories">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-dim">
          Pick a company from the switcher above to browse its success stories.
        </div>
      </AppShell>
    );
  }

  const [stories, pending] = await Promise.all([
    listCaseStudies(scope, companyId),
    listPendingApprovalsFor(scope, companyId),
  ]);

  return (
    <AppShell title="Success Stories">
      <p className="mb-4 text-[12.5px] text-text-faint">
        Completed and approved projects your colleagues have shared as inspiration. Share your own from a
        project&rsquo;s detail page once it&rsquo;s approved — your manager reviews it before it goes live.
      </p>

      {pending.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber/35 bg-amber/5 p-4">
          <h2 className="mb-2 text-[12.5px] font-semibold text-amber">Awaiting your approval</h2>
          <div className="flex flex-col gap-1.5">
            {pending.map((p) => (
              <Link key={p.id} href={`/success-stories/${p.id}`} className="text-[12.5px] text-text hover:text-blue">
                {p.title} — submitted by {p.submittedByName}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {stories.map((s) => (
          <Link
            key={s.id}
            href={`/success-stories/${s.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 hover:border-blue"
          >
            <span className="font-heading text-[15px] font-semibold text-text">{s.title}</span>
            <span className="text-[11.5px] text-text-faint">from project: {s.projectTitle}</span>
            <p className="line-clamp-2 text-[12.5px] text-text-dim">{s.summary}</p>
            <div className="mt-1 flex items-center justify-between">
              <StarRating value={s.avgRating} readOnly size={13} />
              <span className="text-[11px] text-text-faint">
                {s.ratingCount} rating{s.ratingCount === 1 ? "" : "s"} · {s.commentCount} comment
                {s.commentCount === 1 ? "" : "s"}
              </span>
            </div>
            <span className="text-[11px] text-text-faint">by {s.publishedByName}</span>
          </Link>
        ))}
        {stories.length === 0 && (
          <div className="col-span-2 rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-faint">
            No success stories published yet.
          </div>
        )}
      </div>
    </AppShell>
  );
}
