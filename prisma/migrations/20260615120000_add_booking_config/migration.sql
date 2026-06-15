-- Self-hosted booking: per-client availability config + toggle (JSON blob,
-- nothing queries inside it) and per-appointment slot length for overlap
-- detection. Both nullable + additive — safe to deploy ahead of the code.
ALTER TABLE `Client` ADD COLUMN `bookingConfig` JSON NULL;
ALTER TABLE `Appointment` ADD COLUMN `durationMin` INT NULL;
