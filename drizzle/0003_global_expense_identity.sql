CREATE TABLE `expenses` (
	`all_receipts_folder_id` text,
	`all_receipts_folder_view_url` text,
	`created_at_iso` text NOT NULL,
	`currency` text NOT NULL,
	`description` text NOT NULL,
	`expense_id` text NOT NULL,
	`loan_installment_count` integer,
	`loan_lender_id` text,
	`loan_lender_name` text,
	`loan_start_month` text,
	`payment_link` text,
	`receipt_share_message` text,
	`receipt_share_phone_digits` text,
	`requires_receipt_share` integer NOT NULL DEFAULT 0,
	`updated_at_iso` text NOT NULL,
	`user_subject` text NOT NULL,
	PRIMARY KEY(`user_subject`, `expense_id`)
);
--> statement-breakpoint
CREATE TABLE `expense_months` (
	`exchange_rate_month` text,
	`exchange_rate_blue_rate` real,
	`exchange_rate_official_rate` real,
	`exchange_rate_solidarity_rate` real,
	`expense_id` text NOT NULL,
	`is_paid` integer NOT NULL DEFAULT 0,
	`manual_covered_payments` integer NOT NULL DEFAULT 0,
	`month` text NOT NULL,
	`monthly_folder_id` text,
	`monthly_folder_view_url` text,
	`occurrences_per_month` integer NOT NULL,
	`receipt_share_status` text,
	`subtotal` real NOT NULL,
	`updated_at_iso` text NOT NULL,
	`user_subject` text NOT NULL,
	PRIMARY KEY(`user_subject`, `expense_id`, `month`)
);
--> statement-breakpoint
CREATE TABLE `expense_receipts` (
	`all_receipts_folder_id` text NOT NULL,
	`all_receipts_folder_view_url` text NOT NULL,
	`covered_payments` integer NOT NULL,
	`expense_id` text NOT NULL,
	`file_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_view_url` text NOT NULL,
	`month` text NOT NULL,
	`monthly_folder_id` text NOT NULL,
	`monthly_folder_view_url` text NOT NULL,
	`registered_at_iso` text,
	`user_subject` text NOT NULL,
	PRIMARY KEY(`user_subject`, `expense_id`, `month`, `file_id`)
);
--> statement-breakpoint
CREATE TABLE `expense_payment_records` (
	`covered_payments` integer NOT NULL,
	`expense_id` text NOT NULL,
	`month` text NOT NULL,
	`payment_record_id` text NOT NULL,
	`receipt_file_id` text,
	`registered_at_iso` text,
	`user_subject` text NOT NULL,
	PRIMARY KEY(`user_subject`, `expense_id`, `month`, `payment_record_id`)
);
--> statement-breakpoint
CREATE INDEX `expenses_user_subject_idx` ON `expenses` (`user_subject`);
--> statement-breakpoint
CREATE INDEX `expense_months_user_subject_month_idx` ON `expense_months` (`user_subject`, `month`);
--> statement-breakpoint
CREATE INDEX `expense_receipts_user_subject_month_idx` ON `expense_receipts` (`user_subject`, `month`);
--> statement-breakpoint
CREATE INDEX `expense_payment_records_user_subject_month_idx` ON `expense_payment_records` (`user_subject`, `month`);
