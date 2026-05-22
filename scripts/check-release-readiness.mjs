#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.argv[2] ?? ".");

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function addError(errors, path, detail) {
  errors.push(`${path}: ${detail}`);
}

function requireIncludes(errors, path, content, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      addError(errors, path, `missing ${JSON.stringify(snippet)}`);
    }
  }
}

function checkPackage(errors) {
  const pkg = JSON.parse(read("package.json"));
  const scripts = pkg.scripts ?? {};
  const requiredScripts = {
    "env:production:check": "node scripts/check-production-env-template.mjs",
    "verify:prod": "node scripts/verify-prod.mjs",
    "smoke:prod": "node scripts/smoke-production.mjs",
    "prisma:migrate:check": "node scripts/check-prisma-migration.mjs",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "release:check": "node scripts/check-release-readiness.mjs",
  };
  for (const [name, expected] of Object.entries(requiredScripts)) {
    if (scripts[name] !== expected) {
      addError(
        errors,
        "package.json",
        `script ${name} expected ${JSON.stringify(expected)}, got ${JSON.stringify(scripts[name])}`,
      );
    }
  }
}

function checkDockerfile(errors) {
  const dockerfile = read("Dockerfile");
  requireIncludes(errors, "Dockerfile", dockerfile, [
    "FROM node:20.19-bookworm-slim AS runner",
    "ENV NODE_ENV=production",
    "USER nextjs",
    "HEALTHCHECK",
    "/api/health",
    "CMD [\"node\", \"server.js\"]",
  ]);
}

function checkCi(errors) {
  const ci = read(".github/workflows/ci.yml");
  requireIncludes(errors, ".github/workflows/ci.yml", ci, [
    "npm run prisma:migrate:check",
    "npm run typecheck",
    "npm test",
    "npm run build",
    "npm run env:production:check",
    "npm run release:check",
    "docker build --target runner .",
    "docker build --target migrator .",
    "npm run verify:prod",
    "working-directory: apps/mcp-server",
    "node --check scripts/check-release-readiness.mjs",
  ]);
}

function checkReadme(errors) {
  const readme = read("README.md");
  requireIncludes(errors, "README.md", readme, [
    "### Production cutover runbook",
    "### Rollback runbook",
    "### Production incident response",
    "npm run env:production:check",
    "npm run verify:prod",
    "npm run smoke:prod",
    "npm run prisma:migrate:deploy",
    "/api/health",
    "/api/ready",
    "`npm run smoke:prod` verifies protected API behavior both ways",
    "/api/v1/approvals/evaluate",
    "/api/v1/approvals/by-run/[runId]",
    "### MCP policy and run grouping",
    "evaluate_action",
    "list_run_actions",
    "/api/v1/policy",
    "/api/v1/approvals/evaluate",
    "/api/v1/approvals/by-run/[runId]",
    "No Prisma model or migration is required for this Week 2 layer.",
    "`auto_approve` maps to the existing `accepted` status",
    "`block` maps to the existing `rejected` status",
  ]);
}

function checkMcpDocs(errors) {
  const readme = read("apps/mcp-server/README.md");
  requireIncludes(errors, "apps/mcp-server/README.md", readme, [
    "Exposes five tools",
    "`request_approval(action, principal, context?, tool_id?)`",
    "`get_approval_status(request_id)`",
    "`list_pending_approvals(principal_type?, principal_value?, limit?)`",
    "`evaluate_action(action, principal, context)`",
    "`list_run_actions(agent_run_id, limit?)`",
    "This tool does not execute, gate, broker, or proxy",
    "`auto_approve` maps to the existing TrustAccept `accepted` status",
    "`block` maps to the existing `rejected` status",
  ]);
  if (readme.includes("Exposes three tools")) {
    addError(errors, "apps/mcp-server/README.md", 'stale "Exposes three tools" text is not allowed');
  }

  const fieldMapping = read("apps/mcp-server/FIELD_MAPPING.md");
  requireIncludes(errors, "apps/mcp-server/FIELD_MAPPING.md", fieldMapping, [
    "`evaluate_action` / `list_run_actions`",
    "## 3. Week 2 advisory policy decisions",
    "## 4. `list_run_actions` output",
    "`auto_approve`",
    "`block`",
    "Week 2 does not add `auto_approved`, `blocked`, or `cancelled` status values.",
    "`context.metadata.agent_run_id`",
    "`context.metadata.principal_role`",
  ]);
}

const errors = [];
checkPackage(errors);
checkDockerfile(errors);
checkCi(errors);
checkReadme(errors);
checkMcpDocs(errors);

if (errors.length > 0) {
  console.error("Production release-readiness check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production release-readiness gates are present");
