import type { ApprovalsClient } from "./client.js";
import {
  ApprovalRequestInput,
  GetApprovalStatusInput,
  ListPendingApprovalsInput,
} from "../../../src/lib/approval-types.js";
import {
  EvaluateActionInput,
  ListRunActionsInput,
} from "../../../src/lib/policy-types.js";

export interface ToolContent {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

const REQUEST_APPROVAL_DESC = [
  "Request a human approval (or policy auto-decision) before executing an agent action.",
  "Returns the approval record. status will be one of:",
  "  - 'pending' : human gating in progress; poll get_approval_status to detect resolution",
  "  - 'accepted' : action approved (by a human, or auto-allowed by policy)",
  "  - 'rejected' : action denied (by a human, or auto-denied by policy)",
  "  - 'remediation_required' : remediation must complete before re-requesting",
  "  - 'expired' : pending request whose expires_at has passed",
  "",
  "Common action.type values (powers policy at request time):",
  "  - production_deploy        → high risk, requires human approval",
  "  - customer_data_export     → critical, requires human approval",
  "  - api_key_*, secret_*      → critical, requires admin approval",
  "  - payment                  → high risk over $5,000",
  "  - infrastructure_*         → high, requires human approval",
  "  - read_*, report_*         → low risk, auto-allowed when no amount supplied",
  "",
  "Constraints:",
  "  - action.summary is 4–280 characters and surfaces on the approval page",
  "  - principal.value must be ≤ 120 characters (over-length values are rejected with HTTP 400)",
  "  - action.payload is hashed (sha256) but NEVER persisted as raw JSON",
  "  - receipt_jwt in the response is null until the request is resolved; fetch a fresh receipt via get_approval_status once status leaves 'pending'",
].join("\n");

const GET_APPROVAL_STATUS_DESC = [
  "Fetch the current state of a previously-submitted approval by id.",
  "Returns the same locked output shape as request_approval, including:",
  "  - policy_id, risk_level, policy_reason (populated once the policy engine evaluates)",
  "  - action_hash (sha256 of the original action payload)",
  "  - receipt_jwt: a signed RS256 JWT bound to action_hash, issued on demand once the approval is resolved; null while status is 'pending'",
  "  - decided_by, decision_actor_type ('human' | 'policy' | null), decided_at",
  "",
  "Poll this tool to detect when a pending approval is resolved.",
].join("\n");

const LIST_PENDING_APPROVALS_DESC = [
  "List pending approvals filtered by principal. Useful for building approver inboxes,",
  "or for an agent to discover whether its own request is still waiting.",
  "",
  "Inputs are optional; calling with no filters returns the full pending queue (subject to the limit).",
  "principal_value must be ≤ 120 characters.",
].join("\n");

const EVALUATE_ACTION_DESC = [
  "Advisory policy decision point for an agent action.",
  "Returns one of auto_approve, require_human, or block before the agent decides its next step.",
  "This tool does not execute, gate, broker, or proxy the action.",
  "auto_approve and block decisions are still written to TrustAccept as audit records.",
  "require_human returns suggested_request_approval_args that can be passed to request_approval.",
].join("\n");

const LIST_RUN_ACTIONS_DESC = [
  "List every TrustAccept action tied to one agent_run_id.",
  "Use this to show the full blast radius for one agent run, including policy decisions and human approvals.",
].join("\n");

export const TOOL_DEFINITIONS = [
  {
    name: "request_approval",
    description: REQUEST_APPROVAL_DESC,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "object",
          properties: {
            type: {
              type: "string",
              maxLength: 120,
              description:
                "Action type (e.g. production_deploy, customer_data_export). Powers the policy engine.",
            },
            summary: {
              type: "string",
              minLength: 4,
              maxLength: 280,
              description: "Short human-readable summary displayed on the approval page.",
            },
            payload: {
              type: "object",
              additionalProperties: true,
              description:
                "Full action payload. Hashed (sha256) at request time and bound to the receipt; NEVER persisted as raw JSON.",
            },
          },
          required: ["type", "summary"],
        },
        principal: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["email", "phone", "user_id"] },
            value: {
              type: "string",
              minLength: 1,
              maxLength: 120,
              description: "Principal identifier. Over 120 chars returns HTTP 400.",
            },
          },
          required: ["type", "value"],
        },
        context: {
          type: "object",
          properties: {
            agent_name: { type: "string", maxLength: 120 },
            environment: { type: "string", maxLength: 120 },
            amount: {
              type: "number",
              description: "Monetary amount in the smallest currency unit (powers payment policy).",
            },
            resource: { type: "string", maxLength: 120 },
            business_justification: { type: "string", maxLength: 4000 },
            metadata: {
              type: "object",
              additionalProperties: true,
              description:
                "Free-form metadata. Accepted but not persisted in the MVP.",
            },
          },
        },
        tool_id: {
          type: "string",
          maxLength: 120,
          description:
            "Caller tool identifier. When TRUSTACCEPT_ALLOWED_TOOL_IDS is configured, this value must appear in that comma-separated allowlist.",
        },
      },
      required: ["action", "principal"],
    },
  },
  {
    name: "get_approval_status",
    description: GET_APPROVAL_STATUS_DESC,
    inputSchema: {
      type: "object",
      properties: {
        request_id: {
          type: "string",
          description: "Approval id returned by request_approval (e.g. ra-...).",
        },
      },
      required: ["request_id"],
    },
  },
  {
    name: "list_pending_approvals",
    description: LIST_PENDING_APPROVALS_DESC,
    inputSchema: {
      type: "object",
      properties: {
        principal_type: { type: "string", enum: ["email", "phone", "user_id"] },
        principal_value: { type: "string", maxLength: 120 },
        limit: { type: "number", minimum: 1, maximum: 200 },
      },
    },
  },
  {
    name: "evaluate_action",
    description: EVALUATE_ACTION_DESC,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 3,
          maxLength: 200,
          description: "Short imperative describing the action the agent wants to take.",
        },
        principal: {
          type: "object",
          description: "Who is accountable for the action.",
          properties: {
            type: {
              type: "string",
              enum: ["phone", "email", "user_id"],
              description: "Principal identifier type.",
            },
            value: {
              type: "string",
              minLength: 3,
              maxLength: 200,
              description: "Principal identifier value.",
            },
            role: {
              type: "string",
              minLength: 1,
              maxLength: 100,
              description: "Principal role used for policy matching.",
            },
          },
          required: ["type", "value"],
        },
        context: {
          type: "object",
          properties: {
            agent_name: {
              type: "string",
              minLength: 1,
              maxLength: 100,
              description: "Name of the agent requesting evaluation.",
            },
            agent_run_id: {
              type: "string",
              minLength: 1,
              maxLength: 200,
              description: "Optional run identifier used for run grouping.",
            },
            action_type: {
              type: "string",
              minLength: 1,
              maxLength: 100,
              description: "Coarse action category used for policy matching.",
            },
            risk_level: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description: "Risk level used for policy threshold matching.",
            },
            summary: {
              type: "string",
              minLength: 1,
              maxLength: 1000,
              description: "Human-readable action summary.",
            },
            metadata: {
              type: "object",
              additionalProperties: {
                anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
              },
              description: "Optional scalar metadata captured with suggested approval args.",
            },
          },
          required: ["agent_name", "action_type", "summary"],
        },
      },
      required: ["action", "principal", "context"],
    },
  },
  {
    name: "list_run_actions",
    description: LIST_RUN_ACTIONS_DESC,
    inputSchema: {
      type: "object",
      properties: {
        agent_run_id: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Agent run identifier to inspect.",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 200,
          description: "Maximum number of actions to return.",
        },
      },
      required: ["agent_run_id"],
    },
  },
] as const;

function asText(payload: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

function asError(err: unknown): ToolResult {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text", text: `Error: ${msg}` }],
  };
}

export async function handleRequestApproval(
  client: ApprovalsClient,
  args: unknown,
): Promise<ToolResult> {
  try {
    const input = ApprovalRequestInput.parse(args);
    const approval = await client.requestApproval(input);
    return asText({ approval });
  } catch (err) {
    return asError(err);
  }
}

export async function handleGetApprovalStatus(
  client: ApprovalsClient,
  args: unknown,
): Promise<ToolResult> {
  try {
    const input = GetApprovalStatusInput.parse(args);
    const approval = await client.getApprovalStatus(input.request_id);
    return asText({ approval });
  } catch (err) {
    return asError(err);
  }
}

export async function handleListPendingApprovals(
  client: ApprovalsClient,
  args: unknown,
): Promise<ToolResult> {
  try {
    const input = ListPendingApprovalsInput.parse(args ?? {});
    const approvals = await client.listPendingApprovals(input);
    return asText({ approvals, count: approvals.length });
  } catch (err) {
    return asError(err);
  }
}

export async function handleEvaluateAction(
  client: ApprovalsClient,
  args: unknown,
): Promise<ToolResult> {
  try {
    const input = EvaluateActionInput.parse(args);
    const result = await client.evaluateAction(input);
    return asText(result);
  } catch (err) {
    return asError(err);
  }
}

export async function handleListRunActions(
  client: ApprovalsClient,
  args: unknown,
): Promise<ToolResult> {
  try {
    const input = ListRunActionsInput.parse(args);
    const result = await client.listRunActions(input.agent_run_id, input.limit);
    return asText(result);
  } catch (err) {
    return asError(err);
  }
}
