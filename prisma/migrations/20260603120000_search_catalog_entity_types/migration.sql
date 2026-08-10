-- Extend SearchEntityType for dynamic catalog discovery (collections, categories, products, types).
ALTER TABLE `SearchDocument` MODIFY COLUMN `entityType` ENUM(
  'CONTENT_ITEM',
  'CONTENT_COLLECTION',
  'CONTENT_TYPE',
  'CATALOG_PRODUCT',
  'CATALOG_COLLECTION',
  'CATALOG_CATEGORY',
  'POST',
  'CMS_PAGE',
  'FAQ',
  'MEDIA',
  'TESTIMONIAL'
) NOT NULL;
