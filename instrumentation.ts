export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertCloudNativeRuntime } = await import("@/lib/cloud-native-guard");
    assertCloudNativeRuntime();
  }
}
