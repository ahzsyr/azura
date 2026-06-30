export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertCloudNativeRuntime } = await import("@/lib/cloud-native-guard");
    assertCloudNativeRuntime();

    if (
      process.env.LOCAL_PUBLIC_DIR?.trim() ||
      process.env.LOCAL_UPLOADS_DIR?.trim()
    ) {
      const { spawnSync } = await import("node:child_process");
      const { join } = await import("node:path");
      const script = join(process.cwd(), "scripts/deploy/ensure-uploads-symlink.mjs");
      const result = spawnSync(process.execPath, [script], {
        stdio: "inherit",
        env: process.env,
        cwd: process.cwd(),
      });
      const exitCode = result.status ?? 1;
      if (exitCode !== 0) {
        console.error(
          `[instrumentation] ensure-uploads-symlink.mjs failed (exit ${exitCode}) — CMS uploads may not persist across redeploys`,
        );
      }
    }
  }
}
