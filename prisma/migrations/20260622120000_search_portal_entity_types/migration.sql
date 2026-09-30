-- Portal team member and partner search entity types (MySQL).
ALTER TABLE `SearchDocument` MODIFY `entityType` ENUM(
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
  'TESTIMONIAL',
  'TEAM_MEMBER',
  'PARTNER'
) NOT NULL;
