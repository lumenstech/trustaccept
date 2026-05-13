import { createHash } from "node:crypto";

/**
 * Minimal ZIP writer (STORE method — no compression). Avoids pulling in a
 * compression library while still producing a valid .zip that any standard
 * unzip tool can read. Suitable for evidence bundles whose constituent
 * files are JSON/text and already small.
 *
 * Format reference: APPNOTE.TXT (ZIP File Format Specification, 6.3.x).
 * We emit:
 *  - Local file headers + raw file data (sequentially)
 *  - A central directory at the end
 *  - An end-of-central-directory record
 *
 * Limits: <4GiB per file and <65535 files (ZIP32). Plenty for an
 * evidence bundle of decisions.json + manifest.json + README.txt.
 */

export interface ZipFile {
  name: string;
  data: Buffer;
  /** Modification time. Defaults to now. */
  mtime?: Date;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CDIR = 0x02014b50;
const SIG_EOCD = 0x06054b50;

function crc32(buf: Buffer): number {
  // Polynomial-table CRC32 (IEEE 802.3) cached on first use.
  if (!crc32.table) {
    crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crc32.table[i] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crc32.table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
namespace crc32 {
  // eslint-disable-next-line no-var, prefer-const
  export var table: Uint32Array | undefined;
}

function dosDateTime(d: Date): { date: number; time: number } {
  const year = Math.max(1980, d.getFullYear());
  const date =
    ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const time =
    (d.getHours() << 11) |
    (d.getMinutes() << 5) |
    Math.floor(d.getSeconds() / 2);
  return { date: date & 0xffff, time: time & 0xffff };
}

export function buildZip(files: ZipFile[]): Buffer {
  const localChunks: Buffer[] = [];
  const cdirChunks: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const { date, time } = dosDateTime(file.mtime ?? new Date());

    // Local file header
    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(1 << 11, 6); // bit 11 = UTF-8 filename
    local.writeUInt16LE(0, 8); // method = STORE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18); // compressed size
    local.writeUInt32LE(file.data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    localChunks.push(local, nameBuf, file.data);

    // Central directory entry
    const cdir = Buffer.alloc(46);
    cdir.writeUInt32LE(SIG_CDIR, 0);
    cdir.writeUInt16LE(20, 4); // version made by
    cdir.writeUInt16LE(20, 6); // version needed
    cdir.writeUInt16LE(1 << 11, 8); // flags
    cdir.writeUInt16LE(0, 10); // method
    cdir.writeUInt16LE(time, 12);
    cdir.writeUInt16LE(date, 14);
    cdir.writeUInt32LE(crc, 16);
    cdir.writeUInt32LE(file.data.length, 20);
    cdir.writeUInt32LE(file.data.length, 24);
    cdir.writeUInt16LE(nameBuf.length, 28);
    cdir.writeUInt16LE(0, 30); // extra length
    cdir.writeUInt16LE(0, 32); // comment length
    cdir.writeUInt16LE(0, 34); // disk #
    cdir.writeUInt16LE(0, 36); // internal attrs
    cdir.writeUInt32LE(0, 38); // external attrs
    cdir.writeUInt32LE(offset, 42); // local header offset
    cdirChunks.push(cdir, nameBuf);

    offset += local.length + nameBuf.length + file.data.length;
  }

  const cdirBuf = Buffer.concat(cdirChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(SIG_EOCD, 0);
  eocd.writeUInt16LE(0, 4); // disk #
  eocd.writeUInt16LE(0, 6); // disk where cdir starts
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, cdirBuf, eocd]);
}

/**
 * Read STORE-method ZIP file entries back out. Used in tests to verify
 * the bundle. Compressed entries are rejected.
 */
export function readZip(buf: Buffer): { name: string; data: Buffer }[] {
  // Find end-of-central-directory record. Search from the end for the
  // signature — comments may extend the record beyond 22 bytes, but our
  // writer emits none.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("Not a zip file (no EOCD)");

  const totalEntries = buf.readUInt16LE(eocd + 10);
  const cdirSize = buf.readUInt32LE(eocd + 12);
  const cdirOffset = buf.readUInt32LE(eocd + 16);

  const entries: { name: string; data: Buffer }[] = [];
  let p = cdirOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(p) !== SIG_CDIR) {
      throw new Error("Corrupt central directory entry");
    }
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const uncompressedSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    p += 46 + nameLen + extraLen + commentLen;

    if (method !== 0) throw new Error(`Unsupported zip method ${method}`);
    if (compressedSize !== uncompressedSize) {
      throw new Error("STORE entry size mismatch");
    }

    // Local header at localOffset: 30-byte fixed + name + extra
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const data = buf.subarray(dataStart, dataStart + uncompressedSize);
    entries.push({ name, data: Buffer.from(data) });
  }
  // cdirSize is recorded but we navigated by entry count instead. Touch
  // the variable so this file passes noUnused checks if ever flipped on.
  void cdirSize;
  return entries;
}

export function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}
