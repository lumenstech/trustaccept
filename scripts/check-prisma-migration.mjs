#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const migrationPath = join(
  repoRoot,
  "prisma",
  "migrations",
  "20260521191500_init",
  "migration.sql",
);

function normalize(sql) {
  return sql.trim().replace(/\r\n/g, "\n");
}

const expected = normalize(readFileSync(migrationPath, "utf8"));
const generated = normalize(
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--script",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  ),
);

if (expected !== generated) {
  console.error(
    [
      "Prisma migration drift detected.",
      "",
      "The checked-in initial migration no longer matches prisma/schema.prisma.",
      "Create a new migration for schema changes instead of using db push.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Prisma migration matches schema.prisma");
