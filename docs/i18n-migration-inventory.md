# Translation Migration Inventory

Generated: 2026-06-15T22:28:41.239Z

## Registry entity types

- Total registered: **56**
- SQL-backed: **20**
- JSON/workspace-only: **36**

### JSON/workspace-only entities

- `BuilderBlock` — title, subtitle, content, ctaLabel, button, caption, html, alt, emptyMessage
- `CatalogCollection` — name, description
- `DocPortal` — title, description
- `DocSection` — title, content
- `DocVersion` — label
- `EmailTemplate` — subject, body
- `FormTemplate` — successMessage, pendingMessage
- `FormField` — label, placeholder, helpText
- `FormStep` — title
- `Footer` — copyrightText, tagline, rightsText
- `FooterColumn` — heading
- `FooterLink` — label
- `KnowledgeArticle` — title, excerpt, body
- `KnowledgeBase` — title, description
- `KnowledgeCategory` — title
- `MenuItem` — label, cardSubtitle, description
- `Navigation` — label
- `Partner` — name, description, location
- `PartnerCategory` — name
- `PartnerProgram` — title, description
- `PricingCalculator` — title, description
- `PricingCalculatorField` — label
- `PricingPlan` — name, description, badge, ctaLabel
- `PricingPlanFeature` — label
- `PricingPlanSet` — title, description
- `Product` — productTitle, description, shortDescription, seoTitle, seoDescription
- `ReleaseEntry` — text
- `ReleaseSet` — title, description
- `SiteIdentity` — siteTagline, siteDescription, heroCallToAction
- `StatusBoard` — title, description
- `StatusIncident` — title, message
- `StatusMaintenance` — title, message
- `StatusService` — name, description
- `TeamDepartment` — name
- `TeamDirectory` — title, description
- `TeamMember` — name, role, bio, location

## Legacy DB columns (Phase 5 drop list)

- `Gallery`: 8 columns (titleEn, titleAr, excerptEn, excerptAr, …)
- `GalleryMedia`: 8 columns (titleEn, titleAr, excerptEn, excerptAr, …)
- `Testimonial`: 2 columns (contentEn, contentAr)
- `TestimonialCollection`: 4 columns (titleEn, titleAr, excerptEn, excerptAr)
- `FaqSet`: 6 columns (titleEn, titleAr, excerptEn, excerptAr, …)
- `FaqItem`: 4 columns (questionEn, questionAr, answerEn, answerAr)
- `CompanyInfo`: 14 columns (taglineEn, taglineAr, storyEn, storyAr, …)
- `SeoSettings`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `MediaAsset`: 2 columns (altEn, altAr)
- `CmsPage`: 4 columns (titleEn, titleAr, excerptEn, excerptAr)
- `PostCategory`: 2 columns (nameEn, nameAr)
- `PostTag`: 2 columns (nameEn, nameAr)
- `PostAuthor`: 2 columns (bioEn, bioAr)
- `Post`: 6 columns (titleEn, titleAr, excerptEn, excerptAr, …)
- `SeoMeta`: 6 columns (titleEn, titleAr, descriptionEn, descriptionAr, …)
- `Custom404`: 4 columns (titleEn, titleAr, bodyEn, bodyAr)
- `ContentType`: 6 columns (nameEn, nameAr, labelSingularEn, labelSingularAr, …)
- `ContentCollection`: 4 columns (nameEn, nameAr, excerptEn, excerptAr)
- `ContentItem`: 6 columns (titleEn, titleAr, excerptEn, excerptAr, …)
- `ContentItemMedia`: 4 columns (altEn, altAr, captionEn, captionAr)
- `PricingPlanSet`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `PricingPlan`: 8 columns (nameEn, nameAr, descriptionEn, descriptionAr, …)
- `PricingPlanFeature`: 2 columns (labelEn, labelAr)
- `ReleaseSet`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `ReleaseEntry`: 2 columns (textEn, textAr)
- `PricingCalculator`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `PricingCalculatorField`: 2 columns (labelEn, labelAr)
- `KnowledgeBase`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `KnowledgeCategory`: 2 columns (titleEn, titleAr)
- `KnowledgeArticle`: 6 columns (titleEn, titleAr, excerptEn, excerptAr, …)
- `DocPortal`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `DocVersion`: 2 columns (labelEn, labelAr)
- `DocSection`: 4 columns (titleEn, titleAr, contentEn, contentAr)
- `StatusBoard`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `StatusService`: 4 columns (nameEn, nameAr, descriptionEn, descriptionAr)
- `StatusIncident`: 4 columns (titleEn, titleAr, messageEn, messageAr)
- `StatusMaintenance`: 4 columns (titleEn, titleAr, messageEn, messageAr)
- `TeamDirectory`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `TeamDepartment`: 2 columns (nameEn, nameAr)
- `TeamMember`: 8 columns (nameEn, nameAr, roleEn, roleAr, …)
- `PartnerProgram`: 4 columns (titleEn, titleAr, descriptionEn, descriptionAr)
- `PartnerCategory`: 2 columns (nameEn, nameAr)
- `Partner`: 6 columns (nameEn, nameAr, descriptionEn, descriptionAr, …)

## Block translatable field maps

- Block types with field maps: **62**

## Legacy pattern counts in src/

- `titleEn_titleAr`: **1284** occurrences
- `labelEn_labelAr`: **337** occurrences
- `localeStartsWithAr`: **74** occurrences
- `labelsMap`: **19** occurrences

## Workspace entity ID conventions

- `MenuItem`: `makeMenuItemEntityId(menuKey, itemId)`
- `FooterColumn`: `makeFooterColumnEntityId(columnId)`
- `FooterLink`: `makeFooterLinkEntityId(columnId, linkId)`
- `Footer`: `makeFooterEntityId()`
- `FormField`: `makeFormFieldEntityId(templateId, fieldId)`
- `FormStep`: `makeFormStepEntityId(templateId, stepId)`
- `BuilderBlock`: `makeBlockEntityId(parentType, parentId, blockId)`
