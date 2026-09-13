# Deployment profiles

Quick reference for installers. Full spec: [deployment-profiles.md](../deployment-profiles.md).

## Standard profiles

| Profile | Use case |
|---------|----------|
| `marketing` | Brochure / campaign site — no product catalog |
| `showroom` | Product + service showcase |
| `agency` | Services, projects, team, case studies |
| `tourism` | Destinations, properties, packages |
| `documentation` | Knowledge base + docs module |
| `enterprise` | Full platform (default) |

## Configure

```bash
# Build-time — default is enterprise when unset
AZURA_PROFILE=marketing
```

Manifests live in this folder (`*.yaml`). Nav item registry: [admin-nav-manifest.yaml](../admin-nav-manifest.yaml).

## Verify

```bash
npm run profile:generate
npm run profiles:verify
```

Marketing profile smoke: Products admin nav hidden; `/admin/products`, `/{locale}/products`, and `/api/products` return 404.
