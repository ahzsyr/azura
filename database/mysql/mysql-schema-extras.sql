-- MySQL-only schema extras (not emitted by Prisma migrate diff).
-- Sourced from prisma/migrations where indexes live outside the datamodel.

-- 20260531140000_search_fulltext
CREATE FULLTEXT INDEX `SearchDocument_fulltext_idx` ON `SearchDocument`(`title`, `body`);
