-- AlterEnum: add ExpensePreset to AuditEntityType
ALTER TABLE `AuditLog` MODIFY `entityType` ENUM('Lead', 'Appointment', 'Client', 'User', 'Feedback', 'Payment', 'Expense', 'PresetCharge', 'ExpensePreset') NOT NULL;

-- CreateTable
CREATE TABLE `ExpensePreset` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `category` ENUM('electricity', 'rent', 'staff_salary', 'medicines', 'cleaning', 'internet', 'marketing', 'miscellaneous') NOT NULL,
    `amount` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExpensePreset_clientId_active_sortOrder_idx`(`clientId`, `active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExpensePreset` ADD CONSTRAINT `ExpensePreset_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
