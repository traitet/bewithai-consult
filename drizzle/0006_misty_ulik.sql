CREATE TABLE `benefit_impacts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`phase` text NOT NULL,
	`frequency_unit` text NOT NULL,
	`frequency_count` real NOT NULL,
	`minutes_per_occurrence` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `benefit_impacts_project_idx` ON `benefit_impacts` (`project_id`);