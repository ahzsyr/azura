import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { Writable } from "node:stream";
import { crc32 } from "node:zlib";

const ZIP32_MAX = 0xffffffff;

export function sanitizeZipEntryName(name: string): string {
  const parts = name
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part.length > 0 && part !== "." && part !== "..");
  if (parts.length === 0) {
    throw new Error("Invalid zip entry name");
  }
  return parts.join("/");
}

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getSeconds() >> 1) | (date.getMinutes() << 5) | (date.getHours() << 11),
    date: date.getDate() | ((date.getMonth() + 1) << 5) | ((year - 1980) << 9),
  };
}

type ZipEntry = {
  name: string;
  crc: number;
  size: number;
  offset: number;
};

function localFileHeader(name: string, crc: number, size: number, time: number, date: number): Buffer {
  const nameBuf = Buffer.from(name, "utf8");
  const header = Buffer.alloc(30 + nameBuf.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(time, 10);
  header.writeUInt16LE(date, 12);
  header.writeUInt32LE(crc >>> 0, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt16LE(0, 28);
  nameBuf.copy(header, 30);
  return header;
}

function centralDirectoryHeader(entry: ZipEntry, time: number, date: number): Buffer {
  const nameBuf = Buffer.from(entry.name, "utf8");
  const header = Buffer.alloc(46 + nameBuf.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(time, 12);
  header.writeUInt16LE(date, 14);
  header.writeUInt32LE(entry.crc >>> 0, 16);
  header.writeUInt32LE(entry.size, 20);
  header.writeUInt32LE(entry.size, 24);
  header.writeUInt16LE(nameBuf.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.offset, 42);
  nameBuf.copy(header, 46);
  return header;
}

function endOfCentralDirectory(count: number, size: number, offset: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(count, 8);
  header.writeUInt16LE(count, 10);
  header.writeUInt32LE(size, 12);
  header.writeUInt32LE(offset, 16);
  header.writeUInt16LE(0, 20);
  return header;
}

async function hashFile(filePath: string): Promise<{ crc: number; size: number }> {
  const handle = await open(filePath, "r");
  try {
    const stat = await handle.stat();
    if (stat.size > ZIP32_MAX) {
      throw new Error(`File is too large to archive: ${filePath}`);
    }
    let crc = 0;
    let size = 0;
    const buf = Buffer.alloc(64 * 1024);
    while (true) {
      const { bytesRead } = await handle.read(buf, 0, buf.length, null);
      if (bytesRead === 0) break;
      crc = crc32(buf.subarray(0, bytesRead), crc);
      size += bytesRead;
    }
    return { crc: crc >>> 0, size };
  } finally {
    await handle.close();
  }
}

/** Uncompressed ZIP writer. Entry names are sanitized to stay inside the archive. */
export class StoreZipWriter {
  private readonly entries: ZipEntry[] = [];
  private offset = 0;
  private readonly stamped = dosDateTime(new Date());

  constructor(private readonly out: Writable) {}

  private write(chunk: Buffer): Promise<void> {
    this.offset += chunk.length;
    if (this.out.write(chunk)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onError = (error: Error) => {
        this.out.off("drain", onDrain);
        reject(error);
      };
      const onDrain = () => {
        this.out.off("error", onError);
        resolve();
      };
      this.out.once("drain", onDrain);
      this.out.once("error", onError);
    });
  }

  async addFile(entryName: string, filePath: string): Promise<void> {
    const name = sanitizeZipEntryName(entryName);
    const { crc, size } = await hashFile(filePath);
    const localOffset = this.offset;
    await this.write(localFileHeader(name, crc, size, this.stamped.time, this.stamped.date));
    const stream = createReadStream(filePath);
    for await (const chunk of stream) {
      await this.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    this.entries.push({ name, crc, size, offset: localOffset });
  }

  async finish(): Promise<void> {
    const centralStart = this.offset;
    for (const entry of this.entries) {
      await this.write(centralDirectoryHeader(entry, this.stamped.time, this.stamped.date));
    }
    const centralSize = this.offset - centralStart;
    await this.write(endOfCentralDirectory(this.entries.length, centralSize, centralStart));
    await new Promise<void>((resolve, reject) => {
      this.out.end((error?: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
