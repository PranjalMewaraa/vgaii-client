-- EMR encounter metadata on Appointment + clinical identity on Lead.
-- All nullable: filled in by the doctor/receptionist when known.
ALTER TABLE `Appointment`
  ADD COLUMN `encounterType` VARCHAR(191) NULL,
  ADD COLUMN `diagnosisCode` VARCHAR(191) NULL,
  ADD COLUMN `diagnosisStatus` VARCHAR(191) NULL,
  ADD COLUMN `observations` TEXT NULL;

ALTER TABLE `Lead`
  ADD COLUMN `bloodGroup` VARCHAR(191) NULL,
  ADD COLUMN `allergies` TEXT NULL;
