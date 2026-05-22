# @trustaccept/mcp-server

TrustAccept MCP server — thin stdio proxy over `/api/v1/approvals`. Exposes three tools to MCP-compatible AI agents:

- `request_approval(action, principal, context?, tool_id?)`
- `get_approval_status(request_id)`
- `list_pending_approvals(principal_type?, principal_value?, limit?)`

This package is intentionally separate from the web app runtime: own `package.json`, own `node_modules`, and a compiled output that includes the shared approval-type schemas it imports from `src/lib/approval-types.ts`. The storage and field contract is documented in [`FIELD_MAPPING.md`](FIELD_MAPPING.md).

## Install & build

```bash
cd apps/mcp-server
npm install
npm run build       # compiles to dist/
```

## Run

```bash
TRUSTACCEPT_API_URL=http://localhost:3000 \
TRUSTACCEPT_API_KEY=optional-static-token \
node dist/apps/mcp-server/src/index.js
```

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `TRUSTACCEPT_API_URL` | `http://localhost:3000` | Base URL of the Next.js app that hosts `/api/v1/approvals`. |
| `TRUSTACCEPT_API_KEY` | (unset) | Sent as `Cookie: ta_session=<key>`. Optional in demo mode; the wrapper's middleware accepts the demo session implicitly. |
| `TRUSTACCEPT_ALLOWED_TOOL_IDS` | (unset) | Configured on the web app, not the MCP process. When set, `request_approval.tool_id` must match one of the comma-separated values. |

The server runs only on stdio for the MVP. Streamable HTTP is a post-MVP stretch goal per the marketplace plan.

## Connect from a local MCP client

In your MCP client config (e.g. Claude Desktop's `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "trustaccept": {
      "command": "node",
      "args": ["/absolute/path/to/apps/mcp-server/dist/apps/mcp-server/src/index.js"],
      "env": {
        "TRUSTACCEPT_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Test

```bash
npm test            # 18 tests, all paths mocked at the fetch boundary
```

## End-to-end stdio smoke

```bash
# In one terminal: start the wrapper
cd ../..
npm run dev

# In another: drive the MCP server via stdio
cd apps/mcp-server
TRUSTACCEPT_API_URL=http://localhost:3000 node scripts/stdio-smoke.mjs
```

The smoke script prints every JSON-RPC frame (client→server, server→client) so the transcript can be pasted into reports.

## What this package does NOT do

- Policy evaluation (Block 4 — lives in the main repo's `src/server/policies.ts`)
- Action hashing (Block 4 — `src/server/action-hash.ts`)
- Receipt issuance (Block 5 — `src/server/receipts.ts`)
- Real auth (Block X — passthrough cookie only in the MVP)
- Streamable HTTP transport (post-MVP)
- Tool identity issuance. The web app enforces `tool_id` when `TRUSTACCEPT_ALLOWED_TOOL_IDS` is configured; the MCP process only forwards caller input.
