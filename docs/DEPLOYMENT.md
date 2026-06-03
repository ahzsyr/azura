# AZURA — Deployment Guide

Use this checklist when deploying a new client site from the AZURA template.

## 1. Environment

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection (e.g. `mysql://user:pass@host:3306/client_db`) |
| `NEXTAUTH_SECRET` | Random secret for sessions |
| `NEXTAUTH_URL` | Production URL (e.g. `https://example.com`) |
| `NEXT_PUBLIC_SITE_URL` | Same as public site URL (SEO, sitemap, OG) |
| `NEXT_PUBLIC_SITE_NAME` | Client display name (e.g. `B R T Trading LLC`) |
| `NEXT_PUBLIC_SITE_SHORT_NAME` | Logo text fallback (e.g. `BRT`) |
| `NEXT_PUBLIC_SITE_TAGLINE` | Default tagline (template default: `Solutions`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Initial admin (change after first login) |
| `SEED_COMPANY_EMAIL` | Company contact email in seed |
| `UPLOADTHING_*` | Media uploads |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp FAB fallback |

## 2. Database

```bash
npm install
npm run db:migrate
npm run db:seed
```

## 3. Admin customization

1. Sign in at `/admin` with seed credentials.
2. **Company** — legal name, story, contact, addresses, registration.
3. **Theme** — logo, colors, branding, header/footer; **Publish** when ready.
4. Replace demo packages, testimonials, and CMS content as needed.

## 4. Production

```bash
npm run build
npm run start
```

Ensure `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` match the live domain.

## Existing databases (migrated from older branding)

Data is not renamed automatically. Either:

- Update **Admin → Company** and **Theme → Branding**, or
- Reset the database and re-seed for a clean AZURA demo.

## Identity resolution order

1. Published theme `brandConfig.brandName`
2. `CompanyInfo.name`
3. `NEXT_PUBLIC_SITE_NAME`
4. Template default: **AZURA**
