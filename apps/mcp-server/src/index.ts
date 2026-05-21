#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ApprovalsClient } from "./client.js";
import { createServer } from "./server.js";

const baseUrl = process.env.TRUSTACCEPT_API_URL ?? "http://localhost:3000";
const apiKey = process.env.TRUSTACCEPT_API_KEY;

const client = new ApprovalsClient({ baseUrl, apiKey });
const server = createServer(client);

const transport = new StdioServerTransport();
await server.connect(transport);

process.stderr.write(
  `[trustaccept-mcp] stdio transport ready, baseUrl=${baseUrl}\n`,
);
