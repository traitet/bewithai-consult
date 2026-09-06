import { describe, it, expect } from "vitest";
import { seedTestCompanyWithApprovalChain } from "@/lib/test/fixtures";
import { createIssue, listIssues, getIssue } from "@/lib/repos/issues";
import { scopeFromSession } from "@/lib/db/tenant-db";
import type { SessionUser } from "@/lib/types";

function scopeFor(user: { id: string; companyId: string | null; role: string }): ReturnType<typeof scopeFromSession> {
  const session: SessionUser = {
    userId: user.id,
    companyId: user.companyId,
    role: user.role as SessionUser["role"],
    name: "test",
    email: "test@test.dev",
  };
  return scopeFromSession(session);
}

describe("multi-tenant isolation", () => {
  it("a company user can read their own company's issues", async () => {
    const a = await seedTestCompanyWithApprovalChain("Company A");
    const scope = scopeFor(a.member);

    await createIssue(scope, {
      companyId: a.company.id,
      orgUnitId: a.section.id,
      title: "Company A issue",
      description: "...",
      priority: "MEDIUM",
    });

    const rows = await listIssues(scope, a.company.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Company A issue");
  });

  it("a company user cannot list another company's issues", async () => {
    const a = await seedTestCompanyWithApprovalChain("Company A");
    const b = await seedTestCompanyWithApprovalChain("Company B");
    const scopeA = scopeFor(a.member);

    await expect(listIssues(scopeA, b.company.id)).rejects.toThrow(/forbidden/i);
  });

  it("a company user cannot fetch another company's issue by id, even knowing its id", async () => {
    const a = await seedTestCompanyWithApprovalChain("Company A");
    const b = await seedTestCompanyWithApprovalChain("Company B");
    const scopeB = scopeFor(b.member);

    const issue = await createIssue(scopeFor(a.member), {
      companyId: a.company.id,
      orgUnitId: a.section.id,
      title: "Secret to company A",
      description: "...",
      priority: "LOW",
    });

    await expect(getIssue(scopeB, issue.id)).rejects.toThrow(/forbidden/i);
  });

  it("a consultant (companyId null) can read across every company", async () => {
    const a = await seedTestCompanyWithApprovalChain("Company A");
    const b = await seedTestCompanyWithApprovalChain("Company B");
    const consultantScope = scopeFor({ id: "consultant-1", companyId: null, role: "CONSULTANT" });

    await createIssue(scopeFor(a.member), {
      companyId: a.company.id,
      orgUnitId: a.section.id,
      title: "A's issue",
      description: "...",
      priority: "LOW",
    });
    await createIssue(scopeFor(b.member), {
      companyId: b.company.id,
      orgUnitId: b.section.id,
      title: "B's issue",
      description: "...",
      priority: "LOW",
    });

    const aRows = await listIssues(consultantScope, a.company.id);
    const bRows = await listIssues(consultantScope, b.company.id);
    expect(aRows.map((r) => r.title)).toEqual(["A's issue"]);
    expect(bRows.map((r) => r.title)).toEqual(["B's issue"]);
  });

  it("a company user cannot create an issue for another company", async () => {
    const a = await seedTestCompanyWithApprovalChain("Company A");
    const b = await seedTestCompanyWithApprovalChain("Company B");

    await expect(
      createIssue(scopeFor(a.member), {
        companyId: b.company.id,
        orgUnitId: b.section.id,
        title: "Forged cross-company issue",
        description: "...",
        priority: "LOW",
      })
    ).rejects.toThrow(/forbidden/i);
  });
});
