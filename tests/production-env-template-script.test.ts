import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

function tempEnvFile(transform: (content: string) => string): string {
  const dir = mkdtempSync(join(tmpdir(), "trustaccept-env-template-"));
  tempDirs.push(dir);
  const path = join(dir, ".env.production.example");
  const content = readFileSync(".env.production.example", "utf8");
  writeFileSync(path, transform(content));
  return path;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("scripts/check-production-env-template.mjs", () => {
  it("passes the checked-in production env template", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["scripts/check-production-env-template.mjs"],
      { cwd: process.cwd() },
    );

    expect(stdout).toContain(
      "Production env template covers required production variables",
    );
  });

  it("fails when a required production variable is missing", async () => {
    const path = tempEnvFile((content) =>
      content.replace(/^TRUSTACCEPT_ALLOWED_TOOL_IDS=.*\n/m, ""),
    );

    await expect(
      execFileAsync(process.execPath, ["scripts/check-production-env-template.mjs", path], {
        cwd: process.cwd(),
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        "TRUSTACCEPT_ALLOWED_TOOL_IDS: missing from .env.production.example",
      ),
    });
  });

  it("fails when placeholder secrets are blank or ambiguous", async () => {
    const path = tempEnvFile((content) =>
      content.replace(
        /^TRUSTACCEPT_APPROVAL_TOKEN_SECRET=.*$/m,
        "TRUSTACCEPT_APPROVAL_TOKEN_SECRET=",
      ),
    );

    await expect(
      execFileAsync(process.execPath, ["scripts/check-production-env-template.mjs", path], {
        cwd: process.cwd(),
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        "TRUSTACCEPT_APPROVAL_TOKEN_SECRET: must be a clear non-empty placeholder secret",
      ),
    });
  });
});
