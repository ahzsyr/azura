-- Portal & support platform (additive)

-- Fix NewsletterSubscriber composite unique index length (if table exists from partial migration)
-- ALTER TABLE `NewsletterSubscriber` MODIFY `email` VARCHAR(120) NOT NULL;

CREATE TABLE `PricingPlanSet` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PricingPlanSet_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PricingPlan` (
    `id` VARCHAR(191) NOT NULL,
    `planSetId` VARCHAR(36) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `priceMonthly` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `priceYearly` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `badgeEn` VARCHAR(191) NOT NULL DEFAULT '',
    `badgeAr` VARCHAR(191) NOT NULL DEFAULT '',
    `isHighlighted` BOOLEAN NOT NULL DEFAULT false,
    `ctaLabelEn` VARCHAR(191) NOT NULL DEFAULT 'Get started',
    `ctaLabelAr` VARCHAR(191) NOT NULL DEFAULT 'ابدأ الآن',
    `ctaHref` VARCHAR(191) NOT NULL DEFAULT '/contact',
    `featureValues` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `PricingPlan_planSetId_sortOrder_idx`(`planSetId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PricingPlanFeature` (
    `id` VARCHAR(191) NOT NULL,
    `planSetId` VARCHAR(36) NOT NULL,
    `labelEn` VARCHAR(191) NOT NULL,
    `labelAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `PricingPlanFeature_planSetId_sortOrder_idx`(`planSetId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReleaseSet` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ReleaseSet_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Release` (
    `id` VARCHAR(191) NOT NULL,
    `releaseSetId` VARCHAR(36) NOT NULL,
    `version` VARCHAR(64) NOT NULL,
    `releaseDate` DATETIME(3) NULL,
    `status` ENUM('RELEASED', 'BETA', 'DEPRECATED') NOT NULL DEFAULT 'RELEASED',
    `tags` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Release_releaseSetId_sortOrder_idx`(`releaseSetId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReleaseEntry` (
    `id` VARCHAR(191) NOT NULL,
    `releaseId` VARCHAR(36) NOT NULL,
    `category` ENUM('FEATURES', 'IMPROVEMENTS', 'FIXES', 'BREAKING') NOT NULL DEFAULT 'FEATURES',
    `textEn` TEXT NOT NULL,
    `textAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `ReleaseEntry_releaseId_category_sortOrder_idx`(`releaseId`, `category`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PricingCalculator` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `basePrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PricingCalculator_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PricingCalculatorField` (
    `id` VARCHAR(191) NOT NULL,
    `calculatorId` VARCHAR(36) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `labelEn` VARCHAR(191) NOT NULL,
    `labelAr` VARCHAR(191) NOT NULL,
    `fieldType` ENUM('NUMBER', 'SELECT', 'TOGGLE') NOT NULL DEFAULT 'NUMBER',
    `options` JSON NOT NULL,
    `defaultValue` VARCHAR(191) NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PricingCalculatorField_calculatorId_key_key`(`calculatorId`, `key`),
    INDEX `PricingCalculatorField_calculatorId_sortOrder_idx`(`calculatorId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PricingCalculatorRule` (
    `id` VARCHAR(191) NOT NULL,
    `calculatorId` VARCHAR(36) NOT NULL,
    `fieldKey` VARCHAR(64) NOT NULL,
    `operator` VARCHAR(16) NOT NULL DEFAULT 'eq',
    `value` VARCHAR(191) NOT NULL DEFAULT '',
    `priceDelta` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `multiplier` DECIMAL(8, 4) NOT NULL DEFAULT 1,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `PricingCalculatorRule_calculatorId_sortOrder_idx`(`calculatorId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `KnowledgeBase` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `KnowledgeBase_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `KnowledgeCategory` (
    `id` VARCHAR(191) NOT NULL,
    `knowledgeBaseId` VARCHAR(36) NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `KnowledgeCategory_knowledgeBaseId_slug_key`(`knowledgeBaseId`, `slug`),
    INDEX `KnowledgeCategory_knowledgeBaseId_parentId_sortOrder_idx`(`knowledgeBaseId`, `parentId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `KnowledgeArticle` (
    `id` VARCHAR(191) NOT NULL,
    `knowledgeBaseId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `excerptEn` TEXT NOT NULL,
    `excerptAr` TEXT NOT NULL,
    `bodyEn` TEXT NOT NULL,
    `bodyAr` TEXT NOT NULL,
    `ratingSum` INTEGER NOT NULL DEFAULT 0,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `KnowledgeArticle_knowledgeBaseId_slug_key`(`knowledgeBaseId`, `slug`),
    INDEX `KnowledgeArticle_knowledgeBaseId_categoryId_sortOrder_idx`(`knowledgeBaseId`, `categoryId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DocPortal` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `DocPortal_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DocVersion` (
    `id` VARCHAR(191) NOT NULL,
    `portalId` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `labelEn` VARCHAR(191) NOT NULL,
    `labelAr` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `DocVersion_portalId_slug_key`(`portalId`, `slug`),
    INDEX `DocVersion_portalId_sortOrder_idx`(`portalId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DocSection` (
    `id` VARCHAR(191) NOT NULL,
    `portalId` VARCHAR(36) NOT NULL,
    `versionId` VARCHAR(36) NULL,
    `parentId` VARCHAR(36) NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `href` VARCHAR(191) NOT NULL DEFAULT '',
    `contentEn` TEXT NOT NULL,
    `contentAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `DocSection_portalId_slug_key`(`portalId`, `slug`),
    INDEX `DocSection_portalId_versionId_parentId_sortOrder_idx`(`portalId`, `versionId`, `parentId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StatusBoard` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `StatusBoard_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StatusService` (
    `id` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(36) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `status` ENUM('OPERATIONAL', 'DEGRADED', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'MAINTENANCE') NOT NULL DEFAULT 'OPERATIONAL',
    `uptimePercent` DECIMAL(5, 2) NOT NULL DEFAULT 100,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `StatusService_boardId_sortOrder_idx`(`boardId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StatusIncident` (
    `id` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(36) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `messageEn` TEXT NOT NULL,
    `messageAr` TEXT NOT NULL,
    `status` ENUM('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED') NOT NULL DEFAULT 'INVESTIGATING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `StatusIncident_boardId_sortOrder_idx`(`boardId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StatusMaintenance` (
    `id` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(36) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `messageEn` TEXT NOT NULL,
    `messageAr` TEXT NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `StatusMaintenance_boardId_startsAt_idx`(`boardId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeamDirectory` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `TeamDirectory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeamDepartment` (
    `id` VARCHAR(191) NOT NULL,
    `directoryId` VARCHAR(36) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `TeamDepartment_directoryId_sortOrder_idx`(`directoryId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeamMember` (
    `id` VARCHAR(191) NOT NULL,
    `directoryId` VARCHAR(36) NOT NULL,
    `departmentId` VARCHAR(36) NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `roleEn` VARCHAR(191) NOT NULL DEFAULT '',
    `roleAr` VARCHAR(191) NOT NULL DEFAULT '',
    `bioEn` TEXT NOT NULL,
    `bioAr` TEXT NOT NULL,
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `locationEn` VARCHAR(191) NOT NULL DEFAULT '',
    `locationAr` VARCHAR(191) NOT NULL DEFAULT '',
    `skills` JSON NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `TeamMember_directoryId_departmentId_sortOrder_idx`(`directoryId`, `departmentId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PartnerProgram` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `titleEn` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PartnerProgram_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PartnerCategory` (
    `id` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PartnerCategory_programId_slug_key`(`programId`, `slug`),
    INDEX `PartnerCategory_programId_sortOrder_idx`(`programId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Partner` (
    `id` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `descriptionAr` TEXT NOT NULL,
    `logoUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `websiteUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `profileUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `locationEn` VARCHAR(191) NOT NULL DEFAULT '',
    `locationAr` VARCHAR(191) NOT NULL DEFAULT '',
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `certifications` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Partner_programId_categoryId_sortOrder_idx`(`programId`, `categoryId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PricingPlan` ADD CONSTRAINT `PricingPlan_planSetId_fkey` FOREIGN KEY (`planSetId`) REFERENCES `PricingPlanSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PricingPlanFeature` ADD CONSTRAINT `PricingPlanFeature_planSetId_fkey` FOREIGN KEY (`planSetId`) REFERENCES `PricingPlanSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Release` ADD CONSTRAINT `Release_releaseSetId_fkey` FOREIGN KEY (`releaseSetId`) REFERENCES `ReleaseSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReleaseEntry` ADD CONSTRAINT `ReleaseEntry_releaseId_fkey` FOREIGN KEY (`releaseId`) REFERENCES `Release`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PricingCalculatorField` ADD CONSTRAINT `PricingCalculatorField_calculatorId_fkey` FOREIGN KEY (`calculatorId`) REFERENCES `PricingCalculator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PricingCalculatorRule` ADD CONSTRAINT `PricingCalculatorRule_calculatorId_fkey` FOREIGN KEY (`calculatorId`) REFERENCES `PricingCalculator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `KnowledgeCategory` ADD CONSTRAINT `KnowledgeCategory_knowledgeBaseId_fkey` FOREIGN KEY (`knowledgeBaseId`) REFERENCES `KnowledgeBase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `KnowledgeArticle` ADD CONSTRAINT `KnowledgeArticle_knowledgeBaseId_fkey` FOREIGN KEY (`knowledgeBaseId`) REFERENCES `KnowledgeBase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `KnowledgeArticle` ADD CONSTRAINT `KnowledgeArticle_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `KnowledgeCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `DocVersion` ADD CONSTRAINT `DocVersion_portalId_fkey` FOREIGN KEY (`portalId`) REFERENCES `DocPortal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DocSection` ADD CONSTRAINT `DocSection_portalId_fkey` FOREIGN KEY (`portalId`) REFERENCES `DocPortal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DocSection` ADD CONSTRAINT `DocSection_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `DocVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `StatusService` ADD CONSTRAINT `StatusService_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `StatusBoard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StatusIncident` ADD CONSTRAINT `StatusIncident_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `StatusBoard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StatusMaintenance` ADD CONSTRAINT `StatusMaintenance_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `StatusBoard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TeamDepartment` ADD CONSTRAINT `TeamDepartment_directoryId_fkey` FOREIGN KEY (`directoryId`) REFERENCES `TeamDirectory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_directoryId_fkey` FOREIGN KEY (`directoryId`) REFERENCES `TeamDirectory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `TeamDepartment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PartnerCategory` ADD CONSTRAINT `PartnerCategory_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `PartnerProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `PartnerProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `PartnerCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
