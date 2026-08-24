-- AZURA one-file import: demo-safar
-- Supabase SQL Editor: run this file on an empty database

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

-- AZURA seed data: demo-safar
-- Import AFTER 01-schema.sql (Supabase SQL Editor)

SET session_replication_role = 'replica';

-- CmsPage (17 rows)
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmpv9628a001shf2w4z2l68c6', 'home', 'Home', 'الرئيسية', '', '', 'home', 'PUBLISHED', '[{"id":"hero-34","type":"hero","props":{"layout":"fullBleed","badgeAr":"وكالة سفر مرخصة","badgeEn":"Licensed Travel Agency","ctaHref":"/contact","titleAr":"شريكك الموثوق لتجارب سفر لا تُنسى","titleEn":"Your Trusted Partner for Memorable Travel Experiences","imageUrl":"/demo/safar/hero.svg","minHeight":"70vh","ctaLabelAr":"خطط لرحلتك","ctaLabelEn":"Plan Your Trip","subtitleAr":"سافر • استكشف • اكتشف","subtitleEn":"Travel • Explore • Discover","mediaAssetId":"mock-media-hero","backgroundType":"image","overlayOpacity":60,"secondaryCtaHref":"/packages","secondaryCtaLabelAr":"عرض الباقات","secondaryCtaLabelEn":"View Packages"},"version":"2.0"},{"id":"featureGrid-35","type":"featureGrid","props":{"items":[{"id":"feat-1","href":"/services","icon":"fa-map","titleAr":"تخطيط السفر","titleEn":"Travel Planning","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"برامج مخصصة حسب تفضيلاتك.","descriptionEn":"Personalized itineraries tailored to your preferences."},{"id":"feat-2","href":"/packages","icon":"fa-suitcase","titleAr":"باقات السفر","titleEn":"Tour Packages","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"باقات منتقاة لكل نوع من المسافرين.","descriptionEn":"Curated packages for every type of traveler."},{"id":"feat-3","href":"/services","icon":"fa-plane","titleAr":"حجز الطيران","titleEn":"Flight Booking","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"حجوزات طيران محلية ودولية.","descriptionEn":"Domestic and international flight reservations."},{"id":"feat-4","href":"/packages","icon":"fa-compass","titleAr":"تجارب سياحية","titleEn":"Tourism Experiences","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"جولات مرشدة وانغماس ثقافي.","descriptionEn":"Guided tours and cultural immersion."}],"columns":3,"titleAr":"خدماتنا","titleEn":"Our Services","subtitleAr":"حلول سفر متكاملة تحت سقف واحد","subtitleEn":"Complete travel solutions under one roof","cardVariant":"iconTop","showCategories":false},"version":"2.0"},{"id":"catalog-36","type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات السفر المميزة","titleEn":"Featured Tour Packages","manualIds":[],"subtitleAr":"تجارب منتقاة لرحلات لا تُنسى","subtitleEn":"Handpicked experiences for unforgettable journeys","serviceType":"","viewAllHref":"/packages","categorySlug":"","featuredOnly":true,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"version":"2.0"},{"id":"statsCounter-37","type":"statsCounter","props":{"items":[{"id":"stat-1","icon":"","value":15,"prefix":"","suffix":"+","labelAr":"سنوات الخبرة","labelEn":"Years of Expertise","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""},{"id":"stat-2","icon":"","value":50,"prefix":"","suffix":"+","labelAr":"وجهة","labelEn":"Destinations","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""},{"id":"stat-3","icon":"","value":5000,"prefix":"","suffix":"+","labelAr":"مسافر سعيد","labelEn":"Happy Travelers","chartData":[],"chartType":"none","descriptionAr":"","descriptionEn":""}],"layout":"grid","titleAr":"لماذا يختارنا المسافرون","titleEn":"Why Travelers Choose Us","subtitleAr":"","subtitleEn":"","animateOnView":true},"version":"2.0"},{"id":"testimonials-38","type":"testimonials","props":{"limit":6,"source":"collection","columns":3,"titleAr":"آراء المسافرين","titleEn":"Traveler Reviews","autoplay":false,"layoutMode":"grid","subtitleAr":"قصص حقيقية من عملائنا الكرام","subtitleEn":"Real stories from our valued clients","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"safar-travelers"},"version":"2.0"},{"id":"cta-39","type":"cta","props":{"href":"/contact","size":"default","layout":"centered","titleAr":"مستعد لمغامرتك القادمة؟","titleEn":"Ready for Your Next Adventure?","buttonAr":"خطط لرحلتك","buttonEn":"Plan Your Trip","subtitleAr":"دع متخصصينا يصممون الرحلة المثالية لك.","subtitleEn":"Let our travel specialists create the perfect journey for you.","secondaryHref":"","backgroundType":"gradient","secondaryButtonAr":"","secondaryButtonEn":""},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-01 13:36:59.338'::timestamp(3), '2026-06-05 11:01:44.221'::timestamp(3), '{"siteEffects":{"background":"inherit"},"animationsEnabled":true}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmpv9628c001thf2w3e8te0ly', 'about', 'About Us', 'من نحن', '', '', 'about', 'PUBLISHED', '[{"id":"hero-40","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"عن سفر المدينة","titleEn":"About Safar Al-Madina","imageUrl":"","minHeight":"70vh","ctaLabelAr":"اتصل بنا","ctaLabelEn":"Contact Us","subtitleAr":"خلق ذكريات لا تُنسى عبر سفر مخطط بعناية","subtitleEn":"Creating unforgettable memories through carefully planned travel","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"advancedRichText-41","type":"advancedRichText","props":{"prose":true,"htmlAr":"<p>في وكالة سفر الصفار المدينة، نؤمن أن السفر أكثر من الوصول إلى وجهة—إنه خلق ذكريات لا تُنسى واكتشاف ثقافات جديدة.</p><h3>رؤيتنا</h3><p>أن نصبح من أكثر شركات السفر ثقة في المنطقة.</p><h3>مهمتنا</h3><p>تبسيط تخطيط السفر وتقديم خدمات سياحية موثوقة وعالية الجودة.</p>","htmlEn":"<p>At Safar Al-Madina Travel Agency, we believe that travel is more than reaching a destination—it is about creating unforgettable memories, discovering new cultures, and experiencing the world in meaningful ways.</p><h3>Our Vision</h3><p>To become one of the region''s most trusted travel and tourism companies by delivering exceptional travel experiences, innovative solutions, and outstanding customer service.</p><h3>Our Mission</h3><p>To simplify travel planning and provide reliable, high-quality tourism services that help travelers discover new destinations, create unforgettable memories, and travel with confidence.</p>","maxWidth":"reading","contentAr":"","contentEn":""},"version":"2.0"},{"id":"benefitsGrid-42","type":"benefitsGrid","props":{"items":[{"id":"benefit-1","href":"","icon":"fa-handshake","titleAr":"الثقة","titleEn":"Trust","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"بناء علاقات دائمة عبر الصدق والخدمة الموثوقة.","descriptionEn":"Building lasting relationships through honesty and dependable service."},{"id":"benefit-2","href":"","icon":"fa-star","titleAr":"التميز","titleEn":"Excellence","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"الحفاظ على أعلى المعايير في كل جانب من السفر.","descriptionEn":"Maintaining the highest standards across every aspect of travel."},{"id":"benefit-3","href":"","icon":"fa-heart","titleAr":"الالتزام بالعميل","titleEn":"Customer Commitment","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"وضع احتياجات العملاء ورضاهم في المركز.","descriptionEn":"Putting customer needs and satisfaction at the center."},{"id":"benefit-4","href":"","icon":"fa-lightbulb","titleAr":"الابتكار","titleEn":"Innovation","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"تحسين الخدمات باستمرار للمسافرين العصريين.","descriptionEn":"Continuously improving services for modern travelers."},{"id":"benefit-5","href":"","icon":"fa-globe","titleAr":"شغف السفر","titleEn":"Passion for Travel","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"مشاركة الحماس للاستكشاف والاكتشاف.","descriptionEn":"Sharing enthusiasm for exploration and discovery."}],"layout":"cards","titleAr":"قيمنا الأساسية","titleEn":"Core Values","emphasis":"outcome","subtitleAr":"","subtitleEn":""},"version":"2.0"},{"id":"richText-43","type":"richText","props":{"htmlAr":"<h3>فلسفة العلامة</h3><p><strong>دافئ ومرحب</strong> — كل تفاعل يجعل المسافر يشعر بالتقدير.</p><p><strong>تجارب أصيلة</strong> — سفر حقيقي يخلق ذكريات دائمة.</p><p><strong>تميز في الخدمة</strong> — الاحترافية والاهتمام بالتفاصيل يوجهان كل ما نفعله.</p>","htmlEn":"<h3>Brand Philosophy</h3><p><strong>Warm &amp; Welcoming</strong> — Every interaction makes travelers feel valued and supported.</p><p><strong>Authentic Experiences</strong> — Genuine travel that creates lasting memories.</p><p><strong>Excellence in Service</strong> — Professionalism and attention to detail guide everything we do.</p>"},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-01 13:36:59.340'::timestamp(3), '2026-06-05 11:01:44.225'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmpv9628d001uhf2wj35o8c1o', 'contact', 'Contact', 'اتصل بنا', '', '', 'contact', 'PUBLISHED', '[{"id":"hero-60","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"اتصل بنا","titleEn":"Contact Us","imageUrl":"","minHeight":"70vh","ctaLabelAr":"","ctaLabelEn":"","subtitleAr":"بوابتك لتجارب سفر استثنائية","subtitleEn":"Your gateway to exceptional travel experiences","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"inquiryForm-61","type":"inquiryForm","props":{"type":"CONTACT","titleAr":"خطط لرحلتك","titleEn":"Plan Your Journey"},"version":"2.0"},{"id":"richText-62","type":"richText","props":{"htmlAr":"<p><strong>وكالة سفر الصفار المدينة</strong></p><p>سافر • استكشف • اكتشف</p><p>📧 info@safaralmadina.com</p><p>📞 +971 50 123 4567</p><p><em>بوابتك لتجارب سفر استثنائية وخدمة موثوقة ووجهات لا تُنسى.</em></p>","htmlEn":"<p><strong>Safar Al-Madina Travel Agency</strong></p><p>Travel • Explore • Discover</p><p>📧 info@safaralmadina.com</p><p>📞 +971 50 123 4567</p><p><em>Your gateway to exceptional travel experiences, trusted service, and unforgettable destinations.</em></p>"},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-01 13:36:59.342'::timestamp(3), '2026-06-05 11:01:44.239'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmpv9628f001vhf2wywizdn0i', 'packages', 'Tour Packages', 'باقات السفر', '', '', 'packages', 'PUBLISHED', '[{"id":"hero-44","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"باقات السفر","titleEn":"Tour Packages","imageUrl":"","minHeight":"70vh","ctaLabelAr":"باقة مخصصة","ctaLabelEn":"Custom Package","subtitleAr":"باقات سفر منتقاة بعناية لكل نوع من الرحلات","subtitleEn":"Carefully curated travel packages for every type of journey","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"catalog-45","type":"catalog","props":{"city":"","limit":12,"source":"packages","titleAr":"جميع الباقات","titleEn":"All Packages","manualIds":[],"subtitleAr":"","subtitleEn":"","serviceType":"","viewAllHref":"/packages","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":12,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"version":"2.0"},{"id":"faq-46","type":"faq","props":{"limit":0,"titleAr":"أسئلة الباقات","titleEn":"Package FAQ","faqSetSlug":"packages"},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-01 13:36:59.343'::timestamp(3), '2026-06-05 11:01:44.229'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmpv9628i001xhf2wh2ban5s8', 'gallery', 'Gallery', 'المعرض', '', '', 'gallery', 'PUBLISHED', '[{"id":"hero-52","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"معرض الوجهات","titleEn":"Destinations Gallery","imageUrl":"","minHeight":"70vh","ctaLabelAr":"","ctaLabelEn":"","subtitleAr":"استكشف أروع الوجهات في العالم","subtitleEn":"Explore the world''s most inspiring destinations","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"masonryGallery-53","type":"masonryGallery","props":{"items":[],"limit":0,"source":"album","columns":3,"titleAr":"وجهاتنا","titleEn":"Our Destinations","lazyLoad":true,"subtitleAr":"من الرحلات الروحانية إلى العطلات الفاخرة","subtitleEn":"From spiritual journeys to luxury escapes","gallerySlug":"safar-destinations","enableFilter":false,"enableLightbox":true},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-01 13:36:59.347'::timestamp(3), '2026-06-05 11:01:44.234'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmpv9628k001yhf2wm8z0982c', 'testimonials', 'Testimonials', 'آراء العملاء', '', '', 'testimonials', 'PUBLISHED', '[{"id":"hero-54","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"آراء المسافرين","titleEn":"Traveler Testimonials","imageUrl":"","minHeight":"70vh","ctaLabelAr":"","ctaLabelEn":"","subtitleAr":"قصص من مسافرين وثقوا بسفر المدينة","subtitleEn":"Stories from travelers who trusted Safar Al-Madina","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"testimonials-55","type":"testimonials","props":{"limit":12,"source":"collection","columns":3,"titleAr":"ماذا يقول مسافرونا","titleEn":"What Our Travelers Say","autoplay":false,"layoutMode":"grid","subtitleAr":"","subtitleEn":"","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"safar-travelers"},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-01 13:36:59.348'::timestamp(3), '2026-06-05 11:01:44.235'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmpv9628l001zhf2wrg4nzifr', 'hotels-transport', 'Hotels & Transport', 'الفنادق والنقل', '', '', 'hotels-transport', 'PUBLISHED', '[{"id":"hero-50","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"الفنادق والنقل","titleEn":"Hotels & Transport","imageUrl":"","minHeight":"70vh","ctaLabelAr":"","ctaLabelEn":"","subtitleAr":"إقامة فاخرة وترتيبات نقل موثوقة","subtitleEn":"Premium accommodations and reliable transport arrangements","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"catalog-51","type":"catalog","props":{"city":"","limit":6,"source":"hotels","titleAr":"فنادق الشركاء","titleEn":"Partner Hotels","manualIds":[],"subtitleAr":"","subtitleEn":"","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-01 13:36:59.350'::timestamp(3), '2026-06-05 11:01:44.232'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq05v0tp0007hflkcksu8qmq', 'products', '', '', '', '', 'products', 'DRAFT', '[]'::jsonb, NULL, NULL, '2026-06-05 00:03:16.334'::timestamp(3), '2026-06-05 11:01:44.242'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq05v0u30008hflkq684a21o', 'collections', '', '', '', '', 'collections', 'DRAFT', '[]'::jsonb, NULL, NULL, '2026-06-05 00:03:16.348'::timestamp(3), '2026-06-05 11:01:44.244'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq05v0u80009hflksefq0grx', 'services', 'Services', 'الخدمات', '', '', 'services', 'PUBLISHED', '[{"id":"hero-47","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"خدمات السفر","titleEn":"Our Travel Services","imageUrl":"","minHeight":"70vh","ctaLabelAr":"","ctaLabelEn":"","subtitleAr":"إدارة سفر متكاملة من التخطيط إلى الدعم أثناء السفر","subtitleEn":"End-to-end travel management from planning to support during travel","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"featureGrid-48","type":"featureGrid","props":{"items":[{"id":"feat-1","href":"/contact","icon":"fa-map-marked-alt","titleAr":"تخطيط واستشارة السفر","titleEn":"Travel Planning & Consultation","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"تطوير برامج مخصصة وتوصيات وجهات وإرشاد تأشيرات.","descriptionEn":"Personalized itinerary development, destination recommendations, and visa guidance."},{"id":"feat-2","href":"/contact","icon":"fa-plane-departure","titleAr":"حجز الطيران","titleEn":"Flight & Ticket Booking","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"رحلات دولية ومحلية وتخطيط متعدد المدن وحجوزات جماعية.","descriptionEn":"International and domestic flights, multi-city planning, and group reservations."},{"id":"feat-3","href":"/packages","icon":"fa-camera","titleAr":"تجارب سياحية","titleEn":"Tourism Experiences","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"جولات مرشدة وتجارب ثقافية وأنشطة مغامرة وسياحة فاخرة.","descriptionEn":"Guided tours, cultural experiences, adventure activities, and luxury tourism."},{"id":"feat-4","href":"/contact","icon":"fa-briefcase","titleAr":"سفر الأعمال","titleEn":"Corporate Travel","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"حجوزات سفر أعمال وترتيبات جماعية وإدارة الجداول.","descriptionEn":"Business travel bookings, group arrangements, and schedule management."}],"columns":2,"titleAr":"ما نقدمه","titleEn":"What We Offer","subtitleAr":"","subtitleEn":"","cardVariant":"iconTop","showCategories":false},"version":"2.0"},{"id":"catalog-49","type":"catalog","props":{"city":"","limit":6,"source":"services","titleAr":"عروض الخدمات","titleEn":"Service Offerings","manualIds":[],"subtitleAr":"","subtitleEn":"","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-05 00:03:16.352'::timestamp(3), '2026-06-05 11:01:44.231'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq05v0ub000ahflkd7ca8i8k', 'compare', '', '', '', '', 'compare', 'DRAFT', '[]'::jsonb, NULL, NULL, '2026-06-05 00:03:16.355'::timestamp(3), '2026-06-05 11:01:44.245'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq05v0uf000bhflk8am0vhv5', 'favorites', '', '', '', '', 'favorites', 'DRAFT', '[]'::jsonb, NULL, NULL, '2026-06-05 00:03:16.360'::timestamp(3), '2026-06-05 11:01:44.246'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq05v0uk000chflk5roi5z5m', 'account', '', '', '', '', 'account', 'DRAFT', '[]'::jsonb, NULL, NULL, '2026-06-05 00:03:16.364'::timestamp(3), '2026-06-05 11:01:44.247'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq0j4wac0027hfd4sahais3b', 'smart-home', '', '', '', '', 'landing', 'DRAFT', '[]'::jsonb, NULL, NULL, '2026-06-05 06:14:52.020'::timestamp(3), '2026-06-05 11:01:44.248'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq0j4waj0028hfd4muyeccf4', 'security-solutions', '', '', '', '', 'landing', 'DRAFT', '[]'::jsonb, NULL, NULL, '2026-06-05 06:14:52.027'::timestamp(3), '2026-06-05 11:01:44.249'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq0j4was0029hfd4p0t4ll4q', 'enterprise-wireless', '', '', '', '', 'landing', 'DRAFT', '[]'::jsonb, NULL, NULL, '2026-06-05 06:14:52.036'::timestamp(3), '2026-06-05 11:01:44.250'::timestamp(3), '{}'::jsonb);
INSERT INTO "CmsPage" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "templateKey", "status", "blocks", "publishedAt", "scheduledAt", "createdAt", "updatedAt", "visualSettings") VALUES ('cmq0j593r002rhffcy04slljf', 'why-choose-us', 'Why Choose Us', 'لماذا تختارنا', '', '', 'landing', 'PUBLISHED', '[{"id":"hero-56","type":"hero","props":{"layout":"centered","badgeAr":"","badgeEn":"","ctaHref":"/contact","titleAr":"لماذا تختار سفر المدينة؟","titleEn":"Why Choose Safar Al-Madina?","imageUrl":"","minHeight":"70vh","ctaLabelAr":"ابدأ التخطيط","ctaLabelEn":"Start Planning","subtitleAr":"لا نحجز رحلات فحسب—نخلق رحلات تستحق التذكر","subtitleEn":"We don''t simply book trips—we create journeys worth remembering","mediaAssetId":"","backgroundType":"gradient","overlayOpacity":60,"secondaryCtaHref":"","secondaryCtaLabelAr":"","secondaryCtaLabelEn":""},"version":"2.0"},{"id":"benefitsGrid-57","type":"benefitsGrid","props":{"items":[{"id":"benefit-1","href":"","icon":"fa-graduation-cap","titleAr":"خبرة احترافية","titleEn":"Professional Expertise","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"معرفة واسعة بالوجهات العالمية ولوجستيات السفر.","descriptionEn":"Extensive knowledge of global destinations and travel logistics."},{"id":"benefit-2","href":"","icon":"fa-user-check","titleAr":"خدمة شخصية","titleEn":"Personalized Service","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"كل مسافر فريد — نخصص التجارب لتوقعاتك.","descriptionEn":"Every traveler is unique — we tailor experiences to your expectations."},{"id":"benefit-3","href":"","icon":"fa-shield-alt","titleAr":"شريك موثوق","titleEn":"Trusted Partner","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"شفافية وموثوقية وجودة خدمة متسقة.","descriptionEn":"Transparency, reliability, and consistent service quality."},{"id":"benefit-4","href":"","icon":"fa-check-circle","titleAr":"حلول متكاملة","titleEn":"Complete Solutions","imageUrl":"","metricAr":"","metricEn":"","categoryAr":"","categoryEn":"","linkLabelAr":"","linkLabelEn":"","mediaAssetId":"","descriptionAr":"من التخطيط إلى الدعم أثناء السفر — كل شيء تحت سقف واحد.","descriptionEn":"From planning to support during travel — all under one roof."}],"layout":"twoColumn","titleAr":"مزايانا","titleEn":"Our Advantages","emphasis":"outcome","subtitleAr":"","subtitleEn":""},"version":"2.0"},{"id":"trustBadges-58","type":"trustBadges","props":{"items":[{"id":"badge-1","href":"","icon":"fa-certificate","labelAr":"وكالة مرخصة","labelEn":"Licensed Agency","imageUrl":"","mediaAssetId":"","descriptionAr":"","descriptionEn":""},{"id":"badge-2","href":"","icon":"fa-route","labelAr":"برامج مخصصة","labelEn":"Personalized Itineraries","imageUrl":"","mediaAssetId":"","descriptionAr":"","descriptionEn":""},{"id":"badge-3","href":"","icon":"fa-headset","labelAr":"دعم 24/7","labelEn":"24/7 Support","imageUrl":"","mediaAssetId":"","descriptionAr":"","descriptionEn":""},{"id":"badge-4","href":"","icon":"fa-tag","labelAr":"أفضل قيمة","labelEn":"Best Value","imageUrl":"","mediaAssetId":"","descriptionAr":"","descriptionEn":""}],"layout":"grid","titleAr":"التزامنا","titleEn":"Our Commitment","subtitleAr":"","subtitleEn":"","registrationNo":""},"version":"2.0"},{"id":"faq-59","type":"faq","props":{"limit":0,"titleAr":"أسئلة الحجز","titleEn":"Booking Questions","faqSetSlug":"booking"},"version":"2.0"}]'::jsonb, '2026-06-05 11:01:44.205'::timestamp(3), NULL, '2026-06-05 06:15:08.631'::timestamp(3), '2026-06-05 11:01:44.237'::timestamp(3), '{}'::jsonb);

-- CompanyInfo (1 rows)
INSERT INTO "CompanyInfo" ("id", "name", "taglineEn", "taglineAr", "storyEn", "storyAr", "missionEn", "missionAr", "visionEn", "visionAr", "valuesEn", "valuesAr", "registrationNo", "licenseInfo", "addressEn", "addressAr", "phone", "whatsapp", "email", "officeHoursEn", "officeHoursAr", "socialLinks", "trustBadges", "updatedAt") VALUES ('default', 'Safar Al-Madina Travel Agency', 'Your Trusted Partner for Memorable Travel Experiences', 'شريكك الموثوق لتجارب سفر لا تُنسى', 'Safar Al-Madina Travel Agency is a professional travel and tourism company dedicated to creating exceptional travel experiences for individuals, families, groups, and corporate travelers. Combining industry expertise with personalized service, we help our clients discover the world''s most inspiring destinations with confidence, comfort, and peace of mind.', 'وكالة سفر الصفار المدينة هي شركة سفر وسياحة محترفة مكرسة لخلق تجارب سفر استثنائية للأفراد والعائلات والمجموعات ومسافري الأعمال. بخبرة صناعية وخدمة شخصية، نساعد عملاءنا على اكتشاف أروع الوجهات بثقة وراحة وطمأنينة.', 'Simplify travel planning and provide reliable, high-quality tourism services that help travelers discover new destinations, create unforgettable memories, and travel with confidence.', 'تبسيط تخطيط السفر وتقديم خدمات سياحية موثوقة وعالية الجودة تساعد المسافرين على اكتشاف وجهات جديدة وخلق ذكريات لا تُنسى والسفر بثقة.', 'To become one of the region''s most trusted travel and tourism companies by delivering exceptional travel experiences and outstanding customer service.', 'أن نصبح من أكثر شركات السفر والسياحة ثقة في المنطقة من خلال تقديم تجارب سفر استثنائية وخدمة عملاء متميزة.', '["Trust","Excellence","Customer Commitment","Innovation","Passion for Travel"]'::jsonb, '["الثقة","التميز","الالتزام بالعميل","الابتكار","شغف السفر"]'::jsonb, 'SAFAR-2024-UAE', 'Licensed travel agency — UAE', 'Dubai, United Arab Emirates', 'دبي، الإمارات العربية المتحدة', '+971 50 123 4567', '+971501234567', 'info@safaralmadina.com', 'Sun–Sat: 9:00 AM – 8:00 PM', 'الأحد–السبت: 9:00 ص – 8:00 م', '{"twitter":"https://twitter.com","facebook":"https://facebook.com","instagram":"https://instagram.com"}'::jsonb, '[{"icon":"fa-certificate","labelAr":"وكالة مرخصة","labelEn":"Licensed Agency"},{"icon":"fa-user","labelAr":"خدمة شخصية","labelEn":"Personalized Service"},{"icon":"fa-suitcase","labelAr":"حلول متكاملة","labelEn":"Complete Solutions"},{"icon":"fa-handshake","labelAr":"شريك موثوق","labelEn":"Trusted Partner"}]'::jsonb, '2026-06-05 11:01:44.151'::timestamp(3));

-- ContentItem (14 rows)
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtaf0047hf64u70d4w17', 'cmpv9625p0001hf2w01fa4hzm', NULL, 'family-holiday-dubai', 'Family Holiday — Dubai', 'عطلة عائلية — دبي', '5-day family adventure with theme parks and desert safari.', 'مغامرة عائلية 5 أيام مع مدن الملاهي وسفاري الصحراء.', 'Includes flights, 4-star hotel, theme park tickets, and guided desert safari.', 'يشمل الطيران وفندق 4 نجوم وتذاكر مدن الملاهي وسفاري صحراوي مرشد.', '{"price":2499,"currency":"USD","duration":5,"features":["Theme parks","Desert safari","City tour"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', true, true, 0, '2026-06-05 11:01:44.184'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.200'::timestamp(3), '2026-06-05 11:01:44.200'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtai004ahf64expklimi', 'cmpv9625p0001hf2w01fa4hzm', NULL, 'honeymoon-maldives', 'Honeymoon — Maldives', 'شهر العسل — المالديف', '7 nights in an overwater villa with all-inclusive dining.', '7 ليالٍ في فيلا فوق الماء مع إقامة شاملة.', 'Romantic getaway with spa treatments, sunset cruise, and private dining.', 'عطلة رومانسية مع علاجات سبا ورحلة غروب وعشاء خاص.', '{"price":4999,"currency":"USD","duration":7,"features":["Overwater villa","All-inclusive","Spa"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', true, true, 1, '2026-06-05 11:01:44.187'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.202'::timestamp(3), '2026-06-05 11:01:44.202'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtak004dhf64nxpiprn9', 'cmpv9625p0001hf2w01fa4hzm', NULL, 'umrah-package', 'Umrah Package', 'باقة العمرة', '10-day spiritual journey with premium hotels in Makkah and Madinah.', 'رحلة روحانية 10 أيام مع فنادق مميزة في مكة والمدينة.', 'Complete Umrah package with visa, flights, hotels, transport, and guided ziyarat.', 'باقة عمرة كاملة مع تأشيرة وطيران وفنادق ونقل وزيارات مرشدة.', '{"price":1899,"currency":"USD","duration":10,"features":["Visa","5-star hotels","Guided ziyarat"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', true, true, 2, '2026-06-05 11:01:44.189'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.204'::timestamp(3), '2026-06-05 11:01:44.204'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtam004ghf64a5l1fspj', 'cmpv9625p0001hf2w01fa4hzm', NULL, 'turkey-adventure', 'Turkey Adventure Tour', 'جولة مغامرات تركيا', '8-day adventure through Istanbul, Cappadocia, and Pamukkale.', 'مغامرة 8 أيام عبر إسطنبول وكابادوكيا وباموكالي.', 'Hot air balloon, historical sites, and authentic Turkish cuisine experiences.', 'منطاد هوائي ومواقع تاريخية وتجارب مطبخ تركي أصيل.', '{"price":1599,"currency":"USD","duration":8,"features":["Hot air balloon","Historical sites","Local cuisine"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 3, '2026-06-05 11:01:44.191'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.206'::timestamp(3), '2026-06-05 11:01:44.206'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtao004jhf6486ywwgjr', 'cmpv9625p0001hf2w01fa4hzm', NULL, 'europe-cultural', 'European Cultural Experience', 'تجربة ثقافية أوروبية', '12-day tour through Paris, Rome, and Barcelona.', 'جولة 12 يوماً عبر باريس وروما وبرشلونة.', 'Museums, architecture, local guides, and authentic cultural immersion.', 'متاحف وعمارة ومرشدون محليون وانغماس ثقافي أصيل.', '{"price":3299,"currency":"USD","duration":12,"features":["Museums","Local guides","Cultural immersion"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 4, '2026-06-05 11:01:44.193'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.208'::timestamp(3), '2026-06-05 11:01:44.208'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtap004mhf649zxmxnuv', 'cmpv9625p0001hf2w01fa4hzm', NULL, 'luxury-dubai', 'Luxury Dubai Escape', 'عطلة دبي الفاخرة', '5 nights at a 5-star resort with yacht experience.', '5 ليالٍ في منتجع 5 نجوم مع تجربة يخت.', 'Premium accommodation, private transfers, and exclusive experiences.', 'إقامة فاخرة ونقل خاص وتجارب حصرية.', '{"price":3999,"currency":"USD","duration":5,"features":["5-star resort","Yacht","Private transfers"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 5, '2026-06-05 11:01:44.194'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.210'::timestamp(3), '2026-06-05 11:01:44.210'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtaq004phf64k4lktum0', 'cmpv9625p0001hf2w01fa4hzm', NULL, 'seasonal-winter-europe', 'Winter Europe Holiday', 'عطلة أوروبا الشتوية', '7-day winter wonderland tour with Christmas markets.', 'جولة شتوية 7 أيام مع أسواق عيد الميلاد.', 'Festive markets, alpine scenery, and cozy accommodations.', 'أسواق احتفالية ومناظر جبلية وإقامة مريحة.', '{"price":2199,"currency":"USD","duration":7,"features":["Christmas markets","Alpine scenery","Festive tours"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 6, '2026-06-05 11:01:44.196'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.211'::timestamp(3), '2026-06-05 11:01:44.211'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtas004shf649d1nqu2m', 'cmpv9625p0001hf2w01fa4hzm', NULL, 'group-corporate-retreat', 'Corporate Group Retreat', 'خلوة جماعية للشركات', 'Customizable team-building travel for corporate groups.', 'سفر بناء فريق قابل للتخصيص للمجموعات.', 'Tailored itineraries with meeting facilities and team activities.', 'برامج مخصصة مع مرافق اجتماعات وأنشطة جماعية.', '{"price":1299,"currency":"USD","duration":4,"features":["Team building","Meeting facilities","Custom itinerary"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 7, '2026-06-05 11:01:44.197'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.212'::timestamp(3), '2026-06-05 11:01:44.212'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtat004vhf647uamzxx9', 'cmpv9625t0002hf2wcgzesujw', NULL, 'makkah-hotel-5star', 'Makkah Premium Hotel', 'فندق مكة المميز', '5-star hotel steps from the Haram.', 'فندق 5 نجوم على خطوات من الحرم.', 'Luxury accommodation with Haram views, premium dining, and concierge service.', 'إقامة فاخرة بإطلالة على الحرم ومطاعم مميزة وخدمة كونسيرج.', '{"city":"MAKKAH","stars":5,"distance":"200m from Haram","amenities":["Haram view","Premium dining","Concierge"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 8, '2026-06-05 11:01:44.198'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.214'::timestamp(3), '2026-06-05 11:01:44.214'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtav004yhf649vvzdhm9', 'cmpv9625t0002hf2wcgzesujw', NULL, 'madinah-hotel-4star', 'Madinah Comfort Hotel', 'فندق المدينة المريح', '4-star hotel near Masjid Nabawi.', 'فندق 4 نجوم قرب المسجد النبوي.', 'Comfortable rooms with Nabawi proximity, shuttle service, and halal dining.', 'غرف مريحة قرب النبوي مع خدمة نقل ومأكولات حلال.', '{"city":"MADINAH","stars":4,"distance":"500m from Nabawi","amenities":["Shuttle","Halal dining","Prayer facilities"]}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 9, '2026-06-05 11:01:44.200'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.215'::timestamp(3), '2026-06-05 11:01:44.215'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtaw0051hf644b7lxhd6', 'cmpv9625u0003hf2w6pjnojic', NULL, 'travel-planning', 'Travel Planning & Consultation', 'تخطيط السفر والاستشارة', 'Personalized itinerary development and destination recommendations.', 'تطوير برامج مخصصة وتوصيات الوجهات.', 'Expert travel specialists design trips around your preferences and budget.', 'متخصصون يصممون رحلات حسب تفضيلاتك وميزانيتك.', '{"icon":"fa-map","ctaHref":"/contact","ctaLabel":"Consult Now","offeringType":"OTHER"}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', true, true, 10, '2026-06-05 11:01:44.201'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.217'::timestamp(3), '2026-06-05 11:01:44.217'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtax0053hf64k92efpp4', 'cmpv9625u0003hf2w6pjnojic', NULL, 'flight-booking', 'Flight & Ticket Booking', 'حجز الطيران والتذاكر', 'Domestic and international flight reservations.', 'حجوزات طيران محلية ودولية.', 'Access to major airlines with multi-city and group booking options.', 'وصول لخطوط جوية رئيسية مع خيارات حجز متعدد المدن والمجموعات.', '{"icon":"fa-plane","ctaHref":"/contact","ctaLabel":"Book Flights","offeringType":"OTHER"}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 11, '2026-06-05 11:01:44.202'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.218'::timestamp(3), '2026-06-05 11:01:44.218'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtay0055hf642055g0o2', 'cmpv9625u0003hf2w6pjnojic', NULL, 'guided-tours', 'Guided Tours & Experiences', 'جولات مرشدة وتجارب', 'Historical, cultural, and adventure tourism experiences.', 'تجارب سياحية تاريخية وثقافية ومغامرات.', 'Connect with destinations through meaningful guided experiences.', 'تواصل مع الوجهات عبر تجارب مرشدة ذات معنى.', '{"icon":"fa-compass","ctaHref":"/packages","ctaLabel":"Explore Tours","offeringType":"OTHER"}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 12, '2026-06-05 11:01:44.204'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.219'::timestamp(3), '2026-06-05 11:01:44.219'::timestamp(3));
INSERT INTO "ContentItem" ("id", "contentTypeId", "collectionId", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "attributes", "blocks", "displaySettings", "metadata", "status", "isFeatured", "isVisible", "sortOrder", "publishedAt", "archivedAt", "deletedAt", "featuredImageUrl", "createdAt", "updatedAt") VALUES ('cmq0tdtaz0057hf649b1n4t6d', 'cmpv9625u0003hf2w6pjnojic', NULL, 'corporate-travel', 'Corporate Travel Planning', 'تخطيط سفر الأعمال', 'Business travel management and group arrangements.', 'إدارة سفر الأعمال وترتيبات المجموعات.', 'Efficient corporate travel with schedule management and priority support.', 'سفر أعمال فعال مع إدارة الجداول ودعم أولوية.', '{"icon":"fa-briefcase","ctaHref":"/contact","ctaLabel":"Corporate Inquiry","offeringType":"OTHER"}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'PUBLISHED', false, true, 13, '2026-06-05 11:01:44.205'::timestamp(3), NULL, NULL, NULL, '2026-06-05 11:01:44.220'::timestamp(3), '2026-06-05 11:01:44.220'::timestamp(3));

-- ContentItemMedia (10 rows)
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtaf0048hf64tdvvln7t', 'cmq0tdtaf0047hf64u70d4w17', '/images/placeholder.svg', 'Family Holiday — Dubai', 'عطلة عائلية — دبي', '', '', 0, true, true, false, '2026-06-05 11:01:44.200'::timestamp(3), '2026-06-05 11:01:44.200'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtai004bhf643jlywoy4', 'cmq0tdtai004ahf64expklimi', '/images/placeholder.svg', 'Honeymoon — Maldives', 'شهر العسل — المالديف', '', '', 0, true, true, false, '2026-06-05 11:01:44.202'::timestamp(3), '2026-06-05 11:01:44.202'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtak004ehf64siqxi9cf', 'cmq0tdtak004dhf64nxpiprn9', '/images/placeholder.svg', 'Umrah Package', 'باقة العمرة', '', '', 0, true, true, false, '2026-06-05 11:01:44.204'::timestamp(3), '2026-06-05 11:01:44.204'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtam004hhf64b8sfgu23', 'cmq0tdtam004ghf64a5l1fspj', '/images/placeholder.svg', 'Turkey Adventure Tour', 'جولة مغامرات تركيا', '', '', 0, true, true, false, '2026-06-05 11:01:44.206'::timestamp(3), '2026-06-05 11:01:44.206'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtao004khf64bphbo8a0', 'cmq0tdtao004jhf6486ywwgjr', '/images/placeholder.svg', 'European Cultural Experience', 'تجربة ثقافية أوروبية', '', '', 0, true, true, false, '2026-06-05 11:01:44.208'::timestamp(3), '2026-06-05 11:01:44.208'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtap004nhf64m8mkqiqu', 'cmq0tdtap004mhf649zxmxnuv', '/images/placeholder.svg', 'Luxury Dubai Escape', 'عطلة دبي الفاخرة', '', '', 0, true, true, false, '2026-06-05 11:01:44.210'::timestamp(3), '2026-06-05 11:01:44.210'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtaq004qhf6448ju394q', 'cmq0tdtaq004phf64k4lktum0', '/images/placeholder.svg', 'Winter Europe Holiday', 'عطلة أوروبا الشتوية', '', '', 0, true, true, false, '2026-06-05 11:01:44.211'::timestamp(3), '2026-06-05 11:01:44.211'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtas004thf64gqz6sxaz', 'cmq0tdtas004shf649d1nqu2m', '/images/placeholder.svg', 'Corporate Group Retreat', 'خلوة جماعية للشركات', '', '', 0, true, true, false, '2026-06-05 11:01:44.212'::timestamp(3), '2026-06-05 11:01:44.212'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtat004whf64dub9lhtx', 'cmq0tdtat004vhf647uamzxx9', '/images/placeholder.svg', 'Makkah Premium Hotel', 'فندق مكة المميز', '', '', 0, true, true, false, '2026-06-05 11:01:44.214'::timestamp(3), '2026-06-05 11:01:44.214'::timestamp(3));
INSERT INTO "ContentItemMedia" ("id", "itemId", "url", "altEn", "altAr", "captionEn", "captionAr", "sortOrder", "isPublished", "isCover", "isHidden", "createdAt", "updatedAt") VALUES ('cmq0tdtav004zhf645fvtrj6b', 'cmq0tdtav004yhf649vvzdhm9', '/images/placeholder.svg', 'Madinah Comfort Hotel', 'فندق المدينة المريح', '', '', 0, true, true, false, '2026-06-05 11:01:44.215'::timestamp(3), '2026-06-05 11:01:44.215'::timestamp(3));

-- ContentType (4 rows)
INSERT INTO "ContentType" ("id", "slug", "nameEn", "nameAr", "labelSingularEn", "labelSingularAr", "labelPluralEn", "labelPluralAr", "icon", "routePrefix", "fieldSchema", "displaySchema", "adminConfig", "sortOrder", "isEnabled", "createdAt", "updatedAt") VALUES ('cmpv9625p0001hf2w01fa4hzm', 'catalog-items', 'Catalog Items', 'عناصر الفهرس', 'Catalog item', 'عنصر', 'Catalog items', 'عناصر الفهرس', 'package', 'packages', '[{"key":"duration","type":"number","group":"pricing","compare":true,"labelEn":"Duration (days)","required":true,"compareGroup":"Pricing","compareOrder":0,"highlightDifferences":true},{"key":"price","type":"price","group":"pricing","compare":true,"labelEn":"Price","required":true,"compareGroup":"Pricing","compareOrder":10,"highlightDifferences":true},{"key":"currency","type":"text","group":"pricing","compare":true,"labelEn":"Currency","placeholder":"USD","compareGroup":"Pricing","compareOrder":20,"highlightDifferences":true},{"key":"travelDates","type":"json","group":"details","labelEn":"Travel dates (JSON array)"},{"key":"facilities","type":"json","group":"details","labelEn":"Facilities (JSON)","localized":true},{"key":"features","type":"json","group":"details","labelEn":"Features (JSON)","localized":true},{"key":"itinerary","type":"json","group":"details","labelEn":"Itinerary (JSON)","localized":true},{"key":"hotelInfo","type":"textarea","group":"details","compare":true,"labelEn":"Hotel info","localized":true,"compareGroup":"Details","compareOrder":30,"highlightDifferences":true},{"key":"airlineInfo","type":"textarea","group":"details","compare":true,"labelEn":"Airline info","localized":true,"compareGroup":"Details","compareOrder":40,"highlightDifferences":true}]'::jsonb, '{"showPrice":true,"showCategory":true,"showDuration":true}'::jsonb, '{"isComparable":true,"inquiryEnabled":true,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}'::jsonb, 0, true, '2026-06-01 13:36:59.246'::timestamp(3), '2026-06-04 21:15:29.372'::timestamp(3));
INSERT INTO "ContentType" ("id", "slug", "nameEn", "nameAr", "labelSingularEn", "labelSingularAr", "labelPluralEn", "labelPluralAr", "icon", "routePrefix", "fieldSchema", "displaySchema", "adminConfig", "sortOrder", "isEnabled", "createdAt", "updatedAt") VALUES ('cmpv9625t0002hf2wcgzesujw', 'listings', 'Listings', 'قوائم', 'Listing', 'قائمة', 'Listings', 'قوائم', 'building', 'hotels-transport', '[{"key":"city","type":"select","group":"location","compare":true,"labelEn":"City","options":[{"value":"MAKKAH","labelEn":"Makkah"},{"value":"MADINAH","labelEn":"Madinah"}],"compareGroup":"Location","compareOrder":0,"highlightDifferences":true},{"key":"stars","type":"number","group":"details","compare":true,"labelEn":"Star rating","compareGroup":"Details","compareOrder":10,"highlightDifferences":true},{"key":"highlights","type":"json","group":"details","labelEn":"Highlights (JSON)","localized":true},{"key":"address","type":"textarea","group":"location","labelEn":"Address","localized":true},{"key":"distance","type":"textarea","group":"location","compare":true,"labelEn":"Distance info","localized":true,"compareGroup":"Location","compareOrder":20,"highlightDifferences":true},{"key":"amenities","type":"json","group":"details","compare":true,"labelEn":"Amenities (JSON)","localized":true,"compareGroup":"Details","compareOrder":30,"highlightDifferences":true}]'::jsonb, '{"showCity":true,"showPrice":false,"showStars":true}'::jsonb, '{"isComparable":true,"inquiryEnabled":false,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}'::jsonb, 1, true, '2026-06-01 13:36:59.249'::timestamp(3), '2026-06-04 21:15:29.384'::timestamp(3));
INSERT INTO "ContentType" ("id", "slug", "nameEn", "nameAr", "labelSingularEn", "labelSingularAr", "labelPluralEn", "labelPluralAr", "icon", "routePrefix", "fieldSchema", "displaySchema", "adminConfig", "sortOrder", "isEnabled", "createdAt", "updatedAt") VALUES ('cmpv9625u0003hf2w6pjnojic', 'offerings', 'Offerings', 'عروض', 'Offering', 'عرض', 'Offerings', 'عروض', 'briefcase', 'hotels-transport', '[{"key":"offeringType","type":"select","group":"cta","compare":true,"labelEn":"Type","options":[{"value":"TRANSPORT","labelEn":"Transport"},{"value":"AIRPORT_PICKUP","labelEn":"Airport pickup"},{"value":"HOTEL","labelEn":"Hotel service"},{"value":"OTHER","labelEn":"Other"}],"compareGroup":"Cta","compareOrder":0,"highlightDifferences":true},{"key":"highlights","type":"json","group":"details","compare":true,"labelEn":"Highlights (JSON)","localized":true,"compareGroup":"Details","compareOrder":10,"highlightDifferences":true},{"key":"icon","type":"text","group":"display","labelEn":"Icon name","placeholder":"compass"},{"key":"ctaLabel","type":"text","group":"cta","compare":true,"labelEn":"CTA label","localized":true,"compareGroup":"Cta","compareOrder":20,"highlightDifferences":true},{"key":"ctaHref","type":"url","group":"cta","labelEn":"CTA link"}]'::jsonb, '{"showIcon":true,"showPrice":false}'::jsonb, '{"isComparable":true,"inquiryEnabled":false,"comparisonSettings":{"enabled":true,"maxItems":4,"comparisonMode":"hybrid"}}'::jsonb, 2, true, '2026-06-01 13:36:59.251'::timestamp(3), '2026-06-04 21:15:29.387'::timestamp(3));
INSERT INTO "ContentType" ("id", "slug", "nameEn", "nameAr", "labelSingularEn", "labelSingularAr", "labelPluralEn", "labelPluralAr", "icon", "routePrefix", "fieldSchema", "displaySchema", "adminConfig", "sortOrder", "isEnabled", "createdAt", "updatedAt") VALUES ('cmpwfc6xz0000hfl4uqgff75a', 'test-content', 'test content', 'اختبار محتوى', 'Item', 'عنصر', 'Items', 'عناصر', 'box', 'test-content', '[{"key":"field1","type":"text","group":"general","labelEn":"New field","localized":true},{"key":"field2","type":"number","group":"general","labelEn":"New field","localized":true},{"key":"field3","type":"price","group":"general","labelEn":"New field"}]'::jsonb, '{}'::jsonb, '{"inquiryEnabled":true}'::jsonb, 0, true, '2026-06-02 09:17:29.253'::timestamp(3), '2026-06-02 09:22:56.531'::timestamp(3));

-- Custom404 (2 rows)
INSERT INTO "Custom404" ("id", "locale", "titleEn", "titleAr", "bodyEn", "bodyAr", "blocks", "updatedAt") VALUES ('cmpv9628r0021hf2wt3cns8bm', 'en', '', '', '', '', '[]'::jsonb, '2026-06-05 11:01:43.484'::timestamp(3));
INSERT INTO "Custom404" ("id", "locale", "titleEn", "titleAr", "bodyEn", "bodyAr", "blocks", "updatedAt") VALUES ('cmpv9628t0022hf2w412o0vn6', 'ar', '', '', '', '', '[]'::jsonb, '2026-06-05 11:01:43.484'::timestamp(3));

-- FaqItem (4 rows)
INSERT INTO "FaqItem" ("id", "faqSetId", "questionEn", "questionAr", "answerEn", "answerAr", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdt9y0039hf64myyuv370', 'cmq0tdt9y0038hf6475n5wj26', 'How do I book a tour package?', 'كيف أحجز باقة سفر؟', 'Contact us via the inquiry form or phone. Our travel specialists will create a personalized itinerary based on your preferences and budget.', 'تواصل معنا عبر نموذج الاستفسار أو الهاتف. سيعد متخصصونا برنامجاً مخصصاً حسب تفضيلاتك وميزانيتك.', 0, true, '2026-06-05 11:01:44.183'::timestamp(3), '2026-06-05 11:01:44.183'::timestamp(3));
INSERT INTO "FaqItem" ("id", "faqSetId", "questionEn", "questionAr", "answerEn", "answerAr", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdt9y003ahf64wz3t5d4y', 'cmq0tdt9y0038hf6475n5wj26', 'What payment methods do you accept?', 'ما طرق الدفع المقبولة؟', 'We accept bank transfer, credit cards, and installment plans for select packages. Details are provided during booking.', 'نقبل التحويل البنكي وبطاقات الائتمان وأقساط لبعض الباقات. التفاصيل تُقدم عند الحجز.', 1, true, '2026-06-05 11:01:44.183'::timestamp(3), '2026-06-05 11:01:44.183'::timestamp(3));
INSERT INTO "FaqItem" ("id", "faqSetId", "questionEn", "questionAr", "answerEn", "answerAr", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdta0003chf64f9ceq1ks', 'cmq0tdta0003bhf64g10ho1ko', 'Do you provide visa assistance?', 'هل تقدمون مساعدة في التأشيرات؟', 'Yes. We offer visa guidance and documentation support for international destinations included in our packages.', 'نعم. نقدم إرشادات التأشيرات ودعم الوثائق للوجهات الدولية في باقاتنا.', 0, true, '2026-06-05 11:01:44.185'::timestamp(3), '2026-06-05 11:01:44.185'::timestamp(3));
INSERT INTO "FaqItem" ("id", "faqSetId", "questionEn", "questionAr", "answerEn", "answerAr", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdta2003ehf640u3qfbpl', 'cmq0tdta1003dhf64es3pjs9k', 'Can packages be customized?', 'هل يمكن تخصيص الباقات؟', 'Absolutely. Every package can be tailored to your travel dates, group size, accommodation preferences, and activities.', 'بالتأكيد. يمكن تخصيص كل باقة حسب تواريخ السفر وحجم المجموعة وتفضيلات الإقامة والأنشطة.', 0, true, '2026-06-05 11:01:44.186'::timestamp(3), '2026-06-05 11:01:44.186'::timestamp(3));

-- FaqSet (3 rows)
INSERT INTO "FaqSet" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdt9y0038hf6475n5wj26', 'booking', 'Booking FAQ', 'أسئلة الحجز', NULL, NULL, '', '', 0, true, '2026-06-05 11:01:44.183'::timestamp(3), '2026-06-05 11:01:44.183'::timestamp(3));
INSERT INTO "FaqSet" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdta0003bhf64g10ho1ko', 'visas', 'Visa FAQ', 'أسئلة التأشيرات', NULL, NULL, '', '', 0, true, '2026-06-05 11:01:44.185'::timestamp(3), '2026-06-05 11:01:44.185'::timestamp(3));
INSERT INTO "FaqSet" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdta1003dhf64es3pjs9k', 'packages', 'Packages FAQ', 'أسئلة الباقات', NULL, NULL, '', '', 0, true, '2026-06-05 11:01:44.186'::timestamp(3), '2026-06-05 11:01:44.186'::timestamp(3));

-- FormTemplate (1 rows)
INSERT INTO "FormTemplate" ("id", "name", "slug", "category", "description", "definition", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdt9x0037hf64e45uy17g', 'Travel Inquiry Form', 'safar-inquiry', 'GENERAL', NULL, '{"fields":[{"id":"name","type":"text","labelAr":"الاسم الكامل","labelEn":"Full Name","required":true},{"id":"email","type":"email","labelAr":"البريد الإلكتروني","labelEn":"Email","required":true},{"id":"phone","type":"phone","labelAr":"الهاتف","labelEn":"Phone","required":true},{"id":"destination","type":"text","labelAr":"الوجهة المفضلة","labelEn":"Preferred Destination","required":false},{"id":"dates","type":"text","labelAr":"تواريخ السفر","labelEn":"Travel Dates","required":false},{"id":"travelers","type":"number","labelAr":"عدد المسافرين","labelEn":"Number of Travelers","required":false},{"id":"budget","type":"text","labelAr":"نطاق الميزانية","labelEn":"Budget Range","required":false},{"id":"message","type":"textarea","labelAr":"تفاصيل إضافية","labelEn":"Additional Details","required":false}]}'::jsonb, true, '2026-06-05 11:01:44.181'::timestamp(3), '2026-06-05 11:01:44.181'::timestamp(3));

-- Gallery (1 rows)
INSERT INTO "Gallery" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "coverUrl", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa003thf64ogngrgy2', 'safar-destinations', 'Destinations Gallery', 'معرض الوجهات', NULL, NULL, '', '', NULL, NULL, NULL, 0, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));

-- GalleryMedia (12 rows)
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa003uhf64zuhhnw5u', 'cmq0tdtaa003thf64ogngrgy2', 'Makkah', 'مكة', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 0, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa003vhf64uu2qs8el', 'cmq0tdtaa003thf64ogngrgy2', 'Madinah', 'المدينة', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 1, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa003whf647ty0n3pz', 'cmq0tdtaa003thf64ogngrgy2', 'Dubai', 'دبي', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 2, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa003xhf64irx9evk1', 'cmq0tdtaa003thf64ogngrgy2', 'Turkey', 'تركيا', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 3, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa003yhf64n1dncwya', 'cmq0tdtaa003thf64ogngrgy2', 'Maldives', 'المالديف', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 4, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa003zhf64iqzxhv6a', 'cmq0tdtaa003thf64ogngrgy2', 'Europe', 'أوروبا', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 5, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa0040hf640mhkq22a', 'cmq0tdtaa003thf64ogngrgy2', 'Adventure', 'مغامرات', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 6, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa0041hf648ipfcrjv', 'cmq0tdtaa003thf64ogngrgy2', 'Cultural Tours', 'جولات ثقافية', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 7, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa0042hf64clq25i22', 'cmq0tdtaa003thf64ogngrgy2', 'Luxury', 'فخامة', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 8, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa0043hf64t0vdup9d', 'cmq0tdtaa003thf64ogngrgy2', 'Family Holidays', 'عطلات عائلية', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 9, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa0044hf64q08fev4l', 'cmq0tdtaa003thf64ogngrgy2', 'Honeymoon', 'شهر العسل', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 10, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));
INSERT INTO "GalleryMedia" ("id", "galleryId", "titleEn", "titleAr", "excerptEn", "excerptAr", "descriptionEn", "descriptionAr", "infoEn", "infoAr", "mediaUrl", "mediaKind", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdtaa0045hf64tbbj0oy4', 'cmq0tdtaa003thf64ogngrgy2', 'Religious Tourism', 'سياحة دينية', NULL, NULL, '', '', NULL, NULL, '/images/placeholder.svg', 'IMAGE', 11, true, '2026-06-05 11:01:44.195'::timestamp(3), '2026-06-05 11:01:44.195'::timestamp(3));

-- JsonStore (14 rows)
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpwnoz4r000nhfesvci156mx', 'personalization', 'settings', '{"enabled":true,"presets":[{"id":"networking","visibleToUsers":false},{"id":"gaming","visibleToUsers":false},{"id":"sports","visibleToUsers":false},{"id":"luxury","visibleToUsers":true},{"id":"medical","visibleToUsers":true},{"id":"agency","visibleToUsers":true},{"id":"restaurant","visibleToUsers":false},{"id":"education","visibleToUsers":false},{"id":"realestate","visibleToUsers":false},{"id":"finance","visibleToUsers":true},{"id":"fashion","visibleToUsers":false},{"id":"saas","visibleToUsers":true},{"id":"automotive","visibleToUsers":false},{"id":"travel","visibleToUsers":true},{"id":"enterprise-wifi","visibleToUsers":false},{"id":"wireless-isp","visibleToUsers":false},{"id":"datacenter","visibleToUsers":false},{"id":"smart-home","visibleToUsers":false},{"id":"telecom","visibleToUsers":false},{"id":"brt","visibleToUsers":false}],"position":"bottom-start","widgetSections":{"showStyle":true,"showBackToTop":true,"showAppearance":true,"showFabThemeToggle":true}}'::jsonb, 3, '2026-06-02 13:11:22.587'::timestamp(3), '2026-06-04 09:58:07.328'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpwp7h8w0000hfyst0whe5u3', 'preview-tokens', 'f20ff027f653253e85e575af35e1fee495ac1a7b3fb821de', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-02T14:53:45.483Z"}'::jsonb, 1, '2026-06-02 13:53:45.487'::timestamp(3), '2026-06-02 13:53:45.487'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpwp7h8x0001hfys2o9mgfs6', 'preview-tokens', '99f3861d84613f6d1d78b9455b99c551c3569548be3bca2d', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-02T14:53:45.485Z"}'::jsonb, 1, '2026-06-02 13:53:45.489'::timestamp(3), '2026-06-02 13:53:45.489'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpwp7h9g0002hfys4wu0avzi', 'preview-tokens', '6665c7d196724132a7cff412cb6cccb4e67c40d08fdfb0af', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-02T14:53:45.505Z"}'::jsonb, 1, '2026-06-02 13:53:45.508'::timestamp(3), '2026-06-02 13:53:45.508'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpwp7h9h0003hfysjri8euj6', 'preview-tokens', '1da6a4629c7599736d0430f98431726fbeb8644356b3cec7', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-02T14:53:45.507Z"}'::jsonb, 1, '2026-06-02 13:53:45.510'::timestamp(3), '2026-06-02 13:53:45.510'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpwp7r430004hfys07jtezk9', 'preview-tokens', '327abab096951d60f6891156663cc540eb1d0cfc5a6fd7ed', '{"slug":"hotels-transport","blocks":[{"id":"block-1780321018964-rtxghxw","type":"hero","props":{"titleAr":"الفنادق والنقل","titleEn":"Hotels & Transportation","subtitleAr":"إقامة فاخرة ونقل سلس بين المدن المقدسة.","subtitleEn":"Premium stays and seamless travel across the holy cities."}},{"id":"block-1780321018964-twfp7ze","type":"catalog","props":{"limit":6,"source":"hotels","titleAr":"فنادق الشركاء","titleEn":"Partner Hotels"}},{"id":"block-1780321018964-3880ox0","type":"catalog","props":{"limit":6,"source":"services","titleAr":"خدمات النقل","titleEn":"Transportation Services"}}],"locale":"en","pageId":"cmpv9628l001zhf2wrg4nzifr","titleAr":"الفنادق والنقل","titleEn":"Hotels & Transport","expiresAt":"2026-06-02T14:53:58.272Z"}'::jsonb, 1, '2026-06-02 13:53:58.275'::timestamp(3), '2026-06-02 13:53:58.275'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpxvj47x0004hfo49zy1kblr', 'preview-tokens', '1fe9bd293331b857357975999e34122129b3bf6f41a966e6', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-03T10:38:32.345Z"}'::jsonb, 1, '2026-06-03 09:38:32.349'::timestamp(3), '2026-06-03 09:38:32.349'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpxvj47v0003hfo4xfcfdni4', 'preview-tokens', '9c19336f534f570fab17e3c6ee766464c9459e76f281a4e4', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-03T10:38:32.341Z"}'::jsonb, 1, '2026-06-03 09:38:32.347'::timestamp(3), '2026-06-03 09:38:32.347'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpxvj47z0005hfo4epcvq2zo', 'preview-tokens', 'b71c06a1bea253066af03e1352ca77ec1cdd777d172ff83e', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-03T10:38:32.347Z"}'::jsonb, 1, '2026-06-03 09:38:32.351'::timestamp(3), '2026-06-03 09:38:32.351'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpxvj4810006hfo4ef6rcwr9', 'preview-tokens', '57f0b9a5838ebe15acd78f8af5f1a6875598c28bf436ac86', '{"slug":"home","blocks":[{"id":"block-1780321018964-o7gjykp","seo":{},"type":"hero","props":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"styles":{},"version":"2.0","settings":{"ctaHref":"/packages","titleAr":"رحلتك المقدسة، برعاية واهتمام","titleEn":"Your Sacred Journey, Guided with Care","imageUrl":"","ctaLabelAr":"استكشف الباقات","ctaLabelEn":"Explore Packages","subtitleAr":"باقات عمرة فاخرة وخدمات سفر إسلامية — مُعدّة بإخلاص، ومُقدَّمة بتميز.","subtitleEn":"Premium Umrah packages and Islamic travel services — crafted with devotion, delivered with excellence.","mediaAssetId":"","headerOverlay":{"enabled":true,"surface":"solid","paddingTop":"calc(15px + 0px)","contentInset":"auto"}},"animation":{"scroll":{"type":"zoom"},"enabled":true,"entrance":{"type":"fade"}},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-j6zrn3c","seo":{},"type":"catalog","props":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"styles":{},"version":"2.0","settings":{"city":"","limit":6,"source":"packages","titleAr":"باقات العمرة المميزة","titleEn":"Featured Umrah Packages","manualIds":[],"subtitleAr":"رحلات مختارة لكل حاج — من الراحة الأساسية إلى الفخامة الملكية.","subtitleEn":"Handpicked journeys for every pilgrim — from essential comfort to royal luxury.","serviceType":"","viewAllHref":"","categorySlug":"","featuredOnly":false,"emptyMessageAr":"","emptyMessageEn":"","displaySettings":{"limit":6,"columns":3,"autoplay":false,"showCity":true,"showIcon":true,"showPrice":true,"showStars":true,"layoutMode":"grid","cardVariant":"default","showExcerpt":true,"showCategory":true,"showDuration":true,"showViewAllLink":true,"autoplayIntervalMs":5000}},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-r3mrvzt","seo":{},"type":"testimonials","props":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"styles":{},"version":"2.0","settings":{"limit":3,"source":"collection","columns":3,"titleAr":"قصص الحجاج","titleEn":"Pilgrim Stories","autoplay":false,"layoutMode":"grid","subtitleAr":"استمع إلى من سافروا معنا.","subtitleEn":"Hear from those who traveled with us.","cardVariant":"default","sliderEnabled":false,"testimonialIds":[],"showViewAllLink":true,"autoplayIntervalMs":5000,"testimonialCollectionSlug":"home"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}},{"id":"block-1780321018964-bcjbsen","seo":{},"type":"cta","props":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"styles":{},"version":"2.0","settings":{"href":"/contact","titleAr":"ابدأ رحلتك المقدسة","titleEn":"Begin Your Sacred Journey","buttonAr":"تواصل معنا","buttonEn":"Get in Touch"},"animation":{"enabled":false},"responsive":{},"visibility":{},"localization":{}}],"locale":"en","pageId":"cmpv9628a001shf2w4z2l68c6","titleAr":"الرئيسية","titleEn":"Home","expiresAt":"2026-06-03T10:38:32.349Z"}'::jsonb, 1, '2026-06-03 09:38:32.354'::timestamp(3), '2026-06-03 09:38:32.354'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpztabzt0000hff8g12r94l5', 'settings', 'system', '{"setupComplete":false,"comingSoonEnabled":false,"registrationEnabled":true}'::jsonb, 2, '2026-06-04 18:11:15.640'::timestamp(3), '2026-06-04 18:40:41.111'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmq0tdsqr0001hf60aeizbop4', 'footer-workspace', 'default', '{"design":{"columnGap":"normal","linkStyle":"muted","borderStyle":"subtle","headingStyle":"uppercase"},"layout":"grid","columns":[{"id":"brand","type":"brand","title":"","enabled":true,"showEmail":false,"showPhone":false,"showSocial":false,"showAddress":false},{"id":"packages","type":"menu","links":[{"href":"/packages","label":"Family Holidays"},{"href":"/packages","label":"Honeymoon Packages"},{"href":"/packages","label":"Religious Tourism"},{"href":"/packages","label":"Adventure Travel"}],"title":"Tour Packages","enabled":true,"showEmail":false,"showPhone":false,"menuSource":"custom","showSocial":false,"showAddress":false},{"id":"company","type":"menu","links":[{"href":"/about","label":"About Us"},{"href":"/why-choose-us","label":"Why Choose Us"},{"href":"/testimonials","label":"Testimonials"},{"href":"/contact","label":"Contact"}],"title":"Company","enabled":true,"showEmail":false,"showPhone":false,"menuSource":"custom","showSocial":false,"showAddress":false},{"id":"contact","type":"contact","title":"Contact","enabled":true,"showEmail":true,"showPhone":true,"showSocial":false,"showAddress":true},{"id":"social","type":"social","title":"Follow Us","enabled":true,"showEmail":false,"showPhone":false,"showSocial":true,"showAddress":false}],"version":1,"copyright":{"suffix":"Travel • Explore • Discover","showBar":true,"legalLinks":[],"rightsText":"© Safar Al-Madina Travel Agency. All rights reserved."},"gridColumns":4}'::jsonb, 1, '2026-06-05 11:01:43.492'::timestamp(3), '2026-06-05 11:01:44.162'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmq0tdsqm0000hf60kfqzk70j', 'header-workspace', 'default', '{"version":1,"branding":{"tagline":"Travel • Explore • Discover","logoMode":"text","logoText":"SAM","areaStyle":"default","brandName":"Safar Al-Madina","logoSizing":{"mode":"fixed","adaptiveMax":48,"adaptiveMin":28,"heightMobile":32,"heightTablet":36,"heightDesktop":42},"showTagline":true,"logoImageDarkUrl":"","brandLayoutMobile":"logo-and-text","logoImageLightUrl":"","brandLayoutDesktop":"logo-and-text","brandNameTypography":{"customFont":"","fontSource":"heading","fontWeight":800,"sizeMobile":"1rem","sizeDesktop":"1.2rem"},"brandTaglineTypography":{"customFont":"","fontSource":"body","fontWeight":400,"sizeMobile":"0.65rem","sizeDesktop":"0.72rem"}},"settings":{"menuType":"dropdown","menuShadow":"strong","mobileType":"hamburger","headerStyle":"normal-compact","overlayMode":"none","overlaySurface":"glass","menuBlurStrength":"medium","menuGlassEnabled":true,"menuTransparency":92,"mobileMenuShadow":"strong","headerDesktopMode":"sticky","mobileMenuSurface":"glass","headerBorderRadius":"lg","menuPanelAnimation":"slide","mobileMenuAnimation":"slide","mobileMenuBlurStrength":"medium","mobileMenuGlassEnabled":true,"mobileMenuTransparency":96,"firstBlockHeaderOverlay":{"enabled":false,"contentInset":"auto"}},"activeMenuKey":"mainMenu","headerActions":[{"id":"action-search","icon":"fa-search","type":"search","label":"Search","style":"icon","visible":true,"outlined":false},{"id":"action-account","icon":"fa-user","type":"account","label":"Account","style":"icon","visible":true,"outlined":false},{"id":"action-cta","icon":"fa-plane","type":"custom","label":"Plan Your Trip","style":"solid","visible":true,"outlined":false}],"menusDatabase":{"mainMenu":{"name":"Main Menu","items":[{"id":"nav-home","url":"/","type":"link","label":"Home","labels":{"ar":"الرئيسية","en":"Home"},"children":[],"placement":"both"},{"id":"nav-about","url":"/about","type":"link","label":"About","labels":{"ar":"من نحن","en":"About"},"children":[],"placement":"both"},{"id":"nav-packages","url":"/packages","type":"link","label":"Tour Packages","labels":{"ar":"باقات السفر","en":"Tour Packages"},"children":[],"placement":"both"},{"id":"nav-services","url":"/services","type":"link","label":"Services","labels":{"ar":"الخدمات","en":"Services"},"children":[],"placement":"both"},{"id":"nav-hotels","url":"/hotels-transport","type":"link","label":"Hotels & Transport","labels":{"ar":"الفنادق والنقل","en":"Hotels & Transport"},"children":[],"placement":"both"},{"id":"nav-gallery","url":"/gallery","type":"link","label":"Gallery","labels":{"ar":"المعرض","en":"Gallery"},"children":[],"placement":"both"},{"id":"nav-blog","url":"/blog","type":"link","label":"Blog","labels":{"ar":"المدونة","en":"Blog"},"children":[],"placement":"both"},{"id":"nav-contact","url":"/contact","type":"link","label":"Contact","labels":{"ar":"اتصل بنا","en":"Contact"},"children":[],"placement":"both"}],"globalApply":"Both"}}}'::jsonb, 1, '2026-06-05 11:01:43.487'::timestamp(3), '2026-06-05 11:01:44.159'::timestamp(3));
INSERT INTO "JsonStore" ("id", "namespace", "key", "data", "version", "createdAt", "updatedAt") VALUES ('cmpzxm61e0007hfc8nco1a0jf', 'whatsapp', 'settings', '{"fab":{"size":"sm","enabled":true,"iconUrl":null,"iconSize":"1.75rem","position":"bottom-end","showIcon":true,"showLabel":false,"textColor":"#ffffff","offsetSide":24,"offsetBottom":24,"buttonVariant":"custom","backgroundColor":"#25D366"},"contactPage":{"size":"md","enabled":true,"iconUrl":null,"iconSize":"1.75rem","showIcon":true,"fullWidth":true,"showLabel":true,"textColor":"#ffffff","buttonVariant":"gold","backgroundColor":"#25D366"},"contentInquiry":{"size":"md","enabled":true,"iconUrl":null,"iconSize":"1.75rem","showIcon":true,"fullWidth":true,"showLabel":true,"textColor":"#ffffff","buttonVariant":"gold","backgroundColor":"#25D366"}}'::jsonb, 1, '2026-06-04 20:12:26.255'::timestamp(3), '2026-06-04 20:12:26.255'::timestamp(3));

-- LocaleConfig (1 rows)
INSERT INTO "LocaleConfig" ("id", "code", "urlPrefix", "label", "htmlLang", "dir", "flag", "dateLocale", "currency", "numberLocale", "isEnabled", "isDefault", "sortOrder", "createdAt", "updatedAt") VALUES ('cmpv9628u0023hf2whrsan6vt', 'en', 'en', 'English', 'en', 'ltr', '🇺🇸', 'en-US', 'USD', 'en-US', true, true, 0, '2026-06-01 13:36:59.358'::timestamp(3), '2026-06-04 21:15:29.596'::timestamp(3));

-- MediaAsset (17 rows)
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9g002qhf64b8zm2qs8', 'hero.svg', '/demo/safar/hero.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Safar Al-Madina Travel Agency', 'وكالة سفر الصفار المدينة', NULL, NULL, '2026-06-05 11:01:44.165'::timestamp(3), '2026-06-05 11:01:44.165'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9i002rhf64udx82qay', 'dest-1.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Makkah destination', 'وجهة مكة', NULL, NULL, '2026-06-05 11:01:44.166'::timestamp(3), '2026-06-05 11:01:44.166'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9j002shf643j3354li', 'dest-2.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Madinah destination', 'وجهة المدينة', NULL, NULL, '2026-06-05 11:01:44.167'::timestamp(3), '2026-06-05 11:01:44.167'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9k002thf64sr0e3oy3', 'dest-3.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Dubai skyline', 'أفق دبي', NULL, NULL, '2026-06-05 11:01:44.168'::timestamp(3), '2026-06-05 11:01:44.168'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9l002uhf64o66vawy5', 'dest-4.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Turkey travel', 'سفر تركيا', NULL, NULL, '2026-06-05 11:01:44.169'::timestamp(3), '2026-06-05 11:01:44.169'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9m002vhf64h42fizsq', 'dest-5.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Maldives resort', 'منتجع المالديف', NULL, NULL, '2026-06-05 11:01:44.170'::timestamp(3), '2026-06-05 11:01:44.170'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9n002whf64h9xrlinz', 'dest-6.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'European tour', 'جولة أوروبية', NULL, NULL, '2026-06-05 11:01:44.171'::timestamp(3), '2026-06-05 11:01:44.171'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9n002xhf64cy7e07y9', 'dest-7.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Adventure travel', 'سفر مغامرات', NULL, NULL, '2026-06-05 11:01:44.172'::timestamp(3), '2026-06-05 11:01:44.172'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9o002yhf64q5pfrl24', 'dest-8.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Cultural experience', 'تجربة ثقافية', NULL, NULL, '2026-06-05 11:01:44.173'::timestamp(3), '2026-06-05 11:01:44.173'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9p002zhf649k1wmsz3', 'dest-9.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Luxury vacation', 'عطلة فاخرة', NULL, NULL, '2026-06-05 11:01:44.174'::timestamp(3), '2026-06-05 11:01:44.174'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9q0030hf6404ol7c5c', 'dest-10.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Family holiday', 'عطلة عائلية', NULL, NULL, '2026-06-05 11:01:44.175'::timestamp(3), '2026-06-05 11:01:44.175'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9r0031hf64zi3z5epz', 'dest-11.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Honeymoon package', 'باقة شهر العسل', NULL, NULL, '2026-06-05 11:01:44.176'::timestamp(3), '2026-06-05 11:01:44.176'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9s0032hf64o9c9klnh', 'dest-12.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Religious tourism', 'سياحة دينية', NULL, NULL, '2026-06-05 11:01:44.177'::timestamp(3), '2026-06-05 11:01:44.177'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9t0033hf640f0mlpi5', 'pkg-family.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Family holiday package', 'باقة عطلة عائلية', NULL, NULL, '2026-06-05 11:01:44.177'::timestamp(3), '2026-06-05 11:01:44.177'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9u0034hf64yk5mbl1l', 'pkg-honeymoon.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Honeymoon package', 'باقة شهر العسل', NULL, NULL, '2026-06-05 11:01:44.178'::timestamp(3), '2026-06-05 11:01:44.178'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9v0035hf646pojb6os', 'hotel-1.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Makkah hotel', 'فندق مكة', NULL, NULL, '2026-06-05 11:01:44.179'::timestamp(3), '2026-06-05 11:01:44.179'::timestamp(3));
INSERT INTO "MediaAsset" ("id", "filename", "url", "mimeType", "mediaType", "sizeBytes", "width", "height", "altEn", "altAr", "folderId", "uploadedById", "createdAt", "updatedAt") VALUES ('cmq0tdt9w0036hf64r3f9v0jl', 'hotel-2.svg', '/images/placeholder.svg', 'image/svg+xml', 'SVG', 0, NULL, NULL, 'Madinah hotel', 'فندق المدينة', NULL, NULL, '2026-06-05 11:01:44.180'::timestamp(3), '2026-06-05 11:01:44.180'::timestamp(3));

-- Post (5 rows)
INSERT INTO "Post" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "contentEn", "contentAr", "blocks", "relatedPostIds", "status", "featuredImageId", "authorId", "publishedAt", "scheduledAt", "createdAt", "updatedAt") VALUES ('cmq0tdtc1005lhf64to2hsh9v', 'top-destinations-2026', 'Top Travel Destinations for 2026', 'أفضل وجهات السفر لعام 2026', 'Discover the most inspiring destinations our travelers are booking this year.', 'اكتشف أكثر الوجهات إلهاماً التي يحجزها مسافرونا هذا العام.', '<p>From the spiritual beauty of Makkah and Madinah to the turquoise waters of the Maldives, 2026 offers incredible travel opportunities. Our specialists share their top picks for families, couples, and adventure seekers.</p>', '<p>من الجمال الروحاني لمكة والمدينة إلى مياه المالديف الفيروزية، يقدم 2026 فرص سفر مذهلة.</p>', '[]'::jsonb, '[]'::jsonb, 'PUBLISHED', 'cmq0tdt9m002vhf64h42fizsq', 'cmq0tdtbz005jhf64d5140amz', '2026-06-05 11:01:44.243'::timestamp(3), NULL, '2026-06-05 11:01:44.258'::timestamp(3), '2026-06-05 11:01:44.258'::timestamp(3));
INSERT INTO "Post" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "contentEn", "contentAr", "blocks", "relatedPostIds", "status", "featuredImageId", "authorId", "publishedAt", "scheduledAt", "createdAt", "updatedAt") VALUES ('cmq0tdtc7005nhf64hmsvn1dm', 'umrah-planning-guide', 'Complete Umrah Planning Guide', 'دليل تخطيط العمرة الشامل', 'Everything you need to know before your spiritual journey.', 'كل ما تحتاج معرفته قبل رحلتك الروحانية.', '<p>Planning Umrah requires attention to visa requirements, hotel proximity, transport arrangements, and guided ziyarat. Safar Al-Madina provides end-to-end support for a seamless spiritual experience.</p>', '<p>تخطيط العمرة يتطلب الاهتمام بالتأشيرات وقرب الفنادق وترتيبات النقل والزيارات المرشدة.</p>', '[]'::jsonb, '[]'::jsonb, 'PUBLISHED', 'cmq0tdt9s0032hf64o9c9klnh', 'cmq0tdtbz005jhf64d5140amz', '2026-06-05 11:01:44.248'::timestamp(3), NULL, '2026-06-05 11:01:44.263'::timestamp(3), '2026-06-05 11:01:44.263'::timestamp(3));
INSERT INTO "Post" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "contentEn", "contentAr", "blocks", "relatedPostIds", "status", "featuredImageId", "authorId", "publishedAt", "scheduledAt", "createdAt", "updatedAt") VALUES ('cmq0tdtc9005phf64otroud02', 'family-travel-tips', 'Family Travel Tips for Stress-Free Holidays', 'نصائح السفر العائلي لعطلات خالية من التوتر', 'Make your next family vacation enjoyable for everyone.', 'اجعل عطلتك العائلية القادمة ممتعة للجميع.', '<p>Choose destinations with family-friendly activities, book accommodations with connecting rooms, and plan rest days between excursions. Our family packages handle all the details.</p>', '<p>اختر وجهات بأنشطة مناسبة للعائلة واحجز إقامة بغرف متصلة وخطط لأيام راحة بين الجولات.</p>', '[]'::jsonb, '[]'::jsonb, 'PUBLISHED', 'cmq0tdt9q0030hf6404ol7c5c', 'cmq0tdtbz005jhf64d5140amz', '2026-06-05 11:01:44.250'::timestamp(3), NULL, '2026-06-05 11:01:44.265'::timestamp(3), '2026-06-05 11:01:44.265'::timestamp(3));
INSERT INTO "Post" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "contentEn", "contentAr", "blocks", "relatedPostIds", "status", "featuredImageId", "authorId", "publishedAt", "scheduledAt", "createdAt", "updatedAt") VALUES ('cmq0tdtcd005rhf64ilnt11tc', 'honeymoon-destinations', 'Best Honeymoon Destinations', 'أفضل وجهات شهر العسل', 'Romantic getaways for newlyweds seeking unforgettable memories.', 'عطلات رومانسية للعروسين يبحثان عن ذكريات لا تُنسى.', '<p>The Maldives, Bali, Santorini, and Dubai top our honeymoon recommendations. Each offers unique romance — overwater villas, sunset cruises, and private dining experiences.</p>', '<p>المالديف وبالي وسانتوريني ودبي في مقدمة توصياتنا لشهر العسل.</p>', '[]'::jsonb, '[]'::jsonb, 'PUBLISHED', 'cmq0tdt9r0031hf64zi3z5epz', 'cmq0tdtbz005jhf64d5140amz', '2026-06-05 11:01:44.254'::timestamp(3), NULL, '2026-06-05 11:01:44.269'::timestamp(3), '2026-06-05 11:01:44.269'::timestamp(3));
INSERT INTO "Post" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "contentEn", "contentAr", "blocks", "relatedPostIds", "status", "featuredImageId", "authorId", "publishedAt", "scheduledAt", "createdAt", "updatedAt") VALUES ('cmq0tdtcf005thf64o4zoz6vb', 'visa-travel-guide', 'Visa Requirements: A Traveler''s Guide', 'متطلبات التأشيرة: دليل المسافر', 'Navigate visa requirements for popular international destinations.', 'تنقل في متطلبات التأشيرة للوجهات الدولية الشائعة.', '<p>Visa requirements vary by nationality and destination. Our team provides up-to-date guidance and documentation support to ensure smooth travel preparations.</p>', '<p>تختلف متطلبات التأشيرة حسب الجنسية والوجهة. فريقنا يقدم إرشادات محدثة ودعم الوثائق.</p>', '[]'::jsonb, '[]'::jsonb, 'PUBLISHED', 'cmq0tdt9k002thf64sr0e3oy3', 'cmq0tdtbz005jhf64d5140amz', '2026-06-05 11:01:44.256'::timestamp(3), NULL, '2026-06-05 11:01:44.271'::timestamp(3), '2026-06-05 11:01:44.271'::timestamp(3));

-- PostAuthor (1 rows)
INSERT INTO "PostAuthor" ("id", "name", "bioEn", "bioAr", "avatarUrl", "userId", "createdAt", "updatedAt") VALUES ('cmq0tdtbz005jhf64d5140amz', 'Safar Al-Madina Travel Agency', 'Editorial team at Safar Al-Madina Travel Agency', 'فريق التحرير في Safar Al-Madina Travel Agency', NULL, NULL, '2026-06-05 11:01:44.255'::timestamp(3), '2026-06-05 11:01:44.255'::timestamp(3));

-- PostCategory (2 rows)
INSERT INTO "PostCategory" ("id", "slug", "nameEn", "nameAr", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdtbu005hhf64lkwk032w', 'destinations', 'Destinations', 'الوجهات', 0, '2026-06-05 11:01:44.251'::timestamp(3), '2026-06-05 11:01:44.251'::timestamp(3));
INSERT INTO "PostCategory" ("id", "slug", "nameEn", "nameAr", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdtbw005ihf64zym6wjtr', 'travel-tips', 'Travel Tips', 'نصائح السفر', 0, '2026-06-05 11:01:44.252'::timestamp(3), '2026-06-05 11:01:44.252'::timestamp(3));

-- PostCategoryOnPost (5 rows)
INSERT INTO "PostCategoryOnPost" ("postId", "categoryId") VALUES ('cmq0tdtc1005lhf64to2hsh9v', 'cmq0tdtbu005hhf64lkwk032w');
INSERT INTO "PostCategoryOnPost" ("postId", "categoryId") VALUES ('cmq0tdtc7005nhf64hmsvn1dm', 'cmq0tdtbw005ihf64zym6wjtr');
INSERT INTO "PostCategoryOnPost" ("postId", "categoryId") VALUES ('cmq0tdtc9005phf64otroud02', 'cmq0tdtbw005ihf64zym6wjtr');
INSERT INTO "PostCategoryOnPost" ("postId", "categoryId") VALUES ('cmq0tdtcd005rhf64ilnt11tc', 'cmq0tdtbu005hhf64lkwk032w');
INSERT INTO "PostCategoryOnPost" ("postId", "categoryId") VALUES ('cmq0tdtcf005thf64o4zoz6vb', 'cmq0tdtbw005ihf64zym6wjtr');

-- SiteTheme (2 rows)
INSERT INTO "SiteTheme" ("id", "preset", "primaryColor", "secondaryColor", "typography", "faviconUrl", "logoUrl", "headerConfig", "footerConfig", "animationsEnabled", "animationSpeed", "lazyLoadEnabled", "darkModeEnabled", "spacingScale", "customCss", "updatedAt", "activePresetId", "cursorEffect", "backgroundEffect", "textEffect", "brandConfig", "backgroundEffectEnabled", "borderStyle", "cardStyle", "cursorEffectEnabled", "textEffectEnabled") VALUES ('published', 'CUSTOM', '#06b6d4', '#f97316', '{"bodyFont":"DM Sans","headingFont":"Syne","baseFontSize":"16px","headingScale":1.25}'::jsonb, NULL, NULL, '{"sticky":true,"ctaHref":"/contact","showCta":true,"showNav":true,"showLogo":true,"ctaLabelAr":"خطط لرحلتك","ctaLabelEn":"Plan Your Trip","showSearch":true}'::jsonb, '{"columns":4,"taglineAr":"بوابتك لتجارب سفر استثنائية ووجهات لا تُنسى.","taglineEn":"Your gateway to exceptional travel experiences and unforgettable destinations.","showSocial":true,"showContact":true,"showQuickLinks":true}'::jsonb, true, 1, true, true, 1, NULL, '2026-06-05 11:01:44.154'::timestamp(3), 'travel', 'ring-trail', 'waves', 'typewriter', '{"name":"Safar Al-Madina Travel Agency","tagline":"Your Trusted Partner for Memorable Travel Experiences","logoMode":"text","logoText":"SAM","shortName":"SAF","showTagline":true}'::jsonb, true, NULL, NULL, true, true);
INSERT INTO "SiteTheme" ("id", "preset", "primaryColor", "secondaryColor", "typography", "faviconUrl", "logoUrl", "headerConfig", "footerConfig", "animationsEnabled", "animationSpeed", "lazyLoadEnabled", "darkModeEnabled", "spacingScale", "customCss", "updatedAt", "activePresetId", "cursorEffect", "backgroundEffect", "textEffect", "brandConfig", "backgroundEffectEnabled", "borderStyle", "cardStyle", "cursorEffectEnabled", "textEffectEnabled") VALUES ('draft', 'CUSTOM', '#06b6d4', '#f97316', '{"bodyFont":"DM Sans","headingFont":"Syne","baseFontSize":"16px","headingScale":1.25}'::jsonb, NULL, NULL, '{"sticky":true,"ctaHref":"/contact","showCta":true,"showNav":true,"showLogo":true,"ctaLabelAr":"خطط لرحلتك","ctaLabelEn":"Plan Your Trip","showSearch":true}'::jsonb, '{"columns":4,"taglineAr":"بوابتك لتجارب سفر استثنائية ووجهات لا تُنسى.","taglineEn":"Your gateway to exceptional travel experiences and unforgettable destinations.","showSocial":true,"showContact":true,"showQuickLinks":true}'::jsonb, true, 1, true, true, 1, NULL, '2026-06-05 11:01:44.157'::timestamp(3), 'travel', 'ring-trail', 'waves', 'typewriter', '{"name":"Safar Al-Madina Travel Agency","tagline":"Your Trusted Partner for Memorable Travel Experiences","logoMode":"text","logoText":"SAM","shortName":"SAF","showTagline":true}'::jsonb, true, NULL, NULL, true, true);

-- Testimonial (6 rows)
INSERT INTO "Testimonial" ("id", "name", "location", "rating", "contentEn", "contentAr", "videoUrl", "imageUrl", "isPublished", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta2003fhf64o3y28m7r', 'Fatima Al-Zahra', 'Dubai, UAE', 5, 'Our family Umrah package was perfectly organized. Every detail was handled with care and professionalism.', 'باقة العمرة العائلية كانت منظمة بشكل مثالي. كل التفاصيل أُديرت بعناية واحترافية.', NULL, '', true, 0, '2026-06-05 11:01:44.187'::timestamp(3), '2026-06-05 11:01:44.187'::timestamp(3));
INSERT INTO "Testimonial" ("id", "name", "location", "rating", "contentEn", "contentAr", "videoUrl", "imageUrl", "isPublished", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta4003ghf64475n3s6q', 'James Wilson', 'London, UK', 5, 'Safar Al-Madina planned our honeymoon to the Maldives flawlessly. Unforgettable experience!', 'خططت Safar Al-Madina شهر عسلنا في المالديف بلا عيوب. تجربة لا تُنسى!', NULL, '', true, 1, '2026-06-05 11:01:44.188'::timestamp(3), '2026-06-05 11:01:44.188'::timestamp(3));
INSERT INTO "Testimonial" ("id", "name", "location", "rating", "contentEn", "contentAr", "videoUrl", "imageUrl", "isPublished", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta4003hhf64df1ljclq', 'Mohammed Al-Sayed', 'Riyadh, KSA', 5, 'Excellent corporate travel management. Reliable, transparent, and always responsive to our needs.', 'إدارة سفر أعمال ممتازة. موثوقة وشفافة ومتجاوبة دائماً مع احتياجاتنا.', NULL, '', true, 2, '2026-06-05 11:01:44.189'::timestamp(3), '2026-06-05 11:01:44.189'::timestamp(3));
INSERT INTO "Testimonial" ("id", "name", "location", "rating", "contentEn", "contentAr", "videoUrl", "imageUrl", "isPublished", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta5003ihf64vkfy945f', 'Elena Rodriguez', 'Madrid, Spain', 5, 'The European cultural tour exceeded our expectations. Authentic experiences and wonderful guides.', 'الجولة الثقافية الأوروبية فاقت توقعاتنا. تجارب أصيلة ومرشدون رائعون.', NULL, '', true, 3, '2026-06-05 11:01:44.190'::timestamp(3), '2026-06-05 11:01:44.190'::timestamp(3));
INSERT INTO "Testimonial" ("id", "name", "location", "rating", "contentEn", "contentAr", "videoUrl", "imageUrl", "isPublished", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta6003jhf64oy706eug', 'Aisha Khan', 'Abu Dhabi, UAE', 5, 'Adventure travel package to Turkey was thrilling and well-organized. Highly recommend Safar Al-Madina!', 'باقة المغامرات في تركيا كانت مثيرة ومنظمة جيداً. أنصح بـ Safar Al-Madina بشدة!', NULL, '', true, 4, '2026-06-05 11:01:44.190'::timestamp(3), '2026-06-05 11:01:44.190'::timestamp(3));
INSERT INTO "Testimonial" ("id", "name", "location", "rating", "contentEn", "contentAr", "videoUrl", "imageUrl", "isPublished", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta7003khf64uzazphcs', 'David Thompson', 'Sydney, Australia', 5, 'From flight booking to hotel arrangements, everything was seamless. A trusted travel partner.', 'من حجز الطيران إلى ترتيبات الفنادق، كل شيء كان سلساً. شريك سفر موثوق.', NULL, '', true, 5, '2026-06-05 11:01:44.191'::timestamp(3), '2026-06-05 11:01:44.191'::timestamp(3));

-- TestimonialCollection (1 rows)
INSERT INTO "TestimonialCollection" ("id", "slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "sortOrder", "isPublished", "createdAt", "updatedAt") VALUES ('cmq0tdta8003lhf64hb85abp0', 'safar-travelers', 'Traveler Reviews', 'آراء المسافرين', NULL, NULL, 0, true, '2026-06-05 11:01:44.192'::timestamp(3), '2026-06-05 11:01:44.192'::timestamp(3));

-- TestimonialCollectionItem (6 rows)
INSERT INTO "TestimonialCollectionItem" ("id", "collectionId", "testimonialId", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta8003nhf640pkwb27q', 'cmq0tdta8003lhf64hb85abp0', 'cmq0tdta2003fhf64o3y28m7r', 0, '2026-06-05 11:01:44.192'::timestamp(3), '2026-06-05 11:01:44.192'::timestamp(3));
INSERT INTO "TestimonialCollectionItem" ("id", "collectionId", "testimonialId", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta8003ohf64o6s1po5v', 'cmq0tdta8003lhf64hb85abp0', 'cmq0tdta4003ghf64475n3s6q', 1, '2026-06-05 11:01:44.192'::timestamp(3), '2026-06-05 11:01:44.192'::timestamp(3));
INSERT INTO "TestimonialCollectionItem" ("id", "collectionId", "testimonialId", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta8003phf64zzmlj3su', 'cmq0tdta8003lhf64hb85abp0', 'cmq0tdta4003hhf64df1ljclq', 2, '2026-06-05 11:01:44.192'::timestamp(3), '2026-06-05 11:01:44.192'::timestamp(3));
INSERT INTO "TestimonialCollectionItem" ("id", "collectionId", "testimonialId", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta8003qhf64mpgnuiye', 'cmq0tdta8003lhf64hb85abp0', 'cmq0tdta5003ihf64vkfy945f', 3, '2026-06-05 11:01:44.192'::timestamp(3), '2026-06-05 11:01:44.192'::timestamp(3));
INSERT INTO "TestimonialCollectionItem" ("id", "collectionId", "testimonialId", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta8003rhf64tgwrh1hb', 'cmq0tdta8003lhf64hb85abp0', 'cmq0tdta6003jhf64oy706eug', 4, '2026-06-05 11:01:44.192'::timestamp(3), '2026-06-05 11:01:44.192'::timestamp(3));
INSERT INTO "TestimonialCollectionItem" ("id", "collectionId", "testimonialId", "sortOrder", "createdAt", "updatedAt") VALUES ('cmq0tdta8003shf6461xrz49n', 'cmq0tdta8003lhf64hb85abp0', 'cmq0tdta7003khf64uzazphcs', 5, '2026-06-05 11:01:44.192'::timestamp(3), '2026-06-05 11:01:44.192'::timestamp(3));

-- TranslationJob (3 rows)
INSERT INTO "TranslationJob" ("id", "entityType", "languageCode", "status", "totalEntities", "processedCount", "errorMessage", "createdAt", "updatedAt", "completedAt") VALUES ('cmpziifc20001hfo8pl45d97s', NULL, 'ar', 'COMPLETED', 11, 2, NULL, '2026-06-04 13:09:37.442'::timestamp(3), '2026-06-04 13:09:37.540'::timestamp(3), '2026-06-04 13:09:37.537'::timestamp(3));
INSERT INTO "TranslationJob" ("id", "entityType", "languageCode", "status", "totalEntities", "processedCount", "errorMessage", "createdAt", "updatedAt", "completedAt") VALUES ('cmpzmx20q000dhfz0o2nlo9ko', NULL, 'ar', 'COMPLETED', 11, 0, NULL, '2026-06-04 15:12:58.491'::timestamp(3), '2026-06-04 15:12:58.522'::timestamp(3), '2026-06-04 15:12:58.519'::timestamp(3));
INSERT INTO "TranslationJob" ("id", "entityType", "languageCode", "status", "totalEntities", "processedCount", "errorMessage", "createdAt", "updatedAt", "completedAt") VALUES ('cmq046dp80001hf98b7c01qv8', NULL, 'ar', 'COMPLETED', 74, 63, NULL, '2026-06-04 23:16:07.003'::timestamp(3), '2026-06-04 23:16:07.675'::timestamp(3), '2026-06-04 23:16:07.673'::timestamp(3));

-- User (2 rows)
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt", "addressLine1", "addressLine2", "city", "country", "dateOfBirth", "marketingOptIn", "phone", "postalCode", "state") VALUES ('cmq0p45gz0000hfw8uh43tbf9', 'admin@azura.com', '$2b$12$7sRKw6v9xxnKrM1H0uo00OgOEdDSniUFj8lQ/G52/5AU.qJYAAYNq', 'Admin', 'ADMIN', '2026-06-05 09:02:14.963'::timestamp(3), '2026-06-05 09:02:14.963'::timestamp(3), NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL);
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt", "addressLine1", "addressLine2", "city", "country", "dateOfBirth", "marketingOptIn", "phone", "postalCode", "state") VALUES ('cmpzkiwbe0000hfn0kuhcbwbf', 'ali@brt-me.com', '$2b$12$bDag4gsVvZJDi5Ogw4aevuBTE8ZYUUJuPR7oJJE81Y70RoflfRtfi', 'Ali Zahedah', 'CUSTOMER', '2026-06-04 14:05:58.680'::timestamp(3), '2026-06-04 14:05:58.680'::timestamp(3), NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL);

SET session_replication_role = 'origin';
