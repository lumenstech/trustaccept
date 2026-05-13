import { deflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
import type { DecisionEvent } from "@/lib/decisions";
import { escapeCsvValue } from "./csv";
import { evidenceSha256 } from "./evidenceHash";

export const MAX_EXPORT_WINDOW_DAYS = 90;

const DECISIONS_CSV_HEADERS = [
  "id",
  "tenantId",
  "agentId",
  "action",
  "subject",
  "amountCents",
  "currency",
  "decisionStatus",
  "policyVersion",
  "evidenceSha256",
  "capCheckOk",
  "createdAt",
] as const;

export function decisionToCsvRow(d: DecisionEvent): string[] {
  return [
    d.id,
    d.tenantId,
    d.agentId ?? "",
    d.action,
    d.subject,
    d.amountCents ?? "",
    d.currency ?? "",
    d.decisionStatus,
    d.policyVersion,
    d.evidenceSha256,
    d.capCheck.ok ? "true" : "false",
    d.createdAt,
  ].map((v) => String(v ?? ""));
}

export function buildDecisionsCsv(decisions: DecisionEvent[]): string {
  const headers = DECISIONS_CSV_HEADERS.map(escapeCsvValue).join(",");
  const rows = decisions.map((d) =>
    decisionToCsvRow(d).map(escapeCsvValue).join(","),
  );
  return [headers, ...rows].join("\r\n") + "\r\n";
}

export interface ExportContext {
  tenantId: string;
  from: string;
  to: string;
  agentId?: string;
}

/**
 * Hand-rolled ZIP (PKZIP) writer using the DEFLATE method. Sufficient
 * for evidence bundles; no compression-format ambiguity for auditors.
 * Avoids pulling in a third-party dep (consistent with how PDF is also
 * hand-rolled in this codebase).
 *
 * Files: manifest.json, README.txt, decisions.json, decisions.csv.
 */
export function buildEvidenceZip(
  decisions: DecisionEvent[],
  ctx: ExportContext,
): Buffer {
  const decisionsJson = JSON.stringify(decisions, null, 2);
  const decisionsCsv = buildDecisionsCsv(decisions);
  const readme = [
    "TrustAccept Evidence Export",
    "===========================",
    "",
    `Tenant ID:    ${ctx.tenantId}`,
    `Window:       ${ctx.from} .. ${ctx.to}`,
    `Agent filter: ${ctx.agentId ?? "(none)"}`,
    `Decisions:    ${decisions.length}`,
    "",
    "Files in this bundle:",
    "  - manifest.json   SHA-256 of every file in this bundle",
    "  - README.txt      this file",
    "  - decisions.json  raw decision events",
    "  - decisions.csv   RFC-4180 CSV summary",
    "",
    "Receipts are RS256 JWS. Verify with the tenant's public key.",
  ].join("\n");

  const files: { name: string; data: Buffer }[] = [
    { name: "README.txt", data: Buffer.from(readme, "utf8") },
    { name: "decisions.json", data: Buffer.from(decisionsJson, "utf8") },
    { name: "decisions.csv", data: Buffer.from(decisionsCsv, "utf8") },
  ];

  const manifest = {
    tenantId: ctx.tenantId,
    from: ctx.from,
    to: ctx.to,
    agentId: ctx.agentId ?? null,
    count: decisions.length,
    files: files.map((f) => ({
      name: f.name,
      sha256: createHash("sha256").update(f.data).digest("hex"),
      bytes: f.data.length,
    })),
    overallSha256: evidenceSha256(
      decisions.map((d) => ({ id: d.id, sha: d.evidenceSha256 })),
    ),
    generatedAt: new Date().toISOString(),
  };

  // Prepend the manifest so its hashes can be checked first.
  files.unshift({
    name: "manifest.json",
    data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
  });

  return buildZip(files);
}

interface ZipFile {
  name: string;
  data: Buffer;
}

interface LocalEntry {
  name: Buffer;
  crc: number;
  compressed: Buffer;
  uncompressedSize: number;
  offset: number;
}

function crc32(buf: Buffer): number {
  let table = crc32.table;
  if (!table) {
    table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    crc32.table = table;
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}
crc32.table = undefined as Int32Array | undefined;

function buildZip(files: ZipFile[]): Buffer {
  const entries: LocalEntry[] = [];
  const localChunks: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const compressed = deflateRawSync(f.data);
    const crc = crc32(f.data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // method = deflate
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0, 12); // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    name.copy(local, 30);

    localChunks.push(local, compressed);
    entries.push({
      name,
      crc,
      compressed,
      uncompressedSize: f.data.length,
      offset,
    });
    offset += local.length + compressed.length;
  }

  const centralChunks: Buffer[] = [];
  let centralSize = 0;
  for (const e of entries) {
    const central = Buffer.alloc(46 + e.name.length);
    central.writeUInt32LE(0x02014b50, 0); // central dir signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(8, 10); // method
    central.writeUInt16LE(0, 12); // mod time
    central.writeUInt16LE(0, 14); // mod date
    central.writeUInt32LE(e.crc, 16);
    central.writeUInt32LE(e.compressed.length, 20);
    central.writeUInt32LE(e.uncompressedSize, 24);
    central.writeUInt16LE(e.name.length, 28);
    central.writeUInt16LE(0, 30); // extra length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk start
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(e.offset, 42);
    e.name.copy(central, 46);
    centralChunks.push(central);
    centralSize += central.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end-of-central-dir signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk where central dir starts
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}
