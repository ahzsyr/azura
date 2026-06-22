# Project Description

## What this project is

`brt-me` is an AZURA-based multilingual website and CMS platform built on Next.js. It supports marketing pages, catalog products and collections, dynamic content blocks, forms, SEO controls, media management, and admin workflows.

## Core stack

- Next.js (App Router) + React
- Prisma ORM
- Database: MySQL or PostgreSQL (Supabase recommended)
- Auth: NextAuth/Auth.js
- Optional services: Supabase Storage, Resend/SMTP, OpenAI, Google Search Console

## Main capabilities

- Admin dashboard for content, catalog, forms, SEO, theme, and settings
- Translation-first content architecture (multilingual fields and translation tables)
- Product and collection indexing/search support
- CMS pages and reusable block-based page building
- Newsletter and webhook-capable form submissions
- Setup wizard for first-time initialization

## Runtime model

- Production runs as Node.js SSR (`next start`) or standalone (`node server.js`).
- Host environment variables drive database, auth, media storage, and integration behavior.
- For cloud hosts with read-only file systems, use DB/Supabase-backed storage modes.
