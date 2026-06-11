-- Add business contact details to Client (editable on the Settings page).
ALTER TABLE `Client` ADD COLUMN `email` VARCHAR(191) NULL;
ALTER TABLE `Client` ADD COLUMN `mobile` VARCHAR(40) NULL;
