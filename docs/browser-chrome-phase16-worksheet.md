# Browser Chrome — Phase 16 Device Worksheet

Fill on device after Waves 0–3. Mark each cell **Pass** / **Fail** / **N/A** with notes.

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| Cold load System | Clear site data; load home; OS light | Media-scoped metas; chrome matches OS light | |
| Cold load Forced dark | Set dark via toggle; hard refresh; OS light | All theme-color contents = dark projection; app dark | |
| Appearance toggle | Light ↔ dark | Metas update from resolver projection; cookie `devi-theme-mode` set | |
| Preset apply | Apply catalog preset | CSS surfaces + theme-color update without appearance toggle | |
| Soft navigation | Forced dark; navigate Home → Blog → Product | Metas stay Forced dark (not SSR media pair reclaim) | |
| Back / bfcache | Browser back after Forced | Chrome still matches Forced | |
| Refresh | Hard reload Forced | SSR may emit collapsed color via cookie; boot/engine consistent | |
| System restore | Set System in personalization | Media-scoped light/dark metas restored | |

**Assert helpers (unit already cover):**

- `resolveBrowserProjection` / `buildThemeState` — `src/lib/theme/__tests__/browser-chrome-projection.test.ts`
- `syncThemeColorMeta` — `src/features/theme/engine/__tests__/sync-theme-color-meta.test.ts`
