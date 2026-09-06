CREATE TABLE `case_studies` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`submitted_by_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`status` text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	`approver_user_id` text,
	`decided_at` integer,
	`decision_comment` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_studies_project_id_unique` ON `case_studies` (`project_id`);--> statement-breakpoint
CREATE INDEX `case_studies_company_idx` ON `case_studies` (`company_id`);--> statement-breakpoint
CREATE TABLE `case_study_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`case_study_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`case_study_id`) REFERENCES `case_studies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `case_study_comments_study_idx` ON `case_study_comments` (`case_study_id`);--> statement-breakpoint
CREATE TABLE `case_study_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`case_study_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`case_study_id`) REFERENCES `case_studies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_study_ratings_uq` ON `case_study_ratings` (`case_study_id`,`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `annual_target_hours` integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_url` text;