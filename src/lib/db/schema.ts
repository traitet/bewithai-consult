// bewithai — Drizzle schema (SQLite, local file — see .env DATABASE_URL)
//
// "Enum-like" columns are plain `text`; valid values are the string unions
// in src/lib/types.ts, enforced with zod at every write boundary. This is a
// deliberate choice for portability (SQLite has no native enum) and to keep
// the schema readable without generated-type indirection.
//
// Multi-tenant isolation: every tenant-owned table has a `companyId` column.
// The real guarantee is the tenant-scoped query helper in
// src/lib/db/tenant-db.ts (backed by an isolation test), not a DB constraint
// — SQLite has no Row-Level Security. See that file for how it works and
// what to add back if this ever migrates to Postgres.

import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);

// ---------- Global (not tenant-scoped) ----------

export const companies = sqliteTable("companies", {
  id: id(),
  name: text("name").notNull(),
  industry: text("industry"),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | ONBOARDING | INACTIVE
  createdAt: createdAt(),
});

export const users = sqliteTable(
  "users",
  {
    id: id(),
    companyId: text("company_id").references(() => companies.id), // null => consultant
    orgUnitId: text("org_unit_id").references(() => orgUnits.id),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(), // see Role union in types.ts
    workStartHour: integer("work_start_hour").default(8), // consultants only
    workEndHour: integer("work_end_hour").default(22), // consultants only
    createdAt: createdAt(),
  },
  (t) => [index("users_company_idx").on(t.companyId)]
);

export const aiTools = sqliteTable("ai_tools", {
  id: id(),
  name: text("name").notNull().unique(), // Claude Cowork | Claude Code | ChatGPT
});

export const skillLevelDefs = sqliteTable("skill_level_defs", {
  level: integer("level").primaryKey(), // 1..4
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const courses = sqliteTable("courses", {
  id: id(),
  aiToolId: text("ai_tool_id").notNull().references(() => aiTools.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  durationHours: real("duration_hours").notNull(),
  unlocksLevel: integer("unlocks_level").notNull(),
  passingScore: integer("passing_score").notNull().default(70),
});

// ---------- Tenant-scoped (companyId required) ----------

export const orgUnits = sqliteTable(
  "org_units",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => companies.id),
    parentId: text("parent_id"),
    level: text("level").notNull(), // DIVISION | DEPARTMENT | SECTION
    name: text("name").notNull(),
    managerUserId: text("manager_user_id"),
  },
  (t) => [index("org_units_company_idx").on(t.companyId)]
);

export const issues = sqliteTable(
  "issues",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => companies.id),
    orgUnitId: text("org_unit_id").notNull().references(() => orgUnits.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: text("priority").notNull(), // LOW | MEDIUM | HIGH
    status: text("status").notNull().default("OPEN"), // OPEN | IN_REVIEW | CONVERTED | CLOSED
    createdById: text("created_by_id").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("issues_company_idx").on(t.companyId)]
);

export const issueAttachments = sqliteTable("issue_attachments", {
  id: id(),
  issueId: text("issue_id").notNull().references(() => issues.id),
  filename: text("filename").notNull(),
  storedPath: text("stored_path").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: createdAt(),
});

export const projects = sqliteTable(
  "projects",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => companies.id),
    issueId: text("issue_id").notNull().unique().references(() => issues.id),
    orgUnitId: text("org_unit_id").notNull().references(() => orgUnits.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    consultantId: text("consultant_id").references(() => users.id),
    aiToolIds: text("ai_tool_ids").notNull().default(""), // comma-separated AiTool ids
    status: text("status").notNull().default("PENDING_APPROVAL"),
    targetStartDate: integer("target_start_date", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [index("projects_company_idx").on(t.companyId)]
);

export const approvalWorkflows = sqliteTable(
  "approval_workflows",
  {
    id: id(),
    projectId: text("project_id").notNull().references(() => projects.id),
    kind: text("kind").notNull(), // PROJECT_APPROVAL | BENEFIT_APPROVAL
    status: text("status").notNull().default("PENDING"),
    currentStep: integer("current_step").notNull().default(1),
  },
  (t) => [index("workflows_project_idx").on(t.projectId)]
);

export const approvalSteps = sqliteTable(
  "approval_steps",
  {
    id: id(),
    workflowId: text("workflow_id").notNull().references(() => approvalWorkflows.id),
    stepNumber: integer("step_number").notNull(),
    roleRequired: text("role_required").notNull(), // SECTION_MANAGER | DEPARTMENT_MANAGER | DIVISION_MANAGER
    approverUserId: text("approver_user_id").references(() => users.id),
    decision: text("decision").notNull().default("PENDING"),
    targetHoursPerWeek: real("target_hours_per_week"),
    comment: text("comment"),
    decidedAt: integer("decided_at", { mode: "timestamp" }),
  },
  (t) => [index("steps_workflow_idx").on(t.workflowId)]
);

export const benefitSummaries = sqliteTable("benefit_summaries", {
  id: id(),
  projectId: text("project_id").notNull().unique().references(() => projects.id),
  beforeHoursPerWeek: real("before_hours_per_week").notNull(),
  afterHoursPerWeek: real("after_hours_per_week").notNull(),
  status: text("status").notNull().default("DRAFT"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }),
});

export const bookings = sqliteTable(
  "bookings",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => companies.id),
    consultantId: text("consultant_id").notNull().references(() => users.id),
    projectId: text("project_id").references(() => projects.id),
    requestedById: text("requested_by_id").notNull().references(() => users.id),
    startAt: integer("start_at", { mode: "timestamp" }).notNull(),
    endAt: integer("end_at", { mode: "timestamp" }).notNull(),
    topic: text("topic"),
    status: text("status").notNull().default("CONFIRMED"),
    createdAt: createdAt(),
  },
  (t) => [
    index("bookings_company_idx").on(t.companyId),
    index("bookings_consultant_time_idx").on(t.consultantId, t.startAt, t.endAt),
  ]
);

export const consultantUnavailability = sqliteTable(
  "consultant_unavailability",
  {
    id: id(),
    consultantId: text("consultant_id").notNull().references(() => users.id),
    startAt: integer("start_at", { mode: "timestamp" }).notNull(),
    endAt: integer("end_at", { mode: "timestamp" }).notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("unavailability_consultant_time_idx").on(t.consultantId, t.startAt, t.endAt)]
);

export const skillRecords = sqliteTable(
  "skill_records",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => companies.id),
    userId: text("user_id").notNull().references(() => users.id),
    aiToolId: text("ai_tool_id").notNull().references(() => aiTools.id),
    level: integer("level").notNull(), // 1..4
    source: text("source").notNull().default("MANUAL"),
    updatedAt: createdAt(),
  },
  (t) => [
    index("skills_company_idx").on(t.companyId),
    uniqueIndex("skills_user_tool_uq").on(t.userId, t.aiToolId),
  ]
);

export const enrollments = sqliteTable(
  "enrollments",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => companies.id),
    userId: text("user_id").notNull().references(() => users.id),
    courseId: text("course_id").notNull().references(() => courses.id),
    progressPct: integer("progress_pct").notNull().default(0),
    status: text("status").notNull().default("ENROLLED"),
    startedAt: createdAt(),
  },
  (t) => [
    index("enrollments_company_idx").on(t.companyId),
    uniqueIndex("enrollments_user_course_uq").on(t.userId, t.courseId),
  ]
);

export const completions = sqliteTable("completions", {
  id: id(),
  enrollmentId: text("enrollment_id").notNull().unique().references(() => enrollments.id),
  score: integer("score").notNull(),
  levelBefore: integer("level_before").notNull(),
  levelAfter: integer("level_after").notNull(),
  completedAt: createdAt(),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    companyId: text("company_id").references(() => companies.id),
    actorUserId: text("actor_user_id").notNull().references(() => users.id),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_company_idx").on(t.companyId)]
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    companyId: text("company_id").notNull().references(() => companies.id),
    userId: text("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    payload: text("payload").notNull(), // JSON string
    readAt: integer("read_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_company_idx").on(t.companyId),
    index("notifications_user_read_idx").on(t.userId, t.readAt),
  ]
);

/** Table names that carry a companyId and must be scoped by src/lib/db/tenant-db.ts. */
export const TENANT_TABLE_NAMES = [
  "org_units",
  "issues",
  "issue_attachments", // scoped indirectly via issueId -> issue.companyId, see tenant-db.ts
  "projects",
  "approval_workflows", // scoped indirectly via projectId
  "approval_steps", // scoped indirectly via workflowId
  "benefit_summaries", // scoped indirectly via projectId
  "bookings",
  "consultant_unavailability", // consultant-owned, not company-owned — global by design
  "skill_records",
  "enrollments",
  "completions", // scoped indirectly via enrollmentId
  "audit_logs",
  "notifications",
] as const;
