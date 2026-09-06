CREATE TABLE `ai_tools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_tools_name_unique` ON `ai_tools` (`name`);--> statement-breakpoint
CREATE TABLE `approval_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`step_number` integer NOT NULL,
	`role_required` text NOT NULL,
	`approver_user_id` text,
	`decision` text DEFAULT 'PENDING' NOT NULL,
	`target_hours_per_week` real,
	`comment` text,
	`decided_at` integer,
	FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `steps_workflow_idx` ON `approval_steps` (`workflow_id`);--> statement-breakpoint
CREATE TABLE `approval_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workflows_project_idx` ON `approval_workflows` (`project_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`actor_user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_company_idx` ON `audit_logs` (`company_id`);--> statement-breakpoint
CREATE TABLE `benefit_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`before_hours_per_week` real NOT NULL,
	`after_hours_per_week` real NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `benefit_summaries_project_id_unique` ON `benefit_summaries` (`project_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`consultant_id` text NOT NULL,
	`project_id` text,
	`requested_by_id` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`topic` text,
	`status` text DEFAULT 'CONFIRMED' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bookings_company_idx` ON `bookings` (`company_id`);--> statement-breakpoint
CREATE INDEX `bookings_consultant_time_idx` ON `bookings` (`consultant_id`,`start_at`,`end_at`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`industry` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`score` integer NOT NULL,
	`level_before` integer NOT NULL,
	`level_after` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `completions_enrollment_id_unique` ON `completions` (`enrollment_id`);--> statement-breakpoint
CREATE TABLE `consultant_unavailability` (
	`id` text PRIMARY KEY NOT NULL,
	`consultant_id` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`consultant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `unavailability_consultant_time_idx` ON `consultant_unavailability` (`consultant_id`,`start_at`,`end_at`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`ai_tool_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`duration_hours` real NOT NULL,
	`unlocks_level` integer NOT NULL,
	`passing_score` integer DEFAULT 70 NOT NULL,
	FOREIGN KEY (`ai_tool_id`) REFERENCES `ai_tools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`progress_pct` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ENROLLED' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `enrollments_company_idx` ON `enrollments` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_user_course_uq` ON `enrollments` (`user_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `issue_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`filename` text NOT NULL,
	`stored_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`org_unit_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`org_unit_id`) REFERENCES `org_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `issues_company_idx` ON `issues` (`company_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_company_idx` ON `notifications` (`company_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `org_units` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`parent_id` text,
	`level` text NOT NULL,
	`name` text NOT NULL,
	`manager_user_id` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `org_units_company_idx` ON `org_units` (`company_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`org_unit_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`consultant_id` text,
	`ai_tool_ids` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	`target_start_date` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`org_unit_id`) REFERENCES `org_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_issue_id_unique` ON `projects` (`issue_id`);--> statement-breakpoint
CREATE INDEX `projects_company_idx` ON `projects` (`company_id`);--> statement-breakpoint
CREATE TABLE `skill_level_defs` (
	`level` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_records` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`ai_tool_id` text NOT NULL,
	`level` integer NOT NULL,
	`source` text DEFAULT 'MANUAL' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ai_tool_id`) REFERENCES `ai_tools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `skills_company_idx` ON `skill_records` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `skills_user_tool_uq` ON `skill_records` (`user_id`,`ai_tool_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`org_unit_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`work_start_hour` integer DEFAULT 8,
	`work_end_hour` integer DEFAULT 22,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`org_unit_id`) REFERENCES `org_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_company_idx` ON `users` (`company_id`);