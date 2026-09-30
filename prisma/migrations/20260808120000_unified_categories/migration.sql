-- Categories unification: Category (SoT) + CategoryMembership (materialized index)
-- Unique identity uses non-null scopeOwnerId ('' for PRODUCT) to avoid nullable unique pitfalls.

CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `scope` ENUM('PRODUCT', 'CONTENT', 'POST', 'KNOWLEDGE', 'PARTNER', 'TESTIMONIAL') NOT NULL,
    `scopeOwnerId` VARCHAR(64) NOT NULL DEFAULT '',
    `parentId` VARCHAR(36) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `showInNav` BOOLEAN NOT NULL DEFAULT true,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `membershipMode` ENUM('MANUAL', 'RULES', 'HYBRID') NOT NULL DEFAULT 'HYBRID',
    `conditions` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_scope_scopeOwnerId_slug_key`(`scope`, `scopeOwnerId`, `slug`),
    INDEX `Category_scope_parentId_idx`(`scope`, `parentId`),
    INDEX `Category_scope_visible_idx`(`scope`, `visible`),
    INDEX `Category_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `CategoryMembership` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `entityKind` VARCHAR(32) NOT NULL,
    `source` ENUM('MANUAL', 'RULE') NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CategoryMembership_categoryId_entityId_entityKind_key`(`categoryId`, `entityId`, `entityKind`),
    INDEX `CategoryMembership_entityKind_entityId_idx`(`entityKind`, `entityId`),
    INDEX `CategoryMembership_categoryId_source_idx`(`categoryId`, `source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CategoryMembership` ADD CONSTRAINT `CategoryMembership_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
