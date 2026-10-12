# Preset migration

Status: later. Presets stay internal domain schemas during the foundation phase.

`product`, `knowledge`, `team-member`, and the other presets in `docs/profiles/` are dependencies of apps. They are not separate ZIPs unless a client must install one domain on its own.

## Move

- Documentation already requires `knowledge`. That preset is enabled in the same save as the Documentation app.
- When a preset grows workers, a public navigation tree, or its own admin product, promote it to an app. Do not copy it into both a preset and an app.
- Preset routes stay in `PRESET_ROUTE_REGISTRY` until the owning app manifest lists them.

## Guards

- Disabling a preset that an active app requires also deactivates that app in the same save.
- Content stored for a preset remains in the database when the preset is off.
- Blocks that only need a preset keep rendering on the public site from stored content.
