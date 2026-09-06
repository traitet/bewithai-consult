import { describe, it, expect } from "vitest";
import { seedTestCompanyWithApprovalChain, createTestUser } from "@/lib/test/fixtures";
import { createIssue } from "@/lib/repos/issues";
import { createProjectFromIssue, getProjectDetail } from "@/lib/repos/projects";
import { approveStep, rejectStep } from "@/lib/repos/approvals";
import { scopeFromSession } from "@/lib/db/tenant-db";
import type { SessionUser } from "@/lib/types";

function scopeFor(user: { id: string; companyId: string | null; role: string }) {
  const session: SessionUser = {
    userId: user.id,
    companyId: user.companyId,
    role: user.role as SessionUser["role"],
    name: "test",
    email: "test@test.dev",
  };
  return scopeFromSession(session);
}

async function makePendingProject() {
  const org = await seedTestCompanyWithApprovalChain();
  const memberScope = scopeFor(org.member);
  const issue = await createIssue(memberScope, {
    companyId: org.company.id,
    orgUnitId: org.section.id,
    title: "Manual process takes too long",
    description: "...",
    priority: "HIGH",
  });
  const project = await createProjectFromIssue(memberScope, {
    companyId: org.company.id,
    issueId: issue.id,
    orgUnitId: org.section.id,
    title: "Automate it",
    description: "...",
    aiToolIds: [],
  });
  return { org, project };
}

describe("project approval workflow", () => {
  it("creates one step per level of the org unit's chain, in Section -> Department -> Division order", async () => {
    const { org, project } = await makePendingProject();
    const detail = await getProjectDetail(scopeFor(org.member), project.id);

    expect(detail!.steps.map((s) => s.roleRequired)).toEqual([
      "SECTION_MANAGER",
      "DEPARTMENT_MANAGER",
      "DIVISION_MANAGER",
    ]);
    expect(detail!.steps.map((s) => s.approverUserId)).toEqual([
      org.sectionManager.id,
      org.departmentManager.id,
      org.divisionManager.id,
    ]);
    expect(detail!.workflow!.currentStep).toBe(1);
  });

  it("rejects an out-of-turn approval attempt", async () => {
    const { org, project } = await makePendingProject();
    const detail = await getProjectDetail(scopeFor(org.member), project.id);
    const departmentStep = detail!.steps.find((s) => s.roleRequired === "DEPARTMENT_MANAGER")!;

    await expect(
      approveStep(scopeFor(org.departmentManager), departmentStep.id, { targetHoursPerWeek: 5 })
    ).rejects.toThrow(/not this step's turn/i);
  });

  it("rejects an approval from someone who isn't the assigned approver", async () => {
    const { org, project } = await makePendingProject();
    const detail = await getProjectDetail(scopeFor(org.member), project.id);
    const sectionStep = detail!.steps.find((s) => s.roleRequired === "SECTION_MANAGER")!;
    const someoneElse = await createTestUser({ companyId: org.company.id, role: "MEMBER" });

    await expect(
      approveStep(scopeFor(someoneElse), sectionStep.id, { targetHoursPerWeek: 5 })
    ).rejects.toThrow(/forbidden/i);
  });

  it("advances step by step and only completes the workflow after the final approval", async () => {
    const { org, project } = await makePendingProject();
    const scope = scopeFor(org.member);

    let detail = await getProjectDetail(scope, project.id);
    const [sectionStep, departmentStep, divisionStep] = detail!.steps;

    await approveStep(scopeFor(org.sectionManager), sectionStep.id, { targetHoursPerWeek: 4 });
    detail = await getProjectDetail(scope, project.id);
    expect(detail!.workflow!.currentStep).toBe(2);
    expect(detail!.project.status).toBe("PENDING_APPROVAL");

    await approveStep(scopeFor(org.departmentManager), departmentStep.id, { targetHoursPerWeek: 4.5 });
    detail = await getProjectDetail(scope, project.id);
    expect(detail!.workflow!.currentStep).toBe(3);
    expect(detail!.project.status).toBe("PENDING_APPROVAL");

    await approveStep(scopeFor(org.divisionManager), divisionStep.id, { targetHoursPerWeek: 5 });
    detail = await getProjectDetail(scope, project.id);
    expect(detail!.workflow!.status).toBe("APPROVED");
    expect(detail!.project.status).toBe("APPROVED");
  });

  it("a rejection at any step ends the workflow and blocks further decisions", async () => {
    const { org, project } = await makePendingProject();
    const scope = scopeFor(org.member);
    const detail = await getProjectDetail(scope, project.id);
    const [sectionStep, departmentStep] = detail!.steps;

    await rejectStep(scopeFor(org.sectionManager), sectionStep.id, "Not a good fit right now");

    const after = await getProjectDetail(scope, project.id);
    expect(after!.workflow!.status).toBe("REJECTED");
    expect(after!.project.status).toBe("REJECTED");

    await expect(
      approveStep(scopeFor(org.departmentManager), departmentStep.id, { targetHoursPerWeek: 4 })
    ).rejects.toThrow(/already decided/i);
  });

  it("a consultant may approve on behalf of the assigned manager", async () => {
    const { org, project } = await makePendingProject();
    const detail = await getProjectDetail(scopeFor(org.member), project.id);
    const sectionStep = detail!.steps[0];
    const consultantScope = scopeFor({ id: "consultant-x", companyId: null, role: "CONSULTANT" });

    await expect(
      approveStep(consultantScope, sectionStep.id, { targetHoursPerWeek: 3 })
    ).resolves.not.toThrow();
  });

  it("refuses to start an approval workflow when a level in the chain has no manager assigned", async () => {
    const org = await seedTestCompanyWithApprovalChain();
    // Simulate a vacant Department Manager seat.
    const { db } = await import("@/lib/db/client");
    const { orgUnits } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(orgUnits).set({ managerUserId: null }).where(eq(orgUnits.id, org.department.id));

    const memberScope = scopeFor(org.member);
    const issue = await createIssue(memberScope, {
      companyId: org.company.id,
      orgUnitId: org.section.id,
      title: "Blocked by vacant manager seat",
      description: "...",
      priority: "MEDIUM",
    });

    await expect(
      createProjectFromIssue(memberScope, {
        companyId: org.company.id,
        issueId: issue.id,
        orgUnitId: org.section.id,
        title: "Should not be creatable",
        description: "...",
        aiToolIds: [],
      })
    ).rejects.toThrow(/no department manager/i);
  });
});
