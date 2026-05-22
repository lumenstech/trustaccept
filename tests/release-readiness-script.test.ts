import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

const copiedPaths = [
  ".github/workflows/ci.yml",
  "Dockerfile",
  "README.md",
  "apps/mcp-server/FIELD_MAPPING.md",
  "apps/mcp-server/README.md",
  "package.json",
];

function tempRepo(transform?: (root: string) => void): string {
  const root = mkdtempSync(join(tmpdir(), "trustaccept-release-check-"));
  tempDirs.push(root);
  for (const source of copiedPaths) {
    const destination = join(root, source);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  }
  transform?.(root);
  return root;
}

function rewrite(root: string, path: string, transform: (content: string) => string): void {
  const target = join(root, path);
  writeFileSync(target, transform(readFileSync(target, "utf8")));
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("scripts/check-release-readiness.mjs", () => {
  it("passes the checked-in release gates", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["scripts/check-release-readiness.mjs"],
      { cwd: process.cwd() },
    );

    expect(stdout).toContain("Production release-readiness gates are present");
  });

  it("fails when the Docker healthcheck is missing", async () => {
    const root = tempRepo((dir) => {
      rewrite(dir, "Dockerfile", (content) =>
        content
          .split("\n")
          .filter((line) => !line.includes("HEALTHCHECK"))
          .join("\n"),
      );
    });

    await expect(
      execFileAsync(process.execPath, ["scripts/check-release-readiness.mjs", root], {
        cwd: process.cwd(),
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('Dockerfile: missing "HEALTHCHECK"'),
    });
  });

  it("fails when rollback docs are missing", async () => {
    const root = tempRepo((dir) => {
      rewrite(dir, "README.md", (content) =>
        content.replace("### Rollback runbook", "### Revert notes"),
      );
    });

    await expect(
      execFileAsync(process.execPath, ["scripts/check-release-readiness.mjs", root], {
        cwd: process.cwd(),
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('README.md: missing "### Rollback runbook"'),
    });
  });

  it("fails when the MCP README regresses to the old three-tool contract", async () => {
    const root = tempRepo((dir) => {
      rewrite(dir, "apps/mcp-server/README.md", (content) =>
        content
          .replace("Exposes five tools", "Exposes three tools")
          .replace("\n- `evaluate_action(action, principal, context)`", "")
          .replace("\n- `list_run_actions(agent_run_id, limit?)`", ""),
      );
    });

    await expect(
      execFileAsync(process.execPath, ["scripts/check-release-readiness.mjs", root], {
        cwd: process.cwd(),
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(
        'apps/mcp-server/README.md: stale "Exposes three tools" text is not allowed',
      ),
    });
  });
});
