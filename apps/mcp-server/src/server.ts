import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { ApprovalsClient } from "./client.js";
import {
  TOOL_DEFINITIONS,
  handleEvaluateAction,
  handleGetApprovalStatus,
  handleListPendingApprovals,
  handleListRunActions,
  handleRequestApproval,
  type ToolResult,
} from "./tools.js";

function toCallToolResult(result: ToolResult): CallToolResult {
  return result as unknown as CallToolResult;
}

export function createServer(client: ApprovalsClient): Server {
  const server = new Server(
    { name: "trustaccept-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
      case "request_approval":
        return toCallToolResult(await handleRequestApproval(client, args));
      case "get_approval_status":
        return toCallToolResult(await handleGetApprovalStatus(client, args));
      case "list_pending_approvals":
        return toCallToolResult(await handleListPendingApprovals(client, args));
      case "evaluate_action":
        return toCallToolResult(await handleEvaluateAction(client, args));
      case "list_run_actions":
        return toCallToolResult(await handleListRunActions(client, args));
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}
