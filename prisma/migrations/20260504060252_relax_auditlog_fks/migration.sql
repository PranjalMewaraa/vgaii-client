-- DropForeignKey
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_actorId_fkey`;

-- DropForeignKey
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_clientId_fkey`;

-- DropIndex
DROP INDEX `AuditLog_actorId_fkey` ON `AuditLog`;
