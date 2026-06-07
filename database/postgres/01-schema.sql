-- AZURA — PostgreSQL schema for Supabase (generated from prisma/schema.prisma)
-- Run in Supabase SQL Editor before importing CSV data

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "FavoriteEntityType" AS ENUM ('CATALOG_PRODUCT', 'CONTENT_ITEM');

-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('GENERAL', 'PACKAGE', 'CONTENT', 'VISA', 'CONTACT');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GalleryMediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ThemePreset" AS ENUM ('CLASSIC', 'MODERN', 'LUXURY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'SVG');

-- CreateEnum
CREATE TYPE "SearchEntityType" AS ENUM ('CONTENT_ITEM', 'CONTENT_COLLECTION', 'CONTENT_TYPE', 'CATALOG_PRODUCT', 'CATALOG_COLLECTION', 'CATALOG_CATEGORY', 'POST', 'CMS_PAGE', 'FAQ', 'MEDIA', 'TESTIMONIAL');

-- CreateEnum
CREATE TYPE "RedirectType" AS ENUM ('PERMANENT', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('NEW', 'REVIEWED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormTemplateCategory" AS ENUM ('LEAD', 'CONTACT', 'MULTI_STEP', 'GENERAL');

-- CreateEnum
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "DownloadUnlockMethod" AS ENUM ('FORM', 'NEWSLETTER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "FormWebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TranslationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('RELEASED', 'BETA', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ReleaseEntryCategory" AS ENUM ('FEATURES', 'IMPROVEMENTS', 'FIXES', 'BREAKING');

-- CreateEnum
CREATE TYPE "PricingCalculatorFieldType" AS ENUM ('NUMBER', 'SELECT', 'TOGGLE');

-- CreateEnum
CREATE TYPE "ServiceHealthStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "phone" TEXT,
    "dateOfBirth" DATE,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "FavoriteEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptAr" TEXT,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "infoEn" TEXT,
    "infoAr" TEXT,
    "coverUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryMedia" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptAr" TEXT,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "infoEn" TEXT,
    "infoAr" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "mediaKind" "GalleryMediaKind" NOT NULL DEFAULT 'IMAGE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "contentEn" TEXT NOT NULL,
    "contentAr" TEXT NOT NULL,
    "videoUrl" TEXT,
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialCollection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptAr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestimonialCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "testimonialId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestimonialCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "type" "InquiryType" NOT NULL DEFAULT 'GENERAL',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "notes" TEXT,
    "contentItemId" VARCHAR(36),
    "userId" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "contentItemId" VARCHAR(36) NOT NULL,
    "userId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqSet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptAr" TEXT,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "faqSetId" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "answerAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInfo" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'AZURA',
    "taglineEn" TEXT NOT NULL,
    "taglineAr" TEXT NOT NULL,
    "storyEn" TEXT NOT NULL,
    "storyAr" TEXT NOT NULL,
    "missionEn" TEXT NOT NULL,
    "missionAr" TEXT NOT NULL,
    "visionEn" TEXT NOT NULL,
    "visionAr" TEXT NOT NULL,
    "valuesEn" JSONB NOT NULL DEFAULT '[]',
    "valuesAr" JSONB NOT NULL DEFAULT '[]',
    "registrationNo" TEXT NOT NULL,
    "licenseInfo" TEXT NOT NULL,
    "addressEn" TEXT NOT NULL,
    "addressAr" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "officeHoursEn" TEXT NOT NULL,
    "officeHoursAr" TEXT NOT NULL,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "trustBadges" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSettings" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "ogImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTheme" (
    "id" TEXT NOT NULL,
    "preset" "ThemePreset" NOT NULL DEFAULT 'CLASSIC',
    "activePresetId" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#047857',
    "secondaryColor" TEXT NOT NULL DEFAULT '#d4af37',
    "typography" JSONB NOT NULL DEFAULT '{}',
    "faviconUrl" TEXT,
    "logoUrl" TEXT,
    "brandConfig" JSONB NOT NULL DEFAULT '{}',
    "headerConfig" JSONB NOT NULL DEFAULT '{}',
    "footerConfig" JSONB NOT NULL DEFAULT '{}',
    "animationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "animationSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "lazyLoadEnabled" BOOLEAN NOT NULL DEFAULT true,
    "darkModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "spacingScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "customCss" TEXT,
    "cursorEffect" TEXT,
    "backgroundEffect" TEXT,
    "textEffect" TEXT,
    "cursorEffectEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backgroundEffectEnabled" BOOLEAN NOT NULL DEFAULT true,
    "textEffectEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cardStyle" TEXT,
    "borderStyle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JsonStore" (
    "id" TEXT NOT NULL,
    "namespace" VARCHAR(64) NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JsonStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "altEn" TEXT NOT NULL DEFAULT '',
    "altAr" TEXT NOT NULL DEFAULT '',
    "folderId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(128) NOT NULL,
    "field" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptAr" TEXT,
    "templateKey" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "visualSettings" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPageRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "blocks" JSONB NOT NULL,
    "message" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsPageRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAuthor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bioEn" TEXT,
    "bioAr" TEXT,
    "avatarUrl" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptAr" TEXT,
    "contentEn" TEXT,
    "contentAr" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "featuredImageId" TEXT,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "relatedPostIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostCategoryOnPost" (
    "postId" VARCHAR(36) NOT NULL,
    "categoryId" VARCHAR(36) NOT NULL,

    CONSTRAINT "PostCategoryOnPost_pkey" PRIMARY KEY ("postId","categoryId")
);

-- CreateTable
CREATE TABLE "PostTagOnPost" (
    "postId" VARCHAR(36) NOT NULL,
    "tagId" VARCHAR(36) NOT NULL,

    CONSTRAINT "PostTagOnPost_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "SearchDocument" (
    "id" TEXT NOT NULL,
    "entityType" "SearchEntityType" NOT NULL,
    "entityId" VARCHAR(36) NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "urlPath" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMeta" (
    "id" TEXT NOT NULL,
    "pageKey" VARCHAR(128),
    "entityType" VARCHAR(32),
    "entityId" VARCHAR(128),
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "robots" TEXT,
    "focusKeywords" TEXT,
    "ogTitleEn" TEXT,
    "ogTitleAr" TEXT,
    "ogImageUrl" TEXT,
    "twitterCard" TEXT,
    "jsonLd" JSONB,
    "cmsPageId" TEXT,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoRedirect" (
    "id" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "type" "RedirectType" NOT NULL DEFAULT 'PERMANENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Custom404" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Custom404_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocaleConfig" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "urlPrefix" VARCHAR(16) NOT NULL,
    "label" TEXT NOT NULL,
    "htmlLang" VARCHAR(10) NOT NULL DEFAULT 'en',
    "dir" VARCHAR(3) NOT NULL DEFAULT 'ltr',
    "flag" TEXT NOT NULL DEFAULT '🌐',
    "dateLocale" VARCHAR(16) NOT NULL DEFAULT 'en-US',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "numberLocale" VARCHAR(16) NOT NULL DEFAULT 'en-US',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocaleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentType" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "labelSingularEn" TEXT NOT NULL DEFAULT 'Item',
    "labelSingularAr" TEXT NOT NULL DEFAULT 'عنصر',
    "labelPluralEn" TEXT NOT NULL DEFAULT 'Items',
    "labelPluralAr" TEXT NOT NULL DEFAULT 'عناصر',
    "icon" TEXT NOT NULL DEFAULT 'box',
    "routePrefix" VARCHAR(64),
    "fieldSchema" JSONB NOT NULL DEFAULT '[]',
    "displaySchema" JSONB NOT NULL DEFAULT '{}',
    "adminConfig" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCollection" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "contentTypeId" VARCHAR(36) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptAr" TEXT,
    "displayProfile" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "contentTypeId" VARCHAR(36) NOT NULL,
    "collectionId" VARCHAR(36),
    "slug" VARCHAR(128),
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT NOT NULL DEFAULT '',
    "excerptAr" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "displaySettings" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "featuredImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" VARCHAR(36) NOT NULL,
    "itemId" VARCHAR(36) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItemMedia" (
    "id" TEXT NOT NULL,
    "itemId" VARCHAR(36) NOT NULL,
    "url" TEXT NOT NULL,
    "altEn" TEXT NOT NULL DEFAULT '',
    "altAr" TEXT NOT NULL DEFAULT '',
    "captionEn" TEXT NOT NULL DEFAULT '',
    "captionAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItemMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityTranslation" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(36) NOT NULL,
    "field" VARCHAR(64) NOT NULL,
    "languageCode" VARCHAR(16) NOT NULL,
    "value" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityTranslationVersion" (
    "id" TEXT NOT NULL,
    "translationId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL,
    "changedBy" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityTranslationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalizedSlug" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(36) NOT NULL,
    "languageCode" VARCHAR(16) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalizedSlug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationJob" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(64),
    "languageCode" VARCHAR(16) NOT NULL,
    "status" "TranslationJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalEntities" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TranslationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UiMessage" (
    "id" TEXT NOT NULL,
    "namespace" VARCHAR(64) NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "languageCode" VARCHAR(16) NOT NULL,
    "value" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "category" "FormTemplateCategory" NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "blockType" VARCHAR(64),
    "blockId" VARCHAR(64),
    "pageId" VARCHAR(36),
    "pageSlug" VARCHAR(256),
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'NEW',
    "utm" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormDraft" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "templateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "name" TEXT,
    "segment" VARCHAR(64) NOT NULL DEFAULT 'default',
    "status" "NewsletterSubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "confirmToken" VARCHAR(64),
    "confirmedAt" TIMESTAMP(3),
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadGateUnlock" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "email" TEXT,
    "unlockMethod" "DownloadUnlockMethod" NOT NULL DEFAULT 'FORM',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadGateUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormWebhookDelivery" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "status" "FormWebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "responseCode" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlanSet" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlanSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "planSetId" VARCHAR(36) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "priceMonthly" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "priceYearly" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "badgeEn" TEXT NOT NULL DEFAULT '',
    "badgeAr" TEXT NOT NULL DEFAULT '',
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "ctaLabelEn" TEXT NOT NULL DEFAULT 'Get started',
    "ctaLabelAr" TEXT NOT NULL DEFAULT 'ابدأ الآن',
    "ctaHref" TEXT NOT NULL DEFAULT '/contact',
    "featureValues" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlanFeature" (
    "id" TEXT NOT NULL,
    "planSetId" VARCHAR(36) NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseSet" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "releaseSetId" VARCHAR(36) NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "status" "ReleaseStatus" NOT NULL DEFAULT 'RELEASED',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseEntry" (
    "id" TEXT NOT NULL,
    "releaseId" VARCHAR(36) NOT NULL,
    "category" "ReleaseEntryCategory" NOT NULL DEFAULT 'FEATURES',
    "textEn" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCalculator" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCalculator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCalculatorField" (
    "id" TEXT NOT NULL,
    "calculatorId" VARCHAR(36) NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "fieldType" "PricingCalculatorFieldType" NOT NULL DEFAULT 'NUMBER',
    "options" JSONB NOT NULL DEFAULT '[]',
    "defaultValue" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCalculatorField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCalculatorRule" (
    "id" TEXT NOT NULL,
    "calculatorId" VARCHAR(36) NOT NULL,
    "fieldKey" VARCHAR(64) NOT NULL,
    "operator" VARCHAR(16) NOT NULL DEFAULT 'eq',
    "value" TEXT NOT NULL DEFAULT '',
    "priceDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "multiplier" DECIMAL(8,4) NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCalculatorRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCategory" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" VARCHAR(36) NOT NULL,
    "parentId" VARCHAR(36),
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" VARCHAR(36) NOT NULL,
    "categoryId" VARCHAR(36),
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT NOT NULL DEFAULT '',
    "excerptAr" TEXT NOT NULL DEFAULT '',
    "bodyEn" TEXT NOT NULL DEFAULT '',
    "bodyAr" TEXT NOT NULL DEFAULT '',
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocPortal" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocVersion" (
    "id" TEXT NOT NULL,
    "portalId" VARCHAR(36) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocSection" (
    "id" TEXT NOT NULL,
    "portalId" VARCHAR(36) NOT NULL,
    "versionId" VARCHAR(36),
    "parentId" VARCHAR(36),
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '',
    "contentEn" TEXT NOT NULL DEFAULT '',
    "contentAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusBoard" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusService" (
    "id" TEXT NOT NULL,
    "boardId" VARCHAR(36) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "status" "ServiceHealthStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "uptimePercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusIncident" (
    "id" TEXT NOT NULL,
    "boardId" VARCHAR(36) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "messageAr" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'INVESTIGATING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusMaintenance" (
    "id" TEXT NOT NULL,
    "boardId" VARCHAR(36) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "messageAr" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamDirectory" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamDepartment" (
    "id" TEXT NOT NULL,
    "directoryId" VARCHAR(36) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "directoryId" VARCHAR(36) NOT NULL,
    "departmentId" VARCHAR(36),
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "roleEn" TEXT NOT NULL DEFAULT '',
    "roleAr" TEXT NOT NULL DEFAULT '',
    "bioEn" TEXT NOT NULL DEFAULT '',
    "bioAr" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "locationEn" TEXT NOT NULL DEFAULT '',
    "locationAr" TEXT NOT NULL DEFAULT '',
    "skills" JSONB NOT NULL DEFAULT '[]',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProgram" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCategory" (
    "id" TEXT NOT NULL,
    "programId" VARCHAR(36) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "programId" VARCHAR(36) NOT NULL,
    "categoryId" VARCHAR(36),
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "websiteUrl" TEXT NOT NULL DEFAULT '',
    "profileUrl" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "locationEn" TEXT NOT NULL DEFAULT '',
    "locationAr" TEXT NOT NULL DEFAULT '',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "UserFavorite_userId_idx" ON "UserFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavorite_userId_entityType_entityId_key" ON "UserFavorite"("userId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_slug_key" ON "Gallery"("slug");

-- CreateIndex
CREATE INDEX "GalleryMedia_galleryId_idx" ON "GalleryMedia"("galleryId");

-- CreateIndex
CREATE INDEX "GalleryMedia_galleryId_sortOrder_idx" ON "GalleryMedia"("galleryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TestimonialCollection_slug_key" ON "TestimonialCollection"("slug");

-- CreateIndex
CREATE INDEX "TestimonialCollectionItem_collectionId_idx" ON "TestimonialCollectionItem"("collectionId");

-- CreateIndex
CREATE INDEX "TestimonialCollectionItem_collectionId_sortOrder_idx" ON "TestimonialCollectionItem"("collectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_contentItemId_idx" ON "Inquiry"("contentItemId");

-- CreateIndex
CREATE INDEX "Inquiry_userId_idx" ON "Inquiry"("userId");

-- CreateIndex
CREATE INDEX "Booking_contentItemId_idx" ON "Booking"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "FaqSet_slug_key" ON "FaqSet"("slug");

-- CreateIndex
CREATE INDEX "FaqItem_faqSetId_idx" ON "FaqItem"("faqSetId");

-- CreateIndex
CREATE INDEX "FaqItem_faqSetId_sortOrder_idx" ON "FaqItem"("faqSetId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SeoSettings_pageKey_key" ON "SeoSettings"("pageKey");

-- CreateIndex
CREATE INDEX "JsonStore_namespace_idx" ON "JsonStore"("namespace");

-- CreateIndex
CREATE UNIQUE INDEX "JsonStore_namespace_key_key" ON "JsonStore"("namespace", "key");

-- CreateIndex
CREATE INDEX "MediaFolder_parentId_idx" ON "MediaFolder"("parentId");

-- CreateIndex
CREATE INDEX "MediaAsset_folderId_idx" ON "MediaAsset"("folderId");

-- CreateIndex
CREATE INDEX "MediaAsset_mediaType_idx" ON "MediaAsset"("mediaType");

-- CreateIndex
CREATE INDEX "MediaUsage_mediaId_idx" ON "MediaUsage"("mediaId");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_idx" ON "MediaUsage"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_slug_key" ON "CmsPage"("slug");

-- CreateIndex
CREATE INDEX "CmsPage_status_idx" ON "CmsPage"("status");

-- CreateIndex
CREATE INDEX "CmsPage_slug_status_idx" ON "CmsPage"("slug", "status");

-- CreateIndex
CREATE INDEX "CmsPageRevision_pageId_idx" ON "CmsPageRevision"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "PostCategory_slug_key" ON "PostCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PostTag_slug_key" ON "PostTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PostAuthor_userId_key" ON "PostAuthor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "Post_slug_status_idx" ON "Post"("slug", "status");

-- CreateIndex
CREATE INDEX "SearchDocument_locale_idx" ON "SearchDocument"("locale");

-- CreateIndex
CREATE INDEX "SearchDocument_locale_entityType_idx" ON "SearchDocument"("locale", "entityType");

-- CreateIndex
CREATE INDEX "SearchDocument_title_idx" ON "SearchDocument"("title");

-- CreateIndex
CREATE UNIQUE INDEX "SearchDocument_entityType_entityId_locale_key" ON "SearchDocument"("entityType", "entityId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMeta_pageKey_key" ON "SeoMeta"("pageKey");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMeta_cmsPageId_key" ON "SeoMeta"("cmsPageId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMeta_postId_key" ON "SeoMeta"("postId");

-- CreateIndex
CREATE INDEX "SeoMeta_entityType_entityId_idx" ON "SeoMeta"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoRedirect_fromPath_key" ON "SeoRedirect"("fromPath");

-- CreateIndex
CREATE UNIQUE INDEX "Custom404_locale_key" ON "Custom404"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "LocaleConfig_code_key" ON "LocaleConfig"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LocaleConfig_urlPrefix_key" ON "LocaleConfig"("urlPrefix");

-- CreateIndex
CREATE INDEX "LocaleConfig_isEnabled_sortOrder_idx" ON "LocaleConfig"("isEnabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ContentType_slug_key" ON "ContentType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentCollection_slug_key" ON "ContentCollection"("slug");

-- CreateIndex
CREATE INDEX "ContentCollection_contentTypeId_idx" ON "ContentCollection"("contentTypeId");

-- CreateIndex
CREATE INDEX "ContentItem_contentTypeId_status_isFeatured_idx" ON "ContentItem"("contentTypeId", "status", "isFeatured");

-- CreateIndex
CREATE INDEX "ContentItem_collectionId_idx" ON "ContentItem"("collectionId");

-- CreateIndex
CREATE INDEX "ContentItem_deletedAt_idx" ON "ContentItem"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_contentTypeId_slug_key" ON "ContentItem"("contentTypeId", "slug");

-- CreateIndex
CREATE INDEX "ContentCollectionItem_collectionId_sortOrder_idx" ON "ContentCollectionItem"("collectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ContentCollectionItem_collectionId_itemId_key" ON "ContentCollectionItem"("collectionId", "itemId");

-- CreateIndex
CREATE INDEX "ContentItemMedia_itemId_sortOrder_idx" ON "ContentItemMedia"("itemId", "sortOrder");

-- CreateIndex
CREATE INDEX "EntityTranslation_entityType_entityId_idx" ON "EntityTranslation"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "EntityTranslation_languageCode_entityType_idx" ON "EntityTranslation"("languageCode", "entityType");

-- CreateIndex
CREATE INDEX "EntityTranslation_entityType_languageCode_status_idx" ON "EntityTranslation"("entityType", "languageCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EntityTranslation_entityType_entityId_field_languageCode_key" ON "EntityTranslation"("entityType", "entityId", "field", "languageCode");

-- CreateIndex
CREATE INDEX "EntityTranslationVersion_translationId_createdAt_idx" ON "EntityTranslationVersion"("translationId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalizedSlug_entityType_slug_idx" ON "LocalizedSlug"("entityType", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "LocalizedSlug_entityType_entityId_languageCode_key" ON "LocalizedSlug"("entityType", "entityId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "LocalizedSlug_entityType_slug_languageCode_key" ON "LocalizedSlug"("entityType", "slug", "languageCode");

-- CreateIndex
CREATE INDEX "TranslationJob_status_createdAt_idx" ON "TranslationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UiMessage_languageCode_namespace_idx" ON "UiMessage"("languageCode", "namespace");

-- CreateIndex
CREATE UNIQUE INDEX "UiMessage_namespace_key_languageCode_key" ON "UiMessage"("namespace", "key", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "FormTemplate_slug_key" ON "FormTemplate"("slug");

-- CreateIndex
CREATE INDEX "FormTemplate_category_isPublished_idx" ON "FormTemplate"("category", "isPublished");

-- CreateIndex
CREATE INDEX "FormSubmission_templateId_createdAt_idx" ON "FormSubmission"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_status_createdAt_idx" ON "FormSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_blockType_idx" ON "FormSubmission"("blockType");

-- CreateIndex
CREATE UNIQUE INDEX "FormDraft_token_key" ON "FormDraft"("token");

-- CreateIndex
CREATE INDEX "FormDraft_templateId_idx" ON "FormDraft"("templateId");

-- CreateIndex
CREATE INDEX "FormDraft_expiresAt_idx" ON "FormDraft"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_segment_idx" ON "NewsletterSubscriber"("status", "segment");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_segment_key" ON "NewsletterSubscriber"("email", "segment");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadGateUnlock_token_key" ON "DownloadGateUnlock"("token");

-- CreateIndex
CREATE INDEX "DownloadGateUnlock_mediaAssetId_idx" ON "DownloadGateUnlock"("mediaAssetId");

-- CreateIndex
CREATE INDEX "DownloadGateUnlock_expiresAt_idx" ON "DownloadGateUnlock"("expiresAt");

-- CreateIndex
CREATE INDEX "FormWebhookDelivery_submissionId_idx" ON "FormWebhookDelivery"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlanSet_slug_key" ON "PricingPlanSet"("slug");

-- CreateIndex
CREATE INDEX "PricingPlan_planSetId_sortOrder_idx" ON "PricingPlan"("planSetId", "sortOrder");

-- CreateIndex
CREATE INDEX "PricingPlanFeature_planSetId_sortOrder_idx" ON "PricingPlanFeature"("planSetId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseSet_slug_key" ON "ReleaseSet"("slug");

-- CreateIndex
CREATE INDEX "Release_releaseSetId_sortOrder_idx" ON "Release"("releaseSetId", "sortOrder");

-- CreateIndex
CREATE INDEX "ReleaseEntry_releaseId_category_sortOrder_idx" ON "ReleaseEntry"("releaseId", "category", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PricingCalculator_slug_key" ON "PricingCalculator"("slug");

-- CreateIndex
CREATE INDEX "PricingCalculatorField_calculatorId_sortOrder_idx" ON "PricingCalculatorField"("calculatorId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PricingCalculatorField_calculatorId_key_key" ON "PricingCalculatorField"("calculatorId", "key");

-- CreateIndex
CREATE INDEX "PricingCalculatorRule_calculatorId_sortOrder_idx" ON "PricingCalculatorRule"("calculatorId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_slug_key" ON "KnowledgeBase"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeCategory_knowledgeBaseId_parentId_sortOrder_idx" ON "KnowledgeCategory"("knowledgeBaseId", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeCategory_knowledgeBaseId_slug_key" ON "KnowledgeCategory"("knowledgeBaseId", "slug");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_knowledgeBaseId_categoryId_sortOrder_idx" ON "KnowledgeArticle"("knowledgeBaseId", "categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticle_knowledgeBaseId_slug_key" ON "KnowledgeArticle"("knowledgeBaseId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "DocPortal_slug_key" ON "DocPortal"("slug");

-- CreateIndex
CREATE INDEX "DocVersion_portalId_sortOrder_idx" ON "DocVersion"("portalId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DocVersion_portalId_slug_key" ON "DocVersion"("portalId", "slug");

-- CreateIndex
CREATE INDEX "DocSection_portalId_versionId_parentId_sortOrder_idx" ON "DocSection"("portalId", "versionId", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DocSection_portalId_slug_key" ON "DocSection"("portalId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "StatusBoard_slug_key" ON "StatusBoard"("slug");

-- CreateIndex
CREATE INDEX "StatusService_boardId_sortOrder_idx" ON "StatusService"("boardId", "sortOrder");

-- CreateIndex
CREATE INDEX "StatusIncident_boardId_sortOrder_idx" ON "StatusIncident"("boardId", "sortOrder");

-- CreateIndex
CREATE INDEX "StatusMaintenance_boardId_startsAt_idx" ON "StatusMaintenance"("boardId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamDirectory_slug_key" ON "TeamDirectory"("slug");

-- CreateIndex
CREATE INDEX "TeamDepartment_directoryId_sortOrder_idx" ON "TeamDepartment"("directoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "TeamMember_directoryId_departmentId_sortOrder_idx" ON "TeamMember"("directoryId", "departmentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProgram_slug_key" ON "PartnerProgram"("slug");

-- CreateIndex
CREATE INDEX "PartnerCategory_programId_sortOrder_idx" ON "PartnerCategory"("programId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCategory_programId_slug_key" ON "PartnerCategory"("programId", "slug");

-- CreateIndex
CREATE INDEX "Partner_programId_categoryId_sortOrder_idx" ON "Partner"("programId", "categoryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryMedia" ADD CONSTRAINT "GalleryMedia_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialCollectionItem" ADD CONSTRAINT "TestimonialCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "TestimonialCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialCollectionItem" ADD CONSTRAINT "TestimonialCollectionItem_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqItem" ADD CONSTRAINT "FaqItem_faqSetId_fkey" FOREIGN KEY ("faqSetId") REFERENCES "FaqSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPageRevision" ADD CONSTRAINT "CmsPageRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPageRevision" ADD CONSTRAINT "CmsPageRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAuthor" ADD CONSTRAINT "PostAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "PostAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCategoryOnPost" ADD CONSTRAINT "PostCategoryOnPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCategoryOnPost" ADD CONSTRAINT "PostCategoryOnPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PostCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTagOnPost" ADD CONSTRAINT "PostTagOnPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTagOnPost" ADD CONSTRAINT "PostTagOnPost_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PostTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMeta" ADD CONSTRAINT "SeoMeta_cmsPageId_fkey" FOREIGN KEY ("cmsPageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMeta" ADD CONSTRAINT "SeoMeta_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCollection" ADD CONSTRAINT "ContentCollection_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "ContentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "ContentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ContentCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCollectionItem" ADD CONSTRAINT "ContentCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ContentCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCollectionItem" ADD CONSTRAINT "ContentCollectionItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItemMedia" ADD CONSTRAINT "ContentItemMedia_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityTranslationVersion" ADD CONSTRAINT "EntityTranslationVersion_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "EntityTranslation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormDraft" ADD CONSTRAINT "FormDraft_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadGateUnlock" ADD CONSTRAINT "DownloadGateUnlock_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormWebhookDelivery" ADD CONSTRAINT "FormWebhookDelivery_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_planSetId_fkey" FOREIGN KEY ("planSetId") REFERENCES "PricingPlanSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingPlanFeature" ADD CONSTRAINT "PricingPlanFeature_planSetId_fkey" FOREIGN KEY ("planSetId") REFERENCES "PricingPlanSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_releaseSetId_fkey" FOREIGN KEY ("releaseSetId") REFERENCES "ReleaseSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseEntry" ADD CONSTRAINT "ReleaseEntry_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculatorField" ADD CONSTRAINT "PricingCalculatorField_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "PricingCalculator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculatorRule" ADD CONSTRAINT "PricingCalculatorRule_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "PricingCalculator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeCategory" ADD CONSTRAINT "KnowledgeCategory_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KnowledgeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocVersion" ADD CONSTRAINT "DocVersion_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "DocPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocSection" ADD CONSTRAINT "DocSection_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "DocPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocSection" ADD CONSTRAINT "DocSection_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DocVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusService" ADD CONSTRAINT "StatusService_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "StatusBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusIncident" ADD CONSTRAINT "StatusIncident_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "StatusBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusMaintenance" ADD CONSTRAINT "StatusMaintenance_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "StatusBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamDepartment" ADD CONSTRAINT "TeamDepartment_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "TeamDirectory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "TeamDirectory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "TeamDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCategory" ADD CONSTRAINT "PartnerCategory_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PartnerProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PartnerProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PartnerCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
