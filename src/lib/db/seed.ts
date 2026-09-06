// Seed data for local development. Run with: npm run db:seed
// Safe to re-run: it wipes and re-inserts (SQLite file is local/dev only).
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, sqlite } from "./client";
import {
  companies,
  orgUnits,
  users,
  aiTools,
  skillLevelDefs,
  courses,
  issues,
  issueImpacts,
  projects,
  approvalWorkflows,
  approvalSteps,
  benefitSummaries,
  skillRecords,
  bookings,
  consultantUnavailability,
  caseStudies,
  caseStudyRatings,
  caseStudyComments,
} from "./schema";

const DEV_PASSWORD = "password123";

// ---------- Thai name pools, for generating a ~100-person company ----------

const FIRST_NAMES = [
  "Kanya", "Anucha", "Warit", "Pranee", "Napat", "Nattapong", "Sirikan", "Chai", "Ploy", "Somsak",
  "Wichai", "Suda", "Malee", "Pornthip", "Chatri", "Niran", "Duangjai", "Kamon", "Preecha", "Rattana",
  "Sombat", "Ampai", "Boonsong", "Chaiwat", "Darika", "Ekachai", "Fon", "Ganya", "Hathai", "Isara",
  "Jariya", "Kittipong", "Lawan", "Manop", "Nalinee", "Orawan", "Panida", "Rungrote", "Siriporn", "Thanawat",
  "Udomsak", "Varee", "Wanida", "Yupin", "Achara", "Chalerm", "Decha", "Ekarin", "Gamon", "Haruthai",
  "Intira", "Jaidee", "Kanokwan", "Lamai", "Metta", "Naruemon", "Onanong", "Panya", "Ratri", "Sakda",
  "Thongchai", "Umaporn", "Vichit", "Waraporn", "Yanisa", "Anong", "Boonrod", "Chanya", "Damrong", "Ekapong",
  "Siriwan", "Tawan", "Ubon", "Vasan", "Wilai",
];

const LAST_NAMES = [
  "Phongsathorn", "Sirisak", "Suksawat", "Boonmee", "Limthong", "Charoen", "Wattana", "Tantiwong",
  "Ratanaporn", "Srisawat", "Kittikorn", "Meechai", "Chaisiri", "Thongdee", "Wongchai", "Sukjai",
  "Pongpanich", "Ruangrit", "Anantasak", "Boonchu", "Chareonwong", "Dechapanya", "Eiamsuk", "Rojanapak",
  "Sakulchai", "Techapaiboon", "Udomsuk", "Vorakit", "Wichitsuk", "Yindee", "Nopparat", "Panyasiri",
  "Rattanakul", "Sirichai", "Thepwong", "Uraiwan", "Vatanasin", "Wongsuwan", "Yoosuk", "Amornrat",
];

// Deterministic shuffle (mulberry32) so reseeding gives stable, reviewable demo data.
function shuffledPairs(seed: number): { first: string; last: string }[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const pairs: { first: string; last: string }[] = [];
  for (const first of FIRST_NAMES) for (const last of LAST_NAMES) pairs.push({ first, last });
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

function makeNamePool(count: number, seed = 7): { name: string; emailLocal: string }[] {
  const seen = new Set<string>();
  const out: { name: string; emailLocal: string }[] = [];
  for (const { first, last } of shuffledPairs(seed)) {
    const name = `${first} ${last}`;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, emailLocal: `${first.toLowerCase()}.${last.toLowerCase()}` });
    if (out.length === count) break;
  }
  return out;
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  console.log("Wiping existing data...");
  // Deletion order matters: children before parents. In particular `users`
  // references `org_units` (orgUnitId) so users must go before org_units.
  sqlite.exec(`
    DELETE FROM notifications; DELETE FROM audit_logs; DELETE FROM completions;
    DELETE FROM enrollments; DELETE FROM skill_records; DELETE FROM consultant_unavailability;
    DELETE FROM bookings; DELETE FROM benefit_summaries; DELETE FROM approval_steps;
    DELETE FROM approval_workflows; DELETE FROM case_study_comments; DELETE FROM case_study_ratings;
    DELETE FROM case_studies; DELETE FROM projects; DELETE FROM issue_attachments;
    DELETE FROM issue_impacts; DELETE FROM issues; DELETE FROM users; DELETE FROM org_units; DELETE FROM courses;
    DELETE FROM skill_level_defs; DELETE FROM ai_tools; DELETE FROM companies;
  `);

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  console.log("Seeding AI tools + skill levels...");
  const [claudeCowork, claudeCode, chatGpt] = await db
    .insert(aiTools)
    .values([{ name: "Claude Cowork" }, { name: "Claude Code" }, { name: "ChatGPT" }])
    .returning();
  const allTools = [claudeCowork, claudeCode, chatGpt];

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

  console.log("Seeding super admin + consultants...");
  await db.insert(users).values([
    { name: "Traitet (Super Admin)", email: "traitet@gmail.com", passwordHash, role: "SUPERADMIN" },
  ]);
  // Consultants: companyId = null, orgUnitId = null (see tenant-db.ts)
  const [traitetConsultant, saowalak, somchai] = await db
    .insert(users)
    .values([
      { name: "Traitet", email: "traitet@bewithai.dev", passwordHash, role: "CONSULTANT" },
      { name: "Saowalak", email: "saowalak@bewithai.dev", passwordHash, role: "CONSULTANT" },
      { name: "Somchai", email: "somchai@bewithai.dev", passwordHash, role: "CONSULTANT" },
    ])
    .returning();
  const consultants = [traitetConsultant, saowalak, somchai];

  // ---------- Build Acme Manufacturing: ~100 employees across a real 3-level org ----------

  console.log("Seeding Acme Manufacturing org hierarchy (3 divisions x 3 departments x 1 section each)...");
  const DIVISION_PLAN = [
    { name: "Corporate Services", departments: [{ dept: "Finance", section: "AP/AR" }, { dept: "HR", section: "People Ops" }, { dept: "IT", section: "IT Support" }] },
    { name: "Commercial", departments: [{ dept: "Sales", section: "Key Accounts" }, { dept: "Marketing", section: "Brand & Content" }, { dept: "Customer Care", section: "Support Desk" }] },
    { name: "Operations", departments: [{ dept: "Manufacturing", section: "Production Line A" }, { dept: "Quality Assurance", section: "QA Lab" }, { dept: "Supply Chain", section: "Procurement" }] },
  ] as const;

  const divisionRows: { id: string; name: string }[] = [];
  const departmentRows: { id: string; name: string; divisionName: string }[] = [];
  const sectionRows: { id: string; name: string; departmentName: string }[] = [];

  for (const div of DIVISION_PLAN) {
    const [divRow] = await db.insert(orgUnits).values([{ companyId: acme.id, level: "DIVISION", name: div.name }]).returning();
    divisionRows.push(divRow);
    for (const d of div.departments) {
      const [deptRow] = await db.insert(orgUnits).values([{ companyId: acme.id, parentId: divRow.id, level: "DEPARTMENT", name: d.dept }]).returning();
      departmentRows.push({ ...deptRow, divisionName: div.name });
      const [sectionRow] = await db.insert(orgUnits).values([{ companyId: acme.id, parentId: deptRow.id, level: "SECTION", name: d.section }]).returning();
      sectionRows.push({ ...sectionRow, departmentName: d.dept });
    }
  }
  const findDept = (name: string) => {
    const row = departmentRows.find((d) => d.name === name);
    if (!row) throw new Error(`Seed data bug: no department named "${name}"`);
    return row;
  };
  const findSection = (name: string) => {
    const row = sectionRows.find((s) => s.name === name);
    if (!row) throw new Error(`Seed data bug: no section named "${name}"`);
    return row;
  };

  console.log("Seeding ~100 Acme employees (managers + members)...");
  const namePool = makeNamePool(3 + 3 + 9 + 9 + 80); // headroom for the 4 named continuity people below

  let nameIdx = 0;
  const nextName = () => namePool[nameIdx++];

  // 3 division managers (Corporate Services kept as the existing "Napat Limthong" for continuity with earlier docs/testing)
  const divisionManagerUsers: Record<string, typeof consultants[number]> = {} as any;
  for (const div of divisionRows) {
    const isCorpServices = div.name === "Corporate Services";
    const identity = isCorpServices ? { name: "Napat Limthong", emailLocal: "napat" } : nextName();
    const [u] = await db
      .insert(users)
      .values([{ companyId: acme.id, orgUnitId: div.id, name: identity.name, email: `${identity.emailLocal}@acme.dev`, passwordHash, role: "DIVISION_MANAGER" }])
      .returning();
    await db.update(orgUnits).set({ managerUserId: u.id }).where(eq(orgUnits.id, div.id));
    divisionManagerUsers[div.name] = u as any;
  }

  // 9 department managers (Finance kept as "Warit Suksawat", Sales kept as "Anucha Sirisak" for continuity)
  const departmentManagerUsers: Record<string, typeof consultants[number]> = {} as any;
  for (const dept of departmentRows) {
    const continuity: Record<string, { name: string; emailLocal: string }> = {
      Finance: { name: "Warit Suksawat", emailLocal: "warit" },
      Sales: { name: "Anucha Sirisak", emailLocal: "anucha" },
    };
    const identity = continuity[dept.name] ?? nextName();
    const [u] = await db
      .insert(users)
      .values([{ companyId: acme.id, orgUnitId: dept.id, name: identity.name, email: `${identity.emailLocal}@acme.dev`, passwordHash, role: "DEPARTMENT_MANAGER" }])
      .returning();
    await db.update(orgUnits).set({ managerUserId: u.id }).where(eq(orgUnits.id, dept.id));
    departmentManagerUsers[dept.name] = u as any;
  }

  // 9 section managers (AP/AR kept as "Pranee Boonmee" for continuity)
  const sectionManagerUsers: Record<string, typeof consultants[number]> = {} as any;
  for (const section of sectionRows) {
    const continuity: Record<string, { name: string; emailLocal: string }> = {
      "AP/AR": { name: "Pranee Boonmee", emailLocal: "pranee" },
    };
    const identity = continuity[section.name] ?? nextName();
    const [u] = await db
      .insert(users)
      .values([{ companyId: acme.id, orgUnitId: section.id, name: identity.name, email: `${identity.emailLocal}@acme.dev`, passwordHash, role: "SECTION_MANAGER" }])
      .returning();
    await db.update(orgUnits).set({ managerUserId: u.id }).where(eq(orgUnits.id, section.id));
    sectionManagerUsers[section.name] = u as any;
  }

  // Regular members, spread round-robin across all 9 sections (Kanya kept in AP/AR for continuity)
  const allMembers: (typeof consultants[number])[] = [];
  const [kanya] = await db
    .insert(users)
    .values([{ companyId: acme.id, orgUnitId: findSection("AP/AR").id, name: "Kanya Phongsathorn", email: "kanya@acme.dev", passwordHash, role: "MEMBER" }])
    .returning();
  allMembers.push(kanya as any);

  const memberTargetCount = 100 - 3 - 9 - 9 - 1; // total ~100 minus managers minus Kanya
  for (let i = 0; i < memberTargetCount; i++) {
    const identity = nextName();
    const section = sectionRows[i % sectionRows.length];
    const [u] = await db
      .insert(users)
      .values([{ companyId: acme.id, orgUnitId: section.id, name: identity.name, email: `${identity.emailLocal}@acme.dev`, passwordHash, role: "MEMBER" }])
      .returning();
    allMembers.push(u as any);
  }

  const allAcmeEmployees = [
    ...Object.values(divisionManagerUsers),
    ...Object.values(departmentManagerUsers),
    ...Object.values(sectionManagerUsers),
    ...allMembers,
  ];
  console.log(`  -> ${allAcmeEmployees.length} Acme employees created.`);

  console.log("Setting annual benefit-hours targets for ~90% of employees (default 300 = 15% of 2,000 hrs/year)...");
  const targetOptions = [200, 250, 300, 300, 350, 400];
  let targetsSet = 0;
  for (let i = 0; i < allAcmeEmployees.length; i++) {
    if (i % 10 === 9) continue; // leave ~10% at the untouched schema default
    await db
      .update(users)
      .set({ annualTargetHours: pick(targetOptions, i) })
      .where(eq(users.id, allAcmeEmployees[i].id));
    targetsSet++;
  }
  console.log(`  -> ${targetsSet} targets set explicitly.`);

  console.log("Seeding skill records for ~35% of employees (some course-trained, some self-reported)...");
  let skillRowsCount = 0;
  for (let i = 0; i < allAcmeEmployees.length; i++) {
    if (i % 3 !== 0) continue; // ~1 in 3 employees has trained
    const toolCount = 1 + (i % 3); // 1-3 tools per trained person
    for (let t = 0; t < toolCount; t++) {
      const tool = pick(allTools, i + t);
      const level = 1 + ((i + t * 2) % 4);
      await db.insert(skillRecords).values({
        companyId: acme.id,
        userId: allAcmeEmployees[i].id,
        aiToolId: tool.id,
        level,
        source: (i + t) % 2 === 0 ? "COURSE" : "MANUAL",
      });
      skillRowsCount++;
    }
  }
  console.log(`  -> ${skillRowsCount} skill records created.`);

  // ---------- Issues + Projects with realistic, varied approval states ----------

  console.log("Seeding issues...");
  const ISSUE_PLAN = [
    { section: "AP/AR", title: "Manual invoice reconciliation takes ~6 hrs/week", priority: "HIGH", desc: "Every week finance manually cross-checks invoices against ERP records. Repetitive and error-prone." },
    { section: "Key Accounts", title: "Sales quotes are re-typed by hand into 3 systems", priority: "MEDIUM", desc: "Account managers copy the same quote data into CRM, ERP and the proposal doc separately." },
    { section: "Support Desk", title: "First-response ticket triage is fully manual", priority: "HIGH", desc: "L1 support tickets sit un-triaged for hours before a human reads and routes them." },
    { section: "QA Lab", title: "Defect report summaries take a full day to compile", priority: "MEDIUM", desc: "QA leads manually summarize weekly defect logs into a report for production." },
    { section: "Procurement", title: "Supplier PO status checks require manual email follow-up", priority: "LOW", desc: "No automated way to check PO status across supplier emails." },
    { section: "Brand & Content", title: "Social captions are drafted from scratch every time", priority: "LOW", desc: "No reusable drafting workflow for recurring campaign content." },
    { section: "People Ops", title: "Onboarding paperwork is duplicated across systems", priority: "MEDIUM", desc: "New hires fill the same personal details into 4 separate HR forms." },
    { section: "IT Support", title: "L1 IT tickets are not auto-categorized", priority: "LOW", desc: "Every incoming IT ticket needs manual tagging before it can be routed." },
    { section: "Production Line A", title: "Shift handover notes are inconsistent", priority: "MEDIUM", desc: "Handover notes vary by writer, causing missed context between shifts." },
    { section: "Key Accounts", title: "Renewal risk isn't flagged until it's too late", priority: "HIGH", desc: "No systematic way to flag at-risk accounts ahead of renewal." },
    { section: "AP/AR", title: "Expense report approval takes 2 weeks on average", priority: "MEDIUM", desc: "Expense claims sit in email threads waiting on scattered approvals." },
    { section: "Support Desk", title: "Repeated questions aren't answered from a knowledge base", priority: "LOW", desc: "Agents re-answer the same FAQ-type tickets daily." },
    { section: "QA Lab", title: "Test case writing is a manual, slow process", priority: "MEDIUM", desc: "New feature test cases are written line-by-line with no drafting assist." },
    { section: "Brand & Content", title: "Campaign performance reports take 3 days to compile", priority: "MEDIUM", desc: "Marketing pulls numbers from 5 dashboards by hand every month." },
    { section: "IT Support", title: "Password reset requests flood the helpdesk", priority: "LOW", desc: "A large share of tickets are repetitive password reset requests." },
    { section: "Procurement", title: "Contract terms are manually re-checked every renewal", priority: "MEDIUM", desc: "No assist for comparing renewal terms against the original contract." },
    { section: "Production Line A", title: "Downtime root-cause logs are inconsistent", priority: "HIGH", desc: "Root-cause notes vary in quality, making trend analysis hard." },
    { section: "People Ops", title: "Policy questions go to HR instead of self-serve", priority: "LOW", desc: "Employees email HR for answers already covered in the handbook." },
  ] as const;

  // Default workload-impact assumptions per priority, for seeding realistic
  // "hours/year lost" figures (see src/lib/workload.ts for the 250-day math).
  const IMPACT_DEFAULTS_BY_PRIORITY: Record<string, { frequencyCount: number; minutesPerOccurrence: number }> = {
    HIGH: { frequencyCount: 4, minutesPerOccurrence: 30 },
    MEDIUM: { frequencyCount: 3, minutesPerOccurrence: 20 },
    LOW: { frequencyCount: 2, minutesPerOccurrence: 15 },
  };

  type IssueRow = typeof issues.$inferSelect;
  const createdIssues: (IssueRow & { sectionName: string })[] = [];
  let issueIndex = 0;
  for (const plan of ISSUE_PLAN) {
    const section = findSection(plan.section);
    const sectionMembers = (await db.select().from(users).where(eq(users.orgUnitId, section.id))).filter((u) => u.role === "MEMBER");
    // Prefer a member actually in this section for realism; fall back to Kanya.
    const memberInSection = sectionMembers[0] ?? kanya;
    const [row] = await db
      .insert(issues)
      .values({
        companyId: acme.id,
        orgUnitId: section.id,
        title: plan.title,
        description: plan.desc,
        priority: plan.priority,
        status: "OPEN",
        createdById: memberInSection.id,
      })
      .returning();
    createdIssues.push({ ...row, sectionName: plan.section });

    // Log who loses time to this issue and how often, so the workload calculator has real demo data.
    const impactDefaults = IMPACT_DEFAULTS_BY_PRIORITY[plan.priority] ?? IMPACT_DEFAULTS_BY_PRIORITY.MEDIUM;
    await db.insert(issueImpacts).values({
      issueId: row.id,
      userId: memberInSection.id,
      frequencyUnit: "PER_WEEK",
      frequencyCount: impactDefaults.frequencyCount,
      minutesPerOccurrence: impactDefaults.minutesPerOccurrence,
    });
    // Every third issue also affects a second teammate, to demo multi-person totals.
    const secondMember = sectionMembers.find((u) => u.id !== memberInSection.id);
    if (issueIndex % 3 === 0 && secondMember) {
      await db.insert(issueImpacts).values({
        issueId: row.id,
        userId: secondMember.id,
        frequencyUnit: "PER_WEEK",
        frequencyCount: Math.max(1, impactDefaults.frequencyCount - 1),
        minutesPerOccurrence: impactDefaults.minutesPerOccurrence,
      });
    }
    issueIndex += 1;
  }

  console.log("Seeding projects with varied approval states...");
  type ProjectPlan = {
    issueTitle: string;
    projectTitle: string;
    desc: string;
    consultant: typeof consultants[number];
    before: number;
    after: number;
    finalStatus: "REJECTED" | "PENDING_SECTION" | "PENDING_DEPT" | "PENDING_DIVISION" | "APPROVED" | "IN_PROGRESS" | "COMPLETED";
    // Delivery plan (only meaningful once a project has cleared final approval):
    // how many days ago the plan started, how many days the plan allotted, and
    // manual progress logged so far — deliberately mixed on-track/delayed for demo realism.
    planStartedDaysAgo?: number;
    planDurationDays?: number;
    progressPct?: number;
  };
  const PROJECT_PLAN: ProjectPlan[] = [
    { issueTitle: "Manual invoice reconciliation takes ~6 hrs/week", projectTitle: "Invoice Reconciliation Copilot", desc: "Use Claude Code to auto-extract invoice line items and reconcile against ERP records.", consultant: saowalak, before: 11, after: 1.7, finalStatus: "PENDING_DIVISION" },
    { issueTitle: "Sales quotes are re-typed by hand into 3 systems", projectTitle: "Quote Sync Assistant", desc: "Generate quotes once with ChatGPT and sync across CRM/ERP/proposal doc.", consultant: traitetConsultant, before: 8, after: 2, finalStatus: "PENDING_DEPT" },
    { issueTitle: "First-response ticket triage is fully manual", projectTitle: "Support Ticket Triage AI", desc: "Claude Cowork classifies and routes L1 tickets automatically.", consultant: somchai, before: 15, after: 4.5, finalStatus: "IN_PROGRESS", planStartedDaysAgo: 40, planDurationDays: 60, progressPct: 35 },
    { issueTitle: "Defect report summaries take a full day to compile", projectTitle: "QA Defect Summary Generator", desc: "Claude Code drafts the weekly defect summary from raw logs.", consultant: saowalak, before: 8, after: 1.5, finalStatus: "COMPLETED", planStartedDaysAgo: 70, planDurationDays: 60, progressPct: 100 },
    { issueTitle: "Supplier PO status checks require manual email follow-up", projectTitle: "PO Status Assistant", desc: "ChatGPT drafts and tracks supplier follow-up emails.", consultant: traitetConsultant, before: 5, after: 1, finalStatus: "APPROVED", planStartedDaysAgo: 5, planDurationDays: 60, progressPct: 5 },
    { issueTitle: "Onboarding paperwork is duplicated across systems", projectTitle: "Onboarding Form Autofill", desc: "Claude Cowork pre-fills repeated onboarding fields from one intake form.", consultant: somchai, before: 4, after: 0.5, finalStatus: "COMPLETED", planStartedDaysAgo: 45, planDurationDays: 30, progressPct: 100 },
    { issueTitle: "Renewal risk isn't flagged until it's too late", projectTitle: "Renewal Risk Radar", desc: "Claude Code flags at-risk accounts from usage + support signals.", consultant: saowalak, before: 6, after: 2, finalStatus: "PENDING_SECTION" },
    { issueTitle: "Campaign performance reports take 3 days to compile", projectTitle: "Marketing Report Copilot", desc: "ChatGPT compiles the monthly cross-dashboard performance report.", consultant: traitetConsultant, before: 10, after: 3, finalStatus: "IN_PROGRESS", planStartedDaysAgo: 20, planDurationDays: 60, progressPct: 45 },
    { issueTitle: "Downtime root-cause logs are inconsistent", projectTitle: "Root-Cause Log Assistant", desc: "Claude Cowork standardizes downtime root-cause notes as they're written.", consultant: somchai, before: 5, after: 1.5, finalStatus: "APPROVED", planStartedDaysAgo: 30, planDurationDays: 40, progressPct: 10 },
    { issueTitle: "Repeated questions aren't answered from a knowledge base", projectTitle: "Support KB Auto-Answer", desc: "Claude Code drafts KB-grounded replies for repeat questions.", consultant: saowalak, before: 7, after: 2, finalStatus: "REJECTED" },
  ];

  const createdProjects: { id: string; title: string; consultantId: string; finalStatus: ProjectPlan["finalStatus"] }[] = [];

  for (const plan of PROJECT_PLAN) {
    const issue = createdIssues.find((i) => i.title === plan.issueTitle)!;
    const section = findSection(issue.sectionName);
    const department = departmentRows.find((d) => d.name === section.departmentName)!;
    const sectionManager = sectionManagerUsers[issue.sectionName];
    const deptManager = departmentManagerUsers[department.name];
    const divManager = divisionManagerUsers[department.divisionName];

    await db.update(issues).set({ status: "CONVERTED" }).where(eq(issues.id, issue.id));

    const [project] = await db
      .insert(projects)
      .values({
        companyId: acme.id,
        issueId: issue.id,
        orgUnitId: section.id,
        title: plan.projectTitle,
        description: plan.desc,
        consultantId: plan.consultant.id,
        aiToolIds: `${claudeCode.id},${chatGpt.id}`,
        status: plan.finalStatus === "PENDING_SECTION" || plan.finalStatus === "PENDING_DEPT" || plan.finalStatus === "PENDING_DIVISION"
          ? "PENDING_APPROVAL"
          : plan.finalStatus,
      })
      .returning();

    if (plan.planStartedDaysAgo != null && plan.planDurationDays != null) {
      const targetStartDate = new Date();
      targetStartDate.setDate(targetStartDate.getDate() - plan.planStartedDaysAgo);
      const targetCompletionDate = new Date(targetStartDate);
      targetCompletionDate.setDate(targetCompletionDate.getDate() + plan.planDurationDays);
      await db
        .update(projects)
        .set({ targetStartDate, targetCompletionDate, progressPct: plan.progressPct ?? 0 })
        .where(eq(projects.id, project.id));
    }

    const workflowStatus = plan.finalStatus === "REJECTED" ? "REJECTED" : plan.finalStatus.startsWith("PENDING") ? "PENDING" : "APPROVED";
    const currentStep = { PENDING_SECTION: 1, PENDING_DEPT: 2, PENDING_DIVISION: 3 }[plan.finalStatus as "PENDING_SECTION" | "PENDING_DEPT" | "PENDING_DIVISION"] ?? 3;

    const [workflow] = await db
      .insert(approvalWorkflows)
      .values({ projectId: project.id, kind: "PROJECT_APPROVAL", status: workflowStatus, currentStep })
      .returning();

    const target = Math.round((plan.before - plan.after) * 10) / 10;
    const sectionDecision = plan.finalStatus === "PENDING_SECTION" ? "PENDING" : plan.finalStatus === "REJECTED" ? "REJECTED" : "APPROVED";
    const deptDecision = ["PENDING_SECTION", "PENDING_DEPT"].includes(plan.finalStatus) ? "PENDING" : plan.finalStatus === "REJECTED" ? "PENDING" : "APPROVED";
    const divDecision = ["PENDING_SECTION", "PENDING_DEPT", "PENDING_DIVISION"].includes(plan.finalStatus) || plan.finalStatus === "REJECTED" ? "PENDING" : "APPROVED";

    await db.insert(approvalSteps).values([
      {
        workflowId: workflow.id,
        stepNumber: 1,
        roleRequired: "SECTION_MANAGER",
        approverUserId: sectionManager.id,
        decision: sectionDecision,
        targetHoursPerWeek: sectionDecision === "APPROVED" ? target : null,
        comment: sectionDecision === "REJECTED" ? "Not a priority for this quarter." : sectionDecision === "APPROVED" ? "Approved, good use case." : null,
        decidedAt: sectionDecision === "PENDING" ? null : new Date(),
      },
      {
        workflowId: workflow.id,
        stepNumber: 2,
        roleRequired: "DEPARTMENT_MANAGER",
        approverUserId: deptManager.id,
        decision: deptDecision,
        targetHoursPerWeek: deptDecision === "APPROVED" ? target : null,
        comment: deptDecision === "APPROVED" ? "Aligned with department goals." : null,
        decidedAt: deptDecision === "PENDING" ? null : new Date(),
      },
      {
        workflowId: workflow.id,
        stepNumber: 3,
        roleRequired: "DIVISION_MANAGER",
        approverUserId: divManager.id,
        decision: divDecision,
        targetHoursPerWeek: divDecision === "APPROVED" ? target : null,
        comment: divDecision === "APPROVED" ? "Approved, monitor delivery." : null,
        decidedAt: divDecision === "PENDING" ? null : new Date(),
      },
    ]);

    await db.insert(benefitSummaries).values([
      {
        projectId: project.id,
        beforeHoursPerWeek: plan.before,
        afterHoursPerWeek: plan.after,
        status: workflowStatus === "APPROVED" ? "APPROVED" : "DRAFT",
      },
    ]);

    createdProjects.push({ id: project.id, title: project.title, consultantId: plan.consultant.id, finalStatus: plan.finalStatus });
  }

  // ---------- Bookings: a realistic week of consultation slots ----------

  console.log("Seeding consultant bookings + unavailability...");
  function atHour(daysFromNow: number, hour: number, minute = 0): Date {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  }
  const findProject = (title: string) => {
    const row = createdProjects.find((p) => p.title === title);
    if (!row) throw new Error(`Seed data bug: no project titled "${title}"`);
    return row;
  };

  await db.insert(bookings).values([
    { companyId: acme.id, consultantId: saowalak.id, projectId: findProject("Invoice Reconciliation Copilot").id, requestedById: kanya.id, startAt: atHour(1, 10), endAt: atHour(1, 11), topic: "Approval readiness review", status: "CONFIRMED" },
    { companyId: acme.id, consultantId: saowalak.id, projectId: findProject("QA Defect Summary Generator").id, requestedById: sectionManagerUsers["QA Lab"].id, startAt: atHour(2, 14), endAt: atHour(2, 15), topic: "Post-launch check-in", status: "CONFIRMED" },
    { companyId: acme.id, consultantId: traitetConsultant.id, projectId: findProject("Quote Sync Assistant").id, requestedById: departmentManagerUsers["Sales"].id, startAt: atHour(3, 9), endAt: atHour(3, 10), topic: "Solution walkthrough", status: "CONFIRMED" },
    { companyId: acme.id, consultantId: traitetConsultant.id, projectId: findProject("PO Status Assistant").id, requestedById: departmentManagerUsers["Supply Chain"].id, startAt: atHour(-2, 11), endAt: atHour(-2, 12), topic: "Discovery session", status: "CONFIRMED" },
    { companyId: acme.id, consultantId: somchai.id, projectId: findProject("Support Ticket Triage AI").id, requestedById: sectionManagerUsers["Support Desk"].id, startAt: atHour(1, 15), endAt: atHour(1, 16.5), topic: "Mid-project checkpoint", status: "CONFIRMED" },
    { companyId: acme.id, consultantId: somchai.id, projectId: findProject("Onboarding Form Autofill").id, requestedById: departmentManagerUsers["HR"].id, startAt: atHour(4, 13), endAt: atHour(4, 14), topic: "Handover session", status: "CANCELLED" },
    { companyId: acme.id, consultantId: saowalak.id, requestedById: kanya.id, startAt: atHour(5, 10), endAt: atHour(5, 11), topic: "New use case intro", status: "CONFIRMED" },
  ]);

  await db.insert(consultantUnavailability).values([
    { consultantId: saowalak.id, startAt: atHour(2, 12), endAt: atHour(2, 13), reason: "Lunch training" },
    { consultantId: somchai.id, startAt: atHour(6, 13), endAt: atHour(6, 15), reason: "Personal" },
    { consultantId: traitetConsultant.id, startAt: atHour(0, 18), endAt: atHour(0, 22), reason: "Internal planning" },
  ]);

  // ---------- Success case studies: a few already published, with cover photos ----------

  console.log("Seeding published success stories with cover photos, ratings and comments...");
  const CASE_STUDY_PLAN = [
    {
      projectTitle: "QA Defect Summary Generator",
      title: "Cutting QA reporting from a full day to 90 minutes",
      summary:
        "The QA Lab used to spend most of a working day compiling the weekly defect summary by hand. With Claude Code drafting the first pass from raw logs, the team now reviews and ships the report in under two hours — freeing up nearly a full day every week for actual testing.",
      imageUrl: "https://picsum.photos/seed/qa-defect-summary/800/450",
    },
    {
      projectTitle: "Onboarding Form Autofill",
      title: "New hires stopped re-typing the same details four times",
      summary:
        "HR's onboarding pack asked every new hire to enter the same personal details into four separate forms. Claude Cowork now pre-fills the repeat fields from a single intake form, cutting onboarding paperwork time by 90% and noticeably improving new-hire satisfaction scores.",
      imageUrl: "https://picsum.photos/seed/onboarding-autofill/800/450",
    },
    {
      projectTitle: "Support Ticket Triage AI",
      title: "First-response tickets go from hours to minutes",
      summary:
        "Support tickets used to sit un-triaged for hours before a human read and routed them. Claude Cowork now classifies and routes every incoming L1 ticket automatically, and the team is already seeing first-response time drop sharply even before the project is fully wrapped up.",
      imageUrl: "https://picsum.photos/seed/support-triage/800/450",
    },
  ] as const;

  for (const plan of CASE_STUDY_PLAN) {
    const project = findProject(plan.projectTitle);
    const [caseStudy] = await db
      .insert(caseStudies)
      .values({
        companyId: acme.id,
        projectId: project.id,
        title: plan.title,
        summary: plan.summary,
        imageUrl: plan.imageUrl,
        submittedById: kanya.id,
        status: "PUBLISHED",
        approverUserId: departmentManagerUsers["Finance"].id,
        decidedAt: new Date(),
        decisionComment: "Great example for the rest of the company — approved.",
      })
      .returning();

    // A handful of ratings + one comment per story, from a spread of employees.
    const raters = [allMembers[2], allMembers[5], allMembers[9], sectionManagerUsers["Key Accounts"], departmentManagerUsers["Marketing"]].filter(Boolean);
    for (let i = 0; i < raters.length; i++) {
      await db.insert(caseStudyRatings).values({ caseStudyId: caseStudy.id, userId: raters[i]!.id, rating: 4 + (i % 2) });
    }
    await db.insert(caseStudyComments).values({
      caseStudyId: caseStudy.id,
      userId: raters[0]!.id,
      body: "Great result — would love to see this rolled out to our team too.",
    });
  }

  console.log("Done. Demo companies:", [acme.name, siam.name, blueOcean.name].join(", "));
  console.log(`Every seeded user's password is: ${DEV_PASSWORD}`);
  console.log("Super admin: traitet@gmail.com");
  console.log("Consultants (see all companies): traitet@bewithai.dev, saowalak@bewithai.dev, somchai@bewithai.dev");
  console.log("Acme Manufacturing key logins: pranee@acme.dev (Section Mgr, AP/AR), warit@acme.dev (Dept Mgr, Finance), kanya@acme.dev (Member, AP/AR), anucha@acme.dev (Dept Mgr, Sales), napat@acme.dev (Division Mgr, Corporate Services)");
  console.log(`Acme Manufacturing total headcount: ${allAcmeEmployees.length + 1} (including Kanya)`);
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
