-- Provider app credentials configured from admin (sealed secrets)

CREATE TABLE `MarketingProviderAppConfig` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(64) NOT NULL,
    `clientId` VARCHAR(256) NULL,
    `clientSecret` TEXT NULL,
    `appSecret` TEXT NULL,
    `webhookVerifyToken` TEXT NULL,
    `pixelId` VARCHAR(128) NULL,
    `capiAccessToken` TEXT NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketingProviderAppConfig_providerId_key`(`providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
