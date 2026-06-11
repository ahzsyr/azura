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

export async function scaffoldMessageFile(code: string): Promise<{ created: boolean }> {
  const target = messagePath(code);
  if (await messageFileExists(code)) {
    return { created: false };
  }

  const defaultSource = messagePath("en");
  try {
    await copyFile(defaultSource, target);
    return { created: true };
  } catch {
    await writeFile(target, "{}\n", "utf8");
    return { created: true };
  }
}
