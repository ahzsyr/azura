# AZURA Product Vision

> **Constitution v1.0** · Part of [AZURA Architectural Constitution](./constitution.md)  
> **Master plan:** [azura-v2.md](./azura-v2.md)

---

## Mission

AZURA helps organizations publish **modern marketing and showcase experiences** — multilingual sites with rich content, structured offerings, visual design control, SEO, and lead generation — **without** operating an online store.

---

## One-sentence thesis

> AZURA is an Experience-First composable platform where Core Platform and Capabilities provide single-owned services; the Experience Layer supplies Entities and Templates through ViewModels; Pages and Blocks compose the visitor experience; Presets and Modules extend the platform without duplicating infrastructure; Deployment Profiles determine what each installation carries.

---

## What AZURA is

| Capability | Description |
|------------|-------------|
| **Headless CMS** | Pages, posts, menus, editorial workflow |
| **Visual Builder** | Blocks, sections, layouts, page composition |
| **Experience Platform** | Composed visitor journeys — not only catalog browsing |
| **Structured Showcase** | Products, services, projects, properties, team, partners, and more — as **Entities**, when a site needs them |
| **Lead Generation** | Forms, inquiries, WhatsApp, newsletter, download gates |
| **SEO** | Meta, schema, redirects, sitemap (core tier) |
| **Multilingual** | Locales, field translation, UI messages, AI assist |
| **Composable platform** | [Deployment profiles](./deployment-profiles.md) enable subsets of features per install |

---

## What AZURA is not

| Out of scope | Notes |
|--------------|-------|
| **E-commerce** | No cart, checkout, orders, payments, inventory, shipping, coupons, taxes |
| **ERP / fulfillment** | Not operational back-office software |
| **Marketplace** | Not multi-vendor commerce |
| **Full booking engine** | Inquiry and appointment CTAs yes; scheduling infrastructure only via optional **Module** |
| **Enterprise TMS by default** | Core i18n + AI translation; enterprise translation workflow is an optional **Module** |

Legacy commerce-shaped UI fields (price, stock, “add to cart” migrated to quote CTA) are **showcase residue**, not product scope.

---

## Positioning

```text
Webflow  +  Headless CMS  +  Advanced Product/Service Showcase  +  Lead Generation
```

**Not:** Shopify + WooCommerce + Marketplace.

---

## Site archetypes (all first-class)

Every archetype is valid. Not every site has a “catalog.”

| Archetype | Typical structured content | Traditional catalog page? |
|-----------|---------------------------|---------------------------|
| Manufacturing showroom | Products, specifications | Often |
| Service company | Services, case studies | Rarely |
| Agency / consultancy | Projects, team, services | Rarely |
| Law firm | Practice areas, team, case studies | No |
| Tourism | Destinations, packages, properties | Often |
| Real estate | Properties | Often |
| Government / education | Programs, departments, documents | Varies |

AZURA must support **Pages-only marketing sites** and **entity-rich showcase sites** with the same platform.

---

## Core philosophy

### Experience First

Optimize for what the **visitor experiences**: composed pages, embedded showcases, clear conversion paths — not internal folder structure.

### Entity ≠ Page

Structured records (**Entities**) hold data. **Pages** compose the story. A service landing page is a Page that may pull from a Service Entity — they are not the same thing.

See [domain-model.md](./domain-model.md).

### Composable, not monolithic

Installations choose a **deployment profile** (Marketing, Showroom, Agency, …). Not every customer runs every preset, module, or capability.

See [deployment-profiles.md](./deployment-profiles.md).

---

## Extension model (summary)

| Mechanism | Purpose |
|-----------|---------|
| **Preset** | Shipped EntityType: schema, templates, admin defaults, validation |
| **Module** | Optional vertical: workflows, infrastructure, dedicated UX |
| **Capability** | Shared service: search, AI, workflow, versioning, personalization, analytics |

Presets and Modules **consume** Capabilities and Core Platform services — they do not re-implement them.

Full definitions: [domain-model.md](./domain-model.md) · Rules: [architecture-principles.md](./architecture-principles.md)

---

## User-facing vs developer language

| Audience | Sees |
|----------|------|
| **Admin user** | Services, Projects, Team, Products, Partners |
| **Developer / RFC author** | EntityType, Entity, ViewModel, Resolver, Preset, Module, Capability |

Architectural terms do not appear as top-level admin navigation labels.

See [glossary.md](./glossary.md).

---

## AZURA 2.0 goal

1. **Stabilize** architectural language (Constitution v1.0).
2. **Unify** duplicate showcase engines (Product vs ContentItem vs travel presets).
3. **Reclassify** portal features as Presets or Modules — do not delete capabilities.
4. **Reflect** the constitution in admin information architecture.
5. **Enable** composable deployment profiles.

Implementation phases: [azura-v2.md](./azura-v2.md).

---

## Success criteria

- A new RFC is decided in minutes using [Fitness Tests](./platform-boundaries.md#architecture-fitness-tests) — without reopening foundational debates.
- Admin users never ask: “What is the difference between Catalog Item, Listing, Offering, and Product?”
- Developers have one Entity engine, one Template registry, one Search Capability — not parallel paths per vertical.

---

## Related documents

- [domain-model.md](./domain-model.md) — formal concept definitions
- [architecture-principles.md](./architecture-principles.md) — governing rules
- [azura-v2.md](./azura-v2.md) — phased rollout plan
