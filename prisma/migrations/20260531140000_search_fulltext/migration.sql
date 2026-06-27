-- Full-text index for fast bilingual search (InnoDB FULLTEXT, utf8mb4)
CREATE FULLTEXT INDEX `SearchDocument_fulltext_idx` ON `SearchDocument`(`title`, `body`);
