import { access, copyFile, writeFile } from "fs/promises";
import path from "path";

const MESSAGES_DIR = path.join(process.cwd(), "messages");

function messagePath(code: string) {
  return path.join(MESSAGES_DIR, `${code}.json`);
}

export async function messageFileExists(code: string): Promise<boolean> {
  try {
    await access(messagePath(code));
    return true;
  } catch {
    return false;
  }
}

function isReadOnlyFilesystemError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "EROFS" || code === "EPERM" || code === "EACCES";
}

export type ScaffoldMessageFileResult = {
  created: boolean;
  /** True when the repo messages dir is not writable (e.g. Vercel/Lambda). */
  skipped?: boolean;
};

/**
 * Create messages/{code}.json from the English template when possible.
 * On serverless deployments the app bundle is read-only; locale creation must still succeed.
 */
export async function scaffoldMessageFile(code: string): Promise<ScaffoldMessageFileResult> {
  const target = messagePath(code);
  if (await messageFileExists(code)) {
    return { created: false };
  }

  const defaultSource = messagePath("en");
  const attempts: Array<() => Promise<void>> = [
    () => copyFile(defaultSource, target),
    () => writeFile(target, "{}\n", "utf8"),
  ];

  for (const attempt of attempts) {
    try {
      await attempt();
      return { created: true };
    } catch (error) {
      if (isReadOnlyFilesystemError(error)) {
        continue;
      }
      throw error;
    }
  }

  return { created: false, skipped: true };
}
