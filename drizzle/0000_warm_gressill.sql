CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`all_day` integer DEFAULT false NOT NULL,
	`start` real,
	`end` real,
	`category` text DEFAULT 'other' NOT NULL,
	`repeat_freq` text DEFAULT 'none' NOT NULL,
	`repeat_days` text,
	`remind_lead` text DEFAULT 'none' NOT NULL,
	`remind_push` integer DEFAULT false NOT NULL,
	`remind_email` integer DEFAULT false NOT NULL,
	`remind_email_addr` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine` (
	`id` text PRIMARY KEY NOT NULL,
	`checked` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `week_goals` (
	`week_start` text PRIMARY KEY NOT NULL,
	`goal1` text DEFAULT '' NOT NULL,
	`goal2` text DEFAULT '' NOT NULL,
	`goal3` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `week_summary` (
	`week_start` text PRIMARY KEY NOT NULL,
	`summary` text DEFAULT '' NOT NULL
);
