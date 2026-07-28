CREATE TABLE `bots` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`profile_url` text,
	`weapon` text,
	`team` text,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`knockouts` integer DEFAULT 0 NOT NULL,
	`elo` integer DEFAULT 1500 NOT NULL,
	`source_updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bots_slug_idx` ON `bots` (`slug`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_number` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`source_hash` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_source_url_idx` ON `events` (`source_url`);--> statement-breakpoint
CREATE INDEX `events_scheduled_at_idx` ON `events` (`scheduled_at`);--> statement-breakpoint
CREATE TABLE `markets` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`event_id` text NOT NULL,
	`group_name` text NOT NULL,
	`bot_a_id` text NOT NULL,
	`bot_b_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`closes_at` text NOT NULL,
	`liquidity_milli` integer DEFAULT 2500000 NOT NULL,
	`q_a_milli` integer DEFAULT 0 NOT NULL,
	`q_b_milli` integer DEFAULT 0 NOT NULL,
	`initial_price_a_bps` integer DEFAULT 5000 NOT NULL,
	`volume_milli` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`winner_outcome` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bot_a_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bot_b_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `markets_slug_idx` ON `markets` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `markets_fight_idx` ON `markets` (`event_id`,`group_name`,`bot_a_id`,`bot_b_id`);--> statement-breakpoint
CREATE INDEX `markets_status_idx` ON `markets` (`status`,`closes_at`);--> statement-breakpoint
CREATE TABLE `positions` (
	`user_id` text NOT NULL,
	`market_id` text NOT NULL,
	`shares_a_milli` integer DEFAULT 0 NOT NULL,
	`shares_b_milli` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `market_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `price_samples` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`market_id` text NOT NULL,
	`price_a_bps` integer NOT NULL,
	`recorded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `price_samples_market_idx` ON `price_samples` (`market_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `resolutions` (
	`market_id` text PRIMARY KEY NOT NULL,
	`outcome` text NOT NULL,
	`evidence_url` text NOT NULL,
	`evidence_title` text,
	`evidence_excerpt` text,
	`resolved_by` text NOT NULL,
	`resolved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_url` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`markets_found` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`market_id` text NOT NULL,
	`outcome` text NOT NULL,
	`action` text NOT NULL,
	`shares_milli` integer NOT NULL,
	`cost_milli` integer NOT NULL,
	`price_bps` integer NOT NULL,
	`expected_market_version` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `trades_market_idx` ON `trades` (`market_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `trades_user_idx` ON `trades` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`handle` text NOT NULL,
	`balance_milli` integer DEFAULT 10000000 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_idx` ON `users` (`handle`);