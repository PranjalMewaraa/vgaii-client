-- CreateIndex
CREATE FULLTEXT INDEX `Appointment_name_email_diagnosis_idx` ON `Appointment`(`name`, `email`, `diagnosis`);

-- CreateIndex
CREATE FULLTEXT INDEX `Feedback_clientName_reviewText_idx` ON `Feedback`(`clientName`, `reviewText`);

-- CreateIndex
CREATE FULLTEXT INDEX `Lead_name_email_idx` ON `Lead`(`name`, `email`);
