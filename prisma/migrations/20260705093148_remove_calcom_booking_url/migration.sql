-- Cal.com integration removed in favor of the self-hosted booking system
-- (Client.bookingConfig). Drop the now-unused Cal.com booking URL column
-- and stop defaulting new appointments to a "cal.com" source, since nothing
-- creates appointments through that path anymore.
ALTER TABLE `Client` DROP COLUMN `bookingUrl`;
ALTER TABLE `Appointment` MODIFY `source` VARCHAR(191) NOT NULL DEFAULT 'manual';
