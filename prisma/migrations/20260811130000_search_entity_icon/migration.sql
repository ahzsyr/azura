-- Add ICON to SearchEntityType for admin icon library search.
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
  'ICON',
  'TESTIMONIAL',
  'TEAM_MEMBER',
  'PARTNER'
) NOT NULL;
