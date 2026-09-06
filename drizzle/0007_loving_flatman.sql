CREATE TABLE `weekly_progress_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`week_ending` integer NOT NULL,
	`progress_pct` integer NOT NULL,
	`summary` text NOT NULL,
	`submitted_by_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `weekly_progress_reports_project_idx` ON `weekly_progress_reports` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_progress_reports_project_week_idx` ON `weekly_progress_reports` (`project_id`,`week_ending`);