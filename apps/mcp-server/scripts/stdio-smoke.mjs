#!/usr/bin/env node
// Drives the MCP server over stdio: initialize -> tools/list ->
// tools/call x3. Prints every JSON-RPC frame in both directions so the
// transcript can be pasted into reports / docs.
//
// Requires the Next.js dev server at $TRUSTACCEPT_API_URL (defaults
// to http://localhost:3000) to be reachable for tools/call to succeed.
// tools/list and initialize work standalone (no API contact).

import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const baseUrl = process.env.TRUSTACCEPT_API_URL ?? "http://localhost:3000";
const apiKey = process.env.TRUSTACCEPT_API_KEY ?? "";

const server = spawn("node", ["dist/apps/mcp-server/src/index.js"], {
  env: {
    ...process.env,
    TRUSTACCEPT_API_URL: baseUrl,
    TRUSTACCEPT_API_KEY: apiKey,
  },
  stdio: ["pipe", "pipe", "inherit"],
});

let nextId = 1;
const pending = new Map();
let buffer = "";

server.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    process.stdout.write("S→C " + JSON.stringify(msg) + "\n\n");
    if (msg.id != null && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

function send(method, params) {
  const id = nextId++;
  const msg = { jsonrpc: "2.0", id, method, params };
  process.stdout.write("C→S " + JSON.stringify(msg) + "\n");
  server.stdin.write(JSON.stringify(msg) + "\n");
  return new Promise((resolve) => pending.set(id, resolve));
}

function notify(method, params) {
  const msg = { jsonrpc: "2.0", method, params };
  process.stdout.write("C→S " + JSON.stringify(msg) + "\n\n");
  server.stdin.write(JSON.stringify(msg) + "\n");
}

async function main() {
  await send("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "stdio-smoke", version: "0.0.1" },
  });
  notify("notifications/initialized", {});

  await send("tools/list", {});

  const reqRes = await send("tools/call", {
    name: "request_approval",
    arguments: {
      action: {
        type: "production_deploy",
        summary: "Smoke-test deploy v1.0.0",
        payload: { commit: "abc1234", service: "checkout-api" },
      },
      principal: { type: "email", value: "smoke@example.com" },
      context: { agent_name: "smoke-bot", environment: "production" },
    },
  });

  let createdId = "ra-unknown";
  try {
    const inner = JSON.parse(reqRes.result.content[0].text);
    createdId = inner.approval?.id ?? createdId;
  } catch {}

  await send("tools/call", {
    name: "get_approval_status",
    arguments: { request_id: createdId },
  });

  await send("tools/call", {
    name: "list_pending_approvals",
    arguments: { principal_type: "email", principal_value: "smoke@example.com" },
  });

  await wait(50);
  server.kill();
}

main().catch((err) => {
  console.error("[stdio-smoke] error:", err);
  server.kill();
  process.exitCode = 1;
});
