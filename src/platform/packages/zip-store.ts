import { crc32 } from "node:zlib";

export type ZipFile = { name: string; data: Buffer };

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getSeconds() >> 1) | (date.getMinutes() << 5) | (date.getHours() << 11),
    date: date.getDate() | ((date.getMonth() + 1) << 5) | ((year - 1980) << 9),
  };
}

/** Uncompressed in-memory ZIP. Entry names are stored as UTF-8. */
export function writeStoreZip(files: ZipFile[], now = new Date()): Buffer {
  const stamped = dosDateTime(now);
  const locals: Buffer[] = [];
  const entries: { name: string; crc: number; size: number; offset: number }[] = [];
  let offset = 0;
  for (const file of files) {
    if (file.name.includes("..") || file.name.startsWith("/") || file.name.includes("\\")) {
      throw new Error(`Invalid zip entry name: ${file.name}`);
    }
    const nameBuf = Buffer.from(file.name, "utf8");
    const checksum = crc32(file.data) >>> 0;
    const header = Buffer.alloc(30 + nameBuf.length);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(stamped.time, 10);
    header.writeUInt16LE(stamped.date, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(file.data.length, 18);
    header.writeUInt32LE(file.data.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);
    nameBuf.copy(header, 30);
    entries.push({ name: file.name, crc: checksum, size: file.data.length, offset });
    locals.push(header, file.data);
    offset += header.length + file.data.length;
  }
  const central: Buffer[] = [];
  let centralSize = 0;
  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const header = Buffer.alloc(46 + nameBuf.length);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x800, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(stamped.time, 12);
    header.writeUInt16LE(stamped.date, 14);
    header.writeUInt32LE(entry.crc, 16);
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
    central.push(header);
    centralSize += header.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...central, end]);
}

/** Reads store-method ZIP entries. Compressed entries are rejected. */
export function readStoreZip(buffer: Buffer): ZipFile[] {
  let eocd = -1;
  const start = Math.max(0, buffer.length - 22 - 65535);
  for (let index = buffer.length - 22; index >= start; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP central directory was not found");
  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const files: ZipFile[] = [];
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
    const method = buffer.readUInt16LE(cursor + 10);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const size = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    if (method !== 0 || compressed !== size) throw new Error(`ZIP entry is compressed: ${name}`);
    if (name.includes("..") || name.startsWith("/") || name.includes("\\")) {
      throw new Error(`Invalid zip entry name: ${name}`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    files.push({ name, data: buffer.subarray(dataStart, dataStart + size) });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}
