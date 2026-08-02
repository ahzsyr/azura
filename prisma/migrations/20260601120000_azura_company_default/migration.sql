-- AlterTable: AZURA template default company name (new rows only)
ALTER TABLE `CompanyInfo` MODIFY `name` VARCHAR(191) NOT NULL DEFAULT 'AZURA';
