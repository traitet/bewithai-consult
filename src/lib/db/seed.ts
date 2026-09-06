// Seed data for local development. Run with: npm run db:seed
// Safe to re-run: it wipes and re-inserts (SQLite file is local/dev only).
import bcrypt from "bcryptjs";
import { db, sqlite } from "./client";
import {
  companies,
  orgUnits,
  users,
  aiTools,
  skillLevelDefs,
  courses,
  issues,
  projects,
  approvalWorkflows,
  approvalSteps,
  benefitSummaries,
  skillRecords,
} from "./schema";

const DEV_PASSWORD = "password123";

async function main() {
  console.log("Wiping existing data...");
  // Deletion order matters: children before parents. In particular `users`
  // references `org_units` (orgUnitId) so users must go before org_units.
  sqlite.exec(`
    DELETE FROM notifications; DELETE FROM audit_logs; DELETE FROM completions;
    DELETE FROM enrollments; DELETE FROM skill_records; DELETE FROM consultant_unavailability;
    DELETE FROM bookings; DELETE FROM benefit_summaries; DELETE FROM approval_steps;
    DELETE FROM approval_workflows; DELETE FROM projects; DELETE FROM issue_attachments;
    DELETE FROM issues; DELETE FROM users; DELETE FROM org_units; DELETE FROM courses;
    DELETE FROM skill_level_defs; DELETE FROM ai_tools; DELETE FROM companies;
  `);

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  console.log("Seeding AI tools + skill levels...");
  const [claudeCowork, claudeCode, chatGpt] = await db
    .insert(aiTools)
    .values([{ name: "Claude Cowork" }, { name: "Claude Code" }, { name: "ChatGPT" }])
    .returning();

  await db.insert(skillLevelDefs).values([
    { level: 1, name: "Beginner", description: "Guided use only" },
    { level: 2, name: "Intermediate", description: "Independent, routine tasks" },
    { level: 3, name: "Advanced", description: "Complex workflows" },
    { level: 4, name: "Expert", description: "Coaches others" },
  ]);

  console.log("Seeding courses...");
  await db.insert(courses).values([
    { aiToolId: claudeCode.id, title: "Claude Code Fundamentals", description: "Intro to Claude Code for everyday tasks.", durationHours: 2.5, unlocksLevel: 2, passingScore: 70 },
    { aiToolId: claudeCowork.id, title: "Advanced Prompt Design", description: "Design reliable multi-step prompts with Claude Cowork.", durationHours: 3, unlocksLevel: 3, passingScore: 75 },
    { aiToolId: chatGpt.id, title: "ChatGPT for Business Analysis", description: "Using ChatGPT for reporting and analysis work.", durationHours: 2, unlocksLevel: 2, passingScore: 70 },
    { aiToolId: claudeCode.id, title: "Automating Workflows with Claude Code", description: "Building repeatable automations.", durationHours: 4, unlocksLevel: 3, passingScore: 75 },
  ]);

  console.log("Seeding companies...");
  const [acme, siam, blueOcean] = await db
    .insert(companies)
    .values([
      { name: "Acme Manufacturing", industry: "Manufacturing", status: "ACTIVE" },
      { name: "Siam Textile Group", industry: "Textiles", status: "ACTIVE" },
      { name: "Blue Ocean Logistics", industry: "Logistics", status: "ONBOARDING" },
    ])
    .returning();

  console.log("Seeding org units for Acme Manufacturing...");
  const [corpServices] = await db
    .insert(orgUnits)
    .values([{ companyId: acme.id, level: "DIVISION", name: "Corporate Services" }])
    .returning();

  const [finance, salesOps, custCare, hr] = await db
    .insert(orgUnits)
    .values([
      { companyId: acme.id, parentId: corpServices.id, level: "DEPARTMENT", name: "Finance" },
      { companyId: acme.id, parentId: corpServices.id, level: "DEPARTMENT", name: "Sales Ops" },
      { companyId: acme.id, parentId: corpServices.id, level: "DEPARTMENT", name: "Customer Care" },
      { companyId: acme.id, parentId: corpServices.id, level: "DEPARTMENT", name: "HR" },
    ])
    .returning();

  const [apArSection] = await db
    .insert(orgUnits)
    .values([{ companyId: acme.id, parentId: finance.id, level: "SECTION", name: "AP/AR" }])
    .returning();

  console.log("Seeding users...");
  // Consultants: companyId = null, orgUnitId = null (see tenant-db.ts)
  const [traitet, saowalak, somchai] = await db
    .insert(users)
    .values([
      { name: "Traitet", email: "traitet@bewithai.dev", passwordHash, role: "CONSULTANT" },
      { name: "Saowalak", email: "saowalak@bewithai.dev", passwordHash, role: "CONSULTANT" },
      { name: "Somchai", email: "somchai@bewithai.dev", passwordHash, role: "CONSULTANT" },
    ])
    .returning();

  const [pranee, warit, kanya, anucha, napat] = await db
    .insert(users)
    .values([
      { companyId: acme.id, orgUnitId: apArSection.id, name: "Pranee Boonmee", email: "pranee@acme.dev", passwordHash, role: "SECTION_MANAGER" },
      { companyId: acme.id, orgUnitId: finance.id, name: "Warit Suksawat", email: "warit@acme.dev", passwordHash, role: "DEPARTMENT_MANAGER" },
      { companyId: acme.id, orgUnitId: finance.id, name: "Kanya Phongsathorn", email: "kanya@acme.dev", passwordHash, role: "MEMBER" },
      { companyId: acme.id, orgUnitId: salesOps.id, name: "Anucha Sirisak", email: "anucha@acme.dev", passwordHash, role: "DEPARTMENT_MANAGER" },
      { companyId: acme.id, orgUnitId: corpServices.id, name: "Napat Limthong", email: "napat@acme.dev", passwordHash, role: "DIVISION_MANAGER" },
    ])
    .returning();

  // Back-fill org unit managers now that the manager users exist.
  await db.update(orgUnits).set({ managerUserId: napat.id }).where(eqId(orgUnits, corpServices.id));
  await db.update(orgUnits).set({ managerUserId: warit.id }).where(eqId(orgUnits, finance.id));
  await db.update(orgUnits).set({ managerUserId: anucha.id }).where(eqId(orgUnits, salesOps.id));
  await db.update(orgUnits).set({ managerUserId: pranee.id }).where(eqId(orgUnits, apArSection.id));

  console.log("Seeding an issue + project + approval workflow (matches the design mockups)...");
  const [issue] = await db
    .insert(issues)
    .values([
      {
        companyId: acme.id,
        orgUnitId: finance.id,
        title: "Manual invoice reconciliation takes ~6 hrs/week",
        description:
          "Every week our finance team manually cross-checks invoices against ERP records. This is repetitive and error-prone.",
        priority: "HIGH",
        status: "CONVERTED",
        createdById: kanya.id,
      },
    ])
    .returning();

  const [project] = await db
    .insert(projects)
    .values([
      {
        companyId: acme.id,
        issueId: issue.id,
        orgUnitId: finance.id,
        title: "Invoice Reconciliation Copilot",
        description:
          "Use Claude Code to auto-extract invoice line items and reconcile against ERP records, replacing manual cross-checking.",
        consultantId: saowalak.id,
        aiToolIds: `${claudeCode.id},${chatGpt.id}`,
        status: "PENDING_APPROVAL",
      },
    ])
    .returning();

  const [workflow] = await db
    .insert(approvalWorkflows)
    .values([{ projectId: project.id, kind: "PROJECT_APPROVAL", status: "PENDING", currentStep: 2 }])
    .returning();

  await db.insert(approvalSteps).values([
    {
      workflowId: workflow.id,
      stepNumber: 1,
      roleRequired: "SECTION_MANAGER",
      approverUserId: pranee.id,
      decision: "APPROVED",
      targetHoursPerWeek: 9.0,
      comment: "Approved, good use case.",
      decidedAt: new Date(),
    },
    {
      workflowId: workflow.id,
      stepNumber: 2,
      roleRequired: "DEPARTMENT_MANAGER",
      approverUserId: warit.id,
      decision: "PENDING",
      targetHoursPerWeek: 9.3,
    },
    {
      workflowId: workflow.id,
      stepNumber: 3,
      roleRequired: "DIVISION_MANAGER",
      approverUserId: napat.id,
      decision: "PENDING",
    },
  ]);

  await db.insert(benefitSummaries).values([
    { projectId: project.id, beforeHoursPerWeek: 11.0, afterHoursPerWeek: 1.7, status: "DRAFT" },
  ]);

  console.log("Seeding skill records...");
  await db.insert(skillRecords).values([
    { companyId: acme.id, userId: kanya.id, aiToolId: claudeCode.id, level: 1, source: "MANUAL" },
    { companyId: acme.id, userId: kanya.id, aiToolId: chatGpt.id, level: 2, source: "MANUAL" },
    { companyId: acme.id, userId: anucha.id, aiToolId: claudeCode.id, level: 1, source: "MANUAL" },
  ]);

  console.log("Done. Demo companies:", [acme.name, siam.name, blueOcean.name].join(", "));
  console.log(`Every seeded user's password is: ${DEV_PASSWORD}`);
  console.log("Consultants (see all companies): traitet@bewithai.dev, saowalak@bewithai.dev, somchai@bewithai.dev");
  console.log("Acme Manufacturing users: pranee@acme.dev (Section Mgr), warit@acme.dev (Dept Mgr), kanya@acme.dev (Member), anucha@acme.dev (Dept Mgr), napat@acme.dev (Division Mgr)");
}

// small helper so the update-by-id calls above stay readable
import { eq } from "drizzle-orm";
function eqId<T extends { id: any }>(table: T, id: string) {
  return eq(table.id, id);
}

main()
  .then(() => {
    sqlite.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    sqlite.close();
    process.exit(1);
  });
