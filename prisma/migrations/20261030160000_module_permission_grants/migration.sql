-- Phase 3: Module permission grants (compose with adminSectionGrants).
ALTER TABLE `User` ADD COLUMN `modulePermissionGrants` JSON NULL;
