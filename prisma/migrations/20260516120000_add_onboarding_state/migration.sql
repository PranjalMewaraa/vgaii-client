-- User onboarding tracking. Tri-state ENUM, see prisma/schema.prisma:
-- pending → welcome modal on next mount
-- in_progress → resume banner on next mount
-- done → permanently suppressed
ALTER TABLE `User`
  ADD COLUMN `onboardingState`     ENUM('pending','in_progress','done') NOT NULL DEFAULT 'pending',
  ADD COLUMN `onboardingStartedAt` DATETIME(3) NULL,
  ADD COLUMN `onboardingDoneAt`    DATETIME(3) NULL;

-- Grandfather everyone who has logged in before this feature ships —
-- they shouldn't be greeted by a welcome modal at next login.
UPDATE `User` SET `onboardingState` = 'done' WHERE `lastLoginAt` IS NOT NULL;

-- Set the first time the tenant seeds demo data via the tour; cleared
-- when the demo data is torn down.
ALTER TABLE `Client`
  ADD COLUMN `demoDataSeededAt` DATETIME(3) NULL;
