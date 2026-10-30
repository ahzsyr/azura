/**
 * Measure-only twin artifact checks (M2.2 / M8.x).
 * No reviewed expectations — Hostinger must never import this module.
 *
 * Reachability: scripts/deploy/hostinger-build.mjs must not reference this path.
 */
/**
 * @param {object} artifact
 * @param {{ expectMarketing: boolean, profileId?: string }} opts
 * @returns {object} artifact
 */
export function assertTwinDeploymentProfile(artifact, { expectMarketing, profileId = "enterprise" }) {
  if (!artifact || typeof artifact !== "object") {
    throw new Error("missing artifact");
  }
  if (artifact.generated !== true) {
    throw new Error(`generated !== true`);
  }
  if (artifact.profileId !== profileId) {
    throw new Error(`profileId=${artifact.profileId} expected ${profileId}`);
  }
  if (!Array.isArray(artifact.profileSourceModules)) {
    throw new Error("missing profileSourceModules provenance");
  }
  if (typeof artifact.profileSourceHash !== "string" || !artifact.profileSourceHash) {
    throw new Error("missing profileSourceHash provenance");
  }

  const modules = new Set((artifact.modules ?? []).map(String));
  const hasMarketing = modules.has("marketing");
  if (expectMarketing && !hasMarketing) {
    throw new Error("expected marketing module in artifact");
  }
  if (!expectMarketing && hasMarketing) {
    throw new Error("expected marketing module omitted from twin artifact");
  }
  return artifact;
}
