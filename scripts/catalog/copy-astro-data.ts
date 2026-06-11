/**
 * One-time copy of Astro catalog data from sample/ into Next-native paths.
 * Safe to re-run (skips if destination already has collections.json unless --force).
 */
import { access, copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";

const ROOT = process.cwd();
const FORCE = process.argv.includes("--force");

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function copyFileEnsuringDir(src: string, dest: string): Promise<void> {
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

async function copyDirRecursive(src: string, dest: string): Promise<number> {
  let count = 0;
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      count += await copyDirRecursive(from, to);
    } else if (entry.isFile()) {
      await mkdir(dirname(to), { recursive: true });
      await copyFile(from, to);
      count++;
    }
  }
  return count;
}

async function main() {
  const destCollections = join(ROOT, "src", "data", "collections.json");
  if ((await exists(destCollections)) && !FORCE) {
    console.log("collections.json already exists — use --force to overwrite");
  } else {
    const pairs: Array<{ src: string; dest: string; type: "file" | "dir" }> = [
      {
        src: join(ROOT, "sample", "src", "data", "collections.json"),
        dest: destCollections,
        type: "file",
      },
      {
        src: join(ROOT, "sample", "src", "data", "media-library.json"),
        dest: join(ROOT, "src", "data", "media-library.json"),
        type: "file",
      },
      {
        src: join(ROOT, "sample", "src", "data", "header.json"),
        dest: join(ROOT, "src", "data", "header.json"),
        type: "file",
      },
      {
        src: join(ROOT, "sample", "src", "data", "en-us"),
        dest: join(ROOT, "src", "data", "en-us"),
        type: "dir",
      },
      {
        src: join(ROOT, "sample", "src", "data", "ar-ae"),
        dest: join(ROOT, "src", "data", "ar-ae"),
        type: "dir",
      },
      {
        src: join(ROOT, "sample", "public", "uploads"),
        dest: join(ROOT, "public", "uploads"),
        type: "dir",
      },
      {
        src: join(ROOT, "sample", "public", "assets"),
        dest: join(ROOT, "public", "assets"),
        type: "dir",
      },
    ];

    for (const { src, dest, type } of pairs) {
      if (!(await exists(src))) {
        console.warn(`SKIP (missing): ${src}`);
        continue;
      }
      if (type === "file") {
        await copyFileEnsuringDir(src, dest);
        const s = await stat(dest);
        console.log(`FILE ${dest} (${s.size} bytes)`);
      } else {
        const n = await copyDirRecursive(src, dest);
        console.log(`DIR  ${dest} (${n} files)`);
      }
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
