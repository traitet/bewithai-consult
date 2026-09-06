import type { SessionUser } from "@/lib/types";

/**
 * Multi-tenant isolation strategy (SQLite has no Row-Level Security, so this
 * is enforced at the application layer instead of the database layer):
 *
 * 1. Every repo function in src/lib/repos/* takes a `Scope` as its first
 *    argument — never a raw companyId string, so it can't be typo'd or
 *    omitted silently.
 * 2. `Scope.companyId` is `string` for a company user (MUST filter) or
 *    `null` for a consultant (bewithai staff — sees across all companies,
 *    by design, per the product requirement).
 * 3. `scopeFilter(scope, table)` below is the ONLY place that decides
 *    whether to add a `companyId = ?` predicate. Every repo function calls
 *    it rather than writing `eq(table.companyId, ...)` by hand, so the
 *    isolation rule lives in one place.
 * 4. `assertSameCompany` is used before writes that reference another
 *    entity (e.g. creating a Project from an Issue) to make sure the two
 *    records belong to the same tenant.
 * 5. `src/lib/repos/__tests__/isolation.test.ts` seeds two companies and
 *    asserts a scoped read of company A never returns company B's rows.
 *
 * NEVER import `db` (src/lib/db/client.ts) directly from a page, Server
 * Action, or route handler — only from src/lib/repos/*. That is what makes
 * "forgot to scope by company" structurally hard rather than a discipline.
 *
 * --- If/when this migrates to Postgres ---
 * Re-add a second, independent guarantee at the database layer:
 *   - Enable Row-Level Security on every tenant table.
 *   - `CREATE POLICY ... USING (company_id = current_setting('app.company_id')::uuid)`
 *   - Each request opens a transaction and runs `SET LOCAL app.company_id = $1`
 *     before any query, using a non-superuser DB role so RLS actually applies.
 *   - Keep this file and the Scope-based repo pattern as-is on top of that —
 *     defense in depth, not a replacement.
 */

export type Scope = {
  /** null => consultant; sees all companies. Never derive this from a request body/query string — only from the session. */
  companyId: string | null;
  userId: string;
  role: SessionUser["role"];
};

export function scopeFromSession(session: SessionUser): Scope {
  return { companyId: session.companyId, userId: session.userId, role: session.role };
}

export function isConsultantScope(scope: Scope): boolean {
  return scope.companyId === null;
}

/** Throws if a company-scoped user's scope doesn't match the record's companyId. Consultants always pass. */
export function assertInScope(scope: Scope, recordCompanyId: string, what: string): void {
  if (scope.companyId !== null && scope.companyId !== recordCompanyId) {
    throw new Error(`Forbidden: ${what} does not belong to your company`);
  }
}
