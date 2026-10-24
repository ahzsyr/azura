-- Settings users portal: admin section grants and browser-to-user links.
ALTER TABLE `User` ADD COLUMN `adminSectionGrants` JSON NULL;

CREATE TABLE `UserVisitorLink` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `visitorId` VARCHAR(191) NOT NULL,
  `linkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `UserVisitorLink_userId_idx`(`userId`),
  INDEX `UserVisitorLink_visitorId_idx`(`visitorId`),
  UNIQUE INDEX `UserVisitorLink_userId_visitorId_key`(`userId`, `visitorId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserVisitorLink`
  ADD CONSTRAINT `UserVisitorLink_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserVisitorLink`
  ADD CONSTRAINT `UserVisitorLink_visitorId_fkey`
  FOREIGN KEY (`visitorId`) REFERENCES `MarketingVisitor`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
