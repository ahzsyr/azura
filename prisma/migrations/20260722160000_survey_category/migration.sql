-- Add SURVEY form template category

ALTER TABLE `FormTemplate`
  MODIFY COLUMN `category` ENUM('LEAD', 'CONTACT', 'MULTI_STEP', 'GENERAL', 'SURVEY') NOT NULL DEFAULT 'GENERAL';
