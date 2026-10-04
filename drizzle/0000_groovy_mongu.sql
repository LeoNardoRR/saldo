CREATE TABLE `saldo_ledgers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`state` text NOT NULL,
	`previous_state` text,
	`updated_at` text NOT NULL
);
