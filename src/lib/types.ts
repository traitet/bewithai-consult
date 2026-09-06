// Central "enum-like" string unions for fields the Prisma schema stores as
// plain String (see prisma/schema.prisma for why). Every write path should
// go through the zod schemas below rather than writing a raw string.

export const ROLES = [
  "MEMBER",
  "SECTION_MANAGER",
  "DEPARTMENT_MANAGER",
  "DIVISION_MANAGER",
  "CONSULTANT",
] as const;
export type Role = (typeof ROLES)[number];

export const APPROVER_ROLES = [
  "SECTION_MANAGER",
  "DEPARTMENT_MANAGER",
  "DIVISION_MANAGER",
] as const;
export type ApproverRole = (typeof APPROVER_ROLES)[number];

export const ORG_UNIT_LEVELS = ["DIVISION", "DEPARTMENT", "SECTION"] as const;
export type OrgUnitLevel = (typeof ORG_UNIT_LEVELS)[number];

export const ISSUE_STATUSES = ["OPEN", "IN_REVIEW", "CONVERTED", "CLOSED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const PROJECT_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const WORKFLOW_KINDS = ["PROJECT_APPROVAL", "BENEFIT_APPROVAL"] as const;
export type WorkflowKind = (typeof WORKFLOW_KINDS)[number];

export const WORKFLOW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const APPROVAL_DECISIONS = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const BENEFIT_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED"] as const;
export type BenefitStatus = (typeof BENEFIT_STATUSES)[number];

export const BOOKING_STATUSES = ["CONFIRMED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ENROLLMENT_STATUSES = ["ENROLLED", "IN_PROGRESS", "COMPLETED"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const SKILL_SOURCES = ["MANUAL", "COURSE"] as const;
export type SkillSource = (typeof SKILL_SOURCES)[number];

export const COMPANY_STATUSES = ["ACTIVE", "ONBOARDING", "INACTIVE"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/** The ordered approval chain every project workflow is built from. */
export const APPROVAL_CHAIN: ApproverRole[] = [
  "SECTION_MANAGER",
  "DEPARTMENT_MANAGER",
  "DIVISION_MANAGER",
];

/** Session payload carried in the signed auth cookie (see src/lib/auth.ts). */
export type SessionUser = {
  userId: string;
  companyId: string | null; // null => consultant, sees all companies
  role: Role;
  name: string;
  email: string;
};
